export type ReviewStage = "landing" | "processing" | "completed";

export type AgentStatus = "analyzing" | "queued" | "completed";

export type FindingSeverity = "critical" | "warning" | "suggestion" | "success";

export interface AgentTask {
  id: string;
  text: string;
  status: "active" | "pending" | "completed";
}

export interface Agent {
  id: string;
  icon: string;
  iconColor: "error" | "primary" | "secondary";
  title: string;
  subtitle: string;
  status: AgentStatus;
  tasks: AgentTask[];
}

export interface FindingCodeBlock {
  type: "addition" | "deletion" | "unchanged";
  code: string;
}

export interface Finding {
  id: string;
  severity: FindingSeverity;
  title: string;
  description: string;
  fileLocation?: string;
  codeDiff?: FindingCodeBlock[];
}

export interface PRMetadata {
  title: string;
  repoName: string;
  prNumber: number;
  filesChanged: number;
  contributors: number;
}

export interface ReviewSummary {
  score: number;
  grade: string;
  critical: number;
  warnings: number;
  suggestions: number;
  duration?: string;
  cost?: string;
}

export interface ReviewHistoryItem {
  id: string;
  prNumber: number;
  prTitle: string;
  score: number;
  timeAgo: string;
}
