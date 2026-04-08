import type { Agent } from "../../../types/review";

const agentConfig: Record<string, {
  iconBg: string;
  iconText: string;
  icon: string;
  description: string;
}> = {
  security: {
    iconBg: "bg-[#ffdad6]/30",
    iconText: "text-[#ba1a1a]",
    icon: "verified_user",
    description: "Reviewing encryption protocols and dependency vulnerabilities."
  },
  performance: {
    iconBg: "bg-[#c0bdff]/20",
    iconText: "text-[#5a5893]",
    icon: "speed",
    description: "Benchmarking execution speed and resource allocation curves."
  },
  logic: {
    iconBg: "bg-[#e3dfff]/30",
    iconText: "text-[#2a14b4]",
    icon: "account_tree",
    description: "Mapping branch complexity and redundant condition states."
  },
  pattern: {
    iconBg: "bg-[#eae8e5]",
    iconText: "text-[#777586]",
    icon: "grain",
    description: "Semantic similarity check and architectural alignment."
  }
};

export function AgentCard({ agent }: { agent: Agent }) {
  const config = agentConfig[agent.id] ?? agentConfig.pattern;
  const isQueued = agent.status === "queued";
  const isCompleted = agent.status === "completed";
  const isActive = agent.status === "analyzing";

  const activeTasks = agent.tasks.filter((t) => t.status === "active");
  const lastTask = activeTasks[activeTasks.length - 1] ?? agent.tasks[agent.tasks.length - 1];

  return (
    <div className={`bg-white rounded-[24px] p-6 shadow-sm border border-[#c7c4d7]/10 hover:shadow-md transition-shadow ${isQueued ? "opacity-60" : ""}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div className={`p-3 ${config.iconBg} rounded-xl ${config.iconText}`}>
          <span
            className="material-symbols-outlined text-xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {config.icon}
          </span>
        </div>

        {/* Status badge */}
        {isQueued && (
          <span className="px-3 py-1 bg-[#efeeeb] text-[10px] font-bold rounded-full text-[#777586]">
            Queued
          </span>
        )}
        {isActive && (
          <span className="px-3 py-1 bg-[#eae8e5] text-[10px] font-bold rounded-full text-[#464554]">
            {agent.status === "analyzing" ? "Analyzing" : "Scanning"}
          </span>
        )}
        {isCompleted && (
          <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">
            Completed
          </span>
        )}
        {false /* error state not in AgentStatus */ && (
          <span className="px-3 py-1 bg-[#ffdad6] text-[#93000a] text-[10px] font-bold rounded-full">
            Error
          </span>
        )}
      </div>

      {/* Title + description */}
      <h3 className="text-xl font-headline mb-2 text-[#1b1c1a]">{agent.title}</h3>
      <p className="text-sm text-[#464554] mb-6 leading-snug">{config.description}</p>

      {/* Task stream */}
      <div className="pt-4 border-t border-[#eae8e5]">
        {isQueued && (
          <div className="flex items-center gap-2 text-[11px] font-medium text-[#777586]">
            <span>Waiting for prior agent...</span>
          </div>
        )}
        {isActive && lastTask && (
          <div className="flex items-center gap-2 text-[11px] font-medium text-[#2a14b4]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#2a14b4] animate-pulse shrink-0" />
            <span className="truncate">{lastTask.text}</span>
          </div>
        )}
        {isCompleted && (
          <div className="flex items-center gap-2 text-[11px] font-medium text-[#464554]">
            <span className="material-symbols-outlined text-green-600 text-sm">check_circle</span>
            <span>Analysis complete</span>
          </div>
        )}
        {false /* error state not in AgentStatus */ && (
          <div className="flex items-center gap-2 text-[11px] font-medium text-[#ba1a1a]">
            <span className="material-symbols-outlined text-sm">error</span>
            <span>Failed</span>
          </div>
        )}
      </div>
    </div>
  );
}
