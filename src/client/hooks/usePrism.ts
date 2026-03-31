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

const mockReviewHistory: ReviewHistoryItem[] = [
  {
    id: "1",
    prNumber: 841,
    prTitle: "Redux Store Refactor",
    score: 98,
    timeAgo: "2 hours ago"
  },
  {
    id: "2",
    prNumber: 840,
    prTitle: "Fix OAuth Leak",
    score: 42,
    timeAgo: "Yesterday"
  },
  {
    id: "3",
    prNumber: 839,
    prTitle: "New Landing Grid",
    score: 86,
    timeAgo: "2 days ago"
  }
];

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

  // Review Data
  prMetadata: PRMetadata | null;
  agents: Agent[];
  findings: Finding[];
  reviewHistory: ReviewHistoryItem[];
  reviewSummary: ReviewSummary | null;
  logs: LogEntry[];
}

export function usePrism(): PrismState {
  const [connected, setConnected] = useState(false);
  const [input, setInput] = useState("");
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [stage, setStage] = useState<ReviewStage>("landing");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Review data state
  const [prMetadata, setPRMetadata] = useState<PRMetadata | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [reviewHistory] = useState<ReviewHistoryItem[]>(mockReviewHistory);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

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
        } else if (data.type === "agent_update") {
          setAgents((prev) => {
            const existing = prev.find((a) => a.id === data.agent);
            if (existing) {
              return prev.map((a) =>
                a.id === data.agent ? { ...a, status: data.status } : a
              );
            } else {
              const iconMap: Record<string, string> = {
                logic: "psychology",
                security: "security",
                performance: "speed",
                pattern: "hub"
              };
              const colorMap: Record<
                string,
                "error" | "primary" | "secondary"
              > = {
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
        }
      } catch {
        // Not JSON, ignore
      }
    }, [])
  });

  const { messages: rawMessages, sendMessage, clearHistory, stop, status } = useAgentChat({
    agent
  });

  const isStreaming = status === "streaming" || status === "submitted";

  // Filter steering config messages from the chat display
  const messages = rawMessages.filter((m) => {
    if (m.role !== "user") return true;
    const text = m.parts?.find((p) => p.type === "text") as { text?: string } | undefined;
    return !text?.text?.startsWith("PRISM_STEERING:");
  });

  useEffect(() => {
    if (stage === "landing") {
      setPRMetadata(null);
      setAgents([]);
      setFindings([]);
      setReviewSummary(null);
      setLogs([]);
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

  const send = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    sendMessage({ role: "user", parts: [{ type: "text", text }] });
  }, [input, isStreaming, sendMessage]);

  const submitSteering = useCallback((config: SteeringConfig) => {
    sendMessage({ role: "user", parts: [{ type: "text", text: `PRISM_STEERING:${JSON.stringify(config)}` }] });
  }, [sendMessage]);

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
    prMetadata,
    agents,
    findings,
    reviewHistory,
    reviewSummary,
    logs
  };
}
