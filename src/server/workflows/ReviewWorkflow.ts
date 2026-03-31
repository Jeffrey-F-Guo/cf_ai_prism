import { AgentWorkflow } from "agents/workflows";
import type { AgentWorkflowEvent, AgentWorkflowStep } from "agents/workflows";
import type { ReviewOrchestrator } from "../agents/ReviewOrchestrator";
import type { LogicAgent } from "../agents/LogicAgent";
import type { SecurityAgent } from "../agents/SecurityAgent";
import type { PerformanceAgent } from "../agents/PerformanceAgent";
import type { PatternAgent } from "../agents/PatternAgent";
import type { SummaryAgent, SummaryResult } from "../agents/SummaryAgent";
import type { Finding } from "../../types/review";

type ReviewParams = {
  diff: string;
  agents: Array<"logic" | "security" | "performance" | "pattern">;
  rigor: "quick" | "standard" | "deep";
  focus?: string;
};

export class ReviewWorkflow extends AgentWorkflow<
  ReviewOrchestrator,
  ReviewParams,
  { agent: string; status: string }
> {
  async run(event: AgentWorkflowEvent<ReviewParams>, step: AgentWorkflowStep) {
    const { diff, agents: enabledAgents, focus } = event.payload;

    await this.reportProgress({ agent: "all", status: "starting" });

    // Fan out enabled agents in parallel — skipped agents return [] immediately
    const [logicResult, securityResult, performanceResult, patternResult] =
      await Promise.all([
        enabledAgents.includes("logic")
          ? step.do(
              "logic-agent",
              { retries: { limit: 2, delay: "10 seconds" } },
              async () => {
                await this.reportProgress({ agent: "logic", status: "running" });
                this.broadcastToClients({ type: "log_entry", message: "Logic agent: analyzing edge cases and null handling..." });
                const env = this.env as Env & {
                  LogicAgent: DurableObjectNamespace<LogicAgent>;
                };
                const id = env.LogicAgent.newUniqueId();
                const agent = env.LogicAgent.get(id);
                const result = await agent.analyzeCode(diff, focus);
                await this.reportProgress({ agent: "logic", status: "complete" });
                this.broadcastToClients({ type: "log_entry", message: `Logic agent: complete (${result.length} findings)` });
                return [...result] as Finding[];
              }
            )
          : Promise.resolve([] as Finding[]),

        enabledAgents.includes("security")
          ? step.do(
              "security-agent",
              { retries: { limit: 2, delay: "10 seconds" } },
              async () => {
                await this.reportProgress({ agent: "security", status: "running" });
                this.broadcastToClients({ type: "log_entry", message: "Security agent: scanning for vulnerabilities..." });
                const env = this.env as Env & {
                  SecurityAgent: DurableObjectNamespace<SecurityAgent>;
                };
                const id = env.SecurityAgent.newUniqueId();
                const agent = env.SecurityAgent.get(id);
                const result = await agent.analyzeCode(diff, focus);
                await this.reportProgress({ agent: "security", status: "complete" });
                this.broadcastToClients({ type: "log_entry", message: `Security agent: complete (${result.length} findings)` });
                return [...result] as Finding[];
              }
            )
          : Promise.resolve([] as Finding[]),

        enabledAgents.includes("performance")
          ? step.do(
              "performance-agent",
              { retries: { limit: 2, delay: "10 seconds" } },
              async () => {
                await this.reportProgress({ agent: "performance", status: "running" });
                this.broadcastToClients({ type: "log_entry", message: "Performance agent: profiling complexity and memory..." });
                const env = this.env as Env & {
                  PerformanceAgent: DurableObjectNamespace<PerformanceAgent>;
                };
                const id = env.PerformanceAgent.newUniqueId();
                const agent = env.PerformanceAgent.get(id);
                const result = await agent.analyzeCode(diff, focus);
                await this.reportProgress({ agent: "performance", status: "complete" });
                this.broadcastToClients({ type: "log_entry", message: `Performance agent: complete (${result.length} findings)` });
                return [...result] as Finding[];
              }
            )
          : Promise.resolve([] as Finding[]),

        enabledAgents.includes("pattern")
          ? step.do(
              "pattern-agent",
              { retries: { limit: 2, delay: "10 seconds" } },
              async () => {
                await this.reportProgress({ agent: "pattern", status: "running" });
                this.broadcastToClients({ type: "log_entry", message: "Pattern agent: checking SOLID principles and anti-patterns..." });
                const env = this.env as Env & {
                  PatternAgent: DurableObjectNamespace<PatternAgent>;
                };
                const id = env.PatternAgent.newUniqueId();
                const agent = env.PatternAgent.get(id);
                const result = await agent.analyzeCode(diff, focus);
                await this.reportProgress({ agent: "pattern", status: "complete" });
                this.broadcastToClients({ type: "log_entry", message: `Pattern agent: complete (${result.length} findings)` });
                return [...result] as Finding[];
              }
            )
          : Promise.resolve([] as Finding[])
      ]);

    // SummaryAgent compiles, deduplicates, and scores all results
    const summaryResult = await step.do(
      "summary-agent",
      { retries: { limit: 2, delay: "10 seconds" } },
      async () => {
        await this.reportProgress({ agent: "summary", status: "running" });
        this.broadcastToClients({ type: "log_entry", message: "Summary agent: compiling and deduplicating findings..." });
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
        this.broadcastToClients({ type: "log_entry", message: `Review complete — ${result.findings.length} findings, score ${result.summary.score}/100` });
        return { findings: result.findings, summary: result.summary };
      }
    ) as unknown as SummaryResult;

    const { findings, summary } = summaryResult;

    this.broadcastToClients({
      type: "review_complete",
      findings,
      summary
    });

    await step.reportComplete({ findings, summary });
    return { findings, summary };
  }
}
