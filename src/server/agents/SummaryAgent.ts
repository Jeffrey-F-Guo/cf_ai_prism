import { Agent } from "agents";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, Output } from "ai";
import { summarySchema } from "../tools/schemas";
import { z } from "zod";
import type { Finding, ReviewSummary } from "../../types/review";

const CRITICALPENALTY = 20;
const WARNINGPENALTY = 5;

const severityPriority: Record<string, number> = { critical: 0, warning: 1, suggestion: 2, success: 3 };

const judgeSchema = z.object({
  findings: z.array(
    z.object({
      id: z.string(),
      severity: z.enum(["critical", "warning", "suggestion", "success"]),
    })
  ),
});

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
    model?: "claude" | "deepseek";
  }): Promise<SummaryResult> {
    const modelPref = results.model ?? "claude";
    const llm = modelPref === "claude"
      ? createAnthropic({ apiKey: this.env.CLAUDE_API_KEY })("claude-haiku-4-5-20251001")
      : createDeepSeek({ apiKey: this.env.DEEPSEEK_API_KEY })("deepseek-chat");

    const allFindings = [
      ...results.logic,
      ...results.security,
      ...results.performance,
      ...results.pattern,
    ];

    // Step 1: Deduplicate
    const { output: dedupOutput } = await generateText({
      model: llm,
      output: Output.object({ schema: summarySchema }),
      system: `You are deduplicating structured code review findings from 4 specialized agents.

Your jobs:
1. Remove duplicate findings — if 2+ agents flagged the same issue at the same file:line, keep only the most informative one
2. Preserve all unique findings exactly as-is — do not rewrite titles, descriptions, or severity
3. Preserve the "agent" and "fileLocation" fields from each original finding
4. Count criticals, warnings, suggestions in the final list`,
      prompt: `Deduplicate and score these findings from 4 agents:\n\n${JSON.stringify(allFindings, null, 2)}`
    });

    // Assign temporary IDs for the judge pass
    const dedupedFindings: Finding[] = dedupOutput.findings
      .map((f, i) => ({
        id: String(i + 1),
        severity: f.severity,
        title: f.title,
        description: f.description,
        ...(f.agent ? { agent: f.agent } : {}),
        ...(f.fileLocation ? { fileLocation: f.fileLocation } : {})
      }));

    // Step 2: Judge pass — can only de-escalate severity
    const { output: judgeOutput } = await generateText({
      model: llm,
      output: Output.object({ schema: judgeSchema }),
      system: `You are a severity auditor reviewing AI-generated code findings. Your ONLY job is to identify over-escalated findings.

Rules:
- You may ONLY lower severity — NEVER raise it
- If a finding is already "suggestion", leave it as-is
- Return ALL findings (even unchanged ones) with their id and severity

For each CRITICAL finding, ask: will this directly break the project in production under realistic, normal usage?
  → Qualifies as critical: data corruption, security breach, crash, silent data loss for normal inputs
  → Does NOT qualify: "possibly", "under edge conditions", soft invariant violations, bounded collections, single-threaded environments
  → If any doubt → lower to WARNING

For each WARNING finding, ask: is this scenario realistically reachable with normal inputs and normal usage patterns?
  → Does NOT qualify: requires contrived inputs, unlikely concurrent conditions, or theoretical-only scenarios
  → If any doubt → lower to SUGGESTION`,
      prompt: `Review these findings for over-escalated severity:\n\n${JSON.stringify(dedupedFindings.map(f => ({ id: f.id, severity: f.severity, title: f.title, description: f.description })), null, 2)}`
    });

    // Enforce never-escalate: apply judge severity only if it is the same or lower priority
    const judgeBySeverityId = new Map(judgeOutput.findings.map(f => [f.id, f.severity]));

    const findings: Finding[] = dedupedFindings
      .map((f) => {
        const judgeSeverity = judgeBySeverityId.get(f.id);
        const finalSeverity = judgeSeverity !== undefined &&
          (severityPriority[judgeSeverity] ?? 4) >= (severityPriority[f.severity] ?? 4)
          ? judgeSeverity
          : f.severity;
        return { ...f, severity: finalSeverity };
      })
      .sort((a, b) => (severityPriority[a.severity] ?? 4) - (severityPriority[b.severity] ?? 4))
      .map((f, i) => ({ ...f, id: String(i + 1) }));

    const criticalCount = findings.filter((f) => f.severity === "critical").length;
    const warningCount = findings.filter((f) => f.severity === "warning").length;
    const suggestionCount = findings.filter((f) => f.severity === "suggestion").length;

    const summary: ReviewSummary = {
      score: Math.max(100 - criticalCount * CRITICALPENALTY - warningCount * WARNINGPENALTY, 0),
      critical: criticalCount,
      warnings: warningCount,
      suggestions: suggestionCount,
    };

    console.log(`SummaryAgent: ${findings.length} findings after dedup+judge, score ${summary.score}`);
    return { findings, summary };
  }
}
