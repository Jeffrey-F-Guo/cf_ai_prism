import { Agent } from "agents";
import { createWorkersAI } from "workers-ai-provider";
import { generateText, stepCountIs } from "ai";
import { fetchFileContentTool } from "../tools/github";
import { securityScan } from "../tools/SecurityTools";

export class SecurityAgent extends Agent<Env> {
  async analyzeCode(diff: string): Promise<string> {
    const workersai = createWorkersAI({ binding: this.env.AI });
    const { text } = await generateText({
      model: workersai("@cf/mistralai/mistral-small-3.1-24b-instruct"),
      system: `You are a security reviewer. Focus on: SQL injection, XSS, auth issues, secrets exposure, insecure dependencies.
IMPORTANT: You MUST use the securityScan tool first to scan the diff before providing your analysis.`,
      prompt: `Analyze this code diff for security issues:\n\n${diff}`,
      stopWhen: stepCountIs(3),
      tools: { fetchFileContent: fetchFileContentTool, securityScan }
    });
    return text;
  }
}
