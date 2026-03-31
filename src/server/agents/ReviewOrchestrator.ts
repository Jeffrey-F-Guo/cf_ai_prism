import { AIChatAgent, type OnChatMessageOptions } from "@cloudflare/ai-chat";
import { streamText, convertToModelMessages, pruneMessages } from "ai";
import { createWorkersAI } from "workers-ai-provider";
import {
  parsePRUrl,
  getPRAnalysisContext,
  type PRAnalysisContext
} from "../tools/github";
import { makeOrchestratorTools } from "../tools/orchestratorTools";
import type { Finding, SteeringConfig } from "../../types/review";

type OrchestratorState = {
  pendingContext: PRAnalysisContext | null;
  findings: Finding[];
};

export class ReviewOrchestrator extends AIChatAgent<Env, OrchestratorState> {
  maxPersistedMessages = 100;

  initialState: OrchestratorState = {
    pendingContext: null,
    findings: []
  };

  // get the text from the most recent message
  private extractText(): string {
    const lastMessage = this.messages[this.messages.length - 1];
    if (!lastMessage) return "";
    return lastMessage.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as { text?: string }).text ?? "")
      .join("");
  }

  // get url from text
  private extractURL(text: string): string | null {
    const match = text.match(/https?:\/\/github\.com\/[^\s]+\/pull\/\d+/);
    return match ? match[0] : null;
  }

  // init the review pipeline
  private async runReview(url: string): Promise<PRAnalysisContext | null> {
    const parsed = parsePRUrl(url);
    if (!parsed) return null;

    const { owner, repo, prNumber } = parsed;
    try {
      return await getPRAnalysisContext(owner, repo, prNumber);
    } catch (err) {
      console.error(`Failed to fetch PR ${owner}/${repo}#${prNumber}:`, err);
      return null;
    }
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

      // Broadcast agent queued status for selected agents only
      for (const agentId of agents) {
        this.broadcast(JSON.stringify({ type: "agent_update", agent: agentId, status: "queued" }));
      }
      // Mark first agent as analyzing
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
          ...(focus ? { focus } : {})
        });
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

      // Store context in DO state for the next turn
      this.setState({ pendingContext: context, findings: [] });

      const { prData } = context;
      this.broadcast(JSON.stringify({
        type: "pr_loaded",
        prMetadata: {
          title: prData.title,
          repoName: `${prData.owner}/${prData.repo}`,
          prNumber: prData.prNumber,
          filesChanged: prData.files.length,
          contributors: 1
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

  // Workflow callbacks
  async onWorkflowProgress(
    _workflowName: string,
    _instanceId: string,
    progress: { agent: string; status: string }
  ) {
    console.log("Workflow progress:", progress);
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
      // Persist findings in DO state for post-review chat tools
      this.setState({ pendingContext: null, findings: result.findings });

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
