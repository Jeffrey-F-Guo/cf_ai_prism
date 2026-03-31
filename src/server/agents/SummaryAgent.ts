import { Agent } from "agents";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { generateText, Output } from "ai";
import { summarySchema } from "../tools/schemas";
import type { Finding, ReviewSummary } from "../../types/review";

export type SummaryResult = {
  findings: Finding[];
  summary: ReviewSummary;
};

export class SummaryAgent extends Agent<Env> {
  async summarize(results: {
    logic: Finding[];
    security: Finding[];
    performance: Finding[];
    pattern: Finding[];
  }): Promise<SummaryResult> {
    const deepseek = createDeepSeek({ apiKey: this.env.DEEPSEEK_API_KEY });

    const allFindings = [
      ...results.logic,
      ...results.security,
      ...results.performance,
      ...results.pattern,
    ];

    const { output } = await generateText({
      model: deepseek("deepseek-chat"),
      output: Output.object({ schema: summarySchema }),
      system: `You are deduplicating structured code review findings from 4 specialized agents.

Your jobs:
1. Remove duplicate findings — if 2+ agents flagged the same issue at the same file:line, keep only the most informative one
2. Preserve all unique findings exactly as-is — do not rewrite titles, descriptions, or severity
3. Preserve the "agent" and "fileLocation" fields from each original finding
4. Assign sequential numeric IDs ("1", "2", ...) to the final deduplicated list
5. Compute score (0–100): start at 100, subtract 20 per critical, 5 per warning, 1 per suggestion (floor at 0)
6. Assign grade: 90–100 → "A Excellent", 75–89 → "B Stable", 60–74 → "C Needs Work", below 60 → "D Critical Issues"
7. Count criticals, warnings, suggestions in the final list`,
      prompt: `Deduplicate and score these findings from 4 agents:\n\n${JSON.stringify(allFindings, null, 2)}`
    });

    const findings: Finding[] = output.findings.map((f, i) => ({
      id: f.id || String(i + 1),
      severity: f.severity,
      title: f.title,
      description: f.description,
      ...(f.agent ? { agent: f.agent } : {}),
      ...(f.fileLocation ? { fileLocation: f.fileLocation } : {})
    }));

    const summary: ReviewSummary = {
      score: output.score,
      grade: output.grade,
      critical: output.critical,
      warnings: output.warnings,
      suggestions: output.suggestions,
    };

    console.log(`SummaryAgent: ${findings.length} findings after dedup, score ${summary.score}`);
    return { findings, summary };
  }
}
