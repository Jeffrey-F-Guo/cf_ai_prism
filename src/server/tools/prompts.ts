// ── Per-agent severity rubrics (step 1 system prompts) ────────────────────────

export const SECURITY_SEVERITY_RUBRIC = `Severity classification — apply strictly, default to the lower level when uncertain:
- critical: directly exploitable without preconditions — SQL/command/XSS injection, hardcoded secret or API key in source, authentication bypass, privilege escalation, insecure deserialization with a clear attack vector
- warning: real risk that requires specific conditions — missing input validation on user-controlled data, weak/deprecated crypto in active use, missing rate limiting on a sensitive endpoint, CSRF on a state-changing route, insecure direct object reference
- suggestion: defense-in-depth hardening with no direct exploit path — verbose error messages leaking internals, missing security headers, use of eval without obvious risk, non-critical improvements
- Do NOT mark something critical if exploiting it requires additional vulnerabilities or unrealistic attacker preconditions`;

export const PERFORMANCE_SEVERITY_RUBRIC = `Severity classification — apply strictly, default to the lower level when uncertain:
- critical: demonstrable performance problem on a hot path (called per-request or inside a tight loop) — O(n²) or worse algorithm processing unbounded input, N+1 database queries inside a loop, synchronous blocking I/O in an async context, unbounded memory growth with no eviction
- warning: inefficiency in a moderately-hot path with measurable impact — unnecessary work repeated on every call where caching is straightforward, suboptimal data structure with clear better alternative, missing pagination on a query that will grow
- suggestion: micro-optimisation or cold-path improvement — algorithmic complexity in maintenance/GC/init methods, theoretical worst-case in rarely-called code, style preferences about efficiency
- Do NOT mark something critical if the code path is a scheduled job, cleanup routine, or one-time initialisation — O(n) over bounded data in a cold path is not a performance issue
- Do NOT mark something critical if the collection is explicitly bounded by a config constant — bounded O(n) even in a hot path is at most suggestion`;

export const LOGIC_SEVERITY_RUBRIC = `Severity classification — apply strictly, default to the lower level when uncertain:
- critical: will crash or corrupt data at runtime under normal usage — null/undefined dereference on a value that can realistically be absent, off-by-one that causes an infinite loop or corrupts output, inverted condition that produces wrong behaviour in the common case (e.g. > vs >= at a critical boundary), unhandled rejection that silently swallows errors
- warning: incorrect behaviour in a reachable edge case — missing null check on an optional value that could be absent in practice, incorrect default that produces wrong output for a valid input, state mutation that can cause subtle ordering bugs
- suggestion: theoretical edge case requiring unlikely inputs, redundant condition, overly complex boolean logic that could be simplified, missing assertion that would aid debugging
- Do NOT mark something critical if the problematic input requires a contrived or practically impossible scenario`;

export const PATTERN_SEVERITY_RUBRIC = `Severity classification — apply strictly, default to the lower level when uncertain:
- critical: never use critical for pattern findings — structural issues do not constitute a critical severity on their own
- warning: structural problem that actively hinders correctness or maintainability — a function or class with >5 distinct unrelated responsibilities (god object), global mutable state creating hidden coupling between modules, deeply nested callback chains that prevent reliable error handling, copy-pasted logic blocks that will diverge and cause bugs
- suggestion: everything else — SOLID violations that are not yet causing problems, naming inconsistencies, missing abstraction, minor duplication, style preferences
- When uncertain between warning and suggestion, always use suggestion`;

// ── Step 2 extraction reminders (condensed rubric for structured output pass) ─

export const SECURITY_EXTRACTION_REMINDER = `Severity reminder — critical: directly exploitable (injection, hardcoded secret, auth bypass). warning: real risk requiring specific conditions. suggestion: hardening with no direct exploit path. When uncertain, use the lower severity.`;

export const PERFORMANCE_EXTRACTION_REMINDER = `Severity reminder — critical: O(n²)+ or N+1 on a hot per-request path only, processing unbounded input. warning: inefficiency in a moderately-hot path. suggestion: cold-path, theoretical, or bounded-collection concerns. When uncertain, use the lower severity.`;

export const LOGIC_EXTRACTION_REMINDER = `Severity reminder — critical: will crash or corrupt under normal usage. warning: incorrect behaviour in a reachable edge case. suggestion: theoretical or unlikely-input issues. When uncertain, use the lower severity.`;

export const PATTERN_EXTRACTION_REMINDER = `Severity reminder — never use critical for pattern findings. warning: structural problem actively hurting maintainability. suggestion: everything else. When uncertain, use suggestion.`;

// ── Universal rubric for all Tier 2 LLM sub-call tools ────────────────────────
// These tools return free text that the main agent incorporates into its analysis.
// Labelling findings correctly in the output anchors the agent's severity reasoning.

export const SUBCALL_SEVERITY_RUBRIC = `
When describing findings, classify each one explicitly using this rubric:
- CRITICAL: will directly break the project in production under realistic, normal conditions — data corruption, security breach, crash, or silent data loss for normal inputs. Soft invariant violations, bounded overflows, and edge cases requiring unlikely conditions do NOT qualify.
- WARNING: incorrect or risky behaviour in a reachable scenario that does not crash or corrupt — a soft invariant that can be violated under realistic load, a pattern that causes bugs under specific but realistic inputs.
- SUGGESTION: everything else — theoretical issues, micro-optimisations, bounded inefficiencies, improvements with no current measurable impact.
- When uncertain, use the lower classification.
Prefix each finding with its classification label, e.g. "WARNING: ..." or "SUGGESTION: ...".`;
