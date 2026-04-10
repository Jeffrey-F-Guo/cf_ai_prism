# Agent Calibration — Known Issues & Mitigations

This document records observed failure modes in Prism's sub-agents (Security, Performance, Logic, Pattern) and the mitigations applied. Reference this before implementing new agent tools or modifying agent prompts.

---

## Root Cause Summary

Sub-agents have two structural weaknesses that cause misclassification:

1. **Two-step architecture gap**: Each agent runs two LLM calls — step 1 analyzes the diff (rubric in system prompt), step 2 converts the free-text analysis to structured output. Step 2 had no rubric, so the model could silently re-escalate severity when assigning structured fields. **Mitigation**: severity reminder added to all step 2 extraction prompts.

2. **No severity rubric**: The schema enum constrained output to `critical | warning | suggestion | success`, but agents had zero guidance on what qualified for each level. They defaulted to pretrained intuitions, which systematically over-escalate. **Mitigation**: explicit per-agent severity rubrics added to system prompts.

---

## Observed False Positives

### FP-001 — PerformanceAgent: `evictExpired` O(n) flagged as critical

- **Finding**: "O(n) complexity issue in `evictExpired` method iterates through all keys (up to `maxKeys = 10,000`)."
- **Why it's wrong**: `evictExpired` is a GC/maintenance method explicitly documented as a scheduled cron operation, not a hot path. O(n) over all keys is the only way to implement eviction — the alternative (priority queue) adds O(log n) to every `check()` call, a worse tradeoff. The agent pattern-matched "iterates over all keys" → "performance issue" without reasoning about call frequency.
- **Correct severity**: suggestion (or not flagged at all)
- **Rubric fix added**: "Do NOT mark something critical if the code path is a scheduled job, cleanup routine, or one-time initialisation — O(n) over bounded data in a cold path is not a performance issue."

### FP-001b — PerformanceAgent: `evictExpired` O(n×m) flagged as critical (rubric-resistant)

- **Finding** (second run, post-rubric): "O(n) eviction with potential O(n²) worst-case — each `counter.count()` triggers binary search O(log m) + splice O(m), so worst case is O(n × m). Could cause performance spikes when called on cron."
- **Why it's still wrong**: Bounds are concrete — n ≤ `maxKeys` (10,000), m ≤ `limit` (typically 10–1,000). Worst case ~10M simple array ops ≈ 10ms, once per cron minute. The splice complexity claim is also overstated: `prune()` is called _because_ entries are expired, so m shrinks toward 0 as eviction progresses. The agent read the docstring acknowledging "scheduled Worker cron" and still marked it critical.
- **Key new insight**: **This false positive persisted despite the rubric explicitly prohibiting critical for cron/cold paths.** The pretrained association "O(n²) = critical" is strong enough to override explicit rubric text in DeepSeek. This is a fundamental limit of prompt-based calibration for this model.
- **Calibration impact**: Rubrics improved score from 48 → 74 (meaningful), but could not eliminate this specific class of finding. The model acknowledges the cold-path context in its reasoning yet still assigns critical in the structured output.

### FP-003 — PerformanceAgent: `splice(0, lo)` in hot path flagged as critical (severity misclassification, not pure false positive)

- **Finding**: "`prune()` uses `splice(0, lo)` which shifts all remaining elements O(n). This happens on every `check()` call in the hot path."
- **What the agent got right**: `prune()` → `record()` → `check()` IS the hot path called per-request. The hot-path identification is correct, unlike FP-001.
- **Why critical is still wrong**: The array is bounded by `limit` (the rate limit config value — typically 10–1,000). The splice shifts at most `limit - lo` elements. With `limit = 100`, that is ~100 integer shifts per request — sub-microsecond on V8. Treating `limit` as a fixed constant makes `check()` O(1) amortized. The agent reasoned as if the array could grow unboundedly when it cannot.
- **Correct severity**: suggestion — a circular buffer would be a textbook O(1) improvement, worth noting, but no measurable impact at realistic `limit` values.
- **Distinction from FP-001/FP-001b**: This is a **severity misclassification** (valid observation, wrong label) rather than a pure false positive. The agent correctly identified the hot path but failed to account for the bounded array size. FP-001 was a pure false positive (wrong path, wrong context). This pattern — correct observation, incorrect severity due to ignoring bounding constraints — is a separate failure mode to track.

### FP-002 — LogicAgent (or SecurityAgent): Rejected requests counted in sliding window flagged as critical

- **Finding**: "`counter.record()` called unconditionally before checking `allowed` — rejected requests are added to the sliding window, violating expected rate limiter behavior."
- **Why it's wrong**: Counting all attempts (including rejected) is a deliberate and common design choice used by Nginx `limit_req`, AWS API Gateway, Cloudflare's own rate limiting, and Redis INCR-based limiters. It prevents retry storms — clients over-limit who keep hammering extend their own backoff. The agent assumed "only allowed requests should be counted" is the universal contract, which it isn't.
- **Correct severity**: not a finding (or suggestion if documenting the tradeoff)
- **Key lesson**: agents misidentify deliberate design choices as bugs when an alternative design also exists. The "false positive is worse than missed issue" rule in the prompt is meant to catch this but didn't.

---

## Systematic Biases Observed

| Agent            | Bias                                                                                                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PerformanceAgent | Escalates any O(n) or O(n²) mention to critical regardless of call frequency or data bounds. Also fails to account for bounded array/collection sizes — treats bounded O(limit) operations as unbounded O(n). |
| LogicAgent       | Flags design choices as bugs when an alternative implementation exists                                                                                                                                        |
| PatternAgent     | (Pre-rubric) Would use critical severity for structural issues — now hardcoded to never use critical                                                                                                          |
| All agents       | Step 2 extraction re-escalated severity without rubric constraints from step 1                                                                                                                                |

---

## Mitigations Implemented

### 1. Per-agent severity rubrics in system prompts

Added to each agent's step 1 system prompt. Key rules:

- **Security critical**: directly exploitable without preconditions only
- **Performance critical**: hot per-request path only; cold paths capped at suggestion
- **Logic critical**: will crash/corrupt under _normal_ usage; contrived inputs → suggestion
- **Pattern critical**: banned entirely; max severity is warning
- All agents: "when uncertain, use the lower severity"

### 2. Severity reminder in extraction prompts (step 2)

Each agent's step 2 prompt now restates a condensed version of the rubric before the model assigns structured severity values. Prevents re-escalation during the extraction pass.

---

## Prompt-Based Calibration Ceiling

Rubric prompts are effective but have a hard ceiling against strong pretrained priors:

- **What rubrics fix well**: missing guidance (agents had _no_ severity criteria before — rubrics filled a vacuum). Score improved 48 → 74 on `testfile1.ts`.
- **What rubrics cannot fix**: deeply ingrained pattern associations like "O(n²) = critical" or "iteration over many items = performance issue". The model can read and acknowledge the exception in its chain-of-thought, then assign the wrong severity anyway in the structured output.
- **Resolution**: model upgrade to Claude (better instruction following on multi-constraint prompts) is the path to eliminating this residual class of false positive. Prompt tuning alone will not close the remaining gap for complexity-related findings.

---

## Guidance for Future Tool Implementation

When adding new tools to agents:

- **Tool output should not drive severity** — tools provide evidence; the agent assigns severity using the rubric. Don't let a tool return a "severity" field that the agent blindly uses.
- **Cold-path tools** (e.g., a static analysis scanner that runs once) — findings from these should default to suggestion unless there is a concrete runtime impact.
- **Context matters more than pattern** — a finding is only valid if it applies in the actual usage context visible in the diff. Tools that fetch file content should be used to _resolve_ uncertainty, not to _add_ findings about code outside the diff.
- **The two-step gap applies to tool results too** — if a tool returns structured data that feeds into the extraction prompt (step 2), ensure the severity rubric is present in that prompt.

---

## Test File Reference

`testfile1.ts` (project root) — a high-quality sliding window rate limiter used as a calibration benchmark. Expected score: 85–100 with 0 criticals. If a run on this file produces criticals, the agents are over-escalating and prompts need re-tuning.
