import { tool } from "ai";
import { z } from "zod";

export const patternAnalyze = tool({
  description: "Analyze code for pattern issues including code style consistency, SOLID principles, anti-patterns, and code duplication.",
  inputSchema: z.object({
    code: z.string().describe("The code diff to analyze for pattern issues")
  }),
  execute: async ({ code }: { code: string }) => {
    console.log("patternAnalyze called with code length:", code.length);
    return `Pattern analysis tool invoked for ${code.length} chars of diff. Proceed with your own analysis.`;
  }
});
