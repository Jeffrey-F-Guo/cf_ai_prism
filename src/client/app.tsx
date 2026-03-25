import { Suspense, useCallback, useState, useEffect, useRef } from "react";
import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import type { UIMessage } from "ai";
import type { ReviewOrchestrator } from "../server/agents/ReviewOrchestrator";

function Chat() {
  const [connected, setConnected] = useState(false);
  const [input, setInput] = useState("");
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

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="px-5 py-4 border-b border-[#2a2a2a] flex items-center justify-between">
        <span className="font-semibold tracking-widest text-sm uppercase text-white">
          Prism
        </span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
            />
            <span className="text-xs text-[#71717a]">
              {connected ? "Connected" : "Disconnected"}
            </span>
          </div>
          <button
            onClick={clearHistory}
            className="text-xs text-[#71717a] hover:text-white transition-colors"
          >
            Clear
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <p className="text-2xl font-bold tracking-tight">PRISM</p>
              <p className="text-sm text-[#71717a]">
                Paste a GitHub PR URL to begin
              </p>
            </div>
          </div>
        )}

        {messages.map((message: UIMessage) => {
          const isUser = message.role === "user";
          const text = message.parts
            .filter((p) => p.type === "text")
            .map((p) => (p as { type: "text"; text: string }).text)
            .join("");

            // message.parts.forEach(part => {
            //   // Check for your specific tool by type
            //   if (part.type === "tool-reviewPR" && part.state === "output-available") {
            //     const reviewData = part.output;
            //     // reviewData.summary.score
            //     // reviewData.agents.security.findings
            //     // reviewData.pr.title
            //     // etc.
            //   }
            
            // })
            console.log(message)
          return (
            <div
              key={message.id}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-lg text-sm leading-relaxed ${
                  isUser
                    ? "bg-[#7c3aed] text-white"
                    : "bg-[#1a1a1a] text-[#fafafa] border border-[#2a2a2a]"
                }`}
              >
                {text}
                
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#2a2a2a] px-5 py-4">
        <div className="flex items-center gap-3 bg-[#111111] border border-[#2a2a2a] rounded-lg px-4 py-3 focus-within:border-[#7c3aed] transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Paste a GitHub PR URL to deploy your review agents..."
            disabled={!connected || isStreaming}
            rows={1}
            className="flex-1 bg-transparent text-sm text-white placeholder-[#52525b] outline-none resize-none"
          />
          {isStreaming ? (
            <button
              onClick={stop}
              className="text-xs text-[#71717a] hover:text-white transition-colors shrink-0"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={send}
              disabled={!input.trim() || !connected}
              className="text-xs text-[#7c3aed] hover:text-violet-400 transition-colors disabled:opacity-30 shrink-0"
            >
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-[#0a0a0a] text-[#71717a] text-sm">
          Loading...
        </div>
      }
    >
      <Chat />
    </Suspense>
  );
}