import { AgentWorkflow } from "agents/workflows";
import type { AgentWorkflowEvent, AgentWorkflowStep } from "agents/workflows";
import type { ReviewOrchestrator } from "../agents/ReviewOrchestrator";
import type { LogicAgent } from "../agents/LogicAgent";
import type { SecurityAgent } from "../agents/SecurityAgent";
import type { PerformanceAgent } from "../agents/PerformanceAgent";
import type { PatternAgent } from "../agents/PatternAgent";
import type { SummaryAgent, SummaryResult } from "../agents/SummaryAgent";

type ReviewParams = {
  diff: string;
};

export class ReviewWorkflow extends AgentWorkflow<
  ReviewOrchestrator,
  ReviewParams,
  { agent: string; status: string }
> {
  async run(event: AgentWorkflowEvent<ReviewParams>, step: AgentWorkflowStep) {
    const { diff } = event.payload;

    await this.reportProgress({ agent: "all", status: "starting" });

    // Step 1: Fan out all 4 agents in parallel
    const [logicResult, securityResult, performanceResult, patternResult] =
      await Promise.all([
        step.do(
          "logic-agent",
          { retries: { limit: 2, delay: "10 seconds" } },
          async () => {
            await this.reportProgress({ agent: "logic", status: "running" });
            const env = this.env as Env & {
              LogicAgent: DurableObjectNamespace<LogicAgent>;
            };
            const id = env.LogicAgent.newUniqueId();
            const agent = env.LogicAgent.get(id);
            const result = await agent.analyzeCode(diff);
            await this.reportProgress({ agent: "logic", status: "complete" });
            return result;
          }
        ),

        step.do(
          "security-agent",
          { retries: { limit: 2, delay: "10 seconds" } },
          async () => {
            await this.reportProgress({ agent: "security", status: "running" });
            const env = this.env as Env & {
              SecurityAgent: DurableObjectNamespace<SecurityAgent>;
            };
            const id = env.SecurityAgent.newUniqueId();
            const agent = env.SecurityAgent.get(id);
            const result = await agent.analyzeCode(diff);
            await this.reportProgress({ agent: "security", status: "complete" });
            return result;
          }
        ),

        step.do(
          "performance-agent",
          { retries: { limit: 2, delay: "10 seconds" } },
          async () => {
            await this.reportProgress({ agent: "performance", status: "running" });
            const env = this.env as Env & {
              PerformanceAgent: DurableObjectNamespace<PerformanceAgent>;
            };
            const id = env.PerformanceAgent.newUniqueId();
            const agent = env.PerformanceAgent.get(id);
            const result = await agent.analyzeCode(diff);
            await this.reportProgress({ agent: "performance", status: "complete" });
            return result;
          }
        ),

        step.do(
          "pattern-agent",
          { retries: { limit: 2, delay: "10 seconds" } },
          async () => {
            await this.reportProgress({ agent: "pattern", status: "running" });
            const env = this.env as Env & {
              PatternAgent: DurableObjectNamespace<PatternAgent>;
            };
            const id = env.PatternAgent.newUniqueId();
            const agent = env.PatternAgent.get(id);
            const result = await agent.analyzeCode(diff);
            await this.reportProgress({ agent: "pattern", status: "complete" });
            return result;
          }
        )
      ]);

    // Step 2: SummaryAgent compiles, deduplicates, and chunks all results
    const summaryResult = await step.do(
      "summary-agent",
      { retries: { limit: 2, delay: "10 seconds" } },
      async () => {
        await this.reportProgress({ agent: "summary", status: "running" });
        const env = this.env as Env & {
          SummaryAgent: DurableObjectNamespace<SummaryAgent>;
        };
        const id = env.SummaryAgent.newUniqueId();
        const agent = env.SummaryAgent.get(id);
        const result = await agent.summarize({
          logic: logicResult,
          security: securityResult,
          performance: performanceResult,
          pattern: patternResult
        });
        await this.reportProgress({ agent: "summary", status: "complete" });
        // Spread into a plain object to strip the Disposable intersection added by DO RPC
        return { findings: result.findings, summary: result.summary };
      }
    ) as unknown as SummaryResult;

    const { findings, summary } = summaryResult;

    // Broadcast structured findings to all connected clients
    this.broadcastToClients({
      type: "review_complete",
      findings,
      summary
    });

    await step.reportComplete({ findings, summary });
    return { findings, summary };
  }
}
