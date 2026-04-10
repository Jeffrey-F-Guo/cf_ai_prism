# Prism — AI Code Review System
## Claude Code Architecture Reference

This document is the source of truth for how Prism is structured. Read it before touching any file.

---

## Motivation
Cloudflare job application optional assignment:
> Build an AI-powered application on Cloudflare including: LLM (Workers AI), Workflow/coordination (Workflows or Durable Objects), User input via chat or voice, Memory or state.

---

## Package Imports — Critical

The Cloudflare AI agents ecosystem has multiple packages with confusing names. Use exactly these imports:

```typescript
import { AIChatAgent } from "@cloudflare/ai-chat";        // orchestrator only
import { Agent } from "agents";                             // all sub-agents
import { createWorkersAI } from "workers-ai-provider";     // LLM binding
import { streamText } from "ai";                            // streaming chat (orchestrator)
import { generateText, stepCountIs } from "ai";            // tool-calling agents
```

---

## Architecture Overview

```
User (GitHub PR URL pasted into chat)
        │
        ▼
ReviewOrchestrator (AIChatAgent / Durable Object)
  - Holds full conversation history (maxPersistedMessages: 100)
  - Detects PR URLs → broadcasts steering_prompt → waits for PRISM_STEERING: config
  - On PRISM_FIND: message → injects file content into system prompt → streamText (no tools)
  - On regular chat → streamText with getFinding/suggestFix tools
  - Dispatches ReviewWorkflow via this.runWorkflow()
  - Receives onWorkflowProgress / onWorkflowComplete / onWorkflowError callbacks
  - Persists completed review + findings to D1
        │
        ▼
ReviewWorkflow (Cloudflare Workflow)
  - Fan-out: Promise.all([logic, security, performance, pattern]) — filtered by steering config
  - Each step retries 2× with 10s delay
  - Calls agent.analyzeCode(diff) on each DO instance
  - Broadcasts results via orchestrator.broadcast()
        │
        ├──▶ SecurityAgent (Agent / DO)
        ├──▶ PerformanceAgent (Agent / DO)
        ├──▶ LogicAgent (Agent / DO)
        └──▶ PatternAgent (Agent / DO)
              │
              └──▶ SummaryAgent — deduplicates findings, assigns 0–100 score
```

---

## Cloudflare Services Used

| Service | Purpose | Status |
|---|---|---|
| **Workers AI** | LLM inference — Mistral Small 3.1 24B (orchestrator/PRISM_FIND), Kimi K2.5 (agents + SummaryAgent) | ✅ Bound |
| **Durable Objects** | ReviewOrchestrator + all 4 sub-agents | ✅ Bound |
| **Workflows** | Durable fan-out with per-step retries | ✅ Bound |
| **D1** | Persistent reviews + findings tables | ✅ Bound |
| **R2** | Raw PR content storage | ❌ Not bound |
| **Vectorize** | Cross-review pattern memory | ❌ Not bound |
| **AI Gateway** | LLM observability | ❌ Not configured |

---

## Internal Message Protocols

The frontend communicates non-display messages to the orchestrator using prefixed strings over WebSocket. These are routed server-side by prefix before reaching the LLM.

### `PRISM_STEERING:`
Sent after the user configures the review on the steering screen. Contains a JSON-encoded `SteeringConfig`.
```
PRISM_STEERING:{"agents":["security","logic"],"rigor":"standard","focus":"auth changes"}
```
- Orchestrator extracts this, dispatches the workflow with the config, then broadcasts `processing` stage.
- **Filtered from display** on the client — never shown in chat history.

### `PRISM_FIND:`
Sent when the user clicks the "Ask" button on a finding card. Embeds full finding context + file info so the orchestrator doesn't need to look anything up from state.
```
PRISM_FIND:{"id":"3","title":"SQL Injection","severity":"critical","description":"...","fileLocation":"src/auth.ts:42","owner":"org","repo":"repo"}
How do I fix this?
```
- Orchestrator fetches the file from GitHub API, builds an enriched system prompt, and runs `streamText` with `maxOutputTokens: 4096` and **no tools** (avoids tool-call hang).
- **Transformed for display**: shown as `Regarding finding #N "title":\nquestion`

---

## ReviewOrchestrator Flow

`ReviewOrchestrator` extends `AIChatAgent`. It is the only agent the frontend talks to directly.

**Message routing (in order):**
1. `PRISM_STEERING:` prefix → extract config, dispatch workflow, broadcast stage
2. `PRISM_FIND:` prefix → fetch file, build enriched prompt, stream fix suggestion
3. URL matching `github.com/.*/pull/\d+` → fetch PR metadata, broadcast `steering_prompt`
4. Everything else → regular `streamText` with `getFinding` / `suggestFix` tools, `maxOutputTokens: 4096`

**After workflow completes:**
- `prData` is kept in DO state (not nulled) so `suggestFix` tool can resolve `contentsUrl` for non-quoted tool-call flows
- Review + findings written to D1

---

## Orchestrator Tools (`src/server/tools/orchestratorTools.ts`)

`makeOrchestratorTools(findings, token?, prData?)` returns two tools:

- **`getFinding(id)`** — retrieves a specific finding from the in-memory findings array by ID
- **`suggestFix(findingId, contentsUrl?)`** — fetches file content via GitHub API (auto-resolves `contentsUrl` from `prData.files` if not provided), returns the raw file for the model to generate a unified diff fix

These are only used for the regular chat route (not `PRISM_FIND:`).

---

## Sub-Agent Implementation Pattern

All four sub-agents follow the same structure. **Do not deviate from this pattern.**

```typescript
import { Agent } from "agents";
import { createWorkersAI } from "workers-ai-provider";
import { generateText, stepCountIs } from "ai";
import { fetchFileContentTool } from "../tools/github";

export class XxxAgent extends Agent<Env> {
  async analyzeCode(diff: string): Promise<string> {
    const workersai = createWorkersAI({ binding: this.env.AI });

    const result = await generateText({
      model: workersai("@cf/mistralai/mistral-small-3.1-24b-instruct"),
      system: `...tightly scoped domain prompt...`,
      prompt: `Analyze this code diff:\n\n${diff}`,
      stopWhen: stepCountIs(3),
      tools: { fetchFileContent: fetchFileContentTool },
    });

    return result.text || "Analysis completed but no text was generated";
  }
}
```

**Key rules:**
- Agents return plain `string` from `result.text`, not structured objects
- Each agent's system prompt must explicitly focus on its domain
- Tools must use the AI SDK `tool()` helper with a Zod schema
- `stopWhen: stepCountIs(3)` — do NOT use `maxRetries` or `maxSteps`
- Sub-agents post task-stream updates to the orchestrator via DO-to-DO HTTP fetch to `/internal/agent-task`

---

## Agent Domain Boundaries

| Agent | Analyzes | Tools |
|---|---|---|
| **SecurityAgent** | Vulnerabilities, secrets, auth flows, injection risks | `fetchFileContent` |
| **PerformanceAgent** | Complexity, memory leaks, N+1 queries, inefficient algorithms | `fetchFileContent` |
| **LogicAgent** | Logic errors, null handling, off-by-one, edge cases | `fetchFileContent`, `smartLogicEval` |
| **PatternAgent** | Code style consistency, SOLID principles, anti-patterns | `fetchFileContent` |

> Domain-specific tools (scanForSecrets, estimateComplexity, etc.) are planned but not implemented. Agents currently use only `fetchFileContent` (plus `smartLogicEval` for LogicAgent).

---

## D1 Schema

Two tables, written after `review_complete`:

```sql
reviews (id, pr_url, owner, repo, pr_number, pr_title, score, grade, created_at)
findings (id, review_id, agent, severity, title, description, file_location, created_at)
```

Dashboard API (`/api/dashboard`) aggregates across all reviews — no per-repo separation.

---

## wrangler.jsonc Bindings

```jsonc
{
  "durable_objects": {
    "bindings": [
      { "name": "ReviewOrchestrator", "class_name": "ReviewOrchestrator" },
      { "name": "SecurityAgent",      "class_name": "SecurityAgent" },
      { "name": "LogicAgent",         "class_name": "LogicAgent" },
      { "name": "PerformanceAgent",   "class_name": "PerformanceAgent" },
      { "name": "PatternAgent",       "class_name": "PatternAgent" }
    ]
  },
  "workflows": [
    { "name": "review-workflow", "binding": "REVIEW_WORKFLOW", "class_name": "ReviewWorkflow" }
  ],
  "d1_databases": [
    { "binding": "DB", "database_name": "prism-db", "database_id": "..." }
  ],
  "ai": { "binding": "AI" }
}
```

---

## DO Naming Convention

```typescript
// Orchestrator — one per user session
this.env.ReviewOrchestrator.idFromName(sessionId)

// Sub-agents — one per PR per agent type
this.env.SecurityAgent.idFromName(`${owner}/${repo}/${prNumber}/security`)
this.env.PerformanceAgent.idFromName(`${owner}/${repo}/${prNumber}/performance`)
this.env.LogicAgent.idFromName(`${owner}/${repo}/${prNumber}/logic`)
this.env.PatternAgent.idFromName(`${owner}/${repo}/${prNumber}/pattern`)
```

---

## Frontend Layout (Neural Paper Design — `frontend_migration` branch)

The frontend uses a light "Neural Paper" design system (see `DESIGN.md`).

**App-level state:** `usePrism()` is called in `App.tsx` (not inside `ReviewPage`), so the WebSocket stays connected across Dashboard ↔ Review tab switches.

### Stages & Layout

| Stage | Layout |
|---|---|
| `landing` | Full-width editorial hero with centered URL input; bento feature grid below |
| `steering` | 2-col: PR metadata + focus textarea (left), agent toggles + depth selector + CTA (right) |
| `processing` | 4-col agent cards + dark activity log terminal below |
| `completed` | `flex-row`: scrollable findings center (`flex-1`) + sticky right chat panel (400px) |

**Dashboard** (`/` → "Dashboard" tab): separate full-page view with KPI cards, velocity chart, finding distribution donut, agent performance bars, top recurring issues, review history table (clickable rows load a review and switch to Review tab).

### Key Components

| File | Role |
|---|---|
| `app.tsx` | Mounts `usePrism`, routes between Dashboard / ReviewPage, renders Curator's Tray |
| `layout/ReviewPage.tsx` | Accepts `prism: PrismState` prop, renders CenterPanel + conditional ChatSidebar |
| `layout/CenterPanel.tsx` | All 4 stage views; landing URL input wired to `prism.send()` |
| `layout/ChatSidebar.tsx` | Right panel "Prism Assistant" — only rendered in `completed` stage |
| `components/review/AgentCard.tsx` | Light-theme agent status card with Material Symbols icons |
| `components/review/FindingCard.tsx` | Left-border severity accent, "Ask" hover button calls `onReply` |
| `components/review/SteeringPanel.tsx` | Full 2-col editorial steering UI |
| `components/dashboard/Dashboard.tsx` | Full dashboard; accepts `reviewHistory` + `onSelectReview` props |
| `hooks/usePrism.ts` | All WebSocket state, chat, steering, quoted-finding reply logic |

### Chat Message Display Rules

- `PRISM_STEERING:` messages → **hidden** (never shown)
- `PRISM_FIND:` messages → **transformed** to `Regarding finding #N "title":\nquestion`
- Assistant messages → rendered with `streamdown` (streaming markdown)
- Code blocks → `GithubDiff` component if diff-shaped (red/green lines, line numbers)

### Quoted Finding (Reply to Finding)

Clicking "Ask" on a finding card:
1. Sets `quotedFinding` state in `usePrism`
2. Opens chat sidebar (if collapsed), focuses textarea
3. Shows a quoted preview strip above the input
4. On send: prepends `PRISM_FIND:{...}\n` to the message text
5. Orchestrator receives full finding + file context embedded in the message

---

## Current Build Status

- [x] GitHub API integration (`parsePRUrl`, `getPRAnalysisContext`)
- [x] ReviewOrchestrator (AIChatAgent, URL detection, workflow dispatch, streaming)
- [x] ReviewWorkflow (parallel fan-out with retries, steering config respected)
- [x] All 4 sub-agents (SecurityAgent, LogicAgent, PerformanceAgent, PatternAgent)
- [x] SummaryAgent (dedup + scoring via structured output)
- [x] Human-in-the-loop steering (`PRISM_STEERING:` protocol)
- [x] Interactive follow-up chat (`getFinding` + `suggestFix` orchestrator tools)
- [x] Quoted-finding reply (`PRISM_FIND:` protocol — bypasses tool calling, injects context directly)
- [x] Markdown + GitHub-style diff rendering (streamdown + custom GithubDiff component)
- [x] D1 persistence (reviews + findings tables, written after review_complete)
- [x] Dashboard API (`/api/dashboard`) + frontend charts
- [x] Review history from D1 (loaded into `usePrism.reviewHistory`)
- [x] Neural Paper frontend redesign (`frontend_migration` branch)
- [x] Tool implementations beyond placeholders (agent tools return hardcoded strings)
- [x] Vectorize embeddings (PatternAgent cross-review memory)

---

## Known Gotchas

- **`maxOutputTokens: 4096`** (not `maxTokens`) — AI SDK v6 naming. Required on all `streamText` calls to prevent model truncation.
- **`hast-util-to-jsx-runtime`** passes code block `children` as `string[]`, not `string`. Normalize before string operations: `Array.isArray(raw) ? raw.map(c => typeof c === 'string' ? c : '').join('') : raw`.
- **`vite build && wrangler deploy`** must always run together. Wrangler skips CDN upload if the asset hash hasn't changed from a prior stale build.
- **`prData` must not be nulled** after workflow completes — `suggestFix` tool needs it to resolve `contentsUrl` from PR file list.
- **DO-to-DO fetch for task streaming** — sub-agents POST to orchestrator's `/internal/agent-task` route. The URL is constructed from the orchestrator's own `id.toString()` and the CF account routing pattern.
