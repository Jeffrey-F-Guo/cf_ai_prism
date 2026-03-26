import { useState, useEffect, useRef, useCallback } from "react";
import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import type { UIMessage } from "ai";
import type { ReviewOrchestrator } from "../../server/agents/ReviewOrchestrator";

export type ReviewStage = "landing" | "processing" | "completed";

export interface PrismState {
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
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  messages: UIMessage[];
  clearHistory: () => void;
  stop: () => void;
  isStreaming: boolean;
  send: () => void;
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
  };
}
