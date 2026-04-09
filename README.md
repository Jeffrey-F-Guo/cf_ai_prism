# cf_ai_prism

> AI-native code review system powered by a swarm of parallel specialized agents

**[Live Demo](https://cf-ai-prism.jeffrey-guo00703.workers.dev)**

## What It Does

Paste a GitHub PR URL into the chat. Four specialized Durable Object agents — Security, Performance, Logic, and Patterns — spin up in parallel inside a Cloudflare Workflow. Each runs its own ReAct loop: deterministic regex tools run first to ground the analysis, then conditional LLM sub-calls go deeper based on what the first pass found. Results stream back live as each agent finishes. Once complete, a SummaryAgent deduplicates findings across agents and runs a severity judge pass to eliminate false positives. Ask follow-up questions in the chat sidebar — the orchestrator fetches the relevant file from GitHub and suggests a concrete fix.

## Demo

Paste any of these directly into the chat:

- `https://github.com/expressjs/express/pull/6100` — middleware refactor (logic + pattern findings)
- `https://github.com/vercel/next.js/pull/77710` — dependency bump (security scan via OSV.dev)
- Any public GitHub PR URL on a repo your GitHub token can read

## The Four Cloudflare Requirements

### 1. LLM

Two LLMs in use:

- **Workers AI — Mistral Small 3.1 24B** (`@cf/mistralai/mistral-small-3.1-24b-instruct`): powers the `ReviewOrchestrator` (`AIChatAgent`), which handles all user-facing streaming chat, PR URL detection, and finding-context responses via WebSocket
- **DeepSeek Chat** (external API via `@ai-sdk/deepseek`): powers all four sub-agents (SecurityAgent, LogicAgent, PerformanceAgent, PatternAgent) and SummaryAgent — used for structured output extraction with Zod schemas

### 2. Workflow / Coordination

- **Cloudflare Workflows** (`ReviewWorkflow`) orchestrates the fan-out: all four sub-agents are dispatched via `Promise.all` in a single Workflow step with 2× retries and 10s delay per step
- **Durable Objects** (6 total): `ReviewOrchestrator` (extends `AIChatAgent`) holds conversation history and routes all protocol messages; five sub-agent DOs (`SecurityAgent`, `LogicAgent`, `PerformanceAgent`, `PatternAgent`, `SummaryAgent`) each own their own analysis loop
- DO naming is scoped per PR: `${owner}/${repo}/${prNumber}/security`, etc. — concurrent reviews on different PRs never share state

### 3. User Input

- WebSocket chat interface built with React (Vite, served via Workers Static Assets)
- Input flows: PR URL detection → human-in-the-loop steering panel (select agents, set rigor, add focus) → live processing view with per-agent task stream → findings panel with inline "Ask" buttons
- `PRISM_STEERING:` and `PRISM_FIND:` are typed protocol prefixes that route non-display messages server-side without polluting the LLM context

### 4. Memory / State

- **D1** (`prism-reviews`): persists all reviews and findings after completion; powers the dashboard (score history, per-agent finding distribution, severity trends)
- **Durable Object SQLite**: `ReviewOrchestrator` stores up to 100 messages of conversation history per session via the Agents SDK (`maxPersistedMessages: 100`)
- **Vectorize** (optional, bind to enable): PatternAgent embeds function bodies and stores them per-repo; `searchSimilarPatterns` queries for cross-PR recurrence. Gracefully skips if the binding is absent.

## Architecture

```
User (GitHub PR URL)
        │  WebSocket
        ▼
ReviewOrchestrator (AIChatAgent / Durable Object)
  Workers AI — Mistral Small 3.1 24B
  Holds conversation history (D1-backed SQLite)
  Detects PR URLs → steering → dispatches Workflow
        │
        ▼
ReviewWorkflow (Cloudflare Workflow)
  Promise.all fan-out → 4 agent DOs
  Per-step retry (2×, 10s delay)
        │
        ├──▶ SecurityAgent    — securityScan (regex) → checkAuthPatterns (DeepSeek) → OSV.dev CVE lookup
        ├──▶ LogicAgent       — smartLogicEval (regex) → traceDataFlow → detectRaceConditions
        ├──▶ PerformanceAgent — performanceAnalyze (regex) → analyzeMemoryPatterns → findBlockingOperations
        └──▶ PatternAgent     — patternAnalyze (regex) → searchSimilarPatterns (Vectorize) → checkArchitecturalPatterns
                    │
                    ▼
             SummaryAgent
             Dedup pass (DeepSeek structured output)
             → Severity judge pass (can only de-escalate)
             → D1 persist + Vectorize embed
```

| Service | Purpose |
|---|---|
| Workers AI | Mistral Small 3.1 24B — orchestrator streaming chat |
| DeepSeek Chat | All 4 sub-agents + SummaryAgent (structured output) |
| Durable Objects | ReviewOrchestrator + SecurityAgent + LogicAgent + PerformanceAgent + PatternAgent + SummaryAgent |
| Workflows | Durable fan-out with per-step retries |
| D1 | Findings + review history + dashboard analytics |
| Vectorize | Cross-PR pattern memory per repo (optional — enable by binding) |

## What Makes It Non-Trivial

- **Genuine parallel execution** — four Durable Object instances dispatched via `Promise.all` inside a Cloudflare Workflow; each runs a full independent ReAct loop, not a prompt chain
- **Tiered tool architecture** — Tier 1 (deterministic regex) always runs first to ground findings in real line numbers; Tier 2 (DeepSeek sub-calls) only fires conditionally based on Tier 1 results, reducing hallucinations and cost; Tier 3 (OSV.dev CVE API) for dependency scanning
- **Typed structured output** — all findings extracted via `generateText` with `Output.object({ schema })` and Zod schemas; no prose parsing
- **Severity calibration** — shared rubric constants (`prompts.ts`) across all agents; SummaryAgent runs a judge pass that can only lower severity, enforced in code via priority comparison before applying
- **Rigor levels** — Quick (2 steps, Tier 1 only), Standard (3 steps, conditional Tier 2), Deep (5 steps, aggressive Tier 2) controlled from the steering UI and wired through the Workflow to each agent's `stepCountIs(N)` budget

## Running Locally

**Prerequisites:** Node 18+, Wrangler CLI (`npm i -g wrangler`), a GitHub personal access token, a DeepSeek API key

```bash
git clone https://github.com/Jeffrey-F-Guo/cf_ai_prism
cd cf_ai_prism
npm install
```

Create `.dev.vars` in the project root:

```
DEEPSEEK_API_KEY=your-deepseek-api-key
GITHUB_TOKEN=your-github-pat
```

Create the local D1 database:

```bash
npx wrangler d1 execute prism-reviews --local --file=schema.sql
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and paste a GitHub PR URL.

## Running Against the Deployed Link

Open **[https://cf-ai-prism.jeffrey-guo00703.workers.dev](https://cf-ai-prism.jeffrey-guo00703.workers.dev)** and paste any public GitHub PR URL directly into the chat.

The steering panel lets you select which agents run, set rigor (Quick / Standard / Deep), and add a natural-language focus (e.g. "auth changes only"). Results stream back live.

## Project Structure

```
src/
  server/
    agents/         # ReviewOrchestrator, SecurityAgent, LogicAgent,
                    # PerformanceAgent, PatternAgent, SummaryAgent
    workflows/      # ReviewWorkflow (Cloudflare Workflow fan-out)
    tools/          # Per-agent tool implementations (Tier 1/2/3)
                    # prompts.ts — shared severity rubric constants
  client/
    components/     # FindingCard, AgentCard, SteeringPanel, Dashboard
    hooks/          # usePrism — WebSocket state + protocol routing
    layout/         # ReviewPage, CenterPanel, ChatSidebar
```
