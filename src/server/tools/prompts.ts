// ── Per-agent severity rubrics (step 1 system prompts) ────────────────────────

export const SECURITY_SEVERITY_RUBRIC = `Severity classification — apply strictly, default to the lower level when uncertain:
- critical: ALL THREE conditions must be true — (1) exploitable without the attacker needing any precondition or additional vulnerability, (2) consequence is data breach, auth bypass, remote code execution, or credential exposure, (3) triggerable with normal/expected inputs. Examples: SQL injection, hardcoded secret in source, authentication bypass, privilege escalation with a clear vector. If any condition is unclear → use warning.
- warning: real risk that requires specific conditions — missing input validation on user-controlled data, weak/deprecated crypto in active use, missing rate limiting on a sensitive endpoint, CSRF on a state-changing route, insecure direct object reference
- suggestion: defense-in-depth hardening with no direct exploit path — verbose error messages leaking internals, missing security headers, use of eval without obvious risk, non-critical improvements
- Do NOT mark something critical if exploiting it requires additional vulnerabilities or unrealistic attacker preconditions
- Do NOT flag as a vulnerability: optional parameters with safe production defaults (e.g. \`now = Date.now()\`, \`logger = console\`). These are dependency injection for testability. Only flag if untrusted external input can reach the parameter without the caller explicitly choosing to pass it.`;

export const PERFORMANCE_SEVERITY_RUBRIC = `Severity classification — apply strictly, default to the lower level when uncertain:
- critical: ALL THREE conditions must be true — (1) the code runs on a hot path (per-request or inside a tight loop), (2) the complexity is O(n²) or worse, or causes N+1 DB queries, or blocks the event loop, (3) the input is unbounded with no configured maximum size. If any condition is unclear → use warning.
- warning: inefficiency in a moderately-hot path with measurable impact — unnecessary work repeated on every call where caching is straightforward, suboptimal data structure with clear better alternative, missing pagination on a query that will grow
- suggestion: micro-optimisation or cold-path improvement — algorithmic complexity in maintenance/GC/init methods, theoretical worst-case in rarely-called code, style preferences about efficiency
- Do NOT mark something critical if the code path is a scheduled job, cleanup routine, or one-time initialisation — O(n) over bounded data in a cold path is not a performance issue
- Before assigning warning or critical to any loop or array operation: check whether the collection has a maximum size enforced by a config constant, capacity argument, or documented limit. If yes → the worst case is O(that constant), which is bounded — classify as suggestion at most regardless of call frequency.`;

export const LOGIC_SEVERITY_RUBRIC = `Severity classification — apply strictly, default to the lower level when uncertain:
- critical: ALL THREE conditions must be true — (1) the bug triggers under normal inputs without any unusual caller behaviour or rare timing, (2) the consequence is a crash (TypeError, RangeError, NullPointerException, panic, unhandled rejection), silent data corruption, or wrong output on a common code path, (3) no opt-in, configuration, or additional precondition is required to hit it. Examples: null dereference on a value that is absent in the common case, inverted condition in the main branch, off-by-one that accesses an out-of-bounds index on a non-empty collection. Boundary conditions that require an exact integer/timestamp match, bugs that only surface at integer overflow, or errors that require a contrived input do NOT qualify. If any condition is unclear → use warning.
- warning: incorrect behaviour in a reachable edge case — missing null check on an optional value that could be absent in practice, incorrect default that produces wrong output for a valid input, off-by-one on a boundary that is rarely but plausibly hit, state mutation that can cause subtle ordering bugs
- suggestion: theoretical edge case requiring unlikely inputs, redundant condition, overly complex boolean logic that could be simplified, missing assertion that would aid debugging
- Do NOT mark something critical if the problematic input requires a contrived, practically impossible, or astronomically rare scenario (e.g. exact millisecond boundary match, exact integer overflow value)`;

export const PATTERN_SEVERITY_RUBRIC = `Severity classification — apply strictly, default to the lower level when uncertain:
- critical: never use critical for pattern findings — structural issues do not constitute a critical severity on their own
- warning: structural problem that actively hinders correctness or maintainability — a function or class with >5 distinct unrelated responsibilities (god object), global mutable state creating hidden coupling between modules, deeply nested callback chains that prevent reliable error handling, copy-pasted logic blocks that will diverge and cause bugs
- suggestion: everything else — SOLID violations that are not yet causing problems, naming inconsistencies, missing abstraction, minor duplication, style preferences
- When uncertain between warning and suggestion, always use suggestion`;

// ── Step 2 extraction reminders (condensed rubric for structured output pass) ─

export const SECURITY_EXTRACTION_REMINDER = `Severity reminder — critical: directly exploitable without preconditions AND consequence is breach/bypass/RCE AND triggerable with normal inputs (all 3 required). warning: real risk requiring specific conditions. suggestion: hardening with no direct exploit path. When uncertain, use the lower severity.`;

export const PERFORMANCE_EXTRACTION_REMINDER = `Severity reminder — critical: hot path AND O(n²)+/N+1/blocking AND unbounded input (all 3 required). warning: inefficiency in a moderately-hot path. suggestion: cold-path, theoretical, or bounded-collection concerns. When uncertain, use the lower severity.`;

export const LOGIC_EXTRACTION_REMINDER = `Severity reminder — critical: crashes (TypeError, RangeError, NPE, panic) or corrupts data under normal usage with no unusual preconditions (all 3 conditions required). warning: incorrect behaviour in a reachable edge case. suggestion: theoretical or unlikely-input issues. When uncertain, use the lower severity.`;

export const PATTERN_EXTRACTION_REMINDER = `Severity reminder — never use critical for pattern findings. warning: structural problem actively hurting maintainability. suggestion: everything else. When uncertain, use suggestion.`;

// ── Universal rubric for all Tier 2 LLM sub-call tools ────────────────────────
// These tools return free text that the main agent incorporates into its analysis.
// Labelling findings correctly in the output anchors the agent's severity reasoning.

export const SUBCALL_SEVERITY_RUBRIC = `
When describing findings, classify each one explicitly using this rubric:
- CRITICAL: ALL THREE must be true — (1) triggers under normal inputs with no unusual precondition, (2) consequence is data corruption, security breach, crash, or silent data loss, (3) no opt-in or additional configuration required to hit it. If any condition is unclear → use WARNING.
- WARNING: incorrect or risky behaviour in a reachable scenario that does not meet the critical bar — a bug that requires specific but realistic inputs, a missing safeguard that a reasonable developer should add.
- SUGGESTION: everything else — theoretical issues, micro-optimisations, bounded inefficiencies, improvements with no current measurable impact.
- When uncertain, use the lower classification.
Prefix each finding with its classification label, e.g. "WARNING: ..." or "SUGGESTION: ...".`;
