import type { ReviewSummary } from "../../../types/review";

interface SummaryCardProps {
  summary: ReviewSummary;
}

export function SummaryCard({ summary }: SummaryCardProps) {
  const scoreColor =
    summary.score >= 80
      ? "#bd9dff"
      : summary.score >= 60
        ? "#ffb800"
        : "#ff6e84";
  const glowColor =
    summary.score >= 80
      ? "rgba(189,157,255,0.4)"
      : summary.score >= 60
        ? "rgba(255,184,0,0.4)"
        : "rgba(255,110,132,0.4)";

  return (
    <div className="bg-[#131313]/50 rounded-xl p-4 relative overflow-hidden">
      <div
        className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-[40px]"
        style={{ background: `${scoreColor}33` }}
      />
      <div className="relative z-10 text-center flex flex-col items-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#adaaaa] mb-4">
          Analysis Score
        </p>
        <div className="relative flex items-center justify-center mb-4 w-28 h-28">
          <svg viewBox="0 0 112 112" className="w-28 h-28 -rotate-90">
            <circle
              cx="56"
              cy="56"
              fill="transparent"
              r="48"
              stroke="#262626"
              strokeWidth="6"
            />
            <circle
              cx="56"
              cy="56"
              fill="transparent"
              r="48"
              stroke={scoreColor}
              strokeDasharray="301"
              strokeDashoffset={301 - (summary.score / 100) * 301}
              strokeLinecap="round"
              strokeWidth="6"
              style={{ filter: `drop-shadow(0 0 6px ${glowColor})` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
            <span className="text-2xl font-black text-white leading-none tabular-nums">
              {summary.score}
            </span>
          </div>
        </div>
        <div className="w-full space-y-1.5 pt-2 border-t border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase text-[#777575] font-bold tracking-wider">
              Critical
            </span>
            <span className="text-[#ff6e84] font-black text-sm tabular-nums leading-none">
              {summary.critical}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase text-[#777575] font-bold tracking-wider">
              Warnings
            </span>
            <span className="text-[#ffb800] font-black text-sm tabular-nums leading-none">
              {summary.warnings}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase text-[#777575] font-bold tracking-wider">
              Suggestions
            </span>
            <span className="text-[#bd9dff] font-black text-sm tabular-nums leading-none">
              {summary.suggestions}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
