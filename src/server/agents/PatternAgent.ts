import { Agent } from "agents";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { generateText, stepCountIs } from "ai";
import { fetchFileContentTool } from "../tools/github";
import { patternAnalyze } from "../tools/PatternTools";

export class PatternAgent extends Agent<Env> {
  async analyzeCode(diff: string): Promise<string> {
    const deepseek = createDeepSeek({ apiKey: this.env.DEEPSEEK_API_KEY });
    const { text } = await generateText({
      model: deepseek("deepseek-chat"),
      system: `You are a pattern reviewer. Analyze code diffs for code style consistency, SOLID principle violations, anti-patterns, and code duplication. Do NOT comment on security or performance concerns.

Rules for reporting findings:
- Call patternAnalyze first with the diff, then proceed with your analysis
- Only report issues you can DIRECTLY QUOTE from the diff text
- Do NOT invent or estimate line numbers — only reference line numbers explicitly shown in diff hunks (lines beginning with @@)
- If a pattern concern depends on conventions elsewhere in the codebase, use fetchFileContent with the Contents URL listed in the diff to check before flagging it
- If you are uncertain about an issue, do not report it — false positives are worse than missed issues
- Each finding must reference the specific code change that prompted it`,
      prompt: `Analyze this code diff for pattern issues:\n\n${diff}`,
      tools: { fetchFileContent: fetchFileContentTool, patternAnalyze },
      stopWhen: stepCountIs(3)
    });
    return text;
  }
}
