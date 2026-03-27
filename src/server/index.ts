import { routeAgentRequest } from "agents";
import { ReviewOrchestrator } from "./agents/ReviewOrchestrator";

export { ReviewOrchestrator };
export default {
  async fetch(request: Request, env: Env) {
    return (
      (await routeAgentRequest(request, env)) ||
      new Response("Not found", { status: 404 })
    );
  }
} satisfies ExportedHandler<Env>;