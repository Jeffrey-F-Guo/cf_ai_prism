import type { ReviewHistoryItem } from "../../types/review";

interface ReviewHistoryPageProps {
  reviewHistory: ReviewHistoryItem[];
  onSelectReview: (id: string) => void;
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-[#ba1a1a]";
}

function scoreDotColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-400";
  return "bg-[#ba1a1a]";
}

export function ReviewHistoryPage({ reviewHistory, onSelectReview }: ReviewHistoryPageProps) {
  return (
    <main className="mt-20 min-h-screen bg-[#fbf9f6]">
      <div className="max-w-7xl mx-auto px-12 pt-16 pb-24">
        <header className="mb-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#2a14b4] mb-3">Review Archive</p>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="font-headline text-5xl font-bold text-[#1b1c1a] tracking-tight">Review History</h1>
              <p className="text-[#777586] mt-2 text-base">
                {reviewHistory.length} {reviewHistory.length === 1 ? "total review" : "total reviews"}
              </p>
            </div>
          </div>
        </header>

        {reviewHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-2xl border border-[#c7c4d7]/15">
            <span className="material-symbols-outlined text-[#c7c4d7] text-5xl mb-4">history</span>
            <p className="text-[#464554] font-medium">No reviews yet</p>
            <p className="text-xs text-[#777586] mt-1">Complete your first review to see history here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-4">
              <thead className="text-[10px] uppercase tracking-widest text-[#777586]">
                <tr>
                  <th className="px-6 pb-2">PR Title</th>
                  <th className="px-6 pb-2">Repository</th>
                  <th className="px-6 pb-2">Score</th>
                  <th className="px-6 pb-2">Date</th>
                  <th className="px-6 pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {reviewHistory.map((item) => {
                  const score = item.score ?? 0;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => onSelectReview(item.id)}
                      className="bg-white group hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <td className="px-6 py-5 rounded-l-2xl font-medium text-[#1b1c1a] max-w-[320px] truncate">
                        {item.prTitle}
                      </td>
                      <td className="px-6 py-5 text-[#464554] font-mono text-sm">PR #{item.prNumber}</td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${scoreDotColor(score)}`} />
                          <span className={`font-semibold ${scoreColor(score)}`}>{score}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-[#464554] text-sm">{item.timeAgo}</td>
                      <td className="px-6 py-5 rounded-r-2xl">
                        {score >= 80 ? (
                          <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-[10px] font-bold uppercase">Passed</span>
                        ) : score >= 60 ? (
                          <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-[10px] font-bold uppercase">Warning</span>
                        ) : (
                          <span className="bg-[#ffdad6] text-[#93000a] px-3 py-1 rounded-full text-[10px] font-bold uppercase">Failed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
