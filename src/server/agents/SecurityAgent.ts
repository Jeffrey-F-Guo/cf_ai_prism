import { Agent } from "agents";
import { createWorkersAI } from "workers-ai-provider";
import { generateText } from "ai";
import { fetchFileContentTool } from "../tools/github";

export class SecurityAgent extends Agent<Env> {
  async analyzeCode(diff: string): Promise<string> {
    const workersai = createWorkersAI({ binding: this.env.AI });
    const { text } = await generateText({
      model: workersai("@cf/moonshotai/kimi-k2.5"),
      system: `You are a security reviewer. Focus on: SQL injection, XSS, auth issues, secrets exposure, insecure dependencies.`,
      prompt: `Analyze this code diff for security issues:\n\n${diff}`,
      maxRetries: 5,
      tools: { fetchFileContent: fetchFileContentTool }
    });
    return text;
  }
}
