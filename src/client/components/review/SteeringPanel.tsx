import { useState } from "react";
import type { PRMetadata, SteeringConfig } from "../../../types/review";

const AGENTS: Array<{ id: SteeringConfig["agents"][number]; label: string; icon: string }> = [
  { id: "logic", label: "Logic & Edge Cases", icon: "psychology" },
  { id: "security", label: "Security", icon: "security" },
  { id: "performance", label: "Performance", icon: "speed" },
  { id: "pattern", label: "Code Patterns", icon: "hub" }
];

const RIGOR_OPTIONS: Array<{ value: SteeringConfig["rigor"]; label: string; description: string }> = [
  { value: "quick", label: "Quick Scan", description: "Surface-level issues only" },
  { value: "standard", label: "Standard", description: "Balanced depth and speed" },
  { value: "deep", label: "Deep Analysis", description: "Thorough review, all edge cases" }
];

interface SteeringPanelProps {
  prMetadata: PRMetadata;
  onSubmit: (config: SteeringConfig) => void;
}

export function SteeringPanel({ prMetadata, onSubmit }: SteeringPanelProps) {
  const [selectedAgents, setSelectedAgents] = useState<Set<SteeringConfig["agents"][number]>>(
    new Set(["logic", "security", "performance", "pattern"])
  );
  const [rigor, setRigor] = useState<SteeringConfig["rigor"]>("standard");
  const [focus, setFocus] = useState("");

  const toggleAgent = (id: SteeringConfig["agents"][number]) => {
    setSelectedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size === 1) return prev; // keep at least one agent
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    const config: SteeringConfig = {
      agents: Array.from(selectedAgents),
      rigor,
      ...(focus.trim() ? { focus: focus.trim() } : {})
    };
    onSubmit(config);
  };

  return (
    <section className="flex-1 overflow-y-auto p-8 transition-all duration-300 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {/* PR Header */}
      <div className="mb-8">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">
          Configure Review
        </p>
        <h1 className="text-3xl font-bold tracking-[-0.04em] text-white">
          {prMetadata.title}
        </h1>
        <p className="text-[#adaaaa] mt-1 text-sm">
          PR #{prMetadata.prNumber} · {prMetadata.repoName} · {prMetadata.filesChanged} files changed
        </p>
      </div>

      <div className="space-y-8 max-w-2xl">
        {/* Agent Selection */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-3">
            Agents
          </p>
          <div className="grid grid-cols-2 gap-3">
            {AGENTS.map((agent) => {
              const active = selectedAgents.has(agent.id);
              return (
                <button
                  key={agent.id}
                  onClick={() => toggleAgent(agent.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all ${
                    active
                      ? "border-[#bd9dff]/60 bg-[#bd9dff]/10 text-white"
                      : "border-white/10 bg-white/5 text-white/40"
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">{agent.icon}</span>
                  <span className="text-sm font-medium">{agent.label}</span>
                  {active && (
                    <span className="material-symbols-outlined text-sm ml-auto text-[#bd9dff]">
                      check_circle
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Rigor Selection */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-3">
            Analysis Depth
          </p>
          <div className="flex gap-3">
            {RIGOR_OPTIONS.map((option) => {
              const active = rigor === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setRigor(option.value)}
                  className={`flex-1 px-4 py-3 rounded-lg border text-left transition-all ${
                    active
                      ? "border-[#bd9dff]/60 bg-[#bd9dff]/10 text-white"
                      : "border-white/10 bg-white/5 text-white/40"
                  }`}
                >
                  <p className="text-sm font-semibold">{option.label}</p>
                  <p className="text-[11px] mt-0.5 opacity-70">{option.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Focus Area */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-3">
            Focus Area <span className="text-white/20 font-normal normal-case tracking-normal">(optional)</span>
          </p>
          <textarea
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="e.g. authentication middleware, database queries, error handling..."
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-white/20 resize-none focus:outline-none focus:border-[#bd9dff]/40 transition-colors"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          className="flex items-center gap-2 px-6 py-3 bg-[#bd9dff] hover:bg-[#d0baff] text-black font-bold text-sm rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined text-lg">play_arrow</span>
          Start Review
        </button>
      </div>
    </section>
  );
}
