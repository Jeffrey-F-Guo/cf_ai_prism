# Prism — Project Overview

## Purpose

Prism is an AI-powered code review system that analyzes GitHub pull requests using multiple specialized AI agents running in parallel. A user pastes a PR URL, configures what to analyze, and receives a structured review broken down by security, performance, logic, and code patterns — with an interactive chat interface for follow-up questions and fix suggestions.

---

## Core Features

### Parallel AI Agent Review

Four specialized agents analyze the PR diff simultaneously, each focused on a distinct domain:

- **Security** — vulnerabilities, secrets, auth flows, injection risks
- **Performance** — complexity, memory leaks, N+1 queries, inefficient algorithms
- **Logic** — null handling, off-by-one errors, edge cases, unreachable code
- **Pattern** — SOLID violations, anti-patterns, code style consistency

Results are deduplicated and scored by a Summary Agent, which assigns a 0–100 quality score and counts findings by severity (critical, warning, suggestion).

### Human-in-the-Loop Steering

Before the review runs, the user configures it:

- Which agents to include
- Analysis depth (quick / standard / deep)
- Optional free-text focus area (e.g. "focus on the authentication changes")

### Real-Time Streaming

Agent progress streams to the UI over WebSocket as each agent works — showing task-level updates like "Fetching auth/login.ts..." inside each agent card.

### Interactive Post-Review Chat

After the review, the user can ask follow-up questions about any finding. The chat is grounded in the full review context. Each finding card has a reply button that quotes the finding directly into the chat input, so the AI can fetch the affected file and generate a concrete before/after code fix.

### Review History

All reviews are persisted to a database. The user can browse past reviews, reload any review to see its findings, and track score trends over time per repository.

---

## User Flow

1. **Landing** — User sees the Prism title screen with a chat input. Paste a GitHub PR URL to begin.

2. **PR Loaded** — Prism fetches the PR metadata (title, files changed, contributors) and displays it. The UI transitions to the steering screen.

3. **Steering** — User selects which agents to run, analysis depth, and an optional focus area. Clicking "Start Review" dispatches the agents.

4. **Processing** — Four agent cards appear, each showing live status (queued → analyzing → completed) and streaming task updates as the agents work.

5. **Review Complete** — Findings are displayed as cards sorted by severity (critical first). Each card shows the severity badge, agent label, title, description, file location, and optional code diff. A score summary is shown.

6. **Follow-Up Chat** — User can type questions directly ("what's the worst issue here?") or click the reply button on any finding card to quote it in the chat. The AI fetches the relevant file and returns a unified diff suggestion with GitHub-style red/green highlighting.

7. **History** — The right panel shows past reviews for any repo. Clicking a review reloads its findings and metadata into the completed view.

---

## Technical Stack

- **Runtime** — Cloudflare Workers (edge-deployed, no servers)
- **AI Agents** — Cloudflare Durable Objects (one DO per agent, persistent state + WebSocket)
- **Workflow** — Cloudflare Workflows (parallel fan-out with per-step retries)
- **LLM** — Mistral Small 3.1 24B via Workers AI (orchestrator/chat), DeepSeek Chat (analysis agents)
- **Database** — Cloudflare D1 (review + findings persistence)
- **Frontend** — React 19 + Vite + Tailwind CSS
- **Real-Time** — WebSocket via `@cloudflare/ai-chat` SDK
- **Source** — GitHub REST API (PR diffs, file contents)

---

## Key Design Decisions

- Each agent runs in its own Durable Object instance, enabling true parallelism
- The orchestrator maintains full conversation history (up to 100 messages) in DO SQLite for grounded follow-up Q&A
- Structured internal messages (`PRISM_STEERING:`, `PRISM_FIND:`) are sent as user messages over WebSocket, routed by prefix on the server, and filtered from display on the client
- File content for fix suggestions is fetched server-side at response time using the GitHub API with auth — not stored or embedded in the review

---

## Dashboard

The dashboard is a **global summary across all reviews** — there is no per-repo separation.

Per-repo dashboards were considered and ruled out for this scope:

- There is no concept of "linked repos" or user-owned repos — any PR URL from any repo can be reviewed
- Most repos would have only 1–3 reviews, making trend data meaningless
- Per-repo analytics only become valuable with webhook integration (auto-reviewing every PR), which is a different product scope

### Current Dashboard Features

- **KPI row** — total reviews, average score, total warnings, total issues found
- **Severity breakdown** — donut chart showing finding distribution across critical / warning / suggestion / success
- **Top recurring issues** — most frequent finding titles across all reviews
- **Review history** — list of past reviews with PR title, score, and timestamp; clicking any review reloads it into the full findings view

### Proposed Additions

- **Score trend chart** — line graph of review scores over time (all repos combined), showing whether overall code quality is improving or degrading
- **Agent breakdown** — bar chart of findings by agent (security, logic, performance, pattern), showing which domain catches the most issues across all reviews

### Out of Scope

- Per-repo dashboards — deferred until webhook/CI integration provides sufficient per-repo review volume
- Fix rate tracking — requires cross-PR comparison within the same repo
- Per-contributor stats — out of scope for a code review tool
