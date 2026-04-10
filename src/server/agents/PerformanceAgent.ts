import { Agent } from "agents";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, Output, stepCountIs } from "ai";
import { makeFetchFileContentTool } from "../tools/github";
import { performanceAnalyze, makeAnalyzeMemoryPatternsTool, makeFindBlockingOperationsTool } from "../tools/PerformanceTools";
import { agentFindingSchema } from "../tools/schemas";
import { PERFORMANCE_SEVERITY_RUBRIC, PERFORMANCE_EXTRACTION_REMINDER } from "../tools/prompts";
import type { Finding } from "../../types/review";

export class PerformanceAgent extends Agent<Env> {
  async analyzeCode(diff: string, focus?: string, orchestratorId?: string, rigor?: "quick" | "standard" | "deep", model?: "claude" | "deepseek"): Promise<Finding[]> {
    const modelPref = model ?? "claude";
    const llm = modelPref === "claude"
      ? createAnthropic({ apiKey: this.env.CLAUDE_API_KEY })("claude-sonnet-4-6")
      : createDeepSeek({ apiKey: this.env.DEEPSEEK_API_KEY })("deepseek-chat");
    const extractLlm = modelPref === "claude"
      ? createAnthropic({ apiKey: this.env.CLAUDE_API_KEY })("claude-haiku-4-5-20251001")
      : createDeepSeek({ apiKey: this.env.DEEPSEEK_API_KEY })("deepseek-chat");

    const analyzeMemoryPatterns = makeAnalyzeMemoryPatternsTool(this.env.DEEPSEEK_API_KEY, this.env.CLAUDE_API_KEY, modelPref);
    const findBlockingOperations = makeFindBlockingOperationsTool(this.env.DEEPSEEK_API_KEY, this.env.CLAUDE_API_KEY, modelPref);

    const steps = rigor === "quick" ? 2 : rigor === "deep" ? 5 : 3;
    const rigorClause = rigor === "quick"
      ? "\n\nRigor: QUICK — call only performanceAnalyze, then generate immediately. Do not call analyzeMemoryPatterns or findBlockingOperations."
      : rigor === "deep"
      ? "\n\nRigor: DEEP — call performanceAnalyze first, then call analyzeMemoryPatterns if cache/listener/closure code is present, and findBlockingOperations if sequential awaits are present. Be thorough in verification: if performanceAnalyze reports bounded collections, that bound MUST lower the severity — bounded O(n) is at most suggestion regardless of call frequency."
      : "";
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
      model: llm,
      system: `You are a performance reviewer. Analyze code diffs for O(n) complexity issues, memory leaks, N+1 queries, and inefficient algorithms. Do NOT comment on security or logic concerns.

Rules for reporting findings:
- Call performanceAnalyze first with the diff — it classifies hot vs cold paths and detects loops with bounds context
- If the diff touches caches, event listeners, closures, or long-lived objects, call analyzeMemoryPatterns with the relevant section
- If the diff contains async functions or multiple sequential awaits, call findBlockingOperations with the relevant section
- Only report issues you can DIRECTLY QUOTE from the diff text${rigorClause}
- For every finding, include the file path and line number. Extract the file path from the "File: path/to/file" line in the diff, and the line number from the nearest "@@ -X,Y +A,B @@" hunk header above the relevant code (use the +A value). Format as "path/to/file.ts:A". Never invent or interpolate line numbers — only use the exact +A value from a @@ header.
- If a performance concern depends on how a function is used elsewhere, use fetchFileContent with the Contents URL listed in the diff to verify before flagging it
- If you are uncertain about an issue, do not report it — false positives are worse than missed issues
- Each finding must quote the specific code change and include its file:line location

${PERFORMANCE_SEVERITY_RUBRIC}${focusClause}`,
      prompt: `Analyze this code diff for performance issues:\n\n${diff}`,
      tools: { fetchFileContent: makeFetchFileContentTool(this.env.GITHUB_TOKEN), performanceAnalyze, analyzeMemoryPatterns, findBlockingOperations },
      stopWhen: stepCountIs(steps),
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
      model: extractLlm,
      output: Output.object({ schema: agentFindingSchema }),
      prompt: `Extract all findings from this performance analysis as structured data.\n${PERFORMANCE_EXTRACTION_REMINDER}\n\n${text}`
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
