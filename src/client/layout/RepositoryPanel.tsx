import type {
  ReviewStage,
  ReviewSummary,
  ReviewHistoryItem,
  LogEntry
} from "../../types/review";
import { ReviewHistory } from "../components/review/ReviewHistory";
import { SummaryCard } from "../components/review/SummaryCard";
import { ActivityLog } from "../components/review/ActivityLog";
import { ChevronLeft, ChevronRight } from "../components/shared/Icons";

interface RepositoryPanelProps {
  rightCollapsed: boolean;
  setRightCollapsed: (value: boolean) => void;
  stage: ReviewStage;
  hasHistoryRecords: boolean;
  reviewSummary: ReviewSummary | null;
  reviewHistory: ReviewHistoryItem[];
  logs: LogEntry[];
}

export function RepositoryPanel({
  rightCollapsed,
  setRightCollapsed,
  stage,
  hasHistoryRecords,
  reviewSummary,
  reviewHistory,
  logs
}: RepositoryPanelProps) {
  const agentCount = stage === "processing" ? "3" : "0";

  return (
    <section
      className={`${rightCollapsed ? "w-12 shrink-0" : "w-[25%] shrink-0"} bg-[#0e0e0e] flex flex-col h-full border-l border-[#494847]/10 transition-all duration-300 relative`}
    >
      {/* Right Collapse Button */}
      <button
        onClick={() => setRightCollapsed(!rightCollapsed)}
        className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-6 h-12 bg-[#0e0e0e] border border-[#494847]/20 rounded-l-md flex items-center justify-center text-[#777575] hover:text-white hover:bg-[#201f1f] transition-colors"
      >
        {rightCollapsed ? <ChevronLeft /> : <ChevronRight />}
      </button>

      {!rightCollapsed && (
        <>
          {/* Top Half: Status Card */}
          <div className="p-6 border-b border-[#494847]/10 shrink-0">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-4">
              Status
            </h3>

            {stage === "landing" && (
              <div className="bg-[#131313]/50 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-[#201f1f] rounded-xl flex items-center justify-center mb-4 opacity-40">
                  <span className="material-symbols-outlined text-2xl text-white">
                    hourglass_empty
                  </span>
                </div>
                <p className="text-sm font-medium text-white">
                  No reviews in progress
                </p>
                <p className="text-[10px] text-[#adaaaa] mt-1">
                  Submit a PR URL to begin analysis
                </p>
              </div>
            )}

            {stage === "processing" && (
              <div className="bg-[#131313]/50 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-[#bd9dff]/10 rounded-xl flex items-center justify-center mb-4 relative">
                  <span className="material-symbols-outlined text-2xl text-[#bd9dff]">
                    sync
                  </span>
                  <div className="absolute inset-0 border-2 border-[#bd9dff]/30 rounded-xl animate-ping" />
                </div>
                <p className="text-sm font-medium text-[#bd9dff]">
                  Review in progress
                </p>
                <p className="text-[10px] text-[#adaaaa] mt-1">
                  {agentCount} agents analyzing...
                </p>
              </div>
            )}

            {stage === "completed" && reviewSummary && (
              <SummaryCard summary={reviewSummary} />
            )}
          </div>

          {/* Activity Log: visible during and after review */}
          {stage === "processing" && (
            <div className="h-48 shrink-0 p-4 border-b border-[#494847]/10 overflow-hidden flex flex-col">
              <ActivityLog logs={logs} />
            </div>
          )}

          {/* Bottom Half: Review History */}
          <div className="flex-1 overflow-hidden">
            <ReviewHistory
              hasRecords={hasHistoryRecords}
              reviews={reviewHistory}
            />
          </div>

          {/* Footer */}
          <div className="p-4 bg-[#131313]/50 space-y-3 border-t border-[#494847]/10 shrink-0">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest opacity-40">
              <span>Engine Status</span>
              <span className="text-[#bd9dff] flex items-center gap-1">
                <span className="w-1 h-1 bg-[#bd9dff] rounded-full animate-pulse" />
                Stable
              </span>
            </div>
            <div className="h-1 bg-[#262626] rounded-full overflow-hidden">
              <div className="h-full bg-[#bd9dff]/40 w-1/3" />
            </div>
            <p className="text-[9px] text-[#adaaaa] leading-relaxed">
              PRISM AI v2.0.4-stable
            </p>
          </div>
        </>
      )}
    </section>
  );
}
