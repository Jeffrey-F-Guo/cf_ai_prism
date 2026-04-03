import { AIChatAgent, type OnChatMessageOptions } from "@cloudflare/ai-chat";
import { streamText, convertToModelMessages, pruneMessages } from "ai";
import { createWorkersAI } from "workers-ai-provider";
import {
  parsePRUrl,
  getPRAnalysisContext,
  type PRAnalysisContext,
  type PRData
} from "../tools/github";
import { makeOrchestratorTools } from "../tools/orchestratorTools";
import type { Finding, ReviewSummary, SteeringConfig } from "../../types/review";

type OrchestratorState = {
  pendingContext: PRAnalysisContext | null;
  prData: PRData | null;
  findings: Finding[];
};

export class ReviewOrchestrator extends AIChatAgent<Env, OrchestratorState> {
  maxPersistedMessages = 100;

  initialState: OrchestratorState = {
    pendingContext: null,
    prData: null,
    findings: []
  };

  private extractText(): string {
    const lastMessage = this.messages[this.messages.length - 1];
    if (!lastMessage) return "";
    return lastMessage.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as { text?: string }).text ?? "")
      .join("");
  }

  private extractURL(text: string): string | null {
    const match = text.match(/https?:\/\/github\.com\/[^\s]+\/pull\/\d+/);
    return match ? match[0] : null;
  }

  private async runReview(url: string): Promise<PRAnalysisContext | null> {
    const parsed = parsePRUrl(url);
    if (!parsed) return null;

    const { owner, repo, prNumber } = parsed;
    try {
      return await getPRAnalysisContext(owner, repo, prNumber, this.env.GITHUB_TOKEN);
    } catch (err) {
      console.error(`Failed to fetch PR ${owner}/${repo}#${prNumber}:`, err);
      return null;
    }
  }

  private async persistReview(prData: PRData, prUrl: string, summary: ReviewSummary, findings: Finding[]) {
    const db = this.env.DB;
    const reviewId = crypto.randomUUID();

    // Upsert repo
    await db.prepare(
      `INSERT INTO repos (owner, repo) VALUES (?, ?) ON CONFLICT(owner, repo) DO NOTHING`
    ).bind(prData.owner, prData.repo).run();

    const repoRow = await db.prepare(
      `SELECT id FROM repos WHERE owner = ? AND repo = ?`
    ).bind(prData.owner, prData.repo).first<{ id: number }>();

    if (!repoRow) throw new Error("Failed to upsert repo");

    // Insert review
    await db.prepare(`
      INSERT INTO reviews (id, repo_id, pr_number, pr_title, pr_url, score, critical, warnings, suggestions, files_changed, contributors, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(reviewId, repoRow.id, prData.prNumber, prData.title, prUrl, summary.score, summary.critical, summary.warnings, summary.suggestions, prData.files.length, JSON.stringify(prData.contributors), Date.now()).run();

    // Batch insert findings
    if (findings.length > 0) {
      await db.batch(findings.map((f) =>
        db.prepare(`
          INSERT INTO findings (id, review_id, agent, severity, title, description, file_location)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(f.id, reviewId, f.agent ?? null, f.severity, f.title, f.description, f.fileLocation ?? null)
      ));
    }

    console.log(`Persisted review ${reviewId} to D1 (${findings.length} findings)`);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/internal/agent-task" && request.method === "POST") {
      const { agent, text } = await request.json() as { agent: string; text: string };
      this.broadcast(JSON.stringify({ type: "agent_task", agent, text }));
      return new Response(null, { status: 204 });
    }
    return super.fetch(request);
  }

  async onChatMessage(onFinish: unknown, options?: OnChatMessageOptions) {
    const text = this.extractText();
    const workersai = createWorkersAI({ binding: this.env.AI });

    // Route: Steering config submitted — start workflow with user's settings
    if (text.startsWith("PRISM_STEERING:")) {
      let config: SteeringConfig;
      try {
        config = JSON.parse(text.slice("PRISM_STEERING:".length));
      } catch {
        return new Response("Invalid steering configuration.");
      }

      const context = this.state?.pendingContext;
      if (!context) {
        return new Response("No pending PR context. Please submit a PR URL first.");
      }

      const { agents, rigor, focus } = config;
      const agentList = agents.join(", ");

      for (const agentId of agents) {
        this.broadcast(JSON.stringify({ type: "agent_update", agent: agentId, status: "queued" }));
      }
      if (agents.length > 0) {
        this.broadcast(JSON.stringify({ type: "agent_update", agent: agents[0], status: "analyzing" }));
      }

      this.broadcast(JSON.stringify({ type: "stage_change", stage: "processing" }));
      this.broadcast(JSON.stringify({ type: "log_entry", message: `Deploying ${agents.length} agent${agents.length !== 1 ? "s" : ""} (${rigor} analysis)...` }));

      try {
        await this.runWorkflow("REVIEW_WORKFLOW", {
          diff: context.diff,
          agents,
          rigor,
          orchestratorId: this.name,
          ...(focus ? { focus } : {})
        }, { id: crypto.randomUUID() });
      } catch (err) {
        console.error("Failed to start workflow:", err);
        return new Response("Failed to start the review workflow. Please check the server logs.");
      }

      (onFinish as (() => void) | undefined)?.();
      return new Response(`Starting review with ${agents.length} agent${agents.length !== 1 ? "s" : ""}: ${agentList}. ${focus ? `Focusing on: ${focus}.` : ""}`);
    }

    // Route: GitHub PR URL — fetch context and present steering prompt
    const url = this.extractURL(text);
    if (url) {
      const context = await this.runReview(url);

      if (!context) {
        const result = streamText({
          model: workersai("@cf/mistralai/mistral-small-3.1-24b-instruct"),
          system: `You are Prism. Tell the user there was an error fetching the PR.`,
          messages: [{ role: "user", content: `Failed to fetch PR from ${url}` }],
          abortSignal: options?.abortSignal
        });
        return result.toUIMessageStreamResponse();
      }

      // Store context + prData in DO state for subsequent turns
      this.setState({ pendingContext: context, prData: context.prData, findings: [] });

      const { prData } = context;
      this.broadcast(JSON.stringify({
        type: "pr_loaded",
        prMetadata: {
          title: prData.title,
          repoName: `${prData.owner}/${prData.repo}`,
          prNumber: prData.prNumber,
          filesChanged: prData.files.length,
          contributors: prData.contributors
        }
      }));
      this.broadcast(JSON.stringify({ type: "log_entry", message: `PR #${prData.prNumber} loaded — ${prData.files.length} files changed` }));
      this.broadcast(JSON.stringify({ type: "stage_change", stage: "steering" }));

      (onFinish as (() => void) | undefined)?.();
      return new Response(`PR loaded: "${prData.title}" (#${prData.prNumber}, ${prData.files.length} files). Configure your review below.`);
    }

    // Route: Default — conversational chat with review context
    const findings = this.state?.findings ?? [];
    const tools = makeOrchestratorTools(findings);

    const result = streamText({
      model: workersai("@cf/mistralai/mistral-small-3.1-24b-instruct"),
      system: findings.length > 0
        ? `You are Prism, an AI code review assistant. A review is complete with ${findings.length} findings (IDs: ${findings.map((f) => f.id).join(", ")}).
Use getFinding to retrieve a specific finding when the user asks about it. Use suggestFix when the user asks how to fix something — it will fetch the file content and return context for you to generate a concrete diff.
Be direct and specific. When suggesting fixes, show before/after code.`
        : `You are Prism, an AI-powered code review system. Ask the user for a GitHub PR URL to start a review.`,
      messages: pruneMessages({
        messages: await convertToModelMessages(this.messages),
        toolCalls: "before-last-2-messages"
      }),
      tools,
      abortSignal: options?.abortSignal
    });
    return result.toUIMessageStreamResponse();
  }

  async onWorkflowProgress(
    _workflowName: string,
    _instanceId: string,
    progress: { agent: string; status: string }
  ) {
    console.log("Workflow progress:", progress);
    const knownAgents = ["logic", "security", "performance", "pattern", "summary"];
    if (!knownAgents.includes(progress.agent)) return;
    this.broadcast(JSON.stringify({
      type: "agent_update",
      agent: progress.agent,
      status: progress.status === "complete" ? "completed" : "analyzing"
    }));
  }

  async onWorkflowComplete(
    _workflowName: string,
    instanceId: string,
    result?: import("../agents/SummaryAgent").SummaryResult
  ) {
    console.log("Workflow complete:", instanceId, result);

    if (result) {
      const prData = this.state?.prData ?? null;

      // Persist to D1
      if (prData) {
        const prUrl = `https://github.com/${prData.owner}/${prData.repo}/pull/${prData.prNumber}`;
        try {
          await this.persistReview(prData, prUrl, result.summary, result.findings);
        } catch (err) {
          console.error("Failed to persist review to D1:", err);
        }
      }

      // Update DO state: clear pending context, store findings for chat tools
      this.setState({ pendingContext: null, prData: null, findings: result.findings });

      this.broadcast(JSON.stringify({ type: "stage_change", stage: "completed" }));
      this.broadcast(JSON.stringify({
        type: "review_complete",
        findings: result.findings,
        summary: result.summary
      }));
    } else {
      this.broadcast(JSON.stringify({ type: "stage_change", stage: "completed" }));
    }
  }

  async onWorkflowError(
    _workflowName: string,
    instanceId: string,
    error: string
  ) {
    console.error("Workflow error:", instanceId, error);
    this.broadcast(JSON.stringify({ type: "stage_change", stage: "completed" }));
    this.broadcast(JSON.stringify({ type: "review_error", error }));
  }
}
