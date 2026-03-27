import { createWorkersAI } from "workers-ai-provider";
import { routeAgentRequest } from "agents";
import { AIChatAgent, type OnChatMessageOptions } from "@cloudflare/ai-chat";
import {
  streamText,
  convertToModelMessages,
  pruneMessages,
} from "ai";
import { parsePRUrl, getPRAnalysisContext, type PRAnalysisContext } from "../tools/github";

import type { AgentResult, ReviewSummary, PRMetadata } from "../../types/review";

export class ReviewOrchestrator extends AIChatAgent<Env> {
  maxPersistedMessages = 100;

  // ── Helpers ──────────────────────────────────────────────────────────

  private broadcastStatus(type: string, payload: Record<string, unknown>) {
    this.broadcast(JSON.stringify({ type, ...payload }));
  }

  private extractURL(text: string): string | null {
    const match = text.match(/https?:\/\/github\.com\/[^\s]+\/pull\/\d+/);
    return match ? match[0] : null;
  }

  private extractText(options?: OnChatMessageOptions): string {
    const messages = this.messages;
    const last = messages[messages.length - 1];
    if (!last) return "";
    return last.parts
      .filter((p: { type: string }) => p.type === "text")
      .map((p: { type: string; text: string }) => p.text)
      .join("");
  }

  // ── Main review pipeline ─────────────────────────────────────────────

  private async runReview(url: string): Promise<void> {
    const parsed = parsePRUrl(url);
    if (!parsed) {
      this.broadcastStatus("error", { message: "Invalid GitHub PR URL" });
      return;
    }

    const { owner, repo, prNumber } = parsed;

    // 1. Fetch PR data from GitHub
    this.broadcastStatus("stage_change", { stage: "fetching" });

    let context: PRAnalysisContext;
    try {
      context = await getPRAnalysisContext(owner, repo, prNumber);
    } catch (err) {
      this.broadcastStatus("error", {
        message: `Failed to fetch PR: ${err instanceof Error ? err.message : "Unknown error"}`
      });
      return;
    }

    // 2. Broadcast PR metadata to frontend
    const prMetadata: PRMetadata = {
      url,
      title: context.prData.title,
      repo: `${owner}/${repo}`,
      prNumber,
      filesChanged: context.files.length,
      additions: context.files.reduce((sum, f) => sum + f.additions, 0),
      deletions: context.files.reduce((sum, f) => sum + f.deletions, 0),
    };
    this.broadcastStatus("pr_loaded", { prMetadata });

    // 3. Steering pause — wait for user input or timeout
    this.broadcastStatus("stage_change", { stage: "steering" });

    let focusInstruction = "";
    try {
      const steeringEvent = await this.waitForEvent("steering", 10_000);
      focusInstruction = (steeringEvent as { focus?: string })?.focus ?? "";
    } catch {
      // Timeout — proceed with no focus instruction
    }

    // 4. Start parallel agent execution
    this.broadcastStatus("stage_change", { stage: "analyzing" });

    // Broadcast each agent as pending
    for (const agent of ["security", "logic", "performance", "pattern"]) {
      this.broadcastStatus("agent_update", { agent, status: "analyzing" });
    }

    // Run all 4 agents in parallel
    const [security, logic, performance, pattern] = await Promise.allSettled([
      runSecurityAgent(context.diff, context.files, this.env.AI, focusInstruction),
      runLogicAgent(context.diff, context.files, this.env.AI, focusInstruction),
      runPerformanceAgent(context.diff, context.files, this.env.AI, focusInstruction),
      runPatternAgent(context.diff, context.files, this.env.AI, focusInstruction),
    ]);

    // 5. Process results and broadcast each agent completion
    const agentResults: AgentResult[] = [];
    const agentNames = ["security", "logic", "performance", "pattern"] as const;
    const settled = [security, logic, performance, pattern];

    for (let i = 0; i < settled.length; i++) {
      const result = settled[i];
      const agentName = agentNames[i];

      if (result.status === "fulfilled") {
        agentResults.push(result.value);
        this.broadcastStatus("agent_update", {
          agent: agentName,
          status: "complete",
          findings: result.value.findings
        });
      } else {
        this.broadcastStatus("agent_update", {
          agent: agentName,
          status: "failed",
          findings: []
        });
      }
    }

    // 6. Compute summary
    const allFindings = agentResults.flatMap(r => r.findings);
    const summary: ReviewSummary = {
      score: computeScore(allFindings),
      critical: allFindings.filter(f => f.severity === "critical").length,
      warnings: allFindings.filter(f => f.severity === "warning").length,
      suggestions: allFindings.filter(f => f.severity === "suggestion").length,
      topIssues: allFindings
        .filter(f => f.severity === "critical")
        .slice(0, 3)
        .map(f => f.title),
      durationMs: 0,  // set this with Date.now() timing if you want
      costUsd: 0,     // optional — Workers AI billing is complex to compute
    };

    // 7. Broadcast review complete
    this.broadcastStatus("stage_change", { stage: "complete" });
    this.broadcastStatus("review_complete", {
      findings: allFindings,
      summary,
      prMetadata
    });
  }

  // ── Chat handler ─────────────────────────────────────────────────────

  async onChatMessage(_onFinish: unknown, options?: OnChatMessageOptions) {
    const text = this.extractText(options);
    const url = this.extractURL(text);

    // If message contains a PR URL — run the review pipeline
    if (url) {
      // Kick off review async so we can return the stream immediately
      this.ctx.waitUntil(this.runReview(url));

      // Return an immediate acknowledgment via stream
      const workersai = createWorkersAI({ binding: this.env.AI });
      const result = streamText({
        model: workersai("@cf/moonshotai/kimi-k2.5", {
          sessionAffinity: this.sessionAffinity
        }),
        system: `You are Prism. The user submitted a PR URL. 
Respond with exactly one short sentence acknowledging you are starting the review.
Example: "Fetching PR data and deploying review agents now."
Nothing else.`,
        messages: pruneMessages({
          messages: await convertToModelMessages(this.messages),
          toolCalls: "before-last-2-messages"
        }),
        abortSignal: options?.abortSignal
      });
      return result.toUIMessageStreamResponse();
    }

    // Otherwise — handle as follow-up chat with full review context
    const workersai = createWorkersAI({ binding: this.env.AI });
    const result = streamText({
      model: workersai("@cf/moonshotai/kimi-k2.5", {
        sessionAffinity: this.sessionAffinity
      }),
      system: `You are Prism, an AI code review assistant.
Answer questions about the code review findings concisely and precisely.
If asked to generate a fix, provide specific code.
If no review has been run yet, ask the user to paste a GitHub PR URL.`,
      messages: pruneMessages({
        messages: await convertToModelMessages(this.messages),
        toolCalls: "before-last-2-messages"
      }),
      abortSignal: options?.abortSignal
    });
    return result.toUIMessageStreamResponse();
  }
}

// ── Score computation ─────────────────────────────────────────────────

function computeScore(findings: AgentResult["findings"]): number {
  let score = 100;
  for (const finding of findings) {
    if (finding.severity === "critical") score -= 15;
    else if (finding.severity === "warning") score -= 5;
    else if (finding.severity === "suggestion") score -= 1;
  }
  return Math.max(0, score);
}