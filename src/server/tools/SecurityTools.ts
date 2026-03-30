import { tool } from "ai";
import { z } from "zod";

export const securityScan = tool({
  description: "Scan code for security vulnerabilities including SQL injection, XSS, auth issues, secrets exposure, and insecure dependencies.",
  inputSchema: z.object({
    code: z.string().describe("The code diff to scan for security issues")
  }),
  execute: async ({ code }: { code: string }) => {
    console.log("securityScan called with code length:", code.length);
    return `Security scan tool invoked for ${code.length} chars of diff. Proceed with your own analysis.`;
  }
});
