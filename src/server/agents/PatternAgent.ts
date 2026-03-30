import { Agent } from "agents";
import { createWorkersAI } from "workers-ai-provider";
import { generateText, stepCountIs } from "ai";
import { fetchFileContentTool } from "../tools/github";
import { patternAnalyze } from "../tools/PatternTools";

export class PatternAgent extends Agent<Env> {
  async analyzeCode(diff: string): Promise<string> {
    const workersai = createWorkersAI({ binding: this.env.AI });
    const { text } = await generateText({
      model: workersai("@cf/zai-org/glm-4.7-flash"),
      system: `You are a pattern reviewer. Analyze code diffs for code style consistency, SOLID principle violations, anti-patterns, and code duplication. Do NOT comment on security or performance concerns.
IMPORTANT: You MUST use the patternAnalyze tool first to analyze the diff. After the tool result, provide your detailed analysis as text.`,
      prompt: `Analyze this code diff for pattern issues:\n\n${diff}`,
      tools: { fetchFileContent: fetchFileContentTool, patternAnalyze },
      stopWhen: stepCountIs(3)
    });
    return text;
  }
}
