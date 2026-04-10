import { tool } from "ai";
import { z } from "zod";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { SUBCALL_SEVERITY_RUBRIC } from "./prompts";

// ── helpers ───────────────────────────────────────────────────────────────────

interface ParsedLine { lineNum: number; content: string }

function parseAddedLines(diff: string): ParsedLine[] {
  const result: ParsedLine[] = [];
  let currentLine = 0;
  for (const raw of diff.split("\n")) {
    const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) { currentLine = parseInt(hunk[1], 10) - 1; continue; }
    if (raw.startsWith("+") && !raw.startsWith("+++")) {
      currentLine++;
      result.push({ lineNum: currentLine, content: raw.slice(1) });
    } else if (!raw.startsWith("-")) {
      currentLine++;
    }
  }
  return result;
}

const COMPLEXITY_RE = /\b(if|else\s+if|while|for|case|catch)\b|&&|\|\||\?\?|\?\.|(?<!\?)\?(?!\?)/g;
const FUNC_DECL_RE = /(?:async\s+function\s+(\w+)|function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\()/;

interface FuncBlock { name: string; lines: string[] }

function extractFunctions(addedLines: ParsedLine[]): FuncBlock[] {
  const functions: FuncBlock[] = [];
  let current: FuncBlock | null = null;
  for (const { content } of addedLines) {
    const m = content.match(FUNC_DECL_RE);
    if (m) {
      if (current) functions.push(current);
      const name = (m[1] || m[2] || m[3] || "anonymous").trim();
      current = { name, lines: [content] };
    } else if (current) {
      current.lines.push(content);
    }
  }
  if (current) functions.push(current);
  return functions;
}

// ── Tier 1: patternAnalyze ───────────────────────────────────────────────────

export const patternAnalyze = tool({
  description:
    "Compute code quality metrics on changed functions: cyclomatic complexity, function length, parameter count, naming conventions, and SOLID indicators. Always call this first.",
  inputSchema: z.object({
    diff: z.string().describe("The full code diff to analyze for patterns"),
  }),
  execute: async ({ diff }: { diff: string }) => {
    const addedLines = parseAddedLines(diff);
    const allContent = addedLines.map((l) => l.content).join("\n");
    const functions = extractFunctions(addedLines);

    // ── Cyclomatic complexity ──
    const complexFindings: string[] = [];
    for (const fn of functions) {
      const body = fn.lines.join("\n");
      const score = 1 + [...body.matchAll(COMPLEXITY_RE)].length;
      if (score > 10) {
        complexFindings.push(`  - ${fn.name}(): complexity ${score} (threshold: 10)`);
      } else if (functions.length <= 5) {
        complexFindings.push(`  - ${fn.name}(): complexity ${score} — OK`);
      }
    }
    if (!complexFindings.length && functions.length > 5) {
      complexFindings.push("  All changed functions within complexity threshold.");
    }

    // ── Function length ──
    const lengthFindings: string[] = [];
    for (const fn of functions) {
      if (fn.lines.length > 40) {
        lengthFindings.push(`  - ${fn.name}(): ${fn.lines.length} added lines (threshold: 40)`);
      }
    }

    // ── Parameter count ──
    const paramFindings: string[] = [];
    for (const { content } of addedLines) {
      const m = content.match(/(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\()\s*([^)]{20,})\s*\)/);
      if (m) {
        const name = m[1] || m[2];
        const paramCount = m[3].split(",").filter((p) => p.trim().length > 0).length;
        if (paramCount > 4) {
          paramFindings.push(`  - ${name}(): ${paramCount} params (threshold: 4)`);
        }
      }
    }

    // ── Naming conventions ──
    const namingFindings: string[] = [];
    const camelNames = [...allContent.matchAll(/\b[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*\b/g)].map((m) => m[0]);
    const snakeNames = [...allContent.matchAll(/\b[a-z][a-z0-9]*_[a-z][a-z0-9_]*\b/g)].map((m) => m[0]);
    if (camelNames.length > 0 && snakeNames.length > 0) {
      namingFindings.push(
        `  - Mixed conventions: camelCase (e.g. ${camelNames[0]}) and snake_case (e.g. ${snakeNames[0]}) in same diff`
      );
    }

    // ── SOLID indicators ──
    const solidFindings: string[] = [];
    for (const fn of functions) {
      const body = fn.lines.join(" ");
      const ops: string[] = [];
      if (/\bfetch\b|\baxios\b|\bhttp\b/i.test(body)) ops.push("fetch");
      if (/\bJSON\.parse\b|\bparse\b/i.test(body)) ops.push("parse");
      if (/\bvalidat\b|\bassert\b|\bthrow\s/i.test(body)) ops.push("validate");
      if (/\bsave\b|\binsert\b|\bupdate\b|\bpersist\b|\bdb\./i.test(body)) ops.push("persist");
      if (ops.length >= 3) {
        solidFindings.push(`  - ${fn.name}(): performs ${ops.join(" + ")}`);
      }
    }
    for (const { lineNum, content } of addedLines) {
      if (/\bswitch\s*\(\s*\w+\.(?:type|kind|action|event)\s*\)/.test(content)) {
        solidFindings.push(`  - Line +${lineNum}: switch on .type/.kind/.action field`);
      }
    }

    const fmt = (title: string, items: string[]) =>
      items.length ? `${title}:\n${items.join("\n")}` : `${title}:\n  (none found)`;

    return [
      fmt("COMPLEXITY", complexFindings),
      fmt("FUNCTION LENGTH", lengthFindings),
      fmt("PARAMETER COUNT", paramFindings),
      fmt("NAMING", namingFindings),
      fmt("SOLID", solidFindings),
    ].join("\n\n");
  },
});

// ── Tier 4: searchSimilarPatterns ────────────────────────────────────────────

export const makeSearchSimilarPatternsTool = (ai: Ai, vectorize?: VectorizeIndex) =>
  tool({
    description:
      "Query Vectorize for semantically similar patterns from past reviews of the same repo. Call for non-trivial changed functions — pass the function body and repo name extracted from the diff ContentsURL.",
    inputSchema: z.object({
      codeChunk: z.string().describe("The function body or code chunk to search for"),
      repo:      z.string().describe("The repo in owner/repo format, extracted from the ContentsURL in the diff"),
    }),
    execute: async ({ codeChunk, repo }: { codeChunk: string; repo: string }) => {
      if (!vectorize) {
        return "Vectorize not configured — cross-session pattern search unavailable.";
      }
      try {
        const embedding = await ai.run("@cf/baai/bge-base-en-v1.5", {
          text: [codeChunk],
        }) as unknown as { data: number[][] };

        const vector = embedding?.data?.[0];
        if (!vector) return "Embedding generation failed — cannot query Vectorize.";

        const results = await vectorize.query(vector, {
          topK: 3,
          filter: { repo },
          returnMetadata: "all",
        });

        if (!results.matches.length) {
          return `SIMILAR PATTERNS FROM REVIEW HISTORY:\n  No similar patterns on record for "${repo}".`;
        }

        const lines = results.matches.map((m) => {
          const meta = m.metadata as Record<string, unknown>;
          return `  - PR #${meta.prNumber}: similar code pattern in ${meta.filePath}`;
        });

        return `SIMILAR PATTERNS FROM REVIEW HISTORY:\n${lines.join("\n")}`;
      } catch (err) {
        return `SIMILAR PATTERNS FROM REVIEW HISTORY:\n  (query failed: ${String(err).slice(0, 100)})`;
      }
    },
  });

// ── Tier 2: checkArchitecturalPatterns ───────────────────────────────────────

export const makeCheckArchitecturalPatternsTool = (apiKey: string, claudeApiKey?: string, modelPref?: "claude" | "deepseek") =>
  tool({
    description:
      "LLM sub-call for architectural anti-patterns. Call when patternAnalyze reports complexity > 10 or function length > 40 lines.",
    inputSchema: z.object({
      code: z.string().describe("The code section to analyze for architectural issues"),
    }),
    execute: async ({ code }: { code: string }) => {
      try {
        const llm = modelPref === "claude" && claudeApiKey
          ? createAnthropic({ apiKey: claudeApiKey })("claude-haiku-4-5-20251001")
          : createDeepSeek({ apiKey })("deepseek-chat");
        const { text } = await generateText({
          model: llm,
          system: `You are a software architect specializing in code quality. Analyze the provided code for architectural anti-patterns. Focus on structural problems that affect maintainability and extensibility, not style preferences. Be specific about what the violation is and why it matters.

Focus on:
- God object or class doing too much (multiple unrelated responsibilities)
- Feature envy (method more interested in another class's data)
- Layer boundary violations (e.g., data layer producing HTTP responses)
- Dependency inversion violations (high-level module depending on low-level detail)

If nothing found, respond with exactly: (none found)
${SUBCALL_SEVERITY_RUBRIC}`,
          prompt: code,
          maxOutputTokens: 512,
        });
        return `ARCHITECTURAL PATTERNS:\n${text}`;
      } catch (err) {
        return `ARCHITECTURAL PATTERNS:\n  (sub-call failed: ${String(err).slice(0, 100)})`;
      }
    },
  });
