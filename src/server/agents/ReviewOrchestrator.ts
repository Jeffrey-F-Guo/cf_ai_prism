import { createWorkersAI } from "workers-ai-provider";
import { AIChatAgent, type OnChatMessageOptions } from "@cloudflare/ai-chat";
import {
  streamText,
  convertToModelMessages,
  pruneMessages,
  tool,
  stepCountIs
} from "ai";
import { z } from "zod";

export class ReviewOrchestrator extends AIChatAgent<Env> {
  maxPersistedMessages = 100;

  async onChatMessage(_onFinish: unknown, options?: OnChatMessageOptions) {
    const workersai = createWorkersAI({ binding: this.env.AI });

    const result = streamText({
      model: workersai("@cf/moonshotai/kimi-k2.5"),
      system: `You are Prism, an AI-powered code review system. 
When a user provides a GitHub PR URL, call the reviewPR tool immediately.
Present the findings clearly, grouped by severity.
Be concise and actionable in your responses.`,
      messages: pruneMessages({
        messages: await convertToModelMessages(this.messages),
        toolCalls: "before-last-2-messages"
      }),
      tools: {
        reviewPR: tool({
          description:
            "Analyze a GitHub pull request and return findings from all specialist agents",
          inputSchema: z.object({
            url: z.string().describe("The GitHub PR URL to review")
          }),
          execute: async ({ url }) => {
            // Mock response — real agent logic goes here in Day 2
            return {
              pr: {
                url,
                title: "feat: implement distributed caching",
                filesChanged: 8,
                additions: 142,
                deletions: 23
              },
              agents: {
                security: {
                  status: "complete",
                  findings: [
                    {
                      severity: "critical",
                      title: "Hardcoded API Key",
                      description:
                        "A plaintext API key was found in config/cache.ts. This will be exposed in version control.",
                      file: "config/cache.ts",
                      line: 14,
                      suggestion:
                        "Move to environment variable: process.env.CACHE_API_KEY"
                    },
                    {
                      severity: "warning",
                      title: "Missing Input Sanitization",
                      description:
                        "Cache keys built from user input without sanitization could allow cache poisoning.",
                      file: "src/cache/keyBuilder.ts",
                      line: 31,
                      suggestion:
                        "Sanitize input before building cache keys using a whitelist approach"
                    }
                  ]
                },
                logic: {
                  status: "complete",
                  findings: [
                    {
                      severity: "warning",
                      title: "Race Condition on Cache Miss",
                      description:
                        "Multiple concurrent requests on cache miss will all hit the origin simultaneously — classic thundering herd.",
                      file: "src/cache/manager.ts",
                      line: 67,
                      suggestion:
                        "Implement a lock or promise coalescing pattern to deduplicate concurrent fetches"
                    },
                    {
                      severity: "suggestion",
                      title: "Unhandled Promise Rejection",
                      description:
                        "refreshCache() is called without await or catch in the request handler.",
                      file: "src/handlers/request.ts",
                      line: 89,
                      suggestion: "Add try/catch or .catch() handler"
                    }
                  ]
                },
                performance: {
                  status: "complete",
                  findings: [
                    {
                      severity: "warning",
                      title: "O(n²) Key Lookup",
                      description:
                        "Cache invalidation iterates all keys for each invalidation request. Will degrade significantly at scale.",
                      file: "src/cache/invalidation.ts",
                      line: 44,
                      suggestion:
                        "Use a Map or index structure for O(1) key lookups"
                    },
                    {
                      severity: "suggestion",
                      title: "Redundant Serialization",
                      description:
                        "JSON.stringify called twice on the same object in the write path.",
                      file: "src/cache/writer.ts",
                      line: 22,
                      suggestion: "Cache the serialized string in a local variable"
                    }
                  ]
                },
                pattern: {
                  status: "complete",
                  findings: [
                    {
                      severity: "suggestion",
                      title: "God Class Anti-Pattern",
                      description:
                        "CacheManager handles reading, writing, invalidation, and metrics — violates single responsibility.",
                      file: "src/cache/manager.ts",
                      line: 1,
                      suggestion:
                        "Split into CacheReader, CacheWriter, CacheInvalidator"
                    },
                    {
                      severity: "suggestion",
                      title: "Magic Numbers",
                      description:
                        "TTL values hardcoded as raw integers throughout the codebase.",
                      file: "src/cache/manager.ts",
                      line: 55,
                      suggestion:
                        "Extract to named constants: const DEFAULT_TTL_SECONDS = 3600"
                    }
                  ]
                }
              },
              summary: {
                score: 72,
                critical: 1,
                warnings: 3,
                suggestions: 4,
                topIssues: [
                  "Hardcoded API key in config/cache.ts",
                  "Race condition on cache miss (thundering herd)",
                  "O(n²) key lookup in invalidation"
                ]
              }
            };
          }
        })
      },
      stopWhen: stepCountIs(5),
      abortSignal: options?.abortSignal
    });

    return result.toUIMessageStreamResponse();
  }
}

