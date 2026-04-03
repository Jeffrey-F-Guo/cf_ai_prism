import { tool } from "ai";
import { z } from "zod";
import type { Finding } from "../../types/review";

export function makeOrchestratorTools(findings: Finding[]) {
  const getFinding = tool({
    description: "Retrieve a specific finding by ID from the completed review",
    inputSchema: z.object({
      id: z.string().describe("The finding ID (e.g. '1', '2', '3')")
    }),
    execute: async ({ id }) => {
      const finding = findings.find((f) => f.id === id);
      if (!finding) {
        return { error: `Finding #${id} not found. Available IDs: ${findings.map((f) => f.id).join(", ")}` };
      }
      return finding;
    }
  });

  const suggestFix = tool({
    description: "Fetch the affected file content and return context needed to suggest a concrete fix for a finding",
    inputSchema: z.object({
      findingId: z.string().describe("The finding ID to generate a fix for"),
      contentsUrl: z.string().optional().describe("GitHub contents URL for the affected file (found in the diff). Provide this if available.")
    }),
    execute: async ({ findingId, contentsUrl }) => {
      const finding = findings.find((f) => f.id === findingId);
      if (!finding) {
        return { error: `Finding #${findingId} not found.` };
      }

      let fileContent: string | null = null;
      if (contentsUrl) {
        try {
          const res = await fetch(contentsUrl, {
            headers: {
              Accept: "application/vnd.github+json",
              "User-Agent": "cf-ai-prism"
            }
          });
          const data = await res.json() as { content?: string };
          if (data.content) {
            fileContent = Buffer.from(data.content, "base64").toString("utf-8");
          }
        } catch {
          // File fetch failed — proceed without it
        }
      }

      return {
        finding,
        fileContent,
        instruction: `Based on the finding above${fileContent ? " and the file content" : ""}, provide a concrete code fix. Show a before/after diff. Be specific and minimal — only change what's needed to address the issue.`
      };
    }
  });

  return { getFinding, suggestFix };
}
