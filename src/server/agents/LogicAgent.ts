import { Agent } from "agents";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { generateText, stepCountIs } from "ai";
import { fetchFileContentTool } from "../tools/github";
import { smartLogicEval } from "../tools/LogicTools";

export class LogicAgent extends Agent<Env> {
  async analyzeCode(diff: string): Promise<string> {
    const deepseek = createDeepSeek({ apiKey: this.env.DEEPSEEK_API_KEY });

    const result = await generateText({
      model: deepseek("deepseek-chat"),
      system: `You are a logic correctness reviewer. Analyze code diffs for logic errors, null handling issues, off-by-one errors, unreachable code, and edge cases. Do NOT comment on security or performance concerns.

Rules for reporting findings:
- Call smartLogicEval first with the diff, then proceed with your analysis
- Only report issues you can DIRECTLY QUOTE from the diff text
- Do NOT invent or estimate line numbers — only reference line numbers explicitly shown in diff hunks (lines beginning with @@)
- If a variable or function appears undefined in the diff, use fetchFileContent with the Contents URL listed in the diff to check if it is defined elsewhere before flagging it
- If you are uncertain about an issue, do not report it — false positives are worse than missed issues
- Each finding must reference the specific code change that prompted it`,
      prompt: `Analyze this code diff for logic errors:\n\n${diff}`,
      tools: {
        fetchFileContent: fetchFileContentTool,
        smartLogicEval: smartLogicEval
      },
      stopWhen: stepCountIs(3)
    });

    return result.text || "Analysis completed but no text was generated";
  }
}
