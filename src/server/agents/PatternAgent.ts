import { Agent } from "agents";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { generateText, Output, stepCountIs } from "ai";
import { fetchFileContentTool } from "../tools/github";
import { patternAnalyze } from "../tools/PatternTools";
import { agentFindingSchema } from "../tools/schemas";
import type { Finding } from "../../types/review";

export class PatternAgent extends Agent<Env> {
  async analyzeCode(diff: string, focus?: string): Promise<Finding[]> {
    const deepseek = createDeepSeek({ apiKey: this.env.DEEPSEEK_API_KEY });

    const focusClause = focus
      ? `\n\nThe user specifically wants to focus on: ${focus}. Prioritize findings related to this area.`
      : "";

    // Step 1: Analyze with tools
    const { text } = await generateText({
      model: deepseek("deepseek-chat"),
      system: `You are a pattern reviewer. Analyze code diffs for code style consistency, SOLID principle violations, anti-patterns, and code duplication. Do NOT comment on security or performance concerns.

Rules for reporting findings:
- Call patternAnalyze first with the diff, then proceed with your analysis
- Only report issues you can DIRECTLY QUOTE from the diff text
- For every finding, include the file path and line number. Extract the file path from the "File: path/to/file" line in the diff, and the line number from the nearest "@@ -X,Y +A,B @@" hunk header above the relevant code (use the +A value). Format as "path/to/file.ts:A". Never invent or interpolate line numbers — only use the exact +A value from a @@ header.
- If a pattern concern depends on conventions elsewhere in the codebase, use fetchFileContent with the Contents URL listed in the diff to check before flagging it
- If you are uncertain about an issue, do not report it — false positives are worse than missed issues
- Each finding must quote the specific code change and include its file:line location${focusClause}`,
      prompt: `Analyze this code diff for pattern issues:\n\n${diff}`,
      tools: { fetchFileContent: fetchFileContentTool, patternAnalyze },
      stopWhen: stepCountIs(3)
    });

    // Step 2: Extract structured findings from the analysis
    const { output } = await generateText({
      model: deepseek("deepseek-chat"),
      output: Output.object({ schema: agentFindingSchema }),
      prompt: `Extract all findings from this pattern analysis as structured data. Include every distinct issue identified.\n\n${text}`
    });

    return output.findings.map((f, i) => ({
      id: String(i + 1),
      agent: "pattern",
      severity: f.severity,
      title: f.title,
      description: f.description,
      ...(f.fileLocation ? { fileLocation: f.fileLocation } : {})
    }));
  }
}
