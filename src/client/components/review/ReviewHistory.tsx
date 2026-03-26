export interface ReviewHistoryItem {
  id: string;
  prNumber: number;
  prTitle: string;
  score: number;
  timeAgo: string;
}

interface ReviewHistoryProps {
  hasRecords: boolean;
  reviews?: ReviewHistoryItem[];
}

const defaultReviews: ReviewHistoryItem[] = [
  { id: "1", prNumber: 841, prTitle: "Redux Store Refactor", score: 98, timeAgo: "2 hours ago" },
  { id: "2", prNumber: 840, prTitle: "Fix OAuth Leak", score: 42, timeAgo: "Yesterday" },
  { id: "3", prNumber: 839, prTitle: "New Landing Grid", score: 86, timeAgo: "2 days ago" },
];

export function ReviewHistory({ hasRecords, reviews = defaultReviews }: ReviewHistoryProps) {
  if (!hasRecords) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-12 h-12 bg-[#201f1f] rounded-xl flex items-center justify-center opacity-30">
          <span className="material-symbols-outlined text-2xl">history</span>
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
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] font-mono uppercase tracking-widest text-[#adaaaa]">
          Recent History
        </h3>
        <button className="text-[10px] font-bold text-[#bd9dff] hover:underline">
          View All
        </button>
      </div>

      {reviews.map((review) => (
        <div
          key={review.id}
          className="p-4 rounded-lg bg-[#131313] border border-white/5 hover:bg-[#201f1f] transition-all cursor-pointer"
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold">
              #{review.prNumber} {review.prTitle}
            </span>
            <div className={`px-2 py-0.5 text-[10px] font-bold rounded ${getScoreColor(review.score)}`}>
              {review.score}/100
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500 font-mono">{review.timeAgo}</span>
            <span className="material-symbols-outlined text-xs text-gray-600">chevron_right</span>
          </div>
        </div>
      ))}
    </div>
  );
}
