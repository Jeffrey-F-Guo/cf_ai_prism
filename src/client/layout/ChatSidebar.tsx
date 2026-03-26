import type { UIMessage } from "ai";
import type { PrismState } from "../hooks/usePrism";
import { ChevronLeft, ChevronRight } from "../components/shared/Icons";

interface ChatSidebarProps extends PrismState {}

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
}: ChatSidebarProps) {
  return (
    <section className={`${leftCollapsed ? "w-12 shrink-0" : "w-[30%] shrink-0"} bg-[#131313] border-r border-[#494847]/10 flex flex-col transition-all duration-300 relative`}>
      {/* Left Collapse Button */}
      <button
        onClick={() => setLeftCollapsed(!leftCollapsed)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-12 bg-[#131313] border border-[#494847]/20 rounded-r-md flex items-center justify-center text-[#777575] hover:text-white hover:bg-[#201f1f] transition-colors"
      >
        {leftCollapsed ? <ChevronRight /> : <ChevronLeft />}
      </button>

      {/* Header */}
      <div className="p-4 border-b border-[#494847]/10 flex items-center justify-between">
        {!leftCollapsed && (
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
            <span className="text-xs text-[#777575]">{connected ? "Connected" : "Disconnected"}</span>
          </div>
        )}
        {!leftCollapsed && (
          <button
            onClick={clearHistory}
            className="px-3 py-1.5 text-xs font-medium bg-[#14b8a6] text-white rounded-md hover:bg-[#0d9488] transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {!leftCollapsed && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-2 opacity-40">
                  <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#bd9dff]">Session Log</p>
                  <p className="text-sm font-mono italic">Awaiting deployment...</p>
                </div>
              </div>
            )}

            {messages.map((message: UIMessage) => {
              const isUser = message.role === "user";
              const text = message.parts
                .filter((p) => p.type === "text")
                .map((p) => (p as { type: "text"; text: string }).text)
                .join("");

              return (
                <div
                  key={message.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-2.5 rounded-lg text-sm leading-relaxed ${
                      isUser
                        ? "bg-[#bd9dff] text-[#3c0089]"
                        : "bg-[#1a1919] text-white border border-[#494847]/20"
                    }`}
                  >
                    {text}
                  </div>
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Layer */}
          <div className="p-4 bg-gradient-to-t from-[#131313] to-transparent">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-[#bd9dff]/20 rounded-lg blur opacity-0 group-focus-within:opacity-100 transition duration-500" />
              <div className="relative bg-[#1a1919]/70 backdrop-blur-xl border border-[#494847]/20 rounded-lg flex items-center gap-2">
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
                  placeholder="Paste a PR URL to deploy your review agents..."
                  disabled={!connected || isStreaming}
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-white placeholder-[#777575] outline-none resize-none p-3"
                />
                {isStreaming ? (
                  <button
                    onClick={stop}
                    className="mx-2 text-xs text-[#777575] hover:text-white transition-colors shrink-0"
                  >
                    Stop
                  </button>
                ) : (
                  <button
                    onClick={send}
                    disabled={!input.trim() || !connected}
                    className="mx-2 text-[#bd9dff] hover:text-[#8a4cfc] transition-colors disabled:opacity-30 shrink-0"
                  >
                    <span className="material-symbols-outlined">send</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
