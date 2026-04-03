import { Agent } from "agents";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { generateText, Output, stepCountIs } from "ai";
import { makeFetchFileContentTool } from "../tools/github";
import { performanceAnalyze } from "../tools/PerformanceTools";
import { agentFindingSchema } from "../tools/schemas";
import type { Finding } from "../../types/review";

export class PerformanceAgent extends Agent<Env> {
  async analyzeCode(diff: string, focus?: string, orchestratorId?: string): Promise<Finding[]> {
    const deepseek = createDeepSeek({ apiKey: this.env.DEEPSEEK_API_KEY });

    const focusClause = focus
      ? `\n\nThe user specifically wants to focus on: ${focus}. Prioritize findings related to this area.`
      : "";

    const reportTask = (text: string) => {
      if (!orchestratorId) return;
      this.env.ReviewOrchestrator.get(
        this.env.ReviewOrchestrator.idFromName(orchestratorId)
      ).fetch("http://do/internal/agent-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: "performance", text })
      }).catch(() => {});
    };

    // Step 1: Analyze with tools
    const { text } = await generateText({
      model: deepseek("deepseek-chat"),
      system: `You are a performance reviewer. Analyze code diffs for O(n) complexity issues, memory leaks, N+1 queries, and inefficient algorithms. Do NOT comment on security or logic concerns.

Rules for reporting findings:
- Call performanceAnalyze first with the diff, then proceed with your analysis
- Only report issues you can DIRECTLY QUOTE from the diff text
- For every finding, include the file path and line number. Extract the file path from the "File: path/to/file" line in the diff, and the line number from the nearest "@@ -X,Y +A,B @@" hunk header above the relevant code (use the +A value). Format as "path/to/file.ts:A". Never invent or interpolate line numbers — only use the exact +A value from a @@ header.
- If a performance concern depends on how a function is used elsewhere, use fetchFileContent with the Contents URL listed in the diff to verify before flagging it
- If you are uncertain about an issue, do not report it — false positives are worse than missed issues
- Each finding must quote the specific code change and include its file:line location${focusClause}`,
      prompt: `Analyze this code diff for performance issues:\n\n${diff}`,
      tools: { fetchFileContent: makeFetchFileContentTool(this.env.GITHUB_TOKEN), performanceAnalyze },
      stopWhen: stepCountIs(3),
      onStepFinish: ({ toolCalls }) => {
        const tool = toolCalls?.[0];
        if (!tool) return;
        if (tool.toolName === "fetchFileContent" && "input" in tool) {
          const url = (tool.input as { contentsUrl: string }).contentsUrl ?? "";
          const file = url.split("/contents/")[1]?.split("?")[0] ?? "file";
          reportTask(`Fetching ${file}...`);
        } else {
          reportTask(`Running ${tool.toolName}...`);
        }
      }
    });

    // Step 2: Extract structured findings from the analysis
    const { output } = await generateText({
      model: deepseek("deepseek-chat"),
      output: Output.object({ schema: agentFindingSchema }),
      prompt: `Extract all findings from this performance analysis as structured data. Include every distinct issue identified.\n\n${text}`
    });

    return output.findings.map((f, i) => ({
      id: String(i + 1),
      agent: "performance",
      severity: f.severity,
      title: f.title,
      description: f.description,
      ...(f.fileLocation ? { fileLocation: f.fileLocation } : {})
    }));
  }
}
