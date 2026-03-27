import type { Agent } from "../../hooks/usePrism";

const iconColors = {
  error: {
    bg: "bg-[#a70138]/20",
    text: "text-[#ff6e84]"
  },
  primary: {
    bg: "bg-[#bd9dff]/20",
    text: "text-[#bd9dff]"
  },
  secondary: {
    bg: "bg-[#612b8f]/20",
    text: "text-[#c38bf5]"
  }
};

export function AgentCard({ agent }: { agent: Agent }) {
  const colors = iconColors[agent.iconColor];

  return (
    <div
      className={`bg-[#1a1919] p-5 rounded-xl border border-white/5 relative group overflow-hidden ${
        agent.status === "analyzing" ? "pulsing-border" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}
          >
            <span
              className={`material-symbols-outlined ${colors.text}`}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {agent.icon}
            </span>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider">
              {agent.title}
            </h3>
            <p className="text-[10px] text-[#adaaaa] font-mono">
              {agent.subtitle}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div
          className={`px-2 py-1 rounded flex items-center gap-1.5 ${
            agent.status === "queued" ? "bg-[#262626]" : "bg-[#bd9dff]/10"
          }`}
        >
          {agent.status === "analyzing" && (
            <div className="w-1 h-1 rounded-full bg-[#bd9dff] animate-pulse" />
          )}
          <span
            className={`text-[8px] font-bold tracking-widest ${
              agent.status === "queued" ? "text-gray-500" : "text-[#bd9dff]"
            }`}
          >
            {agent.status === "analyzing" && "ANALYZING"}
            {agent.status === "queued" && "QUEUED"}
            {agent.status === "completed" && "COMPLETED"}
          </span>
        </div>
      </div>

      {/* Tasks */}
      <div className="space-y-2 font-mono text-[11px]">
        {agent.tasks.map((task, index) => (
          <div
            key={task.id}
            className={`flex gap-2 ${
              task.status === "completed"
                ? "opacity-30"
                : task.status === "pending"
                  ? "opacity-60"
                  : ""
            }`}
          >
            <span className={`${colors.text} opacity-50`}>
              {String(index + 1).padStart(2, "0")}
            </span>
            <span
              className={`${
                task.status === "active"
                  ? "text-white stream-text"
                  : "text-[#adaaaa]"
              }`}
            >
              {task.text}
            </span>
          </div>
        ))}
      </div>

      {/* Queued State */}
      {agent.status === "queued" && agent.tasks.length > 0 && (
        <div className="h-8 bg-[#0e0e0e]/50 rounded flex items-center justify-center mt-4">
          <span className="text-[10px] font-mono text-gray-600 italic">
            {agent.tasks[0]?.text || "Waiting..."}
          </span>
        </div>
      )}
    </div>
  );
}
