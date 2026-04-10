import { useEffect, useRef } from "react";
import type {
  ReviewStage,
  Agent,
  Finding,
  PRMetadata,
  ReviewSummary,
  SteeringConfig,
  LogEntry
} from "../../types/review";
import { AgentCard } from "../components/review/AgentCard";
import { PRMetadataBar } from "../components/review/PRMetadataBar";
import { FindingCard } from "../components/review/FindingCard";
import { SteeringPanel } from "../components/review/SteeringPanel";

interface CenterPanelProps {
  stage: ReviewStage;
  input: string;
  setInput: (v: string) => void;
  send: () => void;
  isStreaming: boolean;
  prMetadata: PRMetadata | null;
  agents: Agent[];
  findings: Finding[];
  reviewSummary: ReviewSummary | null;
  submitSteering: (config: SteeringConfig) => void;
  onReplyToFinding: (finding: Finding) => void;
  logs: LogEntry[];
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

function getLogSource(message: string): string {
  const upper = message.toUpperCase();
  if (upper.includes("SECURITY")) return "SECURITY";
  if (upper.includes("PERFORMANCE")) return "PERFORMANCE";
  if (upper.includes("LOGIC")) return "LOGIC";
  if (upper.includes("PATTERN")) return "PATTERN";
  if (upper.includes("SUMMARY")) return "SUMMARY";
  return "CORE";
}

function getSourceColor(source: string): string {
  switch (source) {
    case "SECURITY": return "text-[#ff6e84]";
    case "PERFORMANCE": return "text-emerald-400";
    case "LOGIC": return "text-indigo-400";
    case "PATTERN": return "text-amber-400";
    case "SUMMARY": return "text-[#c3c0ff]";
    default: return "text-stone-400";
  }
}

export function CenterPanel({
  stage,
  input,
  setInput,
  send,
  isStreaming,
  prMetadata,
  agents,
  findings,
  reviewSummary,
  submitSteering,
  onReplyToFinding,
  logs
}: CenterPanelProps) {

  // ── Landing ──────────────────────────────────────────────────────────────
  if (stage === "landing") {
    return (
      <section className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* Hero */}
        <div className="max-w-7xl mx-auto px-12 pt-24 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#efeeeb] rounded-full mb-8">
            <span className="material-symbols-outlined text-[#2a14b4] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
            <span className="text-xs font-bold tracking-widest text-[#464554] uppercase">Autonomous PR intelligence</span>
          </div>

          <h1 className="text-7xl md:text-8xl font-headline font-black text-[#1b1c1a] mb-12 tracking-tight leading-tight">
            Refract your<br />
            <span className="text-[#2a14b4] italic">Codebase.</span>
          </h1>

          {/* URL Input */}
          <div className="max-w-3xl mx-auto mb-20">
            <div className="p-2 bg-[#f5f3f0] rounded-[2rem] shadow-[0_16px_32px_-4px_rgba(27,28,26,0.04)] focus-within:ring-1 focus-within:ring-[#2a14b4]/20 transition-all">
              <div className="flex items-center bg-white rounded-[1.75rem] px-6 py-4 gap-4">
                <span className="material-symbols-outlined text-[#464554]">link</span>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !isStreaming) send(); }}
                  placeholder="https://github.com/organization/repo/pull/123"
                  className="w-full bg-transparent border-none focus:ring-0 text-lg placeholder:text-[#464554]/40 font-body outline-none"
                />
                <button
                  onClick={send}
                  disabled={!input.trim() || isStreaming}
                  className="bg-gradient-to-br from-[#2a14b4] to-[#4338ca] text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
                >
                  Analyze
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
            <p className="mt-6 text-[#464554] text-sm">Enter any GitHub Pull Request URL to start an AI-powered code review.</p>
          </div>
        </div>

        {/* Bento feature grid */}
        <div className="max-w-7xl mx-auto px-12 pb-24 grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-8 bg-[#f5f3f0] rounded-[2.5rem] p-12 relative overflow-hidden">
            <span className="font-body font-bold text-[#2a14b4] tracking-widest uppercase text-[10px] mb-4 block">What is Prism</span>
            <h2 className="text-4xl font-headline font-bold text-[#1b1c1a] mb-6 max-w-md">A last line of defense before merge</h2>
            <p className="text-[#464554] text-lg leading-relaxed max-w-lg mb-8">
              Paste a GitHub PR URL and Prism reviews it before it hits main. Four specialized agents run in parallel — each focused on a different class of problem — so nothing slips through. Use it to catch real issues, or as an interactive tool to understand and improve your own code.
            </p>
            <div className="flex gap-4 flex-wrap">
              <div className="bg-white px-4 py-3 rounded-xl shadow-[0_16px_32px_-4px_rgba(27,28,26,0.04)] flex items-center gap-3">
                <span className="material-symbols-outlined text-[#2a14b4]">shield</span>
                <span className="text-sm font-semibold text-[#1b1c1a]">Security</span>
              </div>
              <div className="bg-white px-4 py-3 rounded-xl shadow-[0_16px_32px_-4px_rgba(27,28,26,0.04)] flex items-center gap-3">
                <span className="material-symbols-outlined text-[#2a14b4]">psychology</span>
                <span className="text-sm font-semibold text-[#1b1c1a]">Logic</span>
              </div>
              <div className="bg-white px-4 py-3 rounded-xl shadow-[0_16px_32px_-4px_rgba(27,28,26,0.04)] flex items-center gap-3">
                <span className="material-symbols-outlined text-[#2a14b4]">speed</span>
                <span className="text-sm font-semibold text-[#1b1c1a]">Performance</span>
              </div>
              <div className="bg-white px-4 py-3 rounded-xl shadow-[0_16px_32px_-4px_rgba(27,28,26,0.04)] flex items-center gap-3">
                <span className="material-symbols-outlined text-[#2a14b4]">grid_view</span>
                <span className="text-sm font-semibold text-[#1b1c1a]">Pattern</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-4 bg-gradient-to-br from-[#2a14b4] to-[#4338ca] p-8 rounded-[2.5rem] text-white flex flex-col justify-between">
            <div>
              <span className="material-symbols-outlined text-4xl mb-6 block">bolt</span>
              <h3 className="text-2xl font-headline font-bold mb-4">Follow-up Chat</h3>
              <p className="text-white/80 text-sm leading-relaxed">
                Ask the Prism Assistant about any finding to get an explanation or a suggested fix, with full file context injected automatically.
              </p>
            </div>
          </div>

          <div className="md:col-span-4 bg-[#eae8e5] rounded-[2.5rem] p-10">
            <span className="material-symbols-outlined text-[#2a14b4] mb-4 block">grid_view</span>
            <h4 className="text-xl font-headline font-bold mb-3 text-[#1b1c1a]">SOLID & Anti-patterns</h4>
            <p className="text-[#464554] text-sm leading-relaxed">Flags SOLID violations, high cyclomatic complexity, long functions, and naming inconsistencies.</p>
          </div>
          <div className="md:col-span-4 bg-white border border-[#c7c4d7]/15 rounded-[2.5rem] p-10 shadow-[0_16px_32px_-4px_rgba(27,28,26,0.04)]">
            <span className="material-symbols-outlined text-[#2a14b4] mb-4 block">psychology</span>
            <h4 className="text-xl font-headline font-bold mb-3 text-[#1b1c1a]">Security Scanning</h4>
            <p className="text-[#464554] text-sm leading-relaxed">Scans for injection vulnerabilities, exposed secrets, insecure auth flows, and OWASP-class issues.</p>
          </div>
          <div className="md:col-span-4 bg-[#f5f3f0] rounded-[2.5rem] p-10">
            <span className="material-symbols-outlined text-[#2a14b4] mb-4 block">history</span>
            <h4 className="text-xl font-headline font-bold mb-3 text-[#1b1c1a]">Review History</h4>
            <p className="text-[#464554] text-sm leading-relaxed">Every review is stored in D1. The dashboard tracks scores, finding trends, and top recurring issues across all your PRs.</p>
          </div>
        </div>
      </section>
    );
  }

  // ── Steering ─────────────────────────────────────────────────────────────
  if (stage === "steering") {
    if (!prMetadata) return null;
    return <SteeringPanel prMetadata={prMetadata} onSubmit={submitSteering} />;
  }

  // ── Processing ────────────────────────────────────────────────────────────
  if (stage === "processing") {
    const doneCount = agents.filter((a) => a.status === "completed").length;
    const progress = agents.length > 0 ? Math.round((doneCount / agents.length) * 100) : 0;
    const circumference = 2 * Math.PI * 70;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <section className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="max-w-6xl mx-auto px-12 pt-12 pb-12">
          {/* Editorial header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
            <div className="max-w-2xl">
              <span className="text-[12px] uppercase tracking-[0.3em] text-[#2a14b4] font-bold mb-4 block">System Diagnostic</span>
              <h2 className="text-5xl font-headline text-[#1b1c1a] leading-[1.1] mb-6">System Analysis in Progress</h2>
              <p className="text-[#464554] text-lg leading-relaxed font-light">
                The enabled agents are running in parallel against your diff. Results will appear as each agent completes.
              </p>
            </div>
            {/* Circular progress */}
            <div className="relative flex items-center justify-center shrink-0">
              <svg className="w-40 h-40 -rotate-90">
                <circle cx="80" cy="80" r="70" fill="transparent" stroke="#e4e2df" strokeWidth="6" />
                <circle
                  cx="80" cy="80" r="70"
                  fill="transparent"
                  stroke="#2a14b4"
                  strokeWidth="6"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-1000 ease-in-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-headline text-[#1b1c1a]">{progress}%</span>
                <span className="text-[10px] uppercase tracking-widest text-[#777586] font-bold">Aggregated</span>
              </div>
            </div>
          </div>

          {/* Agent cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>

          {/* Activity log */}
          <ActivityLogPanel logs={logs} />
        </div>
      </section>
    );
  }

  // ── Completed ─────────────────────────────────────────────────────────────
  return (
    <section className="flex-1 overflow-y-auto p-12 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="max-w-5xl mx-auto">
        {prMetadata && (
          <div className="mb-8">
            <PRMetadataBar {...prMetadata} />
          </div>
        )}

        {/* Header */}
        <header className="mb-12">
          <h1 className="font-headline text-5xl font-bold mb-8 tracking-tight text-[#1b1c1a]">Analysis Results</h1>

          {/* Score bento grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Quality score */}
            <div className="md:col-span-1 bg-white p-8 rounded-[24px] border border-[#c7c4d7]/10 shadow-[0_16px_32px_-4px_rgba(27,28,26,0.04)] flex flex-col items-center justify-center">
              <span className="text-xs font-bold tracking-widest uppercase text-[#464554] mb-2">Quality Score</span>
              <div className="text-6xl font-headline font-bold text-indigo-700">{reviewSummary?.score ?? "—"}</div>
              <div className="text-sm text-[#777586] mt-1">out of 100</div>
            </div>

            {/* Metrics */}
            <div className="md:col-span-3 grid grid-cols-3 gap-6">
              <div className="bg-[#f5f3f0] p-6 rounded-[24px] flex flex-col justify-between">
                <span className="material-symbols-outlined text-[#ba1a1a] text-3xl block mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>report</span>
                <div>
                  <div className="text-3xl font-headline font-bold text-[#1b1c1a]">{reviewSummary?.critical ?? 0}</div>
                  <div className="text-xs font-semibold text-[#464554] uppercase tracking-wider mt-1">Critical</div>
                </div>
              </div>
              <div className="bg-[#f5f3f0] p-6 rounded-[24px] flex flex-col justify-between">
                <span className="material-symbols-outlined text-amber-600 text-3xl block mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                <div>
                  <div className="text-3xl font-headline font-bold text-[#1b1c1a]">{reviewSummary?.warnings ?? 0}</div>
                  <div className="text-xs font-semibold text-[#464554] uppercase tracking-wider mt-1">Warnings</div>
                </div>
              </div>
              <div className="bg-[#f5f3f0] p-6 rounded-[24px] flex flex-col justify-between">
                <span className="material-symbols-outlined text-indigo-600 text-3xl block mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
                <div>
                  <div className="text-3xl font-headline font-bold text-[#1b1c1a]">{reviewSummary?.suggestions ?? 0}</div>
                  <div className="text-xs font-semibold text-[#464554] uppercase tracking-wider mt-1">Suggestions</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Findings */}
        <section className="space-y-6">
          <h2 className="font-headline text-2xl font-semibold border-b border-[#e4e2df] pb-4 text-[#1b1c1a]">Detected Findings</h2>
          {findings.length === 0 ? (
            <div className="flex items-center gap-5 bg-emerald-50 border border-emerald-200 rounded-2xl px-8 py-6">
              <span className="material-symbols-outlined text-emerald-500 text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              <div>
                <p className="font-semibold text-emerald-800 text-lg">No errors found</p>
                <p className="text-emerald-700 text-sm mt-0.5">Looks great!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {[...findings].sort((a, b) => {
                const priority: Record<string, number> = { critical: 0, warning: 1, suggestion: 2, success: 3 };
                return (priority[a.severity] ?? 4) - (priority[b.severity] ?? 4);
              }).map((finding) => (
                <FindingCard key={finding.id} finding={finding} onReply={() => onReplyToFinding(finding)} />
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function ActivityLogPanel({ logs }: { logs: LogEntry[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm uppercase tracking-widest font-bold text-[#464554]">Global System Log</h3>
      </div>
      <div className="bg-[#1b1c1a] rounded-[24px] p-8 overflow-hidden relative">
        <div className="font-mono text-xs leading-relaxed h-64 overflow-y-auto space-y-3 [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[#464554] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full">
          {logs.length === 0 ? (
            <div className="flex gap-4">
              <span className="text-stone-600">--:--:--</span>
              <span className="text-stone-500 animate-pulse">Waiting for workflow...</span>
            </div>
          ) : (
            logs.map((entry) => {
              const source = getLogSource(entry.message);
              return (
                <div key={entry.id} className="flex gap-4">
                  <span className="text-stone-600 shrink-0 tabular-nums">[{formatTime(entry.ts)}]</span>
                  <span className={`shrink-0 w-14 ${getSourceColor(source)}`}>{source}</span>
                  <span className="text-stone-400 break-all">{entry.message}</span>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
        <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-[#1b1c1a] to-transparent pointer-events-none" />
      </div>
    </div>
  );
}
