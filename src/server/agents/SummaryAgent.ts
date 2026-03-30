import { Agent } from "agents";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { generateText } from "ai";
import type { Finding, ReviewSummary } from "../../types/review";

export type SummaryResult = {
  findings: Finding[];
  summary: ReviewSummary;
};

const FALLBACK: SummaryResult = {
  findings: [
    {
      id: "1",
      severity: "suggestion",
      title: "Review Complete",
      description: "Agents completed their analysis. Structured output could not be parsed."
    }
  ],
  summary: { score: 50, grade: "N/A", critical: 0, warnings: 0, suggestions: 1 }
};

export class SummaryAgent extends Agent<Env> {
  async summarize(results: {
    logic: string;
    security: string;
    performance: string;
    pattern: string;
  }): Promise<SummaryResult> {
    const deepseek = createDeepSeek({ apiKey: this.env.DEEPSEEK_API_KEY });

    const { text } = await generateText({
      model: deepseek("deepseek-chat"),
      system: `You are a senior code reviewer compiling reports from 4 specialized agents into structured findings.

Your job:
1. Read all 4 agent reports
2. Deduplicate: if multiple agents mention the same issue, keep only one finding
3. Chunk: split long lists into individual, focused findings — one issue per finding
4. Infer severity: "vulnerability", "injection", "exposed secret" → critical; "should", "consider", "inefficient" → warning; "could", "minor", "style" → suggestion; explicitly positive feedback → success
5. Write a short descriptive title per finding (not just "Security Issue" — be specific)
6. Write a concise 1-3 sentence description that is actionable
7. Discard any finding that uses uncertain language ("might", "could", "possible", "may") without citing a specific code change
8. Only populate "fileLocation" if the source agent quoted a specific file path verbatim — do NOT invent or estimate line numbers

Output ONLY a valid JSON object matching this exact schema, no markdown, no explanation:
{
  "findings": [
    {
      "id": "1",
      "severity": "critical" | "warning" | "suggestion" | "success",
      "title": "string",
      "description": "string",
      "fileLocation": "string (optional, only if agent mentioned a specific file)"
    }
  ],
  "score": number (0-100, based on severity distribution),
  "grade": "string (e.g. A Excellent, B+ Stable, C Needs Work, D Critical Issues)",
  "critical": number,
  "warnings": number,
  "suggestions": number
}`,
      prompt: `Compile these 4 agent reports into structured findings:

--- LOGIC AGENT ---
${results.logic}

--- SECURITY AGENT ---
${results.security}

--- PERFORMANCE AGENT ---
${results.performance}

--- PATTERN AGENT ---
${results.pattern}`
    });

    try {
      const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
      const parsed = JSON.parse(cleaned);

      const findings: Finding[] = (parsed.findings ?? []).map(
        (f: Finding & { id?: string }, i: number) => ({
          id: f.id ?? String(i + 1),
          severity: f.severity ?? "suggestion",
          title: f.title ?? "Finding",
          description: f.description ?? "",
          ...(f.fileLocation ? { fileLocation: f.fileLocation } : {})
        })
      );

      const summary: ReviewSummary = {
        score: Number(parsed.score ?? 50),
        grade: parsed.grade ?? "N/A",
        critical: Number(parsed.critical ?? 0),
        warnings: Number(parsed.warnings ?? 0),
        suggestions: Number(parsed.suggestions ?? 0)
      };

      console.log(`SummaryAgent: parsed ${findings.length} findings, score ${summary.score}`);
      return { findings, summary };
    } catch (err) {
      console.error("SummaryAgent: JSON parse failed:", err, "\nRaw output:", text);
      return FALLBACK;
    }
  }
}
