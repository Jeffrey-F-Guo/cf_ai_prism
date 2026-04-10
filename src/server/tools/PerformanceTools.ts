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

const HOT_NAME_RE =
  /\b(check|handle|process|request|middleware|validate|get|post|put|delete|fetch|call|invoke|respond|route|dispatch|serve|execute)\b/i;
const COLD_NAME_RE =
  /\b(evict|cleanup|clean|init|migrate|cron|purge|setup|seed|destroy|bootstrap|teardown|prune|vacuum|flush|reset|rebuild)\b/i;
const LOOP_RE =
  /\b(for\s*\(|for\s+(?:const|let|var)\s+\w|while\s*\()|\.(?:forEach|map|filter|reduce|flatMap)\s*\(/;
const BOUNDS_RE =
  /(maxKeys|maxSize|maxItems|capacity|limit|max|size)\s*[:=]\s*(\d+)/gi;
const BOUNDS_REF_RE = /\b(maxKeys|maxSize|maxItems|capacity|limit|max)\b/gi;
const DB_CALL_RE =
  /\b(fetch|query|findOne|findById|\.where|db\.|prisma\.|supabase\.|execute|runQuery)\b/i;

// ── Tier 1: performanceAnalyze ───────────────────────────────────────────────

export const performanceAnalyze = tool({
  description:
    "Parse diff structure to determine call-path context, loop patterns, collection bounds, and N+1 indicators. Always call this first.",
  inputSchema: z.object({
    diff: z.string().describe("The full code diff to analyze")
  }),
  execute: async ({ diff }: { diff: string }) => {
    const addedLines = parseAddedLines(diff);
    const allContent = addedLines.map((l) => l.content).join("\n");

    // ── Call context detection ──
    const hotFunctions: string[] = [];
    const coldFunctions: string[] = [];
    const coldDocKeywords: string[] = [];
    const seenNames = new Set<string>();

    for (const { content } of addedLines) {
      const m = content.match(
        /(?:async\s+function\s+(\w+)|function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\()/
      );
      if (m) {
        const name = (m[1] || m[2] || m[3] || "").trim();
        if (
          name.length > 1 &&
          !["if", "for", "while", "new", "return"].includes(name) &&
          !seenNames.has(name)
        ) {
          seenNames.add(name);
          if (HOT_NAME_RE.test(name)) hotFunctions.push(`${name}()`);
          else if (COLD_NAME_RE.test(name)) coldFunctions.push(`${name}()`);
        }
      }
      // Docstring/comment cold-path keywords
      if (/^\s*[/*]/.test(content)) {
        const kw = content.match(
          /\b(cron|scheduled|startup|initialization|one.time|maintenance)\b/i
        )?.[0];
        if (kw && !coldDocKeywords.includes(`"${kw}"`))
          coldDocKeywords.push(`"${kw}"`);
      }
    }

    // ── Loop detection ──
    const loops: string[] = [];
    for (let i = 0; i < addedLines.length; i++) {
      const { lineNum, content } = addedLines[i];
      if (!LOOP_RE.test(content)) continue;

      const loopType = content.match(LOOP_RE)?.[0].trim() ?? "loop";
      const lookahead = addedLines
        .slice(i + 1, i + 12)
        .map((l) => l.content)
        .join(" ");
      const hasAwait = /\bawait\b/.test(lookahead);
      const isNested = LOOP_RE.test(lookahead);

      const flags: string[] = [];
      if (hasAwait) flags.push("HAS AWAIT — potential N+1");
      if (isNested) flags.push("NESTED — potential O(n²)");

      loops.push(
        `  - Line +${lineNum}: ${loopType}${flags.length ? " — " + flags.join(", ") : " — no await, not nested"}`
      );
    }

    // ── Bounds inference ──
    const bounds: string[] = [];
    const seenBounds = new Set<string>();
    for (const m of allContent.matchAll(BOUNDS_RE)) {
      const key = `${m[1].toLowerCase()}=${m[2]}`;
      if (!seenBounds.has(key)) {
        seenBounds.add(key);
        bounds.push(`  - ${m[1]} = ${m[2]} (explicit constant)`);
      }
    }
    // Bound variable names referenced without explicit value
    const refNames = [...allContent.matchAll(BOUNDS_REF_RE)]
      .map((m) => m[0].toLowerCase())
      .filter(
        (n, i, arr) =>
          arr.indexOf(n) === i &&
          !bounds.some((b) => b.toLowerCase().startsWith(`  - ${n} =`))
      );
    for (const name of refNames) {
      bounds.push(
        `  - ${name} referenced as loop bound (value from config or parameter)`
      );
    }

    // ── N+1 indicators ──
    const n1Indicators: string[] = [];
    for (let i = 0; i < addedLines.length; i++) {
      const { lineNum, content } = addedLines[i];
      if (!LOOP_RE.test(content)) continue;
      const lookahead = addedLines
        .slice(i + 1, i + 12)
        .map((l) => l.content)
        .join(" ");
      if (/\bawait\b/.test(lookahead) && DB_CALL_RE.test(lookahead)) {
        n1Indicators.push(
          `  - Line +${lineNum}: loop contains await on DB/fetch call — verify this cannot be batched`
        );
      }
    }

    // ── Build output ──
    const contextLines: string[] = [];
    if (hotFunctions.length)
      contextLines.push(
        `  Hot-path functions (per-request): ${hotFunctions.join(", ")}`
      );
    if (coldFunctions.length)
      contextLines.push(
        `  Cold-path functions (maintenance/cron): ${coldFunctions.join(", ")}`
      );
    if (coldDocKeywords.length)
      contextLines.push(`  Docstring keywords: ${coldDocKeywords.join(", ")}`);
    if (!contextLines.length)
      contextLines.push(
        "  No function names or comments indicate hot/cold path classification."
      );

    const fmt = (title: string, items: string[]) =>
      items.length
        ? `${title}:\n${items.join("\n")}`
        : `${title}:\n  (none found)`;

    const sections = [
      `CALL CONTEXT:\n${contextLines.join("\n")}`,
      fmt("LOOP ANALYSIS", loops),
      bounds.length
        ? `BOUNDED COLLECTIONS:\n${bounds.join("\n")}`
        : "BOUNDED COLLECTIONS:\n  (no explicit bounds — treat loops as potentially unbounded)",
      fmt("N+1 INDICATORS", n1Indicators)
    ];

    return sections.join("\n\n");
  }
});

// ── Tier 2: analyzeMemoryPatterns ────────────────────────────────────────────

export const makeAnalyzeMemoryPatternsTool = (
  apiKey: string,
  claudeApiKey?: string,
  modelPref?: "claude" | "deepseek"
) =>
  tool({
    description:
      "LLM sub-call for memory leak patterns and unbounded growth risks. Call when the diff touches caches, event listeners, closures, or Worker-level globals.",
    inputSchema: z.object({
      code: z.string().describe("The code section to analyze for memory risks")
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
          system: `You are a performance engineer specializing in memory management. Analyze the provided code for memory leak patterns and unbounded growth risks only. Be specific about what causes the leak and under what conditions it occurs.

Focus on:
- Event listener added without corresponding removal
- Closure capturing a large object unnecessarily
- Unbounded cache or Map with no eviction
- Missing cleanup in useEffect / component unmount
- Worker-level global state that grows per request

If nothing found, respond with exactly: (none found)
${SUBCALL_SEVERITY_RUBRIC}`,
          prompt: code,
          maxOutputTokens: 512
        });
        return `MEMORY RISKS:\n${text}`;
      } catch (err) {
        return `MEMORY RISKS:\n  (sub-call failed: ${String(err).slice(0, 100)})`;
      }
    }
  });

// ── Tier 2: findBlockingOperations ───────────────────────────────────────────

export const makeFindBlockingOperationsTool = (
  apiKey: string,
  claudeApiKey?: string,
  modelPref?: "claude" | "deepseek"
) =>
  tool({
    description:
      "LLM sub-call for async misuse and blocking operations. Call when the diff contains async functions, sequential awaits, or Promise usage.",
    inputSchema: z.object({
      code: z
        .string()
        .describe("The code section to analyze for blocking operations")
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
          system: `You are a Cloudflare Workers performance specialist. Analyze the provided code for blocking operations and async misuse. Focus on operations that would block the event loop or cause unnecessary sequential execution.

Focus on:
- Sequential awaits on independent calls that could be Promise.all
- Missing await causing an unhandled Promise
- JSON.parse/stringify on large payloads in a hot path
- CPU-intensive synchronous operations in request handler context

If nothing found, respond with exactly: (none found)
${SUBCALL_SEVERITY_RUBRIC}`,
          prompt: code,
          maxOutputTokens: 512
        });
        return `BLOCKING OPERATIONS:\n${text}`;
      } catch (err) {
        return `BLOCKING OPERATIONS:\n  (sub-call failed: ${String(err).slice(0, 100)})`;
      }
    }
  });
