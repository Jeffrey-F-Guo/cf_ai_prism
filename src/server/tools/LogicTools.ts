import { tool } from "ai";
import { z } from "zod";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { SUBCALL_SEVERITY_RUBRIC } from "./prompts";

// ── helpers ───────────────────────────────────────────────────────────────────

interface ParsedLine {
  lineNum: number;
  content: string;
}

function parseAddedLines(diff: string): ParsedLine[] {
  const result: ParsedLine[] = [];
  let currentLine = 0;
  for (const raw of diff.split("\n")) {
    const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      currentLine = parseInt(hunk[1], 10) - 1;
      continue;
    }
    if (raw.startsWith("+") && !raw.startsWith("+++")) {
      currentLine++;
      result.push({ lineNum: currentLine, content: raw.slice(1) });
    } else if (!raw.startsWith("-")) {
      currentLine++;
    }
  }
  return result;
}

const SKIP_VARS = new Set([
  "console",
  "Math",
  "Object",
  "Array",
  "String",
  "JSON",
  "Promise",
  "Date",
  "Error",
  "window",
  "document"
]);

// ── Tier 1: smartLogicEval ───────────────────────────────────────────────────

export const smartLogicEval = tool({
  description:
    "Regex scan for null/undefined risks, async misuse, unreachable conditions, and edge-case checklists. Always call this first.",
  inputSchema: z.object({
    diff: z.string().describe("The full code diff to evaluate for logic errors")
  }),
  execute: async ({ diff }: { diff: string }) => {
    const addedLines = parseAddedLines(diff);
    const allContent = addedLines.map((l) => l.content).join("\n");

    const nullRisks: string[] = [];
    const asyncIssues: string[] = [];
    const unreachable: string[] = [];
    const edgeCases: string[] = [];

    // ── Null/undefined risks ──

    // Non-null assertion (!) on a potentially nullable value
    for (const { lineNum, content } of addedLines) {
      if (/\w+!\.\w+/.test(content) || /\w+!\[/.test(content)) {
        nullRisks.push(
          `  - Line +${lineNum}: non-null assertion (!) — verify value cannot be null/undefined at this point`
        );
      }
    }

    // Explicit type assertion (as T) — may be silencing a null/undefined return type
    for (const { lineNum, content } of addedLines) {
      if (
        /\b\w+\s+as\s+[A-Z]\w+\b/.test(content) &&
        !/\/\//.test(content.slice(0, content.search(/\b\w+\s+as\s+/)))
      ) {
        nullRisks.push(
          `  - Line +${lineNum}: explicit type assertion (as T) — verify source value satisfies T including null/undefined safety`
        );
      }
    }

    // Result of Map.get / array.find / array[index] accessed without null check
    for (const { lineNum, content } of addedLines) {
      const m = content.match(/\.(get|find|at)\s*\([^)]*\)\s*\./);
      if (m) {
        nullRisks.push(
          `  - Line +${lineNum}: result of .${m[1]}() chained directly — may return undefined`
        );
      }
    }

    // Optional chaining inconsistency (same variable with and without ?.)
    const optVars = new Set<string>();
    const nonOptVars = new Set<string>();
    for (const { content } of addedLines) {
      for (const m of content.matchAll(/(\w+)\?\.\w+/g)) optVars.add(m[1]);
      for (const m of content.matchAll(/\b(\w{3,})\.\w+/g)) {
        if (!SKIP_VARS.has(m[1])) nonOptVars.add(m[1]);
      }
    }
    for (const v of optVars) {
      if (nonOptVars.has(v)) {
        nullRisks.push(
          `  - Variable \`${v}\` uses optional chaining (?.) in some places but not others — inconsistent null safety`
        );
      }
    }

    // ── Async misuse ──

    // async callback inside forEach (forEach does not await)
    for (const { lineNum, content } of addedLines) {
      if (/\.forEach\s*\(\s*async/.test(content)) {
        asyncIssues.push(
          `  - Line +${lineNum}: async callback inside .forEach() — forEach does not await; use for...of instead`
        );
      }
    }

    // Async function called without await (and not .then/.catch)
    const asyncFnNames: string[] = [];
    for (const { content } of addedLines) {
      const m = content.match(/async\s+(?:function\s+)?(\w+)\s*\(/);
      if (m && m[1] !== "function") asyncFnNames.push(m[1]);
    }
    for (const { lineNum, content } of addedLines) {
      for (const name of asyncFnNames) {
        const called = new RegExp(`\\b${name}\\s*\\(`).test(content);
        const awaited = new RegExp(`await\\s+${name}\\s*\\(`).test(content);
        const chained =
          content.includes(".then(") || content.includes(".catch(");
        const isReturn = /\breturn\b/.test(content);
        if (called && !awaited && !chained && !isReturn) {
          asyncIssues.push(
            `  - Line +${lineNum}: \`${name}()\` called without await — defined as async in this diff`
          );
        }
      }
    }

    // ── Unreachable / tautological conditions ──

    for (const { lineNum, content } of addedLines) {
      if (/if\s*\(\s*true\s*\)/.test(content)) {
        unreachable.push(
          `  - Line +${lineNum}: always-true condition: if (true)`
        );
      }
      if (/if\s*\(\s*false\s*\)/.test(content)) {
        unreachable.push(
          `  - Line +${lineNum}: always-false condition: if (false) — body is unreachable`
        );
      }
      const taut = content.match(/if\s*\(\s*(\w+)\s*===?\s*\1\s*\)/);
      if (taut) {
        unreachable.push(
          `  - Line +${lineNum}: tautological condition: \`${taut[1]} === ${taut[1]}\``
        );
      }
    }

    // ── Edge case checklist from function signatures ──

    const sigRE =
      /(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?\()\s*([^)]{10,})\s*\)/g;
    for (const sig of [...allContent.matchAll(sigRE)].slice(0, 4)) {
      const params = sig[1];
      const checks: string[] = [];
      if (/:\s*(?:string|String)/.test(params))
        checks.push("empty string, whitespace-only");
      if (/:\s*(?:number|Number)/.test(params))
        checks.push("zero, negative, NaN, Infinity");
      if (/:\s*(?:\w+\s*\[\]|Array)/.test(params)) checks.push("empty array");
      if (/[?]|null|undefined/.test(params))
        checks.push("null/undefined optional params");
      if (/Promise|async/.test(params))
        checks.push("concurrent calls, rejection handling");
      if (checks.length) edgeCases.push(`  - ${checks.join(", ")}`);
    }

    const fmt = (title: string, items: string[]) =>
      items.length
        ? `${title}:\n${items.join("\n")}`
        : `${title}:\n  (none found)`;

    const sections = [
      fmt("NULL/UNDEFINED RISKS", nullRisks),
      fmt("ASYNC MISUSE", asyncIssues),
      fmt("UNREACHABLE CONDITIONS", unreachable)
    ];
    if (edgeCases.length)
      sections.push(`EDGE CASE CHECKLIST:\n${edgeCases.join("\n")}`);

    return sections.join("\n\n");
  }
});

// ── Tier 2: traceDataFlow ─────────────────────────────────────────────────────

export const makeTraceDataFlowTool = (
  apiKey: string,
  claudeApiKey?: string,
  modelPref?: "claude" | "deepseek"
) =>
  tool({
    description:
      "LLM sub-call to trace a specific variable through code, identifying mutations, aliasing, and null risks. Call when smartLogicEval flags a null risk on a specific variable.",
    inputSchema: z.object({
      code: z.string().describe("The code section to analyze"),
      variable: z.string().describe("The variable name to trace")
    }),
    execute: async ({ code, variable }: { code: string; variable: string }) => {
      try {
        const llm =
          modelPref === "claude" && claudeApiKey
            ? createAnthropic({ apiKey: claudeApiKey })(
                "claude-haiku-4-5-20251001"
              )
            : createDeepSeek({ apiKey })("deepseek-chat");
        const { text } = await generateText({
          model: llm,
          system: `You are a code analysis tool specializing in data flow. Trace the specified variable through the provided code. Identify where it is assigned, mutated, aliased, passed to functions, and returned. Flag unexpected state changes, shared mutation, or aliasing that could cause bugs. Be concise.\n${SUBCALL_SEVERITY_RUBRIC}`,
          prompt: `Variable to trace: \`${variable}\`\n\n${code}`,
          maxOutputTokens: 512
        });
        return `DATA FLOW: \`${variable}\`\n${text}`;
      } catch (err) {
        return `DATA FLOW: \`${variable}\`\n  (sub-call failed: ${String(err).slice(0, 100)})`;
      }
    }
  });

// ── Tier 2: detectRaceConditions ─────────────────────────────────────────────

export const makeDetectRaceConditionsTool = (
  apiKey: string,
  claudeApiKey?: string,
  modelPref?: "claude" | "deepseek"
) =>
  tool({
    description:
      "LLM sub-call for race conditions and non-atomic operations. Call when the diff contains Promise.all with side effects, shared mutable state, or concurrent async operations.",
    inputSchema: z.object({
      code: z.string().describe("The code section to check for race conditions")
    }),
    execute: async ({ code }: { code: string }) => {
      try {
        const llm =
          modelPref === "claude" && claudeApiKey
            ? createAnthropic({ apiKey: claudeApiKey })(
                "claude-haiku-4-5-20251001"
              )
            : createDeepSeek({ apiKey })("deepseek-chat");
        const { text } = await generateText({
          model: llm,
          system: `You are a concurrency specialist. Analyze the provided code for race conditions, non-atomic operations, and shared state mutation under concurrent access. Focus on async JavaScript/TypeScript patterns. Be specific about the conditions under which the race occurs.

Focus on:
- Non-atomic read-modify-write on shared state
- Promise.all with side effects on shared objects
- Time-of-check to time-of-use (TOCTOU) patterns
- Concurrent requests mutating the same cache entry

If nothing found, respond with exactly: (none found)
${SUBCALL_SEVERITY_RUBRIC}`,
          prompt: code,
          maxOutputTokens: 512
        });
        return `RACE CONDITIONS:\n${text}`;
      } catch (err) {
        return `RACE CONDITIONS:\n  (sub-call failed: ${String(err).slice(0, 100)})`;
      }
    }
  });
