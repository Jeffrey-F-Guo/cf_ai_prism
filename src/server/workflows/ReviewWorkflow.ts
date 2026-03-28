import { AgentWorkflow } from "agents/workflows";
import type { AgentWorkflowEvent, AgentWorkflowStep } from "agents/workflows";
import type { ReviewOrchestrator } from "../agents/ReviewOrchestrator";
import type { LogicAgent } from "../agents/LogicAgent";
import type { SecurityAgent } from "../agents/SecurityAgent";
import type { PerformanceAgent } from "../agents/PerformanceAgent";
import type { PatternAgent } from "../agents/PatternAgent";

type ReviewParams = {
  diff: string;
};

type ReviewResult = {
  logic: string;
  security: string;
  performance: string;
  pattern: string;
};

export class ReviewWorkflow extends AgentWorkflow<
  ReviewOrchestrator,
  ReviewParams,
  { agent: string; status: string }
> {
  async run(event: AgentWorkflowEvent<ReviewParams>, step: AgentWorkflowStep) {
    const { diff } = event.payload;

    await this.reportProgress({ agent: "all", status: "starting" });

    // Fan out: run all 4 agents in parallel using step.do
    const [logicResult, securityResult, performanceResult, patternResult] =
      await Promise.all([
        // Logic Agent
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

        // Security Agent
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

        // Performance Agent
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

        // Pattern Agent
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

    const result: ReviewResult = {
      logic: logicResult,
      security: securityResult,
      performance: performanceResult,
      pattern: patternResult
    };

    // Broadcast to clients
    this.broadcastToClients({
      type: "review_complete",
      result
    });

    await step.reportComplete(result);
    return result;
  }
}
