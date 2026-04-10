import type { Finding, FindingSeverity } from "../../../types/review";
import { ReplyIcon } from "../shared/Icons";

const severityConfig: Record<FindingSeverity, {
  headerBg: string;
  border: string;
  badgeText: string;
  icon: string;
  iconColor: string;
  label: string;
}> = {
  critical: {
    headerBg: "bg-[#ffdad6]/15",
    border: "border-[#ba1a1a]",
    badgeText: "text-[#ba1a1a]",
    icon: "report",
    iconColor: "text-[#ba1a1a]",
    label: "Critical Severity"
  },
  warning: {
    headerBg: "bg-amber-50",
    border: "border-amber-500",
    badgeText: "text-amber-700",
    icon: "warning",
    iconColor: "text-amber-600",
    label: "Warning"
  },
  suggestion: {
    headerBg: "bg-indigo-50",
    border: "border-indigo-400",
    badgeText: "text-indigo-700",
    icon: "lightbulb",
    iconColor: "text-indigo-600",
    label: "Suggestion"
  },
  success: {
    headerBg: "bg-green-50",
    border: "border-green-500",
    badgeText: "text-green-700",
    icon: "check_circle",
    iconColor: "text-green-600",
    label: "Success"
  }
};

export function FindingCard({ finding, onReply }: { finding: Finding; onReply: () => void }) {
  const config = severityConfig[finding.severity];

  return (
    <article className="bg-white rounded-[24px] shadow-sm group relative">
      {/* Header strip */}
      <div className={`flex items-center gap-4 px-8 py-4 border-l-4 ${config.border} ${config.headerBg}`}>
        <span
          className={`material-symbols-outlined ${config.iconColor}`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {config.icon}
        </span>
        <span className={`text-xs font-bold uppercase tracking-widest ${config.badgeText}`}>
          {config.label}
        </span>
        {finding.agent && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#777586]">
            {finding.agent} agent
          </span>
        )}
        {finding.fileLocation && (
          <span className="ml-auto font-mono text-xs text-[#777586]">
            {finding.fileLocation}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-8">
        <h3 className="font-headline text-xl font-bold mb-3 text-[#1b1c1a]">{finding.title}</h3>
        <p className="text-[#464554] mb-6 leading-relaxed">{finding.description}</p>

        {/* Code diff
        {finding.codeDiff && finding.codeDiff.length > 0 && (
          <div className="rounded-xl bg-stone-900 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 bg-stone-800">
              <span className="material-symbols-outlined text-stone-400 text-xs">code</span>
              <span className="text-[10px] text-stone-400 uppercase tracking-widest">diff</span>
            </div>
            <pre className="p-6 text-sm font-mono overflow-x-auto">
              {finding.codeDiff.map((line, i) => (
                <span
                  key={i}
                  className={`block ${
                    line.type === "deletion"
                      ? "text-[#ff6e84]/70"
                      : line.type === "addition"
                        ? "text-emerald-400"
                        : "text-stone-400"
                  }`}
                >
                  {line.type === "deletion" ? "- " : line.type === "addition" ? "+ " : "  "}
                  {line.code}
                </span>
              ))}
            </pre>
          </div>
        )} */}
      </div>

      {/* Reply button */}
      <button
        onClick={onReply}
        className="absolute bottom-4 right-4 flex items-center gap-1.5 pl-3 pr-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-[#464554] hover:text-[#2a14b4] border border-transparent hover:border-[#2a14b4]/30 opacity-0 group-hover:opacity-100 transition-all duration-200"
      >
        <ReplyIcon size={12} />
        Ask
      </button>
    </article>
  );
}
