import type { Finding, FindingSeverity } from "../../../types/review";

const severityConfig = {
  critical: {
    border: "border-[#ff6e84]",
    bg: "hover:bg-[#1a1919]",
    badgeBg: "bg-[#ff6e84]/10",
    badgeText: "text-[#ff6e84]",
    codeText: "text-[#d73357]",
    icon: "unfold_more",
    iconHover: "group-hover:text-[#ff6e84]"
  },
  warning: {
    border: "border-[#ffb800]",
    bg: "hover:bg-[#1a1919]",
    badgeBg: "bg-[#ffb800]/10",
    badgeText: "text-[#ffb800]",
    codeText: "text-[#ffb800]",
    icon: "chat_bubble_outline",
    iconHover: "group-hover:text-[#ffb800]"
  },
  suggestion: {
    border: "border-[#bd9dff]",
    bg: "hover:bg-[#1a1919]",
    badgeBg: "bg-[#bd9dff]/10",
    badgeText: "text-[#bd9dff]",
    codeText: "text-[#bd9dff]",
    icon: "auto_fix",
    iconHover: "group-hover:text-[#bd9dff]"
  },
  success: {
    border: "border-[#ff97b2]",
    bg: "hover:bg-[#1a1919]",
    badgeBg: "bg-[#ff97b2]/10",
    badgeText: "text-[#ff97b2]",
    codeText: "text-[#ff97b2]",
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

export function FindingCard({
  finding,
  onExpand,
  onChat,
  onAutoFix
}: {
  finding: Finding;
  onExpand?: () => void;
  onChat?: () => void;
  onAutoFix?: () => void;
}) {
  const config = severityConfig[finding.severity];

  const handleIconClick = () => {
    if (finding.severity === "critical" && onExpand) onExpand();
    else if (finding.severity === "warning" && onChat) onChat();
    else if (finding.severity === "suggestion" && onAutoFix) onAutoFix();
  };

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
          {finding.fileLocation && (
            <span className="font-mono text-xs text-[#adaaaa]">
              {finding.fileLocation}
            </span>
          )}
        </div>
        {finding.severity !== "success" && (
          <button
            onClick={handleIconClick}
            className={`text-[#adaaaa] ${config.iconHover} transition-colors cursor-pointer`}
          >
            <span className="material-symbols-outlined">{config.icon}</span>
          </button>
        )}
        {finding.severity === "success" && (
          <span
            className="material-symbols-outlined text-[#ff97b2]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            check_circle
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold mb-2">{finding.title}</h3>

      {/* Description */}
      <p className="text-[#adaaaa] text-sm mb-4 leading-relaxed">
        {finding.description}
      </p>

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
    </div>
  );
}
