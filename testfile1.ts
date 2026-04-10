/**
 * Sliding-window rate limiter for Cloudflare Workers.
 *
 * Tracks request counts per key over a rolling time window using an
 * in-memory timestamp log. Designed to be embedded in a Durable Object
 * or used standalone within a single Worker isolate.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Configuration for a RateLimiter instance. All fields are immutable after construction. */
export interface RateLimiterConfig {
  /** Maximum number of requests allowed within `windowMs`. Must be ≥ 1. */
  readonly limit: number;
  /** Duration of the sliding window in milliseconds. Must be ≥ 1. */
  readonly windowMs: number;
  /**
   * Optional upper bound on distinct keys tracked simultaneously.
   * Prevents unbounded memory growth under adversarial traffic.
   * Defaults to 10_000.
   */
  readonly maxKeys?: number;
}

/** Result returned by {@link RateLimiter.check}. */
export interface RateLimiterResult {
  /** Whether the request is within the rate limit. */
  readonly allowed: boolean;
  /** Remaining requests allowed in the current window. */
  readonly remaining: number;
  /**
   * Milliseconds until the oldest request in the window expires and
   * frees a slot. `0` when `allowed` is `true` and slots are available.
   */
  readonly retryAfterMs: number;
  /** Total requests seen for this key in the current window (including this one). */
  readonly current: number;
}

/** Aggregate statistics snapshot across all tracked keys. */
export interface RateLimiterStats {
  readonly trackedKeys: number;
  readonly totalRequestsAllowed: number;
  readonly totalRequestsRejected: number;
}

// ---------------------------------------------------------------------------
// Internal primitive — not exported
// ---------------------------------------------------------------------------

/**
 * Maintains a log of request timestamps for a single key.
 * Prunes expired entries lazily on every access to keep memory bounded.
 */
class SlidingWindowCounter {
  private readonly timestamps: number[] = [];

  /**
   * Records a new request at `now` and removes entries older than `windowMs`.
   * Returns the count of requests in the window after recording.
   */
  record(now: number, windowMs: number): number {
    this.prune(now, windowMs);
    this.timestamps.push(now);
    return this.timestamps.length;
  }

  /**
   * Returns the count of requests in the window without recording a new one.
   * Safe to call on every read without side effects.
   */
  count(now: number, windowMs: number): number {
    this.prune(now, windowMs);
    return this.timestamps.length;
  }

  /**
   * Returns the timestamp of the oldest entry in the window, or `undefined`
   * if the window is empty.
   */
  oldestTimestamp(): number | undefined {
    return this.timestamps[0];
  }

  /** Removes all entries for this key. */
  clear(): void {
    this.timestamps.length = 0;
  }

  private prune(now: number, windowMs: number): void {
    const cutoff = now - windowMs;
    // Binary-search for the first index still within the window.
    // All entries before it are stale and can be removed in one splice.
    let lo = 0;
    let hi = this.timestamps.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.timestamps[mid] <= cutoff) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    if (lo > 0) {
      this.timestamps.splice(0, lo);
    }
  }
}

// ---------------------------------------------------------------------------
// RateLimiter
// ---------------------------------------------------------------------------

export class RateLimiter {
  private readonly config: Required<RateLimiterConfig>;
  private readonly counters = new Map<string, SlidingWindowCounter>();
  private totalAllowed = 0;
  private totalRejected = 0;

  constructor(config: RateLimiterConfig) {
    if (!Number.isInteger(config.limit) || config.limit < 1) {
      throw new RangeError(
        `RateLimiter: limit must be a positive integer, got ${config.limit}`
      );
    }
    if (!Number.isFinite(config.windowMs) || config.windowMs < 1) {
      throw new RangeError(
        `RateLimiter: windowMs must be a positive finite number, got ${config.windowMs}`
      );
    }
    const maxKeys = config.maxKeys ?? 10_000;
    if (!Number.isInteger(maxKeys) || maxKeys < 1) {
      throw new RangeError(
        `RateLimiter: maxKeys must be a positive integer, got ${maxKeys}`
      );
    }
    this.config = { limit: config.limit, windowMs: config.windowMs, maxKeys };
  }

  /**
   * Checks whether the given key is within the rate limit and records the request.
   *
   * Keys that have never been seen are initialised on first use.
   * If `maxKeys` distinct keys are already tracked, new keys are rejected
   * without being stored to prevent memory exhaustion.
   *
   * @param key - Arbitrary string identifier (e.g. IP address, user ID).
   * @param now - Current time in milliseconds. Defaults to `Date.now()`.
   */
  check(key: string, now: number = Date.now()): RateLimiterResult {
    if (key.length === 0) {
      throw new TypeError("RateLimiter: key must be a non-empty string");
    }

    let counter = this.counters.get(key);

    // Enforce maxKeys: if we haven't seen this key and are at capacity, reject.
    if (counter === undefined) {
      if (this.counters.size >= this.config.maxKeys) {
        this.totalRejected++;
        return {
          allowed: false,
          remaining: 0,
          retryAfterMs: this.config.windowMs,
          current: 0
        };
      }
      counter = new SlidingWindowCounter();
      this.counters.set(key, counter);
    }

    const current = counter.record(now, this.config.windowMs);
    const allowed = current <= this.config.limit;
    const remaining = Math.max(0, this.config.limit - current);

    let retryAfterMs = 0;
    if (!allowed) {
      const oldest = counter.oldestTimestamp();
      retryAfterMs =
        oldest !== undefined
          ? Math.max(0, oldest + this.config.windowMs - now)
          : this.config.windowMs;
    }

    if (allowed) {
      this.totalAllowed++;
    } else {
      this.totalRejected++;
    }

    return { allowed, remaining, retryAfterMs, current };
  }

  /**
   * Clears the request log for a specific key.
   * Useful for resetting limits after a successful CAPTCHA challenge.
   *
   * No-op if the key does not exist.
   */
  reset(key: string): void {
    this.counters.get(key)?.clear();
    this.counters.delete(key);
  }

  /**
   * Removes all keys whose windows are fully expired at `now`.
   * Call periodically (e.g., on a scheduled Worker cron) to reclaim memory
   * when traffic is sparse and keys naturally become inactive.
   *
   * @param now - Current time in milliseconds. Defaults to `Date.now()`.
   * @returns Number of keys evicted.
   */
  evictExpired(now: number = Date.now()): number {
    let evicted = 0;
    for (const [key, counter] of this.counters) {
      if (counter.count(now, this.config.windowMs) === 0) {
        this.counters.delete(key);
        evicted++;
      }
    }
    return evicted;
  }

  /**
   * Returns a snapshot of aggregate statistics.
   * Counts reflect the lifetime of this instance.
   */
  getStats(): RateLimiterStats {
    return {
      trackedKeys: this.counters.size,
      totalRequestsAllowed: this.totalAllowed,
      totalRequestsRejected: this.totalRejected
    };
  }
}

// ---------------------------------------------------------------------------
// Factory (preferred public API)
// ---------------------------------------------------------------------------

/**
 * Creates a {@link RateLimiter} with the given configuration.
 *
 * Prefer this over `new RateLimiter(...)` in application code — it keeps
 * construction details out of call sites and makes the instance easier to
 * swap in tests.
 *
 * @example
 * ```ts
 * const limiter = createRateLimiter({ limit: 100, windowMs: 60_000 });
 *
 * export default {
 *   async fetch(request: Request): Promise<Response> {
 *     const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
 *     const result = limiter.check(ip);
 *     if (!result.allowed) {
 *       return new Response("Too Many Requests", {
 *         status: 429,
 *         headers: { "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)) },
 *       });
 *     }
 *     return new Response("OK");
 *   },
 * };
 * ```
 */
export function createRateLimiter(config: RateLimiterConfig): RateLimiter {
  return new RateLimiter(config);
}
