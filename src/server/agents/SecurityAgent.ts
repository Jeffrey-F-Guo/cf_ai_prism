import { Agent } from "agents";
import { createWorkersAI } from "workers-ai-provider";
import { generateText, stepCountIs } from "ai";
import { fetchFileContentTool } from "../tools/github";
import { securityScan } from "../tools/SecurityTools";

export class SecurityAgent extends Agent<Env> {
  async analyzeCode(diff: string): Promise<string> {
    const workersai = createWorkersAI({ binding: this.env.AI });
    const { text } = await generateText({
      model: workersai("@cf/zai-org/glm-4.7-flash"),
      system: `You are a security reviewer. Analyze code diffs for SQL injection, XSS, auth issues, secrets exposure, and insecure dependencies. Do NOT comment on logic or performance concerns.
IMPORTANT: You MUST use the securityScan tool first to scan the diff. After the tool result, provide your detailed analysis as text.`,
      prompt: `Analyze this code diff for security issues:\n\n${diff}`,
      tools: { fetchFileContent: fetchFileContentTool, securityScan },
      stopWhen: stepCountIs(3)
    });
    return text;
  }
}
