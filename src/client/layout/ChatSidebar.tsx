import React from "react";
import type { UIMessage } from "ai";
import type { Finding } from "../../types/review";
import { Streamdown } from "streamdown";
import { SendIcon, StopIcon } from "../components/shared/Icons";

function GithubDiff({ lines }: { lines: string[] }) {
  let oldLine = 1;
  let newLine = 1;

  const firstHunk = lines.find((l) => l.startsWith("@@"));
  if (firstHunk) {
    const m = firstHunk.match(/@@ -(\d+).*\+(\d+)/);
    if (m) { oldLine = parseInt(m[1]); newLine = parseInt(m[2]); }
  }

  return (
    <div className="rounded-lg overflow-hidden border border-stone-700/30 my-3 font-mono text-xs leading-6 select-text">
      {lines.map((line, i) => {
        if (line.startsWith("@@")) {
          const m = line.match(/@@ -(\d+).*\+(\d+)/);
          if (m) { oldLine = parseInt(m[1]); newLine = parseInt(m[2]); }
          return (
            <div key={i} className="flex bg-[#1a1919] text-[#494847] px-3 py-px">
              <span className="w-8 shrink-0 text-right pr-4 select-none"> </span>
              <span className="w-8 shrink-0 text-right pr-4 select-none"> </span>
              <span className="text-[#494847]">{line}</span>
            </div>
          );
        }
        if (line.startsWith("-")) {
          const n = oldLine++;
          return (
            <div key={i} className="flex bg-[#ff6e84]/10 border-l-2 border-[#ff6e84]/50">
              <span className="w-8 shrink-0 text-right pr-3 text-[#ff6e84]/50 select-none">{n}</span>
              <span className="w-8 shrink-0 text-right pr-3 text-[#494847] select-none"> </span>
              <span className="w-4 shrink-0 text-[#ff6e84] select-none">-</span>
              <span className="text-[#ff6e84] flex-1 pr-3">{line.slice(1)}</span>
            </div>
          );
        }
        if (line.startsWith("+")) {
          const n = newLine++;
          return (
            <div key={i} className="flex bg-[#4cc9a0]/10 border-l-2 border-[#4cc9a0]/50">
              <span className="w-8 shrink-0 text-right pr-3 text-[#494847] select-none"> </span>
              <span className="w-8 shrink-0 text-right pr-3 text-[#4cc9a0]/50 select-none">{n}</span>
              <span className="w-4 shrink-0 text-[#4cc9a0] select-none">+</span>
              <span className="text-[#4cc9a0] flex-1 pr-3">{line.slice(1)}</span>
            </div>
          );
        }
        const o = oldLine++; const n = newLine++;
        return (
          <div key={i} className="flex bg-stone-900 border-l-2 border-transparent">
            <span className="w-8 shrink-0 text-right pr-3 text-[#494847]/60 select-none">{o}</span>
            <span className="w-8 shrink-0 text-right pr-3 text-[#494847]/60 select-none">{n}</span>
            <span className="w-4 shrink-0 select-none"> </span>
            <span className="text-stone-400 flex-1 pr-3">{line.startsWith(" ") ? line.slice(1) : line}</span>
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
    const raw = codeEl?.props?.children;
    const text = typeof raw === "string"
      ? raw
      : Array.isArray(raw)
        ? raw.map((c) => (typeof c === "string" ? c : "")).join("")
        : "";
    const lang = (codeEl?.props?.className ?? "").replace("language-", "");
    const lines = text.split("\n").filter((l, i, arr) => !(i === arr.length - 1 && l === ""));
    const isDiff =
      lang === "diff" ||
      (lines.length > 1 && lines.some((l) => l.startsWith("+") || l.startsWith("-")));

    if (isDiff) return <GithubDiff lines={lines} />;

    return (
      <pre className="bg-stone-900 rounded-lg border border-stone-700/30 p-4 my-3 overflow-x-auto text-xs font-mono text-stone-300 leading-relaxed">
        {children}
      </pre>
    );
  },
  code: ({ className, children }: { className?: string; children?: React.ReactNode }) => (
    <code className={`${className ?? ""} font-mono text-[#2a14b4] bg-[#2a14b4]/8 px-1 py-px rounded text-xs`}>
      {children}
    </code>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-2 last:mb-0 leading-relaxed text-[#1b1c1a]">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="text-[#464554]">{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-[#1b1c1a]">{children}</strong>
  ),
};

interface ChatSidebarProps {
  connected: boolean;
  input: string;
  setInput: (value: string) => void;
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
    <aside className="w-[400px] shrink-0 border-l border-[#efeeeb] bg-[#f5f3f0]/50 sticky top-20 h-[calc(100vh-5rem)] flex flex-col">
      {/* Header */}
      <div className="p-6 pb-4 flex items-center justify-between border-b border-[#efeeeb] shrink-0">
        <div>
          <h3 className="font-headline text-lg font-bold text-[#1b1c1a]">Prism Assistant</h3>
          <p className={`text-[10px] uppercase tracking-widest font-bold mt-0.5 ${connected ? "text-[#2a14b4]" : "text-[#777586]"}`}>
            {connected ? "Neural Engine Active" : "Connecting..."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearHistory}
            className="text-[10px] font-bold uppercase tracking-wider text-[#777586] hover:text-[#ba1a1a] transition-colors"
          >
            Clear
          </button>
          <div className="p-2 bg-[#2a14b4]/10 rounded-lg">
            <span className="material-symbols-outlined text-[#2a14b4] text-xl">auto_awesome</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[#c7c4d7] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-indigo-600 text-xl">bolt</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1b1c1a]">Prism Assistant</p>
              <p className="text-xs text-[#777586] mt-1">Ask a follow-up question about any finding</p>
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

            // Filter internal protocol messages
            const displayText = (() => {
              if (text.startsWith("PRISM_STEERING:")) return null;
              if (text.startsWith("PRISM_FIND:")) {
                const nl = text.indexOf("\n");
                try {
                  const payload = JSON.parse(text.slice("PRISM_FIND:".length, nl >= 0 ? nl : text.length));
                  const question = nl >= 0 ? text.slice(nl + 1).trim() : "";
                  return `Regarding finding #${payload.id} "${payload.title}":\n${question}`;
                } catch {
                  return text.slice(nl >= 0 ? nl + 1 : 0);
                }
              }
              return text;
            })();

            if (!displayText) return null;

            return isUser ? (
              <div key={message.id} className="flex flex-col gap-1 items-end">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#777586]">You</span>
                <div className="max-w-[90%] bg-[#2a14b4] text-white p-4 rounded-xl rounded-tr-none shadow-sm text-sm leading-relaxed">
                  {displayText}
                </div>
              </div>
            ) : (
              <div key={message.id} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span className="material-symbols-outlined text-indigo-600 text-sm">bolt</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#777586]">Assistant</span>
                </div>
                <div className="max-w-[90%] bg-white p-4 rounded-xl rounded-tl-none shadow-sm text-sm leading-relaxed border border-[#c7c4d7]/20">
                  <Streamdown components={markdownComponents} isAnimating={isStreaming}>
                    {displayText}
                  </Streamdown>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quoted finding strip */}
      {quotedFinding && (
        <div className="mx-4 mb-2 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-[#2a14b4]/5 border border-[#2a14b4]/20">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#2a14b4] mb-0.5">
              Replying to finding #{quotedFinding.id}
            </p>
            <p className="text-xs text-[#464554] truncate">{quotedFinding.title}</p>
            {quotedFinding.fileLocation && (
              <p className="font-mono text-[10px] text-[#777586] truncate mt-0.5">{quotedFinding.fileLocation}</p>
            )}
          </div>
          <button
            onClick={clearQuotedFinding}
            className="text-[#777586] hover:text-[#1b1c1a] shrink-0 mt-0.5 text-xs leading-none transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="p-4 shrink-0 border-t border-[#efeeeb]">
        <div className="relative">
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
            placeholder="Ask Prism about these results..."
            disabled={!connected || isStreaming}
            rows={2}
            className="w-full bg-white border-none rounded-[1.5rem] p-4 pr-12 text-sm focus:ring-1 focus:ring-[#2a14b4]/40 shadow-sm resize-none outline-none placeholder:text-[#464554]/40 text-[#1b1c1a]"
          />
          {isStreaming ? (
            <button
              onClick={stop}
              className="absolute right-3 bottom-3 text-[#777586] hover:text-[#ba1a1a] transition-colors"
              title="Stop"
            >
              <StopIcon size={16} />
            </button>
          ) : (
            <button
              onClick={send}
              disabled={!input.trim() || !connected}
              className="absolute right-3 bottom-3 text-[#2a14b4] hover:bg-[#2a14b4]/10 rounded-full p-1 transition-colors disabled:opacity-25"
              title="Send"
            >
              <SendIcon size={17} />
            </button>
          )}
        </div>
        <div className="mt-3 flex gap-2 flex-wrap">
          <span className="px-3 py-1 bg-[#eae8e5] rounded-full text-[10px] font-bold text-[#464554] cursor-pointer hover:bg-[#e4e2df] transition-colors">
            Explain severity
          </span>
          <span className="px-3 py-1 bg-[#eae8e5] rounded-full text-[10px] font-bold text-[#464554] cursor-pointer hover:bg-[#e4e2df] transition-colors">
            Fix suggestions
          </span>
        </div>
      </div>
    </aside>
  );
}
