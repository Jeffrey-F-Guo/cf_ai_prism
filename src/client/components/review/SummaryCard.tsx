import type { ReviewSummary } from "../../hooks/usePrism";

interface SummaryCardProps {
  summary: ReviewSummary;
}

export function SummaryCard({ summary }: SummaryCardProps) {
  const scorePercentage = (summary.score / 100) * 352;

  return (
    <div className="bg-[#131313]/50 rounded-xl p-4 relative overflow-hidden">
      <div className="absolute -top-8 -right-8 w-24 h-24 bg-[#bd9dff]/20 blur-[40px] rounded-full" />
      <div className="relative z-10 text-center flex flex-col items-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#adaaaa] mb-4">
          Overall Analysis Score
        </p>
        <div className="relative flex items-center justify-center mb-4">
          <svg className="w-32 h-32 transform -rotate-90">
            <circle
              className="text-[#262626]"
              cx="64"
              cy="64"
              fill="transparent"
              r="56"
              stroke="currentColor"
              strokeWidth="6"
            />
            <circle
              className="text-[#bd9dff] drop-shadow-[0_0_8px_rgba(189,157,255,0.4)]"
              cx="64"
              cy="64"
              fill="transparent"
              r="56"
              stroke="currentColor"
              strokeDasharray="352"
              strokeDashoffset={352 - scorePercentage}
              strokeLinecap="round"
              strokeWidth="6"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-black text-white tracking-tighter">
              {summary.score}
            </span>
            <span className="text-[9px] text-[#adaaaa] font-medium">
              {summary.grade}
            </span>
          </div>
        </div>
        <div className="flex gap-6 w-full justify-around">
          <div className="flex flex-col items-center">
            <span className="text-[#ff6e84] font-bold text-lg">
              {summary.critical}
            </span>
            <span className="text-[9px] uppercase text-[#adaaaa] font-bold">
              Critical
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[#ffb800] font-bold text-lg">
              {summary.warnings}
            </span>
            <span className="text-[9px] uppercase text-[#adaaaa] font-bold">
              Warnings
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[#bd9dff] font-bold text-lg">
              {summary.suggestions}
            </span>
            <span className="text-[9px] uppercase text-[#adaaaa] font-bold">
              Suggestions
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
