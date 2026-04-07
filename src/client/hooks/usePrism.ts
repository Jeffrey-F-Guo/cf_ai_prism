import { useState, useEffect, useRef, useCallback } from "react";
import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import type { UIMessage } from "ai";
import type { ReviewOrchestrator } from "../../server/agents/ReviewOrchestrator";
import type {
  ReviewStage,
  Agent,
  Finding,
  PRMetadata,
  ReviewSummary,
  ReviewHistoryItem,
  LogEntry,
  SteeringConfig
} from "../../types/review";

function formatTimeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}

type HistoryRow = {
  id: string;
  pr_number: number;
  pr_title: string;
  score: number;
  created_at: number;
};

// State interface
export interface PrismState {
  // UI State
  connected: boolean;
  input: string;
  setInput: (value: string) => void;
  leftCollapsed: boolean;
  setLeftCollapsed: (value: boolean) => void;
  rightCollapsed: boolean;
  setRightCollapsed: (value: boolean) => void;
  stage: ReviewStage;
  setStage: (stage: ReviewStage) => void;
  hasHistoryRecords: boolean;

  // Refs
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;

  // Chat
  messages: UIMessage[];
  clearHistory: () => void;
  stop: () => void;
  isStreaming: boolean;
  send: () => void;
  submitSteering: (config: SteeringConfig) => void;
  quotedFinding: Finding | null;
  quoteFinding: (finding: Finding) => void;
  clearQuotedFinding: () => void;

  // Review Data
  prMetadata: PRMetadata | null;
  agents: Agent[];
  findings: Finding[];
  reviewHistory: ReviewHistoryItem[];
  reviewSummary: ReviewSummary | null;
  logs: LogEntry[];
  loadHistoryReview: (id: string) => void;
  deleteReview: (id: string) => void;
}

export function usePrism(): PrismState {
  const [connected, setConnected] = useState(false);
  const [input, setInput] = useState("");
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [stage, setStage] = useState<ReviewStage>("landing");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [prMetadata, setPRMetadata] = useState<PRMetadata | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [reviewHistory, setReviewHistory] = useState<ReviewHistoryItem[]>([]);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [quotedFinding, setQuotedFinding] = useState<Finding | null>(null);

  const fetchHistory = useCallback(() => {
    fetch("/api/reviews?limit=20")
      .then((r) => r.json())
      .then((rows: unknown) => (rows as HistoryRow[]))
      .then((rows) => {
        setReviewHistory(rows.map((row) => ({
          id: row.id,
          prNumber: row.pr_number,
          prTitle: row.pr_title,
          score: row.score,
          timeAgo: formatTimeAgo(row.created_at)
        })));
      })
      .catch(() => {});
  }, []);

  // Load history on mount
  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const agent = useAgent<ReviewOrchestrator>({
    agent: "ReviewOrchestrator",
    onOpen: useCallback(() => setConnected(true), []),
    onClose: useCallback(() => setConnected(false), []),
    onError: useCallback(
      (error: Event) => console.error("WebSocket error:", error),
      []
    ),
    onMessage: useCallback((event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Broadcast event:", data);

        if (data.type === "log_entry") {
          setLogs((prev) => [
            ...prev,
            { id: crypto.randomUUID(), message: data.message, ts: Date.now() }
          ]);
        } else if (data.type === "stage_change") {
          setStage(data.stage);
        } else if (data.type === "agent_task") {
          setAgents((prev) => prev.map((a) => {
            if (a.id !== data.agent) return a;
            // Mark previous active task as completed, append new active one
            const updatedTasks = (a.tasks ?? []).map((t) =>
              t.status === "active" ? { ...t, status: "completed" as const } : t
            );
            const newTask: import("../../types/review").AgentTask = {
              id: crypto.randomUUID(),
              text: data.text,
              status: "active"
            };
            return { ...a, tasks: [...updatedTasks, newTask] };
          }));
        } else if (data.type === "agent_update") {
          setAgents((prev) => {
            const existing = prev.find((a) => a.id === data.agent);
            if (existing) {
              // On completion, mark all tasks as completed
              const updatedTasks = data.status === "completed"
                ? existing.tasks.map((t) => ({ ...t, status: "completed" as const }))
                : existing.tasks;
              return prev.map((a) =>
                a.id === data.agent ? { ...a, status: data.status, tasks: updatedTasks } : a
              );
            } else {
              const iconMap: Record<string, string> = {
                logic: "psychology",
                security: "security",
                performance: "speed",
                pattern: "account_tree"
              };
              const colorMap: Record<string, "error" | "primary" | "secondary"> = {
                logic: "primary",
                security: "error",
                performance: "secondary",
                pattern: "primary"
              };
              const titleMap: Record<string, string> = {
                logic: "Logic & Edge Cases",
                security: "Security Agent",
                performance: "Performance Profiler",
                pattern: "Pattern Recognition"
              };
              return [
                ...prev,
                {
                  id: data.agent,
                  icon: iconMap[data.agent] || "help",
                  iconColor: colorMap[data.agent] || "primary",
                  title: titleMap[data.agent] || `${data.agent} Agent`,
                  subtitle: "",
                  status: data.status,
                  tasks: []
                }
              ];
            }
          });
        } else if (data.type === "pr_loaded") {
          setPRMetadata(data.prMetadata);
        } else if (data.type === "review_complete") {
          setFindings(data.findings || []);
          setReviewSummary(data.summary || null);
          // Refresh history list after a short delay to let D1 write settle
          setTimeout(fetchHistory, 500);
        }
      } catch {
        // Not JSON, ignore
      }
    }, [fetchHistory])
  });

  const { messages: rawMessages, sendMessage, clearHistory, stop, status } = useAgentChat({
    agent
  });

  const isStreaming = status === "streaming" || status === "submitted";

  // Filter/transform internal protocol messages from chat display
  const messages = rawMessages
    .filter((m) => {
      if (m.role !== "user") return true;
      const text = m.parts?.find((p) => p.type === "text") as { text?: string } | undefined;
      return !text?.text?.startsWith("PRISM_STEERING:");
    }) // filter out steering config messages from chat display
    .map((m) => {
      if (m.role !== "user") return m;
      const textPart = m.parts?.find((p) => p.type === "text") as { type: "text"; text?: string } | undefined;
      if (!textPart?.text?.startsWith("PRISM_FIND:")) return m;
      // Replace structured prefix with human-readable label
      const nl = textPart.text.indexOf("\n");
      const userQuestion = nl >= 0 ? textPart.text.slice(nl + 1) : ""; // flag to check if user provided a question
      try {
        const payload = JSON.parse(textPart.text.slice("PRISM_FIND:".length, nl >= 0 ? nl : textPart.text.length)) as { id: string; title: string };
        const label = `Regarding finding #${payload.id} "${payload.title}": ${userQuestion ? `\n${userQuestion}` : ""}`;
        return { ...m, parts: m.parts.map((p) => p.type === "text" ? { ...p, text: label } : p) };
      } catch {
        return { ...m, parts: m.parts.map((p) => p.type === "text" ? { ...p, text: userQuestion } : p) };
      }
    });

  useEffect(() => {
    if (stage === "landing") {
      setPRMetadata(null);
      setAgents([]);
      setFindings([]);
      setReviewSummary(null);
      setLogs([]);
      setQuotedFinding(null);
    }
  }, [stage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isStreaming && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isStreaming]);

  const quoteFinding = useCallback((finding: Finding) => {
    setQuotedFinding(finding);
    setLeftCollapsed(false);
    textareaRef.current?.focus();
  }, []);

  const clearQuotedFinding = useCallback(() => setQuotedFinding(null), []);

  const send = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    let messageText = text;
    if (quotedFinding) {
      const [owner, repo] = (prMetadata?.repoName ?? "/").split("/");
      const payload = {
        id: quotedFinding.id,
        title: quotedFinding.title,
        severity: quotedFinding.severity,
        description: quotedFinding.description,
        ...(quotedFinding.fileLocation ? { fileLocation: quotedFinding.fileLocation } : {}),
        ...(owner && repo ? { owner, repo } : {})
      };
      messageText = `PRISM_FIND:${JSON.stringify(payload)}\n${text}`;
      setQuotedFinding(null);
    }
    sendMessage({ role: "user", parts: [{ type: "text", text: messageText }] });
  }, [input, isStreaming, sendMessage, quotedFinding, prMetadata]);

  const submitSteering = useCallback((config: SteeringConfig) => {
    sendMessage({ role: "user", parts: [{ type: "text", text: `PRISM_STEERING:${JSON.stringify(config)}` }] });
  }, [sendMessage]);

  const deleteReview = useCallback((id: string) => {
    // Optimistic removal
    setReviewHistory((prev) => prev.filter((r) => r.id !== id));
    fetch(`/api/reviews/${id}`, { method: "DELETE" }).catch(() => {
      // Restore on failure
      fetchHistory();
    });
  }, [fetchHistory]);

  const loadHistoryReview = useCallback((id: string) => {
    Promise.all([
      fetch(`/api/reviews/${id}`).then((r) => r.json()),
      fetch(`/api/reviews/${id}/findings`).then((r) => r.json())
    ]).then(([reviewRaw, findingsRaw]) => {
      const review = reviewRaw as {
        pr_number: number; pr_title: string; score: number;
        critical: number; warnings: number; suggestions: number;
        files_changed: number; owner: string; repo: string;
        contributors: Array<{ login: string; avatarUrl: string }>;
      };
      const dbFindings = findingsRaw as Array<{
        id: string; agent: string | null; severity: string; title: string;
        description: string; file_location: string | null;
      }>;

      setPRMetadata({
        title: review.pr_title,
        repoName: `${review.owner}/${review.repo}`,
        prNumber: review.pr_number,
        filesChanged: review.files_changed,
        contributors: review.contributors ?? []
      });
      setReviewSummary({
        score: review.score,
        critical: review.critical,
        warnings: review.warnings,
        suggestions: review.suggestions
      });
      setFindings(dbFindings.map((f) => ({
        id: f.id,
        severity: f.severity as Finding["severity"],
        title: f.title,
        description: f.description,
        agent: f.agent ?? undefined,
        fileLocation: f.file_location ?? undefined
      })));
      setAgents([]);
      setStage("completed");
    }).catch(() => {});
  }, []);

  return {
    connected,
    input,
    setInput,
    leftCollapsed,
    setLeftCollapsed,
    rightCollapsed,
    setRightCollapsed,
    stage,
    setStage,
    hasHistoryRecords: reviewHistory.length > 0,
    messagesEndRef,
    textareaRef,
    messages,
    clearHistory,
    stop,
    isStreaming,
    send,
    submitSteering,
    quotedFinding,
    quoteFinding,
    clearQuotedFinding,
    loadHistoryReview,
    deleteReview,
    prMetadata,
    agents,
    findings,
    reviewHistory,
    reviewSummary,
    logs
  };
}
