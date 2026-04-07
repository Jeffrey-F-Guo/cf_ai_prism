import type { Finding, FindingSeverity } from "../../../types/review";
import { DangerousIcon, WarningTriangleIcon, LightbulbIcon, SuccessCircleIcon, ReplyIcon } from "../shared/Icons";

const severityConfig = {
  critical: {
    border: "border-[#ff6e84]",
    bg: "hover:bg-[#1a1919]",
    badgeBg: "bg-[#ff6e84]/10",
    badgeText: "text-[#ff6e84]",
    codeText: "text-[#d73357]",
    icon: "dangerous",
    iconHover: "group-hover:text-[#ff6e84]"
  },
  warning: {
    border: "border-[#ffb800]",
    bg: "hover:bg-[#1a1919]",
    badgeBg: "bg-[#ffb800]/10",
    badgeText: "text-[#ffb800]",
    codeText: "text-[#ffb800]",
    icon: "warning",
    iconHover: "group-hover:text-[#ffb800]"
  },
  suggestion: {
    border: "border-[#bd9dff]",
    bg: "hover:bg-[#1a1919]",
    badgeBg: "bg-[#bd9dff]/10",
    badgeText: "text-[#bd9dff]",
    codeText: "text-[#bd9dff]",
    icon: "lightbulb",
    iconHover: "group-hover:text-[#bd9dff]"
  },
  success: {
    border: "border-[#4cc9a0]",
    bg: "hover:bg-[#1a1919]",
    badgeBg: "bg-[#4cc9a0]/10",
    badgeText: "text-[#4cc9a0]",
    codeText: "text-[#4cc9a0]",
    icon: "check_circle",
    iconHover: ""
  }
};

const severityLabels: Record<FindingSeverity, string> = {
  critical: "Critical",
  warning: "Warning",
  suggestion: "Suggestion",
  success: "Success"
};

export function FindingCard({ finding, onReply }: { finding: Finding; onReply: () => void }) {
  const config = severityConfig[finding.severity];

  return (
    <div
      className={`group bg-[#131313] border-l-4 ${config.border} ${config.bg} transition-all p-6 rounded relative overflow-hidden`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <span
            className={`px-2 py-0.5 rounded-sm ${config.badgeBg} ${config.badgeText} text-[10px] font-bold uppercase tracking-widest`}
          >
            {severityLabels[finding.severity]}
          </span>
          {finding.agent && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#494847]">
              {finding.agent} agent
            </span>
          )}
        </div>
        <span className={`text-[#adaaaa] ${config.iconHover} transition-colors`}>
          {finding.severity === "critical" && <DangerousIcon size={18} />}
          {finding.severity === "warning" && <WarningTriangleIcon size={18} />}
          {finding.severity === "suggestion" && <LightbulbIcon size={18} />}
          {finding.severity === "success" && (
            <span className="text-[#4cc9a0]"><SuccessCircleIcon size={18} /></span>
          )}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold mb-2">{finding.title}</h3>

      {/* Description */}
      <p className="text-[#adaaaa] text-sm mb-3 leading-relaxed">
        {finding.description}
      </p>

      {/* File location */}
      {finding.fileLocation && (
        <div className="flex items-center gap-1.5 mb-4">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="text-[#494847] shrink-0">
            <path d="M1.5 3.5L5 6.5L1.5 9.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M6.5 9.5H11.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
          </svg>
          <span className="font-mono text-xs text-[#777575]">
            {finding.fileLocation}
          </span>
        </div>
      )}

      {/* Code Diff */}
      {finding.codeDiff && finding.codeDiff.length > 0 && (
        <div className="bg-[#0e0e0e] p-4 rounded border border-[#494847]/10">
          {finding.codeDiff.map((line, index) => (
            <div key={index}>
              <code
                className={`font-mono text-xs ${line.type === "deletion" ? config.codeText : line.type === "addition" ? "text-[#bd9dff]" : "text-[#777575]"}`}
              >
                {line.type === "deletion" && "- "}
                {line.type === "addition" && "+ "}
                {line.code}
              </code>
              {finding.codeDiff && index < finding.codeDiff.length - 1 && (
                <br />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reply button */}
      <button
        onClick={onReply}
        className="absolute bottom-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-[#494847] hover:text-[#bd9dff] border border-transparent hover:border-[#bd9dff]/30 opacity-0 group-hover:opacity-100 transition-all duration-200"
      >
        <ReplyIcon size={12} />
        Ask
      </button>
    </div>
  );
}
