import { useState } from "react";
import type { ReviewHistoryItem } from "../../types/review";

interface ReviewHistoryPageProps {
  reviewHistory: ReviewHistoryItem[];
  onSelectReview: (id: string) => void;
  onDeleteReview: (id: string) => void;
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

export function ReviewHistoryPage({
  reviewHistory,
  onSelectReview,
  onDeleteReview
}: ReviewHistoryPageProps) {
  const [repoFilter, setRepoFilter] = useState<string | null>(null);
  const repos = [...new Set(reviewHistory.map((r) => `${r.owner}/${r.repo}`))];

  return (
    <main className="mt-20 min-h-screen bg-[#fbf9f6]">
      <div className="max-w-7xl mx-auto px-12 pt-16 pb-24">
        <header className="mb-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#2a14b4] mb-3">
            Review Archive
          </p>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="font-headline text-5xl font-bold text-[#1b1c1a] tracking-tight">
                Review History
              </h1>
              <p className="text-[#777586] mt-2 text-base">
                {reviewHistory.length}{" "}
                {reviewHistory.length === 1 ? "total review" : "total reviews"}
              </p>
            </div>
            {repos.length > 1 && (
              <select
                value={repoFilter ?? ""}
                onChange={(e) => setRepoFilter(e.target.value || null)}
                className="text-xs font-mono bg-[#f5f3f0] border border-[#c7c4d7]/30 rounded-xl px-3 py-2 text-[#464554] focus:outline-none focus:ring-2 focus:ring-[#2a14b4]/20 cursor-pointer"
              >
                <option value="">All repos</option>
                {repos.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            )}
          </div>
        </header>

        {reviewHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-2xl border border-[#c7c4d7]/15">
            <span className="material-symbols-outlined text-[#c7c4d7] text-5xl mb-4">
              history
            </span>
            <p className="text-[#464554] font-medium">No reviews yet</p>
            <p className="text-xs text-[#777586] mt-1">
              Complete your first review to see history here
            </p>
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
                  <th className="px-6 pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {(repoFilter
                  ? reviewHistory.filter(
                      (r) => `${r.owner}/${r.repo}` === repoFilter
                    )
                  : reviewHistory
                ).map((item) => {
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
                      <td className="px-6 py-5 text-[#464554] font-mono text-sm">
                        {item.owner}/{item.repo}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${scoreDotColor(score)}`}
                          />
                          <span
                            className={`font-semibold ${scoreColor(score)}`}
                          >
                            {score}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-[#464554] text-sm">
                        {item.timeAgo}
                      </td>
                      <td className="px-6 py-5">
                        {score >= 80 ? (
                          <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-[10px] font-bold uppercase">
                            Passed
                          </span>
                        ) : score >= 60 ? (
                          <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-[10px] font-bold uppercase">
                            Warning
                          </span>
                        ) : (
                          <span className="bg-[#ffdad6] text-[#93000a] px-3 py-1 rounded-full text-[10px] font-bold uppercase">
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-5 rounded-r-2xl">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteReview(item.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-[#ffdad6] text-[#777586] hover:text-[#ba1a1a]"
                          title="Delete review"
                        >
                          <span className="material-symbols-outlined text-base">
                            delete
                          </span>
                        </button>
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
