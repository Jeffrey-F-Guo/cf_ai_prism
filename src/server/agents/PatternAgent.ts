import { Agent } from "agents";
import { createWorkersAI } from "workers-ai-provider";
import { generateText, stepCountIs } from "ai";
import { fetchFileContentTool } from "../tools/github";
import { patternAnalyze } from "../tools/PatternTools";

export class PatternAgent extends Agent<Env> {
  async analyzeCode(diff: string): Promise<string> {
    const workersai = createWorkersAI({ binding: this.env.AI });
    const { text } = await generateText({
      model: workersai("@cf/mistralai/mistral-small-3.1-24b-instruct"),
      system: `You are a pattern reviewer. Focus on: code style consistency, SOLID principles, anti-patterns, code duplication.
IMPORTANT: You MUST use the patternAnalyze tool first to analyze the diff before providing your analysis.`,
      prompt: `Analyze this code diff for pattern issues:\n\n${diff}`,
      stopWhen: stepCountIs(3),
      tools: { fetchFileContent: fetchFileContentTool, patternAnalyze }
    });
    return text;
  }
}
