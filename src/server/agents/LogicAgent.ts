import { Agent } from "agents";
import { createWorkersAI } from "workers-ai-provider";
import { generateText, stepCountIs } from "ai";
import { fetchFileContentTool } from "../tools/github";
import { smartLogicEval } from "../tools/LogicTools";

export class LogicAgent extends Agent<Env> {
  async analyzeCode(diff: string): Promise<string> {
    const workersai = createWorkersAI({ binding: this.env.AI });

    const result = await generateText({
      model: workersai("@cf/zai-org/glm-4.7-flash"),
      system: `You are a logic correctness reviewer. Analyze code diffs for logic errors, null handling issues, off-by-one errors, unreachable code, and edge cases. Do NOT comment on security or performance concerns.
IMPORTANT: You MUST use the smartLogicEval tool to evaluate the code diff first. After the tool result, provide your detailed analysis as text.`,
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
