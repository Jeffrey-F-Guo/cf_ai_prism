import { Agent } from "agents";
import { createWorkersAI } from "workers-ai-provider";
import { generateText, stepCountIs } from "ai";
import { fetchFileContentTool } from "../tools/github";
import { performanceAnalyze } from "../tools/PerformanceTools";

export class PerformanceAgent extends Agent<Env> {
  async analyzeCode(diff: string): Promise<string> {
    const workersai = createWorkersAI({ binding: this.env.AI });
    const { text } = await generateText({
      model: workersai("@cf/mistralai/mistral-small-3.1-24b-instruct"),
      system: `You are a performance reviewer. Focus on: O(n) complexity, memory leaks, N+1 queries, inefficient algorithms.
IMPORTANT: You MUST use the performanceAnalyze tool first to analyze the diff before providing your analysis.`,
      prompt: `Analyze this code diff for performance issues:\n\n${diff}`,
      stopWhen: stepCountIs(3),
      tools: { fetchFileContent: fetchFileContentTool, performanceAnalyze }
    });
    return text;
  }
}
