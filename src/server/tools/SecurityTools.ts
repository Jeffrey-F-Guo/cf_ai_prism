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

// ── Tier 1: securityScan ─────────────────────────────────────────────────────

const CREDENTIAL_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: "OpenAI API key", regex: /sk-[a-zA-Z0-9]{20,}/ },
  { name: "GitHub personal access token", regex: /ghp_[a-zA-Z0-9]{36}/ },
  { name: "AWS access key ID", regex: /AKIA[0-9A-Z]{16}/ },
  { name: "Slack bot token", regex: /xoxb-[0-9]+-[a-zA-Z0-9]+/ },
  { name: "Slack user token", regex: /xoxp-[0-9]+-[a-zA-Z0-9]+/ },
  { name: "JWT literal", regex: /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/ },
  { name: "Bearer token literal", regex: /[Bb]earer\s+[a-zA-Z0-9_\-.]{20,}/ },
  {
    name: "hardcoded password/secret/key",
    regex:
      /(password|secret|api_key|apikey|api_secret)\s*[:=]\s*['"][^'"]{8,}['"]/i
  }
];

const DANGEROUS_FN_PATTERNS: Array<{
  name: string;
  regex: RegExp;
  needsAuthContext?: boolean;
}> = [
  { name: "eval() usage", regex: /\beval\s*\(/ },
  { name: "new Function() constructor", regex: /new\s+Function\s*\(/ },
  { name: "innerHTML assignment", regex: /\.innerHTML\s*=/ },
  { name: "dangerouslySetInnerHTML usage", regex: /dangerouslySetInnerHTML/ },
  {
    name: "Math.random() in security context",
    regex: /Math\.random\(\)/,
    needsAuthContext: true
  },
  { name: "MD5 hash usage", regex: /\bmd5\s*\(/, needsAuthContext: true },
  { name: "SHA1 hash usage", regex: /\bsha1\s*\(/, needsAuthContext: true }
];

const SQL_INJECTION_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  {
    name: "template literal SQL",
    regex: /`[^`]*(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE)\b[^`]*\$\{/i
  },
  {
    name: "string concatenation SQL",
    regex: /"(SELECT|INSERT|UPDATE|DELETE)\s[^"]+"\s*\+\s*(?!['"])/i
  }
];

const AUTH_MISUSE_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: "hardcoded admin role check", regex: /role\s*===?\s*['"]admin['"]/ },
  {
    name: "hardcoded superuser role check",
    regex: /role\s*===?\s*['"]superuser['"]/
  }
];

export const securityScan = tool({
  description:
    "Regex scan of added diff lines for credential patterns, dangerous functions, SQL injection, and auth misuse. Always call this first.",
  inputSchema: z.object({
    diff: z.string().describe("The full code diff to scan")
  }),
  execute: async ({ diff }: { diff: string }) => {
    const addedLines = parseAddedLines(diff);
    const isAuthContext =
      /(token|session|csrf|auth|secret|key|password|credential)/i.test(diff);

    const credentialFindings: string[] = [];
    const dangerousFindings: string[] = [];
    const sqlFindings: string[] = [];
    const authMisuseFindings: string[] = [];

    for (const { lineNum, content } of addedLines) {
      for (const p of CREDENTIAL_PATTERNS) {
        if (p.regex.test(content)) {
          const match = content.match(p.regex)?.[0] ?? "";
          const preview =
            match.length > 40 ? match.slice(0, 40) + "..." : match;
          credentialFindings.push(
            `  - Line +${lineNum}: ${p.name} — matched: ${preview}`
          );
        }
      }
      for (const p of DANGEROUS_FN_PATTERNS) {
        if (p.regex.test(content) && (!p.needsAuthContext || isAuthContext)) {
          dangerousFindings.push(`  - Line +${lineNum}: ${p.name}`);
        }
      }
      for (const p of SQL_INJECTION_PATTERNS) {
        if (p.regex.test(content)) {
          sqlFindings.push(`  - Line +${lineNum}: ${p.name}`);
        }
      }
      for (const p of AUTH_MISUSE_PATTERNS) {
        if (p.regex.test(content)) {
          authMisuseFindings.push(`  - Line +${lineNum}: ${p.name}`);
        }
      }
    }

    if (
      !credentialFindings.length &&
      !dangerousFindings.length &&
      !sqlFindings.length &&
      !authMisuseFindings.length
    ) {
      return "No credential patterns, dangerous functions, auth misuse, or SQL injection indicators detected in added lines.";
    }

    const fmt = (title: string, items: string[]) =>
      items.length
        ? `${title}:\n${items.join("\n")}`
        : `${title}:\n  (none found)`;

    return [
      fmt("CREDENTIAL PATTERNS FOUND", credentialFindings),
      fmt("DANGEROUS FUNCTIONS", dangerousFindings),
      fmt("AUTH MISUSE", authMisuseFindings),
      fmt("SQL INJECTION INDICATORS", sqlFindings)
    ].join("\n\n");
  }
});

// ── Tier 2: checkAuthPatterns ─────────────────────────────────────────────────

export const makeCheckAuthPatternsTool = (
  apiKey: string,
  claudeApiKey?: string,
  modelPref?: "claude" | "deepseek"
) =>
  tool({
    description:
      "LLM sub-call for auth anti-patterns: missing token verification, session misconfiguration, privilege escalation. Call when the diff contains auth/token/session/JWT/crypto code.",
    inputSchema: z.object({
      code: z
        .string()
        .describe("The relevant auth-related code section from the diff")
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
          system: `You are a security code auditor specializing in authentication and authorization. Analyze the provided code for auth anti-patterns only. Return findings as a structured list with line references where possible. Be specific and avoid false positives.

Focus on:
- Missing token verification (JWT without signature check)
- Session without expiry or Secure/HttpOnly flags
- Privilege escalation paths (role check bypassable)
- Insecure direct object reference
- Missing rate limiting on auth endpoints
- Password hashing with insufficient rounds

If nothing found, respond with exactly: (none found)
${SUBCALL_SEVERITY_RUBRIC}`,
          prompt: code,
          maxOutputTokens: 512
        });
        return `AUTH PATTERN FINDINGS:\n${text}`;
      } catch (err) {
        return `AUTH PATTERN FINDINGS:\n  (sub-call failed: ${String(err).slice(0, 100)})`;
      }
    }
  });

// ── Tier 3: analyzeDependencies ───────────────────────────────────────────────

export const analyzeDependencies = tool({
  description:
    "Query OSV.dev for CVEs in changed dependencies. Call only when the diff modifies package.json, requirements.txt, go.mod, Cargo.toml, or similar dependency files.",
  inputSchema: z.object({
    diff: z
      .string()
      .describe("The diff section containing dependency file changes")
  }),
  execute: async ({ diff }: { diff: string }) => {
    const addedLines = diff
      .split("\n")
      .filter((l) => l.startsWith("+") && !l.startsWith("+++"))
      .map((l) => l.slice(1));

    const packages: Array<{
      name: string;
      version: string;
      ecosystem: string;
    }> = [];

    for (const line of addedLines) {
      // npm (package.json)
      const npm = line.match(
        /"(@?[a-zA-Z0-9/_.-]+)":\s*"[~^]?([0-9]+\.[0-9]+\.[0-9][^"]*)"/
      );
      if (npm) {
        packages.push({ name: npm[1], version: npm[2], ecosystem: "npm" });
        continue;
      }
      // PyPI (requirements.txt / Pipfile)
      const pypi = line.match(/^([a-zA-Z0-9._-]+)==([0-9]+\.[0-9.]+)/);
      if (pypi)
        packages.push({ name: pypi[1], version: pypi[2], ecosystem: "PyPI" });
    }

    if (!packages.length) {
      return "No parseable package versions found in diff. Cannot query CVE database.";
    }

    const toCheck = packages.slice(0, 5);
    const results: string[] = [];

    for (const pkg of toCheck) {
      try {
        const resp = await fetch("https://api.osv.dev/v1/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            version: pkg.version,
            package: { name: pkg.name, ecosystem: pkg.ecosystem }
          })
        });

        if (!resp.ok) {
          results.push(
            `  - ${pkg.name}@${pkg.version}: query failed (HTTP ${resp.status})`
          );
          continue;
        }

        type OsvVuln = {
          id: string;
          summary?: string;
          database_specific?: { severity?: string };
        };
        const data = (await resp.json()) as { vulns?: OsvVuln[] };

        if (!data.vulns?.length) {
          results.push(`  - ${pkg.name}@${pkg.version}: no known CVEs`);
        } else {
          for (const v of data.vulns.slice(0, 3)) {
            const sev = v.database_specific?.severity ?? "UNKNOWN";
            results.push(
              `  - ${pkg.name}@${pkg.version}: ${v.id} (${sev}) — ${v.summary ?? "see advisory"}`
            );
          }
        }
      } catch {
        results.push(
          `  - ${pkg.name}@${pkg.version}: query failed (network error)`
        );
      }
    }

    return [
      "DEPENDENCY VULNERABILITIES:",
      results.join("\n"),
      "\nNOTES: CVE data from OSV.dev. Check the npm advisory database for additional advisories."
    ].join("\n");
  }
});
