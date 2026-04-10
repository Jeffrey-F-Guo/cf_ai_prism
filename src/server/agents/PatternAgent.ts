import { Agent } from "agents";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, Output, stepCountIs } from "ai";
import { makeFetchFileContentTool } from "../tools/github";
import {
  patternAnalyze,
  makeSearchSimilarPatternsTool,
  makeCheckArchitecturalPatternsTool
} from "../tools/PatternTools";
import { agentFindingSchema } from "../tools/schemas";
import {
  PATTERN_SEVERITY_RUBRIC,
  PATTERN_EXTRACTION_REMINDER
} from "../tools/prompts";
import type { Finding } from "../../types/review";

export class PatternAgent extends Agent<Env> {
  async analyzeCode(
    diff: string,
    focus?: string,
    orchestratorId?: string,
    rigor?: "quick" | "standard" | "deep",
    repoContext?: string,
    model?: "claude" | "deepseek"
  ): Promise<Finding[]> {
    const modelPref = model ?? "claude";
    const llm =
      modelPref === "claude"
        ? createAnthropic({ apiKey: this.env.CLAUDE_API_KEY })(
            "claude-sonnet-4-6"
          )
        : createDeepSeek({ apiKey: this.env.DEEPSEEK_API_KEY })(
            "deepseek-chat"
          );
    const extractLlm =
      modelPref === "claude"
        ? createAnthropic({ apiKey: this.env.CLAUDE_API_KEY })(
            "claude-haiku-4-5-20251001"
          )
        : createDeepSeek({ apiKey: this.env.DEEPSEEK_API_KEY })(
            "deepseek-chat"
          );

    const searchSimilarPatterns = makeSearchSimilarPatternsTool(
      this.env.AI,
      (this.env as Env & { VECTORIZE?: VectorizeIndex }).VECTORIZE
    );
    const checkArchitecturalPatterns = makeCheckArchitecturalPatternsTool(
      this.env.DEEPSEEK_API_KEY,
      this.env.CLAUDE_API_KEY,
      modelPref
    );

    const steps = rigor === "quick" ? 2 : rigor === "deep" ? 5 : 3;
    const rigorClause =
      rigor === "quick"
        ? "\n\nRigor: QUICK — call only patternAnalyze, then generate immediately. Do not call searchSimilarPatterns or checkArchitecturalPatterns."
        : rigor === "deep"
          ? "\n\nRigor: DEEP — call patternAnalyze first, then call searchSimilarPatterns on any non-trivial changed function, and checkArchitecturalPatterns if complexity > 10 or length > 40 lines. Be thorough."
          : "";
    const focusClause = focus
      ? `\n\nThe user specifically wants to focus on: ${focus}. Prioritize findings related to this area.`
      : "";
    const repoContextClause = repoContext
      ? `\n\nRepository history — past findings for this repo:\n${repoContext}\nUse this to flag recurring patterns and note when an issue has been seen before in this codebase.`
      : "";

    const reportTask = (text: string) => {
      if (!orchestratorId) return;
      this.env.ReviewOrchestrator.get(
        this.env.ReviewOrchestrator.idFromName(orchestratorId)
      )
        .fetch("http://do/internal/agent-task", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agent: "pattern", text })
        })
        .catch(() => {});
    };

    // Step 1: Analyze with tools
    const { text } = await generateText({
      model: llm,
      system: `You are a pattern reviewer. Analyze code diffs for code style consistency, SOLID principle violations, anti-patterns, and code duplication. Do NOT comment on security or performance concerns.

Rules for reporting findings:
- Call patternAnalyze first with the diff — it computes complexity, function length, and naming metrics
- If patternAnalyze reports complexity > 10 or function length > 40 lines, call checkArchitecturalPatterns with that function's code
- Call searchSimilarPatterns with a changed function body and the repo name (from the ContentsURL in the diff) to check cross-PR history
- Only report issues you can DIRECTLY QUOTE from the diff text${rigorClause}
- For every finding, include the file path and line number. Extract the file path from the "File: path/to/file" line in the diff, and the line number from the nearest "@@ -X,Y +A,B @@" hunk header above the relevant code (use the +A value). Format as "path/to/file.ts:A". Never invent or interpolate line numbers — only use the exact +A value from a @@ header.
- If a pattern concern depends on conventions elsewhere in the codebase, use fetchFileContent with the Contents URL listed in the diff to check before flagging it
- If you are uncertain about an issue, do not report it — false positives are worse than missed issues
- Each finding must quote the specific code change and include its file:line location

      ${PATTERN_SEVERITY_RUBRIC}${focusClause}${repoContextClause}`,
      prompt: `Analyze this code diff for pattern issues:\n\n${diff}`,
      tools: {
        fetchFileContent: makeFetchFileContentTool(this.env.GITHUB_TOKEN),
        patternAnalyze,
        searchSimilarPatterns,
        checkArchitecturalPatterns
      },
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
      prompt: `Extract all findings from this pattern analysis as structured data.\n${PATTERN_EXTRACTION_REMINDER}\n\n${text}`
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
