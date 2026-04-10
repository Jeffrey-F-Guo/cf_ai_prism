import { useState } from "react";
import type { PRMetadata, SteeringConfig } from "../../../types/review";

const AGENTS: Array<{
  id: SteeringConfig["agents"][number];
  label: string;
  description: string;
  icon: string;
}> = [
  { id: "security",    label: "Security",    description: "Vulnerability scanning, injection checks, secret exposure.", icon: "shield" },
  { id: "performance", label: "Performance", description: "Efficiency scoring, memory leak detection, latency optimization.", icon: "speed" },
  { id: "logic",       label: "Logic",       description: "Edge case analysis, business logic validation, test coverage.", icon: "psychology" },
  { id: "pattern",     label: "Pattern",     description: "Codebase consistency, architectural alignment, DRY adherence.", icon: "grid_view" }
];

const DEPTH_OPTIONS: Array<{ value: SteeringConfig["rigor"]; label: string; time: string }> = [
  { value: "quick",    label: "Quick",    time: "~30 Seconds" },
  { value: "standard", label: "Standard", time: "~2 Minutes" },
  { value: "deep",     label: "Deep",     time: "~5 Minutes" }
];

interface SteeringPanelProps {
  prMetadata: PRMetadata;
  onSubmit: (config: SteeringConfig) => void;
}

export function SteeringPanel({ prMetadata, onSubmit }: SteeringPanelProps) {
  const [selectedAgents, setSelectedAgents] = useState<Set<SteeringConfig["agents"][number]>>(
    new Set(["security", "performance", "logic", "pattern"])
  );
  const [rigor, setRigor] = useState<SteeringConfig["rigor"]>("standard");
  const [model, setModel] = useState<"claude" | "deepseek">("claude");
  const [focus, setFocus] = useState("");

  const toggleAgent = (id: SteeringConfig["agents"][number]) => {
    setSelectedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size === 1) return prev;
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    onSubmit({
      agents: Array.from(selectedAgents),
      rigor,
      model,
      ...(focus.trim() ? { focus: focus.trim() } : {})
    });
  };

  // Derive file ecosystem tags from PR title
  const ecosystems: string[] = [];
  const title = prMetadata.title.toLowerCase();
  if (title.includes("auth") || title.includes("security") || title.includes("login")) ecosystems.push("Auth");
  if (title.includes("api") || title.includes("endpoint")) ecosystems.push("API");
  if (title.includes("middleware") || title.includes("handler")) ecosystems.push("Middleware");
  if (ecosystems.length === 0) ecosystems.push("General");

  return (
    <section className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="max-w-7xl mx-auto px-12 pt-16 pb-24">
        {/* Editorial header */}
        <header className="mb-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="max-w-2xl">
              <span className="text-[#2a14b4] font-bold tracking-widest text-xs uppercase mb-4 block">Review Configuration</span>
              <h1 className="text-5xl md:text-6xl font-headline font-bold text-[#1b1c1a] leading-tight">
                Configure <span className="italic text-[#2a14b4]">Intelligence</span> Steering
              </h1>
              <p className="mt-6 text-[#464554] text-lg leading-relaxed max-w-xl">
                Define the scope, depth, and specific focus of the PR analysis. Prism leverages specialized neural agents to curate feedback for your architecture.
              </p>
            </div>
            <div className="hidden md:block shrink-0">
              <div className="bg-[#f5f3f0] p-6 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#2a14b4]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#2a14b4]">info</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1b1c1a]">System Status</p>
                  <p className="text-xs text-[#464554]">Neural Paper Engines Active</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* 2-col grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left: PR metadata + focus area */}
          <div className="lg:col-span-5 space-y-8">
            {/* PR Metadata card */}
            <section className="bg-white rounded-3xl p-8 shadow-[0_16px_32px_-4px_rgba(27,28,26,0.04)]">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold font-headline text-[#1b1c1a]">PR Metadata</h2>
                <span className="bg-[#2a14b4]/5 text-[#2a14b4] text-xs font-bold px-3 py-1 rounded-full">
                  #{prMetadata.prNumber}
                </span>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#464554] mb-2 block">Pull Request Title</label>
                  <p className="text-lg font-medium text-[#1b1c1a]">{prMetadata.title}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#464554] mb-2 block">Files Modified</label>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#2a14b4] text-sm">description</span>
                      <span className="text-[#1b1c1a] font-semibold">{prMetadata.filesChanged} Files</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#464554] mb-2 block">Repository</label>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#2a14b4] text-sm">folder_open</span>
                      <span className="text-[#1b1c1a] font-semibold text-sm truncate">{prMetadata.repoName}</span>
                    </div>
                  </div>
                </div>
                <div className="pt-6 border-t border-[#c7c4d7]/15">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#464554] mb-4 block">Affected Ecosystems</label>
                  <div className="flex flex-wrap gap-2">
                    {ecosystems.map((tag) => (
                      <span key={tag} className="px-3 py-1 bg-[#eae8e5] rounded-full text-xs font-medium text-[#1b1c1a]">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Focus area */}
            <section className="bg-[#f5f3f0] rounded-3xl p-8">
              <h2 className="text-xl font-bold font-headline mb-6 text-[#1b1c1a]">Optional Focus Area</h2>
              <textarea
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                className="w-full h-32 bg-white border-none rounded-2xl p-4 text-[#1b1c1a] placeholder:text-[#464554]/50 focus:ring-1 focus:ring-[#2a14b4]/40 transition-all outline-none resize-none"
                placeholder="e.g. 'Pay special attention to the JWT rotation logic in the middleware...'"
              />
            </section>
          </div>

          {/* Right: agent toggles + depth + CTA */}
          <div className="lg:col-span-7 space-y-12">
            {/* Agent toggles */}
            <section>
              <div className="flex items-end justify-between mb-8">
                <h2 className="text-2xl font-bold font-headline text-[#1b1c1a]">AI Specialist Agents</h2>
                <span className="text-xs text-[#464554] italic">Select agents to steer the review</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {AGENTS.map((agent) => {
                  const active = selectedAgents.has(agent.id);
                  return (
                    <button
                      key={agent.id}
                      onClick={() => toggleAgent(agent.id)}
                      className={`text-left bg-white p-6 rounded-2xl shadow-sm border transition-all ${
                        active ? "border-[#2a14b4]/20" : "border-transparent hover:border-[#2a14b4]/10"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-xl bg-[#e3dfff] flex items-center justify-center">
                          <span className="material-symbols-outlined text-[#2a14b4]">{agent.icon}</span>
                        </div>
                        {/* Toggle switch */}
                        <div className={`w-11 h-6 rounded-full transition-colors relative ${active ? "bg-[#2a14b4]" : "bg-[#eae8e5]"}`}>
                          <div className={`absolute top-[2px] w-5 h-5 rounded-full bg-white border border-stone-200 shadow-sm transition-all ${active ? "left-[22px]" : "left-[2px]"}`} />
                        </div>
                      </div>
                      <h3 className="text-lg font-bold text-[#1b1c1a]">{agent.label}</h3>
                      <p className="text-sm text-[#464554] mt-1">{agent.description}</p>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Analysis depth */}
            <section className="bg-[#efeeeb] rounded-3xl p-8">
              <h2 className="text-xl font-bold font-headline mb-8 text-[#1b1c1a]">Analysis Depth</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {DEPTH_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setRigor(opt.value)}
                    className={`p-6 rounded-2xl bg-white text-center transition-all border-2 ${
                      rigor === opt.value
                        ? "border-[#2a14b4] shadow-lg"
                        : "border-transparent"
                    }`}
                  >
                    <span className="block text-sm font-bold text-[#1b1c1a] mb-1">{opt.label}</span>
                    <span className="text-[10px] text-[#464554]">{opt.time}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Model */}
            <section className="bg-[#efeeeb] rounded-3xl p-8">
              <h2 className="text-xl font-bold font-headline mb-2 text-[#1b1c1a]">Model</h2>
              <p className="text-sm text-[#464554] mb-6">Select the AI model used by all agents.</p>
              <div className="grid grid-cols-2 gap-4">
                {([
                  { value: "claude" as const, label: "Claude", sub: "Anthropic" },
                  { value: "deepseek" as const, label: "DeepSeek", sub: "DeepSeek AI" },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setModel(opt.value)}
                    className={`p-6 rounded-2xl bg-white text-center transition-all border-2 ${
                      model === opt.value ? "border-[#2a14b4] shadow-lg" : "border-transparent"
                    }`}
                  >
                    <span className="block text-sm font-bold text-[#1b1c1a] mb-1">{opt.label}</span>
                    <span className="text-[10px] text-[#464554]">{opt.sub}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* CTA */}
            <div className="flex flex-col md:flex-row items-center gap-6 pt-4">
              <button
                onClick={handleSubmit}
                className="w-full md:w-auto px-12 py-4 rounded-full bg-gradient-to-br from-[#2a14b4] to-[#4338ca] text-white font-bold text-lg shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Start Review
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
