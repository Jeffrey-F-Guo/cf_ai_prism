# Agent Tools Implementation Plan

## Context

All 4 sub-agent tools (`securityScan`, `performanceAnalyze`, `smartLogicEval`, `patternAnalyze`) are currently no-ops — they accept a diff and return "proceed with your own analysis." The agents call these tools as step 1, incorporate the output into their context, then do LLM analysis in step 2.

Real tool implementations ground the LLM in deterministic evidence and targeted sub-call analysis, directly addressing the calibration failures documented in `AGENT_CALIBRATION.md`:

- FP-001/FP-001b: PerformanceAgent couldn't distinguish cold paths (eviction cron) from hot paths — a call-context parser fixes this
- FP-003: PerformanceAgent ignored bounded collection sizes — a bounds detector fixes this
- SecurityAgent: regex-based secret detection is more reliable than LLM pattern-matching for credential patterns

---

## Design Principles

**Separate tools, not packaged.** Each tool is independently callable so DeepSeek can decide which are relevant for the specific diff. A Python diff with no auth code shouldn't trigger `checkAuthPatterns`. A well-structured function with no loops shouldn't trigger N+1 detection. Modular tools mean targeted calls and clean signal per observation.

**Tool budget per agent: 2 tool calls + 1 output pass** (within `maxSteps: 3`). Each agent has a primary tool it always calls and conditional tools it calls based on what the diff contains. DeepSeek decides.

**Tool output is formatted text, not JSON.** The LLM reads tool output as free text in its observation step — human-readable structure (section headers, bullet points, line numbers) gives the model better signal than JSON for its next reasoning step.

**Implementation tiers:**

- **Tier 1 — Regex/string (fast, deterministic):** Always-call tools. No LLM cost, immediate output.
- **Tier 2 — Targeted LLM sub-call (focused prompt):** Conditional tools for semantics regex can't capture. Each sub-call uses a tightly scoped prompt and returns structured text.
- **Tier 3 — External API:** Only where real-time data is genuinely needed (CVEs). One call max per review.
- **Tier 4 — Vectorize query:** PatternsAgent cross-session memory. Requires embedding step.

All tools must run in Cloudflare Workers — no Node APIs, no file system access.

---

## Critical Files

| File                                   | Change                                                                                                               |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `src/server/tools/SecurityTools.ts`    | `securityScan` (regex), `checkAuthPatterns` (LLM sub-call), `analyzeDependencies` (OSV API)                          |
| `src/server/tools/PerformanceTools.ts` | `performanceAnalyze` (regex/string), `analyzeMemoryPatterns` (LLM sub-call), `findBlockingOperations` (LLM sub-call) |
| `src/server/tools/LogicTools.ts`       | `smartLogicEval` (regex), `traceDataFlow` (LLM sub-call), `detectRaceConditions` (LLM sub-call)                      |
| `src/server/tools/PatternTools.ts`     | `patternAnalyze` (regex/string), `searchSimilarPatterns` (Vectorize), `checkArchitecturalPatterns` (LLM sub-call)    |
| `src/server/tools/github.ts`           | `fetchFileContent` — shared across all agents, unchanged                                                             |

No agent files need to change — they already call these tools and incorporate their output.

---

## Tool Definitions Per Agent

---

### SecurityAgent — 4 tools

**Decision path:**

1. `securityScan` — always, fast regex pass
2. `checkAuthPatterns` — if auth/token/session/crypto code detected in diff
3. `analyzeDependencies` — only if diff touches `package.json`, `requirements.txt`, `go.mod`, etc.
4. `fetchFileContent` — if upstream context needed to assess a pattern

---

#### `securityScan(diff: string)` — Tier 1

Regex scan of added lines for credential patterns, dangerous functions, auth misuse, and SQL injection. Returns concrete line numbers and matched text so the LLM has deterministic evidence for its reasoning step.

**Credential patterns:**

- API keys: `sk-[a-zA-Z0-9]{20,}`, `ghp_[a-zA-Z0-9]{36}`, `AKIA[0-9A-Z]{16}`, `xoxb-[0-9]+-`, `xoxp-[0-9]+-`
- Generic: `(password|secret|token|api_key|apikey)\s*[:=]\s*['"][^'"]{8,}['"]` (case-insensitive)
- JWT literals: `eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}`
- Bearer token literals in source

**Dangerous functions:**

- `eval(`, `new Function(`, `innerHTML\s*=`, `dangerouslySetInnerHTML`
- `Math.random()` in auth/token/session/csrf contexts (filename or function name match)
- `md5(`, `sha1(` in password/credential contexts

**SQL injection indicators:**

- String concatenation in query patterns: `` `SELECT ... ${`` or `"SELECT ... " +`

**Auth misuse patterns (regex):**

- Missing `await` on async auth calls
- Hardcoded role strings: `role === 'admin'`, `role === 'superuser'`
- JWT without algorithm specification

**Output format:**

```
CREDENTIAL PATTERNS FOUND:
  - Line +12: hardcoded API key — matched: sk-proj-abc123...
  - Line +34: password assignment — matched: password = "hunter2"

DANGEROUS FUNCTIONS:
  - Line +7: eval() usage

AUTH MISUSE:
  - Line +19: Math.random() used in token generation context

SQL INJECTION INDICATORS:
  (none found)

NOTES: Scan covers +lines (added code) only. Verify false positives before reporting.
```

If nothing found: `No credential patterns, dangerous functions, auth misuse, or SQL injection indicators detected in added lines.`

---

#### `checkAuthPatterns(code: string)` — Tier 2 (LLM sub-call)

Focused sub-call targeting auth anti-patterns that require semantic understanding. Invoked when the diff contains auth/token/session/crypto-related code.

**System prompt:** `You are a security code auditor specializing in authentication and authorization. Analyze the provided code for auth anti-patterns only. Return findings as a structured list with line references where possible. Be specific and avoid false positives.`

**Targets:**

- Missing token verification (JWT without signature check)
- Session without expiry or secure flags
- Privilege escalation paths (role check bypassable)
- Insecure direct object reference
- Missing rate limiting on auth endpoints
- Password hashing with insufficient rounds

**Output format:**

```
AUTH PATTERN FINDINGS:
  - JWT decoded without signature verification (line ~45)
  - Session cookie missing Secure and HttpOnly flags
  - Role check at line +23 bypassable if user object is null

(none found) if clean
```

---

#### `analyzeDependencies(diff: string)` — Tier 3 (OSV API)

Parses dependency file changes from the diff, queries the OSV API for known CVEs. Only called when the diff modifies `package.json`, `requirements.txt`, `Pipfile`, `go.mod`, `Cargo.toml`, or equivalent.

**Implementation:**

1. Extract added/changed dependency entries from diff
2. Parse package name and version
3. POST to `https://api.osv.dev/v1/query` per package
4. Return CVE data with severity and fix version

**Output format:**

```
DEPENDENCY VULNERABILITIES:
  - lodash@4.17.20: CVE-2021-23337 (HIGH) — command injection via template
    Fix: upgrade to 4.17.21
  - express@4.17.1: no known CVEs

NOTES: CVE data from OSV.dev. Check for additional advisories on npm advisory database.
```

---

### PerformanceAgent — 4 tools

**Decision path:**

1. `performanceAnalyze` — always, provides call context the LLM cannot infer from diff alone
2. `analyzeMemoryPatterns` — if diff touches long-lived objects, caches, event listeners, or closures
3. `findBlockingOperations` — if diff contains async functions or Promise usage
4. `fetchFileContent` — if call-path context is needed to assess hot vs cold classification

---

#### `performanceAnalyze(diff: string)` — Tier 1

Parses diff structure to determine call-path context, loop patterns, collection bounds, and N+1 indicators. The highest-value deterministic tool in the system — provides context the LLM genuinely cannot infer from a diff alone.

**Call context detection:**

- Extract function names from `+` lines: `function <name>`, `async <name>`, `<name>(`
- **Hot-path indicators:** names containing `check`, `handle`, `process`, `request`, `middleware`, `validate`, `get`, `post`, `put`, `delete`, `fetch`, `call`, `invoke`
- **Cold-path indicators:** names containing `evict`, `cleanup`, `init`, `migrate`, `cron`, `purge`, `setup`, `seed`, `destroy`
- Scan docstring/comment keywords in added context: `cron`, `scheduled`, `startup`, `initialization`

**Loop detection (on `+` lines):**

- Detect: `for `, `while (`, `.forEach(`, `.map(`, `.filter(`, `.reduce(`
- Check if loop body contains `await` (N+1 indicator)
- Check if nested (loop inside loop)
- Track line number from `@@` header

**Bounds inference:**

- Variables bounding collections: `maxKeys`, `limit`, `max`, `capacity`, `size` near loop bounds
- Patterns: `.length < max`, `.size <= limit`, `i < config.`
- Report bounding variable and approximate value if visible

**N+1 indicators:**

- `await` inside a loop body where the awaited call matches db/fetch/query patterns
- ORM method calls (`.findOne`, `.findById`, `.where`) inside `.map(` or `forEach(`

**Output format:**

```
CALL CONTEXT:
  Hot-path functions (called per-request): check(), handleRequest()
  Cold-path functions (maintenance/cron): evictExpired(), cleanup()
  Docstring keywords found: "scheduled Worker cron"

LOOP ANALYSIS:
  - Line +45: for...of loop in evictExpired() — NOT nested, no await
  - Line +67: forEach in check() — NOT nested, no await

BOUNDED COLLECTIONS:
  - entries array bounded by `maxKeys` (config, line +12) — max ~10,000
  - timestamps bounded by `limit` (config, line +23) — max ~1,000

N+1 INDICATORS:
  (none found)

SUMMARY: Changed code spans both hot-path (check) and cold-path (evictExpired).
  Cold-path loops over bounded collections do not constitute performance issues.
```

---

#### `analyzeMemoryPatterns(code: string)` — Tier 2 (LLM sub-call)

Focused sub-call targeting memory risks that require semantic scope understanding. Invoked when diff touches long-lived objects, caches, event listeners, React components, or Worker-level globals.

**System prompt:** `You are a performance engineer specializing in memory management. Analyze the provided code for memory leak patterns and unbounded growth risks only. Be specific about what causes the leak and under what conditions it occurs.`

**Targets:**

- Event listener added without corresponding removal
- Closure capturing a large object unnecessarily
- Unbounded cache or Map with no eviction
- Missing cleanup in useEffect / component unmount
- Worker-level global state that grows per request
- WeakRef/WeakMap misuse

**Output format:**

```
MEMORY RISKS:
  - Event listener added at line +34 (resize handler) — no removeEventListener found in cleanup
  - Cache Map at line +12 has no size limit or TTL — unbounded growth under load

(none found) if clean
```

---

#### `findBlockingOperations(code: string)` — Tier 2 (LLM sub-call)

Focused sub-call for async/blocking misuse that requires understanding of execution context. Invoked when diff contains `async`, `Promise`, `await`, or sync operations in a server context.

**System prompt:** `You are a Node.js/Cloudflare Workers performance specialist. Analyze the provided code for blocking operations and async misuse. Focus on operations that would block the event loop or cause unnecessary sequential execution.`

**Targets:**

- Sync I/O in async/hot-path context
- Missing `await` causing unhandled Promise
- Sequential `await` that could be `Promise.all`
- `JSON.parse` / `JSON.stringify` on large payloads in hot path
- CPU-intensive operations without yielding

**Output format:**

```
BLOCKING OPERATIONS:
  - Lines +45-47: three sequential awaits on independent requests — use Promise.all
  - Line +23: JSON.parse on potentially large payload in request handler

(none found) if clean
```

---

### LogicAgent — 4 tools

**Decision path:**

1. `smartLogicEval` — always, fast regex pass for null risks and async misuse
2. `traceDataFlow` — if `smartLogicEval` flags a suspicious variable or complex mutation chain
3. `detectRaceConditions` — if diff contains concurrent async operations, shared state, or Promise.all with side effects
4. `fetchFileContent` — if callers need to be checked for null handling consistency

---

#### `smartLogicEval(diff: string)` — Tier 1

Regex scan for null/undefined risk patterns, async misuse, unreachable conditions, and edge case checklist generation from function signatures.

**Null/undefined risks:**

- Optional chaining inconsistency: `foo?.bar` in some places, `foo.bar` in others for same variable
- Non-null assertion `!` on a nullable value (assigned from `Map.get()`, array index, `find()`)
- Property access on value from nullable lookup without null check

**Async misuse:**

- `async` function called without `await` and without `.then()`/`.catch()` chain
- Promise returned but not awaited in a context that expects resolution
- `forEach` with `async` callback (forEach doesn't await)

**Unreachable/tautological conditions:**

- Literal: `if (true)`, `if (x === x)`, `if (1 === 1)`
- Contradiction: `if (x > 5 && x < 3)`

**Edge case checklist (from function signatures):**
Statically generate a checklist based on parameter types in the diff:

- Array/List params → empty array input
- String params → empty string, whitespace-only
- Number params → zero, negative, NaN, Infinity
- Nullable params (`?` or `| null`) → null/undefined path
- async/Promise return → concurrent invocation, rejection handling

**Output format:**

```
NULL/UNDEFINED RISKS:
  - Line +34: `user.profile` accessed — `user` assigned from Map.get() at +28, could be undefined

ASYNC MISUSE:
  - Line +56: `saveRecord()` called without await — defined as async at +12
  - Line +71: async callback inside forEach — forEach does not await callbacks

UNREACHABLE CONDITIONS:
  (none found)

EDGE CASE CHECKLIST (for changed functions):
  - processUser(user: User | null): null input path, undefined property access
  - calculateScore(values: number[]): empty array, NaN values, negative numbers

NOTES: Potential risks only. Verify whether null states are actually reachable before reporting.
```

---

#### `traceDataFlow(code: string, variable: string)` — Tier 2 (LLM sub-call)

Focused sub-call to follow a specific variable through the code, identifying unexpected mutations, aliasing, and state changes. Invoked when `smartLogicEval` flags a suspicious variable or when the diff shows complex state management.

**System prompt:** `You are a code analysis tool specializing in data flow. Trace the specified variable through the provided code. Identify where it is assigned, mutated, aliased, passed to functions, and returned. Flag any unexpected state changes, shared mutation, or aliasing that could cause bugs.`

**Output format:**

```
DATA FLOW: `sessionData`
  +12: assigned from cache.get() — may be undefined
  +18: passed to validateSession() — callee may mutate
  +24: property `.userId` accessed without null check
  +31: returned directly — caller receives potentially mutated object

RISKS:
  - Object passed by reference to validateSession — mutation affects caller's copy
  - No null guard between assignment (+12) and access (+24)
```

---

#### `detectRaceConditions(code: string)` — Tier 2 (LLM sub-call)

Focused sub-call targeting concurrency bugs that require understanding of async execution order. Invoked when diff contains concurrent operations, shared mutable state, or non-atomic sequences.

**System prompt:** `You are a concurrency specialist. Analyze the provided code for race conditions, non-atomic operations, and shared state mutation under concurrent access. Focus on async JavaScript/TypeScript patterns. Be specific about the conditions under which the race occurs.`

**Targets:**

- Non-atomic read-modify-write on shared state
- `Promise.all` with side effects on shared object
- Time-of-check to time-of-use (TOCTOU) patterns
- Missing mutex/lock on shared resource
- Concurrent requests mutating the same cache entry

**Output format:**

```
RACE CONDITIONS:
  - Lines +34-38: read-modify-write on `requestCount` without atomic operation
    Race: two concurrent requests both read stale value, both increment, one update lost
  - Line +52: Promise.all modifying shared `results` array from multiple callbacks

(none found) if clean
```

---

### PatternsAgent — 4 tools + Vectorize

**Decision path:**

1. `patternAnalyze` — always, structural metrics baseline
2. `searchSimilarPatterns` — for any non-trivial changed function (Vectorize cross-session memory)
3. `checkArchitecturalPatterns` — if `patternAnalyze` flags high complexity or large functions
4. `fetchFileContent` — if pattern violation appears isolated but may be systemic

---

#### `patternAnalyze(diff: string)` — Tier 1

Compute code quality metrics on changed functions. Always called first to give the LLM a structured quality baseline.

**Cyclomatic complexity (on `+` lines):**

- Start at 1, +1 for each: `if`, `else if`, `while`, `for`, `case`, `catch`, `&&`, `||`, `??`, `?.`, ternary `?`
- Report per-function score
- Flag functions with complexity > 10

**Function length:**

- Count `+` lines per function block
- Flag functions with > 40 added/changed lines

**Parameter count:**

- Detect function signatures in `+` lines
- Flag functions with > 4 parameters

**Naming convention:**

- Detect mixed camelCase and snake_case in the same file section
- Detect PascalCase for non-class/interface names

**SOLID indicators (regex-reliable only):**

- Single Responsibility: flag functions > 40 lines performing multiple distinct operation types (fetch + parse + validate + persist pattern)
- Open/Closed: `switch` statement on `type`, `kind`, or `action` field — classic OCP violation

**Output format:**

```
COMPLEXITY:
  - processRequest(): complexity score 14 (threshold: 10) — HIGH
  - validate(): complexity score 3 — OK

FUNCTION LENGTH:
  - processRequest(): 67 added lines (threshold: 40) — LONG

PARAMETER COUNT:
  - buildQuery(conn, table, filters, limit, offset, orderBy): 6 params (threshold: 4)

NAMING:
  - Mixed conventions: camelCase (getUserById) and snake_case (get_user_by_id) in same section

SOLID:
  - processRequest(): performs fetch + parse + validate + persist — likely violates SRP
  - Line +89: switch on `type` field — consider polymorphism (OCP)
```

---

#### `searchSimilarPatterns(codeChunk: string, repo: string)` — Tier 4 (Vectorize)

Queries the Vectorize index for semantically similar code patterns from past reviews of the same repo. This is the tool that makes PatternsAgent memory-enabled and the dashboard "most common finding type" meaningful.

**Implementation:**

1. Embed `codeChunk` using `@cf/baai/bge-base-en-v1.5`
2. Query Vectorize with `filter: { repo }` to scope to current repo
3. Return top 3 matches with their historical finding context

**Vectorize index populated by:** post-review step that embeds each finding + its code snippet after every completed review (see Vectorize Integration section below).

**Output format:**

```
SIMILAR PATTERNS FROM REVIEW HISTORY:
  - PR #7 (2 days ago): "Inline style consistency issue" (WARNING, Pattern Agent)
    Similarity: high — same template literal pattern
  - PR #3 (1 week ago): "Missing null check on user lookup" (CRITICAL, Logic Agent)
    Similarity: moderate — same Map.get() access pattern

NO HISTORY: First review of this repo — no similar patterns on record.
```

---

#### `checkArchitecturalPatterns(code: string)` — Tier 2 (LLM sub-call)

Focused sub-call for structural issues requiring semantic understanding. Invoked when `patternAnalyze` flags high complexity (> 10) or long functions (> 40 lines).

**System prompt:** `You are a software architect specializing in code quality. Analyze the provided code for architectural anti-patterns. Focus on structural problems that affect maintainability and extensibility, not style preferences. Be specific about what the violation is and why it matters.`

**Targets:**

- God object / class doing too much
- Feature envy (class more interested in another class's data)
- Inappropriate intimacy between modules
- Layer boundary violations (e.g., UI logic in data layer)
- Shotgun surgery indicators (change requires touching many places)
- Dependency inversion violations (high-level module depending on low-level)

**Output format:**

```
ARCHITECTURAL PATTERNS:
  - UserService (line +12): accessing database directly and formatting HTTP responses
    Violation: layer boundary — service layer should not produce HTTP-formatted output
  - processOrder(): reads from 4 different domain objects to complete its work
    Indicator: feature envy — logic may belong in Order or OrderProcessor

(none found) if clean
```

---

## Vectorize Integration

### Post-Review Embedding (runs after every completed review)

After findings are persisted to D1, embed each finding for future cross-session retrieval:

```typescript
// Called in the notify-orchestrator workflow step after D1 persist
async function embedFindings(findings: Finding[], review: Review, env: Env) {
  const vectors = await Promise.all(
    findings.map(async (finding) => {
      const embeddingInput = [
        finding.title,
        finding.description,
        finding.codeSnippet ?? "",
        `file: ${finding.file ?? ""}`,
        `agent: ${finding.agent}`,
        `severity: ${finding.severity}`
      ].join("\n");

      const embedding = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
        text: embeddingInput
      });

      return {
        id: finding.id,
        values: embedding.data[0],
        metadata: {
          repo: review.repo,
          prNumber: review.prNumber,
          agent: finding.agent,
          severity: finding.severity,
          title: finding.title,
          reviewId: review.id,
          createdAt: Date.now()
        }
      };
    })
  );

  await env.VECTORIZE.upsert(vectors);
}
```

### `searchSimilarPatterns` Query Implementation

```typescript
execute: async ({ codeChunk, repo }) => {
  const embedding = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
    text: codeChunk
  });

  const results = await env.VECTORIZE.query(embedding.data[0], {
    topK: 3,
    filter: { repo },
    returnMetadata: true
  });

  if (!results.matches.length) {
    return "No similar patterns found in review history for this repo.";
  }

  return results.matches
    .map(
      (m) =>
        `PR #${m.metadata.prNumber}: "${m.metadata.title}" (${m.metadata.severity}, ${m.metadata.agent})`
    )
    .join("\n");
};
```

### Dashboard Payoff

The Vectorize index makes these D1 queries meaningful:

```sql
-- Most common finding type per repo (powers "top recurring issues" dashboard card)
SELECT title, COUNT(*) as occurrences, agent, severity
FROM findings
WHERE review_id IN (SELECT id FROM reviews WHERE repo = ?)
GROUP BY title
ORDER BY occurrences DESC
LIMIT 5;

-- Severity trend over time
SELECT DATE(created_at, 'unixepoch') as date, severity, COUNT(*) as count
FROM findings f
JOIN reviews r ON f.review_id = r.id
WHERE r.repo = ?
GROUP BY date, severity
ORDER BY date DESC;
```

---

## What Does NOT Need to Change

- Agent files (`SecurityAgent.ts`, `PerformanceAgent.ts`, `LogicAgent.ts`, `PatternAgent.ts`) — already call tools and incorporate output
- `schemas.ts` — no schema changes needed
- `github.ts` — `fetchFileContent` unchanged
- `orchestratorTools.ts` — unrelated

---

## Verification

1. `npx tsc --noEmit` — no type errors
2. Run Prism on `testfile1.ts` (project root) — benchmark:
   - Expected: score 85–100, **0 criticals**
   - PerformanceAgent should classify `evictExpired` as cold-path with bounded collection → suggestion at most
   - PerformanceAgent should classify `splice` in `check()` as hot-path but bounded by `limit` → suggestion
   - SecurityAgent should find no credentials or dangerous functions in test file
3. Verify tool output appears in agent task stream during processing stage
4. After first review completes, verify Vectorize upsert ran — second review of same repo should show `searchSimilarPatterns` returning history
5. Dashboard "Findings by Agent" chart should reflect correct agent attribution after multi-agent reviews
