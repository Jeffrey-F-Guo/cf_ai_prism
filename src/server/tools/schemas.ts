import { z } from "zod";

const severityEnum = z.enum(["critical", "warning", "suggestion", "success"]);

// Schema for each analysis agent's extraction step
export const agentFindingSchema = z.object({
  findings: z.array(
    z.object({
      severity: severityEnum,
      title: z.string(),
      description: z.string(),
      fileLocation: z.string().optional(),
    })
  ),
});

// Schema for SummaryAgent's deduplicated output
export const summarySchema = z.object({
  findings: z.array(
    z.object({
      id: z.string(),
      severity: severityEnum,
      title: z.string(),
      description: z.string(),
      agent: z.string().optional(),
      fileLocation: z.string().optional(),
    })
  ),
  score: z.number().min(0).max(100),
  critical: z.number(),
  warnings: z.number(),
  suggestions: z.number(),
});
