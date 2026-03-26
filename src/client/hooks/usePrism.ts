import { useState, useEffect, useRef, useCallback } from "react";
import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import type { UIMessage } from "ai";
import type { ReviewOrchestrator } from "../../server/agents/ReviewOrchestrator";
import type { ReviewStage, FindingSeverity, Agent, Finding, PRMetadata, ReviewSummary, ReviewHistoryItem } from "../../types/review";

export type { ReviewStage, FindingSeverity, Agent, Finding, PRMetadata, ReviewSummary, ReviewHistoryItem } from "../../types/review";

// Mock Data
const mockPRMetadata: PRMetadata = {
  title: "feat: implement-distributed-caching",
  repoName: "prism-ai / core-engine",
  prNumber: 842,
  filesChanged: 8,
  contributors: 3,
};

const mockAgents: Agent[] = [
  {
    id: "security",
    icon: "security",
    iconColor: "error",
    title: "Security Agent",
    subtitle: "Scanning for vulnerabilities...",
    status: "analyzing",
    tasks: [
      { id: "1", text: 'Checking encryption constants in `auth/vault.go`', status: "active" },
      { id: "2", text: "Verifying cross-origin policy changes in `api/middleware.ts`", status: "pending" },
      { id: "3", text: "Evaluating SQL injection surface area", status: "pending" },
    ],
  },
  {
    id: "logic",
    icon: "psychology",
    iconColor: "primary",
    title: "Logic & Edge Cases",
    subtitle: "Evaluating business rules...",
    status: "analyzing",
    tasks: [
      { id: "1", text: "Validating cache invalidation logic on high-concurrency", status: "active" },
      { id: "2", text: "Checking race conditions in `worker/sync.go`", status: "pending" },
    ],
  },
  {
    id: "performance",
    icon: "speed",
    iconColor: "secondary",
    title: "Performance Profiler",
    subtitle: "Measuring complexity overhead...",
    status: "analyzing",
    tasks: [
      { id: "1", text: "Simulating O(n) impact on large dataset fetch", status: "active" },
    ],
  },
  {
    id: "pattern",
    icon: "hub",
    iconColor: "primary",
    title: "Pattern Recognition",
    subtitle: "Ensuring repo consistency...",
    status: "queued",
    tasks: [
      { id: "1", text: "Waiting for Security completion...", status: "pending" },
    ],
  },
];

const mockFindings: Finding[] = [
  {
    id: "1",
    severity: "critical",
    title: "Insecure Session Token Generation",
    description: "The use of Math.random() for token generation is cryptographically insecure. Use crypto.getRandomValues() to prevent session hijacking via token prediction.",
    fileLocation: "src/auth/session.ts:L42",
    codeDiff: [
      { type: "deletion", code: "const token = Math.random().toString(36);" },
      { type: "addition", code: "const token = crypto.randomUUID();" },
    ],
  },
  {
    id: "2",
    severity: "warning",
    title: "Potential Memory Leak in Logger",
    description: "Event listeners are being attached within the request handler without cleanup. This will cause heap exhaustion under high load.",
    fileLocation: "src/api/middleware.ts:L114",
  },
  {
    id: "3",
    severity: "suggestion",
    title: "Extract Constants",
    description: "Hardcoded timeout values found. Moving these to a configuration file would improve maintainability across environments.",
    fileLocation: "src/lib/utils.ts:L12",
  },
  {
    id: "4",
    severity: "success",
    title: "Optimal Complexity Scores",
    description: "Cyclomatic complexity is below the threshold for all new functions. Excellent separation of concerns.",
    fileLocation: "Project-wide",
  },
];

const mockReviewHistory: ReviewHistoryItem[] = [
  { id: "1", prNumber: 841, prTitle: "Redux Store Refactor", score: 98, timeAgo: "2 hours ago" },
  { id: "2", prNumber: 840, prTitle: "Fix OAuth Leak", score: 42, timeAgo: "Yesterday" },
  { id: "3", prNumber: 839, prTitle: "New Landing Grid", score: 86, timeAgo: "2 days ago" },
];

const mockReviewSummary: ReviewSummary = {
  score: 85,
  grade: "B+ Stable",
  critical: 1,
  warnings: 4,
  suggestions: 12,
  duration: "12s",
  cost: "$0.004",
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
  setHasHistoryRecords: (value: boolean) => void;
  
  // Refs
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  
  // Chat
  messages: UIMessage[];
  clearHistory: () => void;
  stop: () => void;
  isStreaming: boolean;
  send: () => void;
  
  // Review Data
  prMetadata: PRMetadata | null;
  agents: Agent[];
  findings: Finding[];
  reviewHistory: ReviewHistoryItem[];
  reviewSummary: ReviewSummary | null;
}

export function usePrism(): PrismState {
  const [connected, setConnected] = useState(false);
  const [input, setInput] = useState("");
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [stage, setStage] = useState<ReviewStage>("completed");
  const [hasHistoryRecords, setHasHistoryRecords] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Review data state
  const [prMetadata, setPRMetadata] = useState<PRMetadata | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [reviewHistory] = useState<ReviewHistoryItem[]>(mockReviewHistory);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);

  const agent = useAgent<ReviewOrchestrator>({
    agent: "ReviewOrchestrator",
    onOpen: useCallback(() => setConnected(true), []),
    onClose: useCallback(() => setConnected(false), []),
    onError: useCallback(
      (error: Event) => console.error("WebSocket error:", error),
      []
    )
  });

  const { messages, sendMessage, clearHistory, stop, status } = useAgentChat({
    agent
  });

  const isStreaming = status === "streaming" || status === "submitted";

  // Load mock data based on stage
  useEffect(() => {
    if (stage === "processing") {
      setPRMetadata(mockPRMetadata);
      setAgents(mockAgents);
      setFindings([]);
      setReviewSummary(null);
    } else if (stage === "completed") {
      setPRMetadata(mockPRMetadata);
      setAgents([]);
      setFindings(mockFindings);
      setReviewSummary(mockReviewSummary);
    } else {
      setPRMetadata(null);
      setAgents([]);
      setFindings([]);
      setReviewSummary(null);
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
    hasHistoryRecords,
    setHasHistoryRecords,
    messagesEndRef,
    textareaRef,
    messages,
    clearHistory,
    stop,
    isStreaming,
    send,
    prMetadata,
    agents,
    findings,
    reviewHistory,
    reviewSummary,
  };
}
