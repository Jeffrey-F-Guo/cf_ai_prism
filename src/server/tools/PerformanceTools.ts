import { tool } from "ai";
import { z } from "zod";

export const performanceAnalyze = tool({
  description: "Analyze code for performance issues including O(n) complexity, memory leaks, N+1 queries, and inefficient algorithms.",
  inputSchema: z.object({
    code: z.string().describe("The code diff to analyze for performance issues")
  }),
  execute: async ({ code }: { code: string }) => {
    console.log("performanceAnalyze called with code length:", code.length);
    return `Performance analysis tool invoked for ${code.length} chars of diff. Proceed with your own analysis.`;
  }
});
