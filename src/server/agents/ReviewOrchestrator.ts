import { AIChatAgent, type OnChatMessageOptions } from "@cloudflare/ai-chat";
import { streamText, convertToModelMessages, pruneMessages } from "ai";
import { createWorkersAI } from "workers-ai-provider";
import {
  parsePRUrl,
  getPRAnalysisContext,
  type PRAnalysisContext
} from "../tools/github";
import { LogicAgent } from "./LogicAgent";

export class ReviewOrchestrator extends AIChatAgent<Env> {
  maxPersistedMessages = 100;

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

    // TEST MODE: Call LogicAgent directly
    if (text.includes("test logic")) {
      const testDiff = `--- a/src/auth/session.ts
+++ b/src/auth/session.ts
@@ -10,7 +10,7 @@ export function createSession(userId: string) {
-  const token = Math.random().toString(36);
+  const token = crypto.randomUUID();
   return { token, userId };
 }`;

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

      // Simulate agent thinking
      // await new Promise((resolve) => setTimeout(resolve, 5000));

      // Call LogicAgent DO
      const env = this.env as Env & {
        LogicAgent: DurableObjectNamespace<LogicAgent>;
      };
      const id = env.LogicAgent.newUniqueId();
      const logicAgent = env.LogicAgent.get(id);
      const result = await logicAgent.analyzeCode(testDiff);

      this.broadcast(
        JSON.stringify({
          type: "agent_update",
          agent: "logic",
          status: "complete",
          findings: []
        })
      );
      this.broadcast(
        JSON.stringify({ type: "stage_change", stage: "completed" })
      );

      return new Response(`Logic Agent Result:\n\n${result}`, {
        headers: { "Content-Type": "text/plain" }
      });
    }

    // TEST MODE: testing without llm
    if (text.includes("test hello")) {
      return new Response(
        "Hello! I'm Prism. Type 'test logic' to run the logic agent.",
        {
          headers: { "Content-Type": "text/plain" }
        }
      );
    }

    const TEST_MODE = false;
    if (TEST_MODE) {
      const url = this.extractURL(text);

      let response =
        "Hello! I'm Prism. Paste a GitHub PR URL to start a review.";

      if (url) {
        response = `Got URL: ${url}\n\nFetching PR data...`;
        const context = await this.runReview(url);

        if (context) {
          response = `PR: ${context.prData.title}
Repo: ${context.prData.owner}/${context.prData.repo}
Files: ${context.files.length}`;
        } else {
          response = `Could not fetch PR from ${url}`;
        }
      }

      return new Response(response, {
        headers: { "Content-Type": "text/plain" }
      });
    }

    const workersai = createWorkersAI({ binding: this.env.AI });
    const url = this.extractURL(text);

    // Route: User provided a GitHub PR URL - fetch and summarize the PR
    if (url) {
      const context = await this.runReview(url);

      // If PR fetch failed, tell the user
      if (!context) {
        const result = streamText({
          model: workersai("@cf/moonshotai/kimi-k2.5"),
          system: `You are Prism. Tell the user there was an error fetching the PR.`,
          messages: [
            { role: "user", content: `Failed to fetch PR from ${url}` }
          ],
          abortSignal: options?.abortSignal
        });
        return result.toUIMessageStreamResponse();
      }

      // PR fetched successfully - generate summary
      const summary = `PR: ${context.prData.title}
Repo: ${context.prData.owner}/${context.prData.repo}
Files changed: ${context.files.length}
Additions: +${context.files.reduce((sum, f) => sum + f.additions, 0)}
Deletions: -${context.files.reduce((sum, f) => sum + f.deletions, 0)}
      
Files:
${context.files.map((f) => `• ${f.filename} (${f.status})`).join("\n")}`;

      const result = streamText({
        model: workersai("@cf/moonshotai/kimi-k2.5"),
        system: `You are Prism. Display the PR summary clearly formatted.`,
        messages: [{ role: "user", content: summary }],
        abortSignal: options?.abortSignal
      });
      return result.toUIMessageStreamResponse();
    }

    // Route: Default - conversational chat (no URL provided)
    // Uses full message history for context
    const result = streamText({
      model: workersai("@cf/moonshotai/kimi-k2.5"),
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
}
