import { routeAgentRequest } from "agents";
import { ReviewOrchestrator } from "./agents/ReviewOrchestrator";
import { LogicAgent } from "./agents/LogicAgent";
import { PerformanceAgent } from "./agents/PerformanceAgent";
import { SecurityAgent } from "./agents/SecurityAgent";
import { PatternAgent } from "./agents/PatternAgent";
import { ReviewWorkflow } from "./workflows/ReviewWorkflow";

export {
  ReviewOrchestrator,
  LogicAgent,
  PerformanceAgent,
  SecurityAgent,
  PatternAgent,
  ReviewWorkflow
};

export default {
  async fetch(request: Request, env: Env) {
    return (
      (await routeAgentRequest(request, env)) ||
      new Response("Not found", { status: 404 })
    );
  }
} satisfies ExportedHandler<Env>;
