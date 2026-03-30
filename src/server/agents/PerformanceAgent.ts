import { Agent } from "agents";
import { createWorkersAI } from "workers-ai-provider";
import { generateText, stepCountIs } from "ai";
import { fetchFileContentTool } from "../tools/github";
import { performanceAnalyze } from "../tools/PerformanceTools";

export class PerformanceAgent extends Agent<Env> {
  async analyzeCode(diff: string): Promise<string> {
    const workersai = createWorkersAI({ binding: this.env.AI });
    const { text } = await generateText({
      model: workersai("@cf/zai-org/glm-4.7-flash"),
      system: `You are a performance reviewer. Analyze code diffs for O(n) complexity issues, memory leaks, N+1 queries, and inefficient algorithms. Do NOT comment on security or logic concerns.
IMPORTANT: You MUST use the performanceAnalyze tool first to analyze the diff. After the tool result, provide your detailed analysis as text.`,
      prompt: `Analyze this code diff for performance issues:\n\n${diff}`,
      tools: { fetchFileContent: fetchFileContentTool, performanceAnalyze },
      stopWhen: stepCountIs(3)
    });
    return text;
  }
}
