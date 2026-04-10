# cf_ai_prism

AI-powered code review system that runs four specialized agents in parallel against a GitHub PR diff.

## Overview

Paste a GitHub PR URL into the chat. A steering panel lets you choose which agents run, how deep to analyze (quick / standard / deep), and optionally focus the review on a specific area. A Cloudflare Workflow then fans out to four Durable Object agents simultaneously — Security, Logic, Performance, and Patterns — each running its own tool-calling loop. Results stream back as each agent finishes. A SummaryAgent deduplicates findings across agents and runs a severity judge pass before presenting the final list. From there you can ask follow-up questions about any finding in a chat sidebar.

## How It Works

1. **URL detection** — `ReviewOrchestrator` (an `AIChatAgent` Durable Object) detects a GitHub PR URL in the chat and fetches PR metadata via the GitHub API
2. **Steering** — the frontend sends a `PRISM_STEERING:` message with the selected agents, rigor level, and optional focus text
3. **Workflow dispatch** — the orchestrator dispatches `ReviewWorkflow`, which calls all four agent DOs in parallel via `Promise.all`, each step retrying up to 2× with a 10s delay
4. **Agent analysis** — each agent runs a ReAct loop (via `generateText` with `stopWhen: stepCountIs(N)`) calling its tools and producing findings as structured text
5. **Summary** — `SummaryAgent` deduplicates findings (structured output with Zod schema), then runs a judge pass that can only lower severity, never raise it
6. **Persistence** — completed review and findings are written to D1; the orchestrator embeds findings into Vectorize if the binding is present
7. **Chat** — the `PRISM_FIND:` protocol lets the frontend embed a finding's full context into a follow-up message; the orchestrator fetches the relevant file from GitHub and streams a suggested fix

## Agents

Each agent uses Claude Sonnet 4.6 (default) or DeepSeek Chat (selectable via the steering panel) and calls tools in a loop before producing findings.

| Agent | Domain | Tools | Notes |
|---|---|---|---|
| **SecurityAgent** | Vulnerabilities, secrets, auth | `securityScan` (regex, always), `checkAuthPatterns` (LLM sub-call, if auth/crypto present), `analyzeDependencies` (OSV.dev CVE lookup, if dependency files changed), `fetchFileContent` | `analyzeDependencies` parses npm/PyPI/go.mod versions and queries OSV.dev |
| **LogicAgent** | Null safety, async misuse, edge cases | `smartLogicEval` (regex, always), `traceDataFlow` (LLM sub-call, if null risk flagged), `detectRaceConditions` (LLM sub-call, if shared mutable state across async ops), `fetchFileContent` | `detectRaceConditions` only triggers on diffed shared state, not plain increments |
| **PerformanceAgent** | Complexity, N+1s, memory leaks | `performanceAnalyze` (regex, always), `analyzeMemoryPatterns` (LLM sub-call, if caches/listeners present), `findBlockingOperations` (LLM sub-call, if sequential awaits), `fetchFileContent` | Bounded O(n) collections are at most `suggestion`, never `critical` |
| **PatternAgent** | SOLID, code structure, duplication | `patternAnalyze` (regex, always), `checkArchitecturalPatterns` (LLM sub-call, if complexity >10 or length >40 lines), `searchSimilarPatterns` (Vectorize embedding search, if bound), `fetchFileContent` | Pattern findings never escalate to `critical` |

**Rigor levels** control the step budget passed to each agent:

| Level | Steps | Behavior |
|---|---|---|
| quick | 2 | Tier 1 regex tools only |
| standard | 3 | Tier 1 + conditional Tier 2 sub-calls |
| deep | 5 | Tier 2 tools called aggressively |

**Severity scoring**: `max(100 - criticals×20 - warnings×5, 0)`. Suggestions don't affect the score.

## Architecture

```
User (GitHub PR URL pasted into chat)
        │  WebSocket
        ▼
ReviewOrchestrator  (AIChatAgent / Durable Object)
  Mistral Small 3.1 24B via Workers AI
  Holds conversation history (D1-backed SQLite, up to 100 messages)
  Handles PRISM_STEERING: and PRISM_FIND: protocol prefixes
        │
        ▼
ReviewWorkflow  (Cloudflare Workflow)
  Promise.all → 4 agents in parallel
  Per-step retry: 2×, 10s delay
        │
        ├──▶ SecurityAgent     Claude Sonnet 4.6 / DeepSeek  securityScan → checkAuthPatterns → analyzeDependencies
        ├──▶ LogicAgent        Claude Sonnet 4.6 / DeepSeek  smartLogicEval → traceDataFlow → detectRaceConditions
        ├──▶ PerformanceAgent  Claude Sonnet 4.6 / DeepSeek  performanceAnalyze → analyzeMemoryPatterns → findBlockingOperations
        └──▶ PatternAgent      Claude Sonnet 4.6 / DeepSeek  patternAnalyze → checkArchitecturalPatterns → searchSimilarPatterns
                    │
                    ▼
             SummaryAgent  Claude Haiku 4.5 / DeepSeek
             Dedup pass (structured output, Zod schema)
             → Judge pass (severity can only decrease)
             → D1 persist + Vectorize embed (if bound)
```

| Service | Purpose |
|---|---|
| Workers AI | Mistral Small 3.1 24B for the orchestrator (chat, PRISM_FIND responses) |
| Claude API (Anthropic) | All four sub-agents and SummaryAgent — default model (`CLAUDE_API_KEY`) |
| DeepSeek Chat | Alternative model for all agents — selectable per review (`DEEPSEEK_API_KEY`) |
| Durable Objects | ReviewOrchestrator, SecurityAgent, LogicAgent, PerformanceAgent, PatternAgent, SummaryAgent |
| Cloudflare Workflows | Durable fan-out with per-step retries |
| D1 | Review and findings persistence, dashboard aggregation |
| Vectorize | Cross-PR pattern embeddings for PatternAgent (optional — no-ops if not configured) |

## Running Locally

**Prerequisites:** Node 18+, Wrangler CLI, a GitHub personal access token, a Claude API key (Anthropic)

```bash
git clone https://github.com/Jeffrey-F-Guo/cf_ai_prism
cd cf_ai_prism
npm install
```

Create `.dev.vars`:

```
CLAUDE_API_KEY=sk-ant-...
DEEPSEEK_API_KEY=sk-...
GITHUB_TOKEN=ghp_...
```

`CLAUDE_API_KEY` is required (default model). `DEEPSEEK_API_KEY` is optional — only needed if you select DeepSeek on the steering panel.

Initialize the local D1 database:

```bash
npx wrangler d1 execute prism-reviews --local --file=schema.sql
```

**(Optional) Set up Vectorize for cross-PR pattern memory:**

```bash
npx wrangler vectorize create prism-patterns --dimensions=768 --metric=cosine
```

Then add the binding to `wrangler.jsonc` (see `vectorize` section — it's already defined, just needs the index to exist).

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Live Demo

[https://cf-ai-prism.jeffrey-guo00703.workers.dev](https://cf-ai-prism.jeffrey-guo00703.workers.dev)

Paste any public GitHub PR URL. The steering panel appears after the PR is loaded — select agents, choose a rigor level, optionally add a focus description, then start the review.

## API

| Method | Route | Description |
|---|---|---|
| GET | `/api/reviews` | Recent reviews (`?limit=N`, default 20, max 100) |
| GET | `/api/reviews/:id` | Review metadata and finding counts |
| GET | `/api/reviews/:id/findings` | Full findings list for a review |
| DELETE | `/api/reviews/:id` | Delete a review and its findings |
| GET | `/api/dashboard` | Aggregated stats: totals, 7-day velocity, severity split, top recurring issues |

## Project Structure

```
src/
  server/
    agents/           # ReviewOrchestrator, SecurityAgent, LogicAgent,
                      # PerformanceAgent, PatternAgent, SummaryAgent
    workflows/        # ReviewWorkflow — Cloudflare Workflow fan-out
    tools/            # Per-agent tool implementations
      prompts.ts      # Shared severity rubric constants (single source of truth)
      SecurityTools.ts
      LogicTools.ts
      PerformanceTools.ts
      PatternTools.ts
      orchestratorTools.ts  # getFinding, suggestFix
  client/
    hooks/
      usePrism.ts     # WebSocket state, protocol routing, chat
    layout/           # ReviewPage, CenterPanel, ChatSidebar, ReviewHistoryPage
    components/
      review/         # FindingCard, AgentCard, SteeringPanel
      dashboard/      # Dashboard charts and review history table
```
