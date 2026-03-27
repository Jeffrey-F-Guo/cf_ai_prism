import { createWorkersAI } from "workers-ai-provider";
import { AIChatAgent, type OnChatMessageOptions } from "@cloudflare/ai-chat";
import {
  streamText,
  convertToModelMessages,
  pruneMessages,
} from "ai";
import { parsePRUrl, getPRAnalysisContext, type PRAnalysisContext } from "../tools/github";

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
    const TEST_MODE = false;
    // testing without llm
    if (TEST_MODE) {
      const text = this.extractText();
      const url = this.extractURL(text);

      let response = "Hello! I'm Prism. Paste a GitHub PR URL to start a review.";

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
    const text = this.extractText();
    const url = this.extractURL(text);
    
    if (url) {
      const context = await this.runReview(url);
      const testResponse = await this.env.AI.run(
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  {
    messages: [
      {
        role: "system",
        content: `You are a code analysis tool. You must respond with ONLY a valid JSON array. No markdown, no explanation, no code fences. Just the raw JSON array.`
      },
      {
        role: "user",
        content: `Analyze this code change and return findings as a JSON array with this exact shape:
[{"severity":"critical"|"warning"|"suggestion","title":"string","description":"string","file":"string","line":number,"suggestion":"string"}]

Code diff:
\`\`\`
- const token = Math.random().toString(36)
+ const token = crypto.randomUUID()
\`\`\`

Return ONLY the JSON array.`
      }
    ]
  }
);
console.log("RAW LLAMA OUTPUT:", JSON.stringify(testResponse));
      if (!context) {
        const result = streamText({
          model: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
          system: `You are Prism. Tell the user there was an error fetching the PR.`,
          messages: [{ role: "user", content: `Failed to fetch PR from ${url}` }],
          abortSignal: options?.abortSignal
        });
        return result.toUIMessageStreamResponse();
      }

      const summary = `PR: ${context.prData.title}
Repo: ${context.prData.owner}/${context.prData.repo}
Files changed: ${context.files.length}
Additions: +${context.files.reduce((sum, f) => sum + f.additions, 0)}
Deletions: -${context.files.reduce((sum, f) => sum + f.deletions, 0)}
      
Files:
${context.files.map(f => `• ${f.filename} (${f.status})`).join("\n")}`;

      const result = streamText({
        model: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
        system: `You are Prism. Display the PR summary clearly formatted.`,
        messages: [{ role: "user", content: summary }],
        abortSignal: options?.abortSignal
      });
      return result.toUIMessageStreamResponse();
    }

    const result = streamText({
      model: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
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
