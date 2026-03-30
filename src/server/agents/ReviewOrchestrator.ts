import { AIChatAgent, type OnChatMessageOptions } from "@cloudflare/ai-chat";
import { streamText, convertToModelMessages, pruneMessages } from "ai";
import { createWorkersAI } from "workers-ai-provider";
import {
  parsePRUrl,
  getPRAnalysisContext,
  type PRAnalysisContext
} from "../tools/github";

export class ReviewOrchestrator extends AIChatAgent<Env> {
  maxPersistedMessages = 100;

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
    if (!parsed) {
      return null;
    }

    const { owner, repo, prNumber } = parsed;

    try {
      return await getPRAnalysisContext(owner, repo, prNumber);
    } catch (err) {
      console.error(`Failed to fetch PR ${owner}/${repo}#${prNumber}:`, err);
      return null;
    }
  }

  async onChatMessage(_onFinish: unknown, options?: OnChatMessageOptions) {
    const text = this.extractText();
    const workersai = createWorkersAI({ binding: this.env.AI });
    const url = this.extractURL(text);

    // Route: User provided a GitHub PR URL - start review workflow
    if (url) {
      // Fetch PR context
      const context = await this.runReview(url);

      // If PR fetch failed, tell the user
      if (!context) {
        const result = streamText({
          model: workersai("@cf/mistralai/mistral-small-3.1-24b-instruct"),
          system: `You are Prism. Tell the user there was an error fetching the PR.`,
          messages: [
            { role: "user", content: `Failed to fetch PR from ${url}` }
          ],
          abortSignal: options?.abortSignal
        });
        return result.toUIMessageStreamResponse();
      }

      // Start processing stage
      this.broadcast(
        JSON.stringify({ type: "stage_change", stage: "processing" })
      );
      this.broadcast(
        JSON.stringify({
          type: "agent_update",
          agent: "logic",
          status: "analyzing"
        })
      );
      this.broadcast(
        JSON.stringify({
          type: "agent_update",
          agent: "security",
          status: "queued"
        })
      );
      this.broadcast(
        JSON.stringify({
          type: "agent_update",
          agent: "performance",
          status: "queued"
        })
      );
      this.broadcast(
        JSON.stringify({
          type: "agent_update",
          agent: "pattern",
          status: "queued"
        })
      );

      // Start workflow in background
      let workflowStarted = false;
      try {
        await this.runWorkflow("REVIEW_WORKFLOW", {
          diff: context.diff
        });
        workflowStarted = true;
        console.log("Workflow started successfully");
      } catch (err) {
        console.error("Failed to start workflow:", err);
      }

      // // If workflow failed to start, run agents directly as fallback
      // if (!workflowStarted) {
      //   // TODO: Run agents directly as fallback when workflows unavailable
      //   this.broadcast(
      //     JSON.stringify({
      //       type: "review_error",
      //       error: "Background processing unavailable. Please try again."
      //     })
      //   );
      // }

      // Immediately return a hardcoded acknowledgement — no LLM call needed here
      const encoder = new TextEncoder();
      const ackStream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('0:"Acknowledged code review request. Deploying agents."\n'));
          controller.enqueue(encoder.encode('e:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0},"isContinued":false}\n'));
          controller.enqueue(encoder.encode('d:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n'));
          controller.close();
        }
      });
      return new Response(ackStream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Vercel-AI-Data-Stream": "v1"
        }
      });
    }

    // Route: Default - conversational chat (no URL provided)
    const result = streamText({
      model: workersai("@cf/mistralai/mistral-small-3.1-24b-instruct"),
      system: `You are Prism, an AI-powered code review system. 
Ask the user for a GitHub PR URL to start a review.`,
      messages: pruneMessages({
        messages: await convertToModelMessages(this.messages),
        toolCalls: "before-last-2-messages"
      }),
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
    this.broadcast(
      JSON.stringify({
        type: "agent_update",
        agent: progress.agent,
        status: progress.status === "complete" ? "completed" : "analyzing"
      })
    );
  }

  async onWorkflowComplete(
    _workflowName: string,
    instanceId: string,
    result?: {
      logic: string;
      security: string;
      performance: string;
      pattern: string;
    }
  ) {
    console.log("Workflow complete:", instanceId, result);
    this.broadcast(
      JSON.stringify({
        type: "agent_update",
        agent: "logic",
        status: "completed"
      })
    );
    this.broadcast(
      JSON.stringify({
        type: "agent_update",
        agent: "security",
        status: "completed"
      })
    );
    this.broadcast(
      JSON.stringify({
        type: "agent_update",
        agent: "performance",
        status: "completed"
      })
    );
    this.broadcast(
      JSON.stringify({
        type: "agent_update",
        agent: "pattern",
        status: "completed"
      })
    );
    this.broadcast(
      JSON.stringify({ type: "stage_change", stage: "completed" })
    );

    if (result) {
      this.broadcast(
        JSON.stringify({
          type: "review_complete",
          result
        })
      );
    }
  }

  async onWorkflowError(
    _workflowName: string,
    instanceId: string,
    error: string
  ) {
    console.error("Workflow error:", instanceId, error);
    this.broadcast(
      JSON.stringify({ type: "stage_change", stage: "completed" })
    );
    this.broadcast(
      JSON.stringify({
        type: "review_error",
        error
      })
    );
  }
}
