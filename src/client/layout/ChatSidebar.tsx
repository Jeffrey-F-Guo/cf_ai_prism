import React from "react";
import type { UIMessage } from "ai";
import type { Finding } from "../../types/review";
import { Streamdown } from "streamdown";
import { ChevronLeft, ChevronRight, BotIcon, SendIcon, StopIcon } from "../components/shared/Icons";

function GithubDiff({ lines }: { lines: string[] }) {
  let oldLine = 1;
  let newLine = 1;

  // Extract starting line numbers from first @@ hunk header if present
  const firstHunk = lines.find((l) => l.startsWith("@@"));
  if (firstHunk) {
    const m = firstHunk.match(/@@ -(\d+).*\+(\d+)/);
    if (m) { oldLine = parseInt(m[1]); newLine = parseInt(m[2]); }
  }

  return (
    <div className="rounded-lg overflow-hidden border border-[#494847]/20 my-3 font-mono text-xs leading-6 select-text">
      {lines.map((line, i) => {
        // Hunk header
        if (line.startsWith("@@")) {
          const m = line.match(/@@ -(\d+).*\+(\d+)/);
          if (m) { oldLine = parseInt(m[1]); newLine = parseInt(m[2]); }
          return (
            <div key={i} className="flex bg-[#1a1919] text-[#494847] px-3 py-px">
              <span className="w-8 shrink-0 text-right pr-4 select-none">{" "}</span>
              <span className="w-8 shrink-0 text-right pr-4 select-none">{" "}</span>
              <span className="text-[#494847]">{line}</span>
            </div>
          );
        }

        if (line.startsWith("-")) {
          const n = oldLine++;
          return (
            <div key={i} className="flex bg-[#ff6e84]/10 border-l-2 border-[#ff6e84]/50">
              <span className="w-8 shrink-0 text-right pr-3 text-[#ff6e84]/50 select-none">{n}</span>
              <span className="w-8 shrink-0 text-right pr-3 text-[#494847] select-none">{" "}</span>
              <span className="w-4 shrink-0 text-[#ff6e84] select-none">-</span>
              <span className="text-[#ff6e84] flex-1 pr-3">{line.slice(1)}</span>
            </div>
          );
        }

        if (line.startsWith("+")) {
          const n = newLine++;
          return (
            <div key={i} className="flex bg-[#4cc9a0]/10 border-l-2 border-[#4cc9a0]/50">
              <span className="w-8 shrink-0 text-right pr-3 text-[#494847] select-none">{" "}</span>
              <span className="w-8 shrink-0 text-right pr-3 text-[#4cc9a0]/50 select-none">{n}</span>
              <span className="w-4 shrink-0 text-[#4cc9a0] select-none">+</span>
              <span className="text-[#4cc9a0] flex-1 pr-3">{line.slice(1)}</span>
            </div>
          );
        }

        // Unchanged context line
        const o = oldLine++; const n = newLine++;
        return (
          <div key={i} className="flex bg-[#0e0e0e] border-l-2 border-transparent">
            <span className="w-8 shrink-0 text-right pr-3 text-[#494847]/60 select-none">{o}</span>
            <span className="w-8 shrink-0 text-right pr-3 text-[#494847]/60 select-none">{n}</span>
            <span className="w-4 shrink-0 select-none">{" "}</span>
            <span className="text-[#777575] flex-1 pr-3">{line.startsWith(" ") ? line.slice(1) : line}</span>
          </div>
        );
      })}
    </div>
  );
}

const markdownComponents = {
  pre: ({ children }: { children?: React.ReactNode }) => {
    const codeEl = React.Children.toArray(children).find(
      (c): c is React.ReactElement<{ className?: string; children?: React.ReactNode }> =>
        React.isValidElement(c)
    );
    // hast-util-to-jsx-runtime passes children as string | string[] — normalize to string
    const raw = codeEl?.props?.children;
    const text = typeof raw === "string"
      ? raw
      : Array.isArray(raw)
        ? raw.map((c) => (typeof c === "string" ? c : "")).join("")
        : "";
    const lang = (codeEl?.props?.className ?? "").replace("language-", "");
    const lines = text
      .split("\n")
      .filter((l, i, arr) => !(i === arr.length - 1 && l === ""));
    const isDiff =
      lang === "diff" ||
      (lines.length > 1 && lines.some((l) => l.startsWith("+") || l.startsWith("-")));

    if (isDiff) return <GithubDiff lines={lines} />;

    return (
      <pre className="bg-[#0e0e0e] rounded-lg border border-[#494847]/20 p-4 my-3 overflow-x-auto text-xs font-mono text-[#adaaaa] leading-relaxed">
        {children}
      </pre>
    );
  },
  code: ({ className, children }: { className?: string; children?: React.ReactNode }) => (
    <code className={`${className ?? ""} font-mono text-[#bd9dff] bg-[#bd9dff]/10 px-1 py-px rounded text-xs`}>
      {children}
    </code>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="text-[#adaaaa]">{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),
};

interface ChatSidebarProps {
  connected: boolean;
  input: string;
  setInput: (value: string) => void;
  leftCollapsed: boolean;
  setLeftCollapsed: (value: boolean) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  messages: UIMessage[];
  clearHistory: () => void;
  stop: () => void;
  isStreaming: boolean;
  send: () => void;
  quotedFinding: Finding | null;
  clearQuotedFinding: () => void;
}

export function ChatSidebar({
  connected,
  input,
  setInput,
  leftCollapsed,
  setLeftCollapsed,
  messagesEndRef,
  textareaRef,
  messages,
  clearHistory,
  stop,
  isStreaming,
  send,
  quotedFinding,
  clearQuotedFinding
}: ChatSidebarProps) {
  return (
    <section
      className={`${leftCollapsed ? "w-12 shrink-0" : "w-[30%] shrink-0"} bg-[#131313] border-r border-[#494847]/10 flex flex-col transition-all duration-300 relative`}
    >
      {/* Collapse Toggle */}
      <button
        onClick={() => setLeftCollapsed(!leftCollapsed)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-12 bg-[#131313] border border-[#494847]/20 rounded-r-md flex items-center justify-center text-[#777575] hover:text-white hover:bg-[#201f1f] transition-colors"
      >
        {leftCollapsed ? <ChevronRight /> : <ChevronLeft />}
      </button>

      {/* Header */}
      <div className="px-4 h-12 border-b border-[#494847]/10 flex items-center justify-between shrink-0">
        {!leftCollapsed && (
          <>
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full transition-colors ${connected ? "bg-[#4cc9a0]" : "bg-[#ff6e84]"}`} />
              <span className="text-[11px] font-medium text-[#777575]">
                {connected ? "Connected" : "Disconnected"}
              </span>
            </div>
            <button
              onClick={clearHistory}
              className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border border-[#494847]/30 text-[#777575] rounded hover:border-[#ff6e84]/40 hover:text-[#ff6e84] transition-all duration-200"
            >
              Clear
            </button>
          </>
        )}
      </div>

      {!leftCollapsed && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 opacity-30">
                <div className="w-10 h-10 rounded-full bg-[#bd9dff]/15 flex items-center justify-center">
                  <BotIcon size={18} />
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#bd9dff]">Prism</p>
                  <p className="text-xs text-[#777575] mt-1">Paste a PR URL to begin</p>
                </div>
              </div>
            ) : (
              messages.map((message: UIMessage) => {
                const isUser = message.role === "user";
                const text = message.parts
                  .filter((p) => p.type === "text")
                  .map((p) => (p as { type: "text"; text: string }).text)
                  .join("");

                if (!text) return null;

                return isUser ? (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[82%] px-3.5 py-2.5 bg-[#bd9dff] text-[#3c0089] text-sm leading-relaxed font-medium rounded-xl rounded-br-sm">
                      {text}
                    </div>
                  </div>
                ) : (
                  <div key={message.id} className="flex gap-2.5 items-start">
                    <div className="w-6 h-6 rounded-full bg-[#bd9dff]/15 border border-[#bd9dff]/20 flex items-center justify-center shrink-0 mt-0.5 text-[#bd9dff]">
                      <BotIcon size={13} />
                    </div>
                    <div className="max-w-[82%] px-3.5 py-2.5 bg-[#1a1919] text-white text-sm leading-relaxed border border-[#494847]/20 rounded-xl rounded-tl-sm">
                      <Streamdown components={markdownComponents} isAnimating={isStreaming}>
                        {text}
                      </Streamdown>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quoted finding preview */}
          {quotedFinding && (
            <div className="mx-4 mb-1 flex items-start gap-2 px-3 py-2 rounded-lg bg-[#bd9dff]/8 border border-[#bd9dff]/20">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#bd9dff] mb-0.5">
                  Replying to finding #{quotedFinding.id}
                </p>
                <p className="text-xs text-[#adaaaa] truncate">{quotedFinding.title}</p>
                {quotedFinding.fileLocation && (
                  <p className="font-mono text-[10px] text-[#494847] truncate mt-0.5">{quotedFinding.fileLocation}</p>
                )}
              </div>
              <button
                onClick={clearQuotedFinding}
                className="text-[#494847] hover:text-white shrink-0 mt-0.5 text-xs leading-none"
              >
                ✕
              </button>
            </div>
          )}

          {/* Input */}
          <div className="p-4 shrink-0">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-[#bd9dff]/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition duration-500" />
              <div className="relative bg-[#1a1919] border border-[#494847]/25 rounded-xl flex items-end gap-2 group-focus-within:border-[#bd9dff]/30 transition-colors">
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
                  placeholder="Paste a PR URL or ask a question..."
                  disabled={!connected || isStreaming}
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-white placeholder-[#494847] outline-none resize-none p-3 leading-relaxed"
                />
                {isStreaming ? (
                  <button
                    onClick={stop}
                    className="mb-3 mr-3 text-[#777575] hover:text-[#ff6e84] transition-colors shrink-0"
                    title="Stop"
                  >
                    <StopIcon size={16} />
                  </button>
                ) : (
                  <button
                    onClick={send}
                    disabled={!input.trim() || !connected}
                    className="mb-3 mr-3 text-[#bd9dff] hover:text-[#d0baff] transition-colors disabled:opacity-25 shrink-0"
                    title="Send"
                  >
                    <SendIcon size={17} />
                  </button>
                )}
              </div>
            </div>
            <p className="text-[10px] text-[#494847] mt-2 text-center">
              Enter to send · Shift+Enter for newline
            </p>
          </div>
        </>
      )}
    </section>
  );
}
