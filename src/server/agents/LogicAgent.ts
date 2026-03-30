import { Agent } from "agents";
import { createWorkersAI } from "workers-ai-provider";
import { generateText, stepCountIs } from "ai";
import { fetchFileContentTool } from "../tools/github";
import { smartLogicEval } from "../tools/LogicTools";

export class LogicAgent extends Agent<Env> {
  async analyzeCode(diff: string): Promise<string> {
    const workersai = createWorkersAI({ binding: this.env.AI });

    const result = await generateText({
      model: workersai("@cf/mistralai/mistral-small-3.1-24b-instruct"),
      system: `You are a logic correctness reviewer.
IMPORTANT: You MUST use the smartLogicEval tool to evaluate the code diff first.
After calling the tool and getting the result, you MUST provide your detailed analysis as text. Do NOT just call tools - generate a final response.`,
      prompt: `Analyze this code diff for logic errors:\n\n${diff}`,
      tools: {
        fetchFileContent: fetchFileContentTool,
        smartLogicEval: smartLogicEval
      },
      stopWhen: stepCountIs(3)
    });

    return result.text || "Analysis completed but no text was generated";
  }
}
