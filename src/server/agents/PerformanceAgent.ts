import { Agent } from "agents";
import { createWorkersAI } from "workers-ai-provider";
import { generateText } from "ai";

import { fetchFileContentTool } from "../tools/github";

export class PerformanceAgent extends Agent<Env> {
  async analyzeCode(diff: string) {
    const workersai = createWorkersAI({ binding: this.env.AI });
    const { text } = await generateText({
      model: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
      system: `You are a logic correctness reviewer. Your ONLY concern is logical correctness.
Do NOT comment on security vulnerabilities, performance, or code style.
Focus exclusively on: null/undefined handling, off-by-one errors, incorrect conditionals, 
unreachable code, missing edge cases, incorrect return values, and logical contradictions.
Use fetchFileContent to retrieve full file context when a diff alone is insufficient to assess correctness.`,
      prompt: `Analyze this code diff and identify any logical errors:\n\n${diff}`,
      maxRetries: 5,
      tools: {
        fetchFileContent: fetchFileContentTool
      }
    });

    return text;
  }
}
