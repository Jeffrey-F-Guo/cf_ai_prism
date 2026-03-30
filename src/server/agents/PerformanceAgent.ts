import { Agent } from "agents";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { generateText, stepCountIs } from "ai";
import { fetchFileContentTool } from "../tools/github";
import { performanceAnalyze } from "../tools/PerformanceTools";

export class PerformanceAgent extends Agent<Env> {
  async analyzeCode(diff: string): Promise<string> {
    const deepseek = createDeepSeek({ apiKey: this.env.DEEPSEEK_API_KEY });
    const { text } = await generateText({
      model: deepseek("deepseek-chat"),
      system: `You are a performance reviewer. Analyze code diffs for O(n) complexity issues, memory leaks, N+1 queries, and inefficient algorithms. Do NOT comment on security or logic concerns.

Rules for reporting findings:
- Call performanceAnalyze first with the diff, then proceed with your analysis
- Only report issues you can DIRECTLY QUOTE from the diff text
- Do NOT invent or estimate line numbers — only reference line numbers explicitly shown in diff hunks (lines beginning with @@)
- If a performance concern depends on how a function is used elsewhere, use fetchFileContent with the Contents URL listed in the diff to verify before flagging it
- If you are uncertain about an issue, do not report it — false positives are worse than missed issues
- Each finding must reference the specific code change that prompted it`,
      prompt: `Analyze this code diff for performance issues:\n\n${diff}`,
      tools: { fetchFileContent: fetchFileContentTool, performanceAnalyze },
      stopWhen: stepCountIs(3)
    });
    return text;
  }
}
