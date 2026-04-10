import type { ReviewHistoryItem } from "../../../types/review";
import { ChevronRight } from "../shared/Icons";

interface ReviewHistoryProps {
  hasRecords: boolean;
  reviews: ReviewHistoryItem[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ReviewHistory({
  hasRecords,
  reviews,
  onSelect,
  onDelete
}: ReviewHistoryProps) {
  if (!hasRecords) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-12 h-12 bg-[#201f1f] rounded-xl flex items-center justify-center opacity-30">
          <svg
            width="22"
            height="22"
            viewBox="0 0 22 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M11 4V11L15 13"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M3.5 8A8 8 0 1 1 4.5 15"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M3.5 4V8H7.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-white">No previous reviews</p>
          <p className="text-xs text-[#adaaaa] max-w-[180px]">
            Your review history will appear here once analysis is complete.
          </p>
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-[#bd9dff]/20 text-[#bd9dff]";
    if (score >= 60) return "bg-[#ffb800]/20 text-[#ffb800]";
    return "bg-[#a70138]/20 text-[#ff6e84]";
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] font-mono uppercase tracking-widest text-[#adaaaa]">
          Recent History
        </h3>
      </div>

      {reviews.map((review) => (
        <div
          key={review.id}
          className="group relative p-4 rounded-lg bg-[#131313] border border-white/5 hover:bg-[#201f1f] transition-all"
        >
          {/* Full-card select button (behind delete button) */}
          <button
            onClick={() => onSelect(review.id)}
            aria-label={`Open review #${review.prNumber}`}
            className="absolute inset-0 rounded-lg cursor-pointer"
          />
          {/* Delete button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(review.id);
            }}
            className="absolute top-2 right-2 z-10 w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 text-[#494847] hover:text-[#ff6e84] hover:bg-[#ff6e84]/10 transition-all"
            title="Delete review"
          >
            <svg
              width="8"
              height="8"
              viewBox="0 0 8 8"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1 1L7 7M7 1L1 7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <div className="relative flex justify-between items-start mb-2 pr-4">
            <span className="text-xs font-bold leading-snug">
              #{review.prNumber} {review.prTitle}
            </span>
            <div
              className={`px-2 py-0.5 text-[10px] font-bold rounded shrink-0 ml-2 ${getScoreColor(review.score)}`}
            >
              {review.score}/100
            </div>
          </div>
          <div className="relative flex items-center justify-between">
            <span className="text-[10px] text-gray-500 font-mono">
              {review.timeAgo}
            </span>
            <ChevronRight />
          </div>
        </div>
      ))}
    </div>
  );
}
