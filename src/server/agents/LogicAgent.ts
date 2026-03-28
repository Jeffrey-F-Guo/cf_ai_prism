import { Agent } from "agents";
import { createWorkersAI } from "workers-ai-provider";
import { generateText } from "ai";
import { fetchFileContentTool } from "../tools/github";
import { smartLogicEval } from "../tools/LogicTools";

export class LogicAgent extends Agent<Env> {
  async analyzeCode(diff: string): Promise<string> {
    const workersai = createWorkersAI({ binding: this.env.AI });

    console.log("LogicAgent: Starting analysis with diff:", diff);

    let result = await generateText({
      model: workersai("@cf/moonshotai/kimi-k2.5"),
      system: `You are a logic correctness reviewer. 
Call the smartLogicEval tool first with the diff to get an initial assessment.
After receiving the tool result, provide your detailed findings about logical correctness.
Focus on: null/undefined handling, off-by-one errors, incorrect conditionals, unreachable code, missing edge cases, incorrect return values, and logical contradictions.`,
      prompt: `Analyze this code diff for logic errors:\n\n${diff}`,
      tools: {
        fetchFileContent: fetchFileContentTool,
        smartLogicEval: smartLogicEval
      }
    });

    // If model stopped at tool-calls without generating text, make a second call with tool results
//     if (!result.text && result.toolResults && result.toolResults.length > 0) {
//       console.log("LogicAgent: Making second call with tool results...");
//       const toolOutput = result.toolResults
//         .map((tr) => `${tr.toolName}: ${tr.output}`)
//         .join("\n");

//       result = await generateText({
//         model: workersai("@cf/moonshotai/kimi-k2.5"),
//         system: `You are a logic correctness reviewer. 
// You called a tool and got this result:
// ${toolOutput}

// Now provide your detailed findings based on the tool assessment.`,
//         prompt: `Analyze this code diff for logic errors:\n\n${diff}`
//       });
//     }

    console.log("LogicAgent: text value:", result.text);
    console.log("LogicAgent: finishReason:", result.finishReason);

    return result.text || "No analysis generated";
  }
}
