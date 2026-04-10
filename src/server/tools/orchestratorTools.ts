import { tool } from "ai";
import { z } from "zod";
import type { Finding } from "../../types/review";
import type { PRData } from "./github";

export function makeOrchestratorTools(
  findings: Finding[],
  token?: string,
  prData?: PRData | null
) {
  const getFinding = tool({
    description: "Retrieve a specific finding by ID from the completed review",
    inputSchema: z.object({
      id: z.string().describe("The finding ID (e.g. '1', '2', '3')")
    }),
    execute: async ({ id }) => {
      const finding = findings.find((f) => f.id === id);
      if (!finding) {
        return {
          error: `Finding #${id} not found. Available IDs: ${findings.map((f) => f.id).join(", ")}`
        };
      }
      return finding;
    }
  });

  const suggestFix = tool({
    description:
      "Fetch the affected file content and return context needed to suggest a concrete fix for a finding",
    inputSchema: z.object({
      findingId: z.string().describe("The finding ID to generate a fix for"),
      contentsUrl: z
        .string()
        .optional()
        .describe(
          "GitHub contents URL for the affected file (found in the diff). Provide this if available."
        )
    }),
    execute: async ({ findingId, contentsUrl }) => {
      const finding = findings.find((f) => f.id === findingId);
      if (!finding) {
        return { error: `Finding #${findingId} not found.` };
      }

      // Auto-resolve contentsUrl from prData if not provided by the LLM
      let resolvedUrl = contentsUrl;
      if (!resolvedUrl && prData && finding.fileLocation) {
        const filePath = finding.fileLocation.split(":")[0];
        const match = prData.files.find((f) => f.filename === filePath);
        if (match) resolvedUrl = match.contents_url;
      }

      let fileContent: string | null = null;
      if (resolvedUrl) {
        try {
          const headers: Record<string, string> = {
            Accept: "application/vnd.github.v3.raw",
            "User-Agent": "cf-ai-prism"
          };
          if (token) headers["Authorization"] = `Bearer ${token}`;
          const res = await fetch(resolvedUrl, { headers });
          if (res.ok) {
            fileContent = await res.text();
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
