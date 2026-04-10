import { Agent } from "agents";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, Output, stepCountIs } from "ai";
import { makeFetchFileContentTool } from "../tools/github";
import {
  securityScan,
  makeCheckAuthPatternsTool,
  analyzeDependencies
} from "../tools/SecurityTools";
import { agentFindingSchema } from "../tools/schemas";
import {
  SECURITY_SEVERITY_RUBRIC,
  SECURITY_EXTRACTION_REMINDER
} from "../tools/prompts";
import type { Finding } from "../../types/review";

export class SecurityAgent extends Agent<Env> {
  async analyzeCode(
    diff: string,
    focus?: string,
    orchestratorId?: string,
    rigor?: "quick" | "standard" | "deep",
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

    const checkAuthPatterns = makeCheckAuthPatternsTool(
      this.env.DEEPSEEK_API_KEY,
      this.env.CLAUDE_API_KEY,
      modelPref
    );

    const steps = rigor === "quick" ? 2 : rigor === "deep" ? 5 : 3;
    const rigorClause =
      rigor === "quick"
        ? "\n\nRigor: QUICK — call only securityScan, then generate immediately. Do not call checkAuthPatterns or analyzeDependencies."
        : rigor === "deep"
          ? "\n\nRigor: DEEP — call securityScan first, then call checkAuthPatterns if ANY auth/crypto code is present, and analyzeDependencies if ANY dependency file is touched. Be thorough."
          : "";
    const focusClause = focus
      ? `\n\nThe user specifically wants to focus on: ${focus}. Prioritize findings related to this area.`
      : "";

    const reportTask = (text: string) => {
      if (!orchestratorId) return;
      this.env.ReviewOrchestrator.get(
        this.env.ReviewOrchestrator.idFromName(orchestratorId)
      )
        .fetch("http://do/internal/agent-task", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agent: "security", text })
        })
        .catch(() => {});
    };

    // Step 1: Analyze with tools
    const { text } = await generateText({
      model: llm,
      system: `You are a security reviewer. Analyze code diffs for SQL injection, XSS, auth issues, secrets exposure, and insecure dependencies. Do NOT comment on logic or performance concerns.

Rules for reporting findings:
- Call securityScan first with the diff — it returns concrete line numbers for any credential/injection patterns found
- If the diff contains auth, token, session, JWT, password, or crypto code, call checkAuthPatterns with the relevant section
- If the diff modifies package.json, requirements.txt, go.mod, or similar dependency files, call analyzeDependencies
- Only report issues you can DIRECTLY QUOTE from the diff text${rigorClause}
- For every finding, include the file path and line number. Extract the file path from the "File: path/to/file" line in the diff, and the line number from the nearest "@@ -X,Y +A,B @@" hunk header above the relevant code (use the +A value). Format as "path/to/file.ts:A". Never invent or interpolate line numbers — only use the exact +A value from a @@ header.
- If a potential vulnerability depends on context outside the diff, use fetchFileContent with the Contents URL listed in the diff to verify before flagging it
- If you are uncertain about an issue, do not report it — false positives are worse than missed issues
- Each finding must quote the specific code change and include its file:line location

${SECURITY_SEVERITY_RUBRIC}${focusClause}`,
      prompt: `Analyze this code diff for security issues:\n\n${diff}`,
      tools: {
        fetchFileContent: makeFetchFileContentTool(this.env.GITHUB_TOKEN),
        securityScan,
        checkAuthPatterns,
        analyzeDependencies
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
      prompt: `Extract all findings from this security analysis as structured data.\n${SECURITY_EXTRACTION_REMINDER}\n\n${text}`
    });

    return output.findings.map((f, i) => ({
      id: String(i + 1),
      agent: "security",
      severity: f.severity,
      title: f.title,
      description: f.description,
      ...(f.fileLocation ? { fileLocation: f.fileLocation } : {})
    }));
  }
}
