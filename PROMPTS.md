# PROMPTS.md

AI prompts used during the development of cf_ai_prism, made to Claude Code (Anthropic). Organized chronologically by feature phase.

---

## 1. Project Setup

> "Read CLAUDE.md. This is the architecture reference for the project. Use it as context for everything going forward."

> "Set up a Cloudflare Workers project with Durable Objects for a multi-agent code review system. I need a ReviewOrchestrator that acts as the main chat agent and four sub-agents: SecurityAgent, LogicAgent, PerformanceAgent, and PatternAgent. Each sub-agent should be its own Durable Object."

---

## 2. Prototype Frontend — Component by Component

> "In the stitch directory you will see the target project UI. We will be implementing this UI component by component in the client directory. First look at the designs in the stitch directory and then we can start."

> "Write code for the header nav bar in another component called Nav.tsx."

> "Update the base page (client.tsx) to include the nav."

> "Add a state variable in app.tsx to track which tab between review and dashboard is active. Then pass that state to the nav via props to determine which tab to highlight purple. Those tabs should be buttons with onclick handlers."

> "Shrink the landing page to fit on the page without scrolling. Then make the scroll bar not visible."

> "Move the review and dashboard tab to the center of the nav bar."

> "Make another file, Dashboard.tsx, and implement the dashboard UI. This will be a stand-in prototype until I get real data to display on the dashboard, so use mock data for now."

> "Remove the sidebar from the dashboard page."

> "In app.tsx there is a block of commented out tsx code. This was for the chat functionality of the original template. Integrate that code into the left chat panel of app.tsx for a working chat feature."

> "Only the landing page needs these chat elements. Refactor the code so all agent hooks and chat-related elements are local in LandingPage.tsx rather than passing through props. app.tsx will become a router-like file whose only job will be to switch between landing and dashboard."

---

## 3. Frontend Structural Refactor

> "We are going to do a big structural refactor on the frontend code. App will remain as the tab toggle router between the review page and dashboard. The review page should be split into three components, whose files are in the layout directory. The shared state and agent connection should go in usePrism under hooks. App should load the three components and the top nav bar."

> "Go into components/review/ and implement agentcard.tsx. This is a single card component that displays the status of an agent. The card design can be found from root/stitch/prism_analyzing."

> "Implement the remaining review components: a FindingCard for the completed state, a PRMetadataBar for the processing state, a ReviewHistory sidebar, and a SummaryCard showing the final score."

> "Move all shared types and interfaces into a src/types directory so components stop importing from each other."

---

## 4. Sub-Agent Boilerplate

I manually wrote the LogicAgent boilerplate using the Agents SDK and Workers AI (llama model), then:

> "I've written the LogicAgent boilerplate using the agents SDK and Workers AI binding. Copy this same pattern to SecurityAgent, PerformanceAgent, and PatternAgent. Keep the same structure — extend Agent, add an analyzeCode method, use generateText with stopWhen: stepCountIs(3)."

> "Init the workflows file alongside the orchestrator and add the Durable Object bindings to wrangler.jsonc."

---

## 5. GitHub API & Debugging Tool Calls

I wrote github.ts and integrated it into ReviewOrchestrator. After testing, tool calls weren't returning results:

> "The tool call for fetchFileContent isn't working. Add console logs to the tool execution so I can see what's happening when it fires."

> "The function in github.ts needs to be wrapped as an AI SDK tool with a Zod input schema. Convert it so it can be passed to generateText's tools object."

After further debugging, realized llama didn't support tool calling reliably:

> "Llama doesn't work reliably with tool calling. Switch the agents to use Kimi K2 via Workers AI. Keep the same generateText pattern but swap the model binding."

---

## 6. Parallel Workflow

> "Create the ReviewWorkflow file. It should use Promise.all to concurrently run all four agent Durable Objects at the same time. Each step should have 2 retries with a 10-second delay. Pass the diff to each agent and collect results."

> "Add mock tool implementations to each agent so I can test the full workflow end-to-end before the real tools are built. The mocks should return plausible-looking findings."

After running tests, agents weren't being found by the worker:

> "The agents aren't being exported from the server entrypoint. Export all four agent classes and the workflow from index.ts so the worker can find them."

---

## 7. Getting Agents to Actually Work

After testing the end-to-end flow, outputs weren't displaying on the frontend correctly:

> "Agents call tools correctly now but the output isn't displaying on the frontend. Fix the usePrism hook to correctly parse and render the findings coming back from the orchestrator."

Kimi K2 was producing inconsistent outputs and the models needed further tuning:

> "The agents are returning inconsistent output formats. Try different model configurations — I need something that reliably follows the output schema."

> "Add a SummaryAgent that takes the raw text outputs from all four agents, deduplicates findings, and produces a final structured result using Zod schema validation. Score = max(100 - criticals×20 - warnings×5, 0)."

After confirming the flow worked end-to-end but Kimi was hitting Cloudflare rate limits:

> "Kimi K2 is hitting Cloudflare Workers AI rate limits on every review. Refactor all agents to use the DeepSeek API via @ai-sdk/deepseek instead. Add DEEPSEEK_API_KEY to the environment bindings."

---

## 8. Live Logs — DO-to-DO Communication

> "Implement a live logs feature. As agents run their tools, I want to stream progress updates to the frontend. Use DO-to-DO communication — each sub-agent should POST task updates to the orchestrator via a `/internal/agent-task` route, which then broadcasts them to the frontend over WebSocket."

---

## 9. Human-in-the-Loop Steering

> "Add a human-in-the-loop step between URL detection and workflow dispatch. When a PR URL is detected, show a steering panel instead of immediately starting the review. The user should be able to select which agents run, choose a rigor level (quick/standard/deep), and optionally add a focus area. Send the config as a PRISM_STEERING: prefixed message."

> "The rigor levels should control the step budget for each agent: quick=2 steps (regex tools only), standard=3 steps (conditional sub-calls), deep=5 steps (aggressive sub-calls). Add rigor clauses to each agent's system prompt."

---

## 10. D1 Persistence

> "After a review completes, persist the review and all findings to D1. Create the migration files for a reviews table (id, pr_url, owner, repo, pr_number, pr_title, score, created_at) and a findings table (id, review_id, agent, severity, title, description, file_location, created_at)."

> "Write the orchestrator code that inserts into D1 after the workflow completes."

> "Add a /api/dashboard endpoint that aggregates stats: total reviews, avg score, criticals/warnings/suggestions, review velocity by day (last 7 days), severity split, top recurring issues, and agent contribution breakdown."

> "Update the frontend to pull real data from the D1 API routes instead of mock data. Wire it through usePrism.ts."

---

## 11. UI Polish — Icons and Forcing Zod Schema

> "Some icon placeholders in the dashboard and agent cards are still showing text fallbacks. Create a shared Icons.tsx component and wire up real Material Symbols icons throughout."

> "Force the sub-agents to return a Zod-validated schema instead of free text. The summary agent can't reliably parse unstructured output."

> "Add the SummaryAgent judge pass after deduplication. The judge is a second LLM call that reviews each finding's severity and can only lower it, never raise it. Enforce the never-escalate rule in code using a severityPriority map, not just prompting."

---

## 12. Markdown Formatting, Follow-Up Chat, Token Limits

> "Add markdown formatting to the chat sidebar. Assistant responses should render with proper headings, bold, and code blocks using a streaming markdown renderer."

> "The follow-up chat is hanging when it hits a tool call. Implement a PRISM_FIND: protocol: the frontend embeds the full finding details into a prefixed message. The orchestrator detects this prefix, fetches the full file content from GitHub, builds an enriched system prompt, and streams a fix suggestion directly — bypassing the tool-calling flow."

> "Add maxOutputTokens limits to all streamText and generateText calls so agents don't get cut off mid-response."

> "The finding IDs used for follow-up replies are inconsistent because agents return findings in different orders. Sort findings by severity in the SummaryAgent before assigning sequential IDs."

---

## 13. Full UI Redesign — Neural Paper Design (Stitch Migration)

> "Read stitch_ai_code_reviewer/. This directory contains the updated frontend design. Migrate the project frontend to the new design while keeping all current features. For UI elements that are needed to preserve features but aren't specified by the stitch UI, generate new elements following the design guidelines in DESIGN.md to make UI consistent with the stitch designs."

> "Polish the new UI. The landing page should have a bento feature grid below the URL input. The steering panel should be two columns: PR metadata and focus area on the left, agent toggles and depth selector on the right. The processing view should have four agent cards with a circular progress indicator and a live log terminal below."

> "Add a ReviewHistoryPage that lists all past reviews with score badges and timestamps, accessible from the dashboard."

---

## 14. Agent Tool Implementations

I wrote a plan file outlining the three-tier tool structure (Tier 1: regex static analysis, Tier 2: LLM sub-calls, Tier 3: external APIs) and handed it to Claude Code:

> "Implement the tools for the LogicAgent. I need: a static analysis tool (smartLogicEval) that scans the diff for null risks, async misuse, and unreachable conditions using regex; a DeepSeek sub-call tool (traceDataFlow) that traces a specific variable through code when a null risk is flagged; and a detectRaceConditions tool for when the diff shows shared mutable state across async operations."

> "Implement the tools for the SecurityAgent. I need: a securityScan tool that uses regex to detect hardcoded credentials, injection patterns, and dangerous function calls; a checkAuthPatterns LLM sub-call for auth anti-patterns (JWT issues, session misconfiguration, privilege escalation); and an analyzeDependencies tool that parses package.json/requirements.txt and queries the OSV.dev API for known CVEs."

> "Implement the tools for the PerformanceAgent. I need: a performanceAnalyze tool that classifies hot vs cold paths and detects O(n) loops with bounds context; an analyzeMemoryPatterns LLM sub-call for memory leak patterns (unbounded caches, event listeners without cleanup); and a findBlockingOperations tool for sequential awaits that could be parallelized."

> "Implement the tools for the PatternAgent. I need: a patternAnalyze tool that computes cyclomatic complexity, function length, parameter count, naming conventions (camelCase vs snake_case mixing), and SOLID indicators; a checkArchitecturalPatterns LLM sub-call for god objects, feature envy, and layer boundary violations; and a searchSimilarPatterns tool that queries Vectorize for semantically similar code from past reviews."

> "Integrate all four tool sets into their respective agents. Also add getFinding and suggestFix tools to the ReviewOrchestrator for the follow-up chat flow."

> "Move all inline severity rubrics out of each agent's system prompt and into a shared prompts.ts file as named constants. Also add a SUBCALL_SEVERITY_RUBRIC for the LLM sub-call tools which currently have no rubric."

> "Move the Zod output schemas used by all agents into a shared schemas.ts file."

---

## 15. Vectorize — Cross-PR Pattern Memory

> "Implement Vectorize embeddings for the PatternAgent. After each review completes, embed the changed file patches into Vectorize using @cf/baai/bge-base-en-v1.5 (768-dim, cosine). Store metadata: repo, filePath, prNumber, reviewId. The searchSimilarPatterns tool should query Vectorize with a code chunk and repo name to find similar patterns from past reviews."

> "Also inject past D1 findings for the same repo into the PatternAgent's system prompt before dispatching the workflow. Query the 15 most recent findings for the owner/repo from D1 and format them as a compact list."

---

## 16. Per-Repo UI Filtering

> "The Repository column in the review history table shows PR #N instead of owner/repo. The API already returns owner and repo but usePrism.ts discards them. Thread owner and repo through the full chain: ReviewHistoryItem type → history rows → usePrism mapping → Dashboard and ReviewHistoryPage display."

> "Add a per-repo filter to the history tables. The repo filter pills wrap to multiple lines when there are many repos — replace the pill strip with a compact styled select dropdown integrated into the section header row, only shown when there are multiple repos."

---

## 17. Model Toggle — Claude vs DeepSeek

> "The DeepSeek API is unreliable. Add a toggle on the steering panel to switch between Claude (Anthropic, default) and DeepSeek for all agent calls. The selection should flow through SteeringConfig → ReviewWorkflow → all 4 agents + SummaryAgent + all sub-call tools. Use claude-sonnet-4-6 for main analysis passes and claude-haiku-4-5-20251001 for extraction/sub-call passes. The Claude API key is CLAUDE_API_KEY."

---

## 18. UI Polish & Calibration

> "Add a delete button to each row in the review history table. On hover, show a delete icon. On click (with stopPropagation), call deleteReview(id) which removes it from D1 and from the history list."

> "The left side of the reply arrow icon on the ASK button is getting clipped. Rewrite the SVG from scratch with a viewBox that gives the stroke enough room, and remove overflow-hidden from the parent element."

> "Update the Agent Performance section in the dashboard. Rename the title to 'Agent Contribution', add column headers (Agent / # of findings / % of all findings), and show the raw finding count per agent alongside the percentage bar. Make it look like a table with row dividers."

> "Update the descriptions on the landing page to be more accurate and less like marketing copy. The main feature section should describe what Prism actually does: a last line of defense before merge, four specialized agents running in parallel, interactive follow-up to learn how to improve code quality."

> "Add a success card when there are no findings. Show a green checkmark with 'No errors found — Looks great!' instead of an empty findings list."

> "Create a test file (testfile2.ts) with junior-level code that contains planted bugs for calibration testing. Aim for a Prism score of around 60-70. Include: an IDOR vulnerability (critical), an async forEach with unawaited promises (warning), an off-by-one error (warning), a missing await causing premature response (warning), insecure random ID generation (warning), and missing auth on an admin endpoint (warning)."
