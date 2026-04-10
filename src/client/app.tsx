import { useState } from "react";

function ConfirmNewReviewModal({ isProcessing, onConfirm, onCancel }: {
  isProcessing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-[#1b1c1a]/20 backdrop-blur-sm z-[100] flex items-center justify-center">
      <div className="bg-white rounded-[24px] p-8 max-w-sm w-full mx-4 shadow-[0_16px_32px_-4px_rgba(27,28,26,0.12)]">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-6 ${isProcessing ? "bg-[#ffdad6]/40" : "bg-[#e3dfff]/40"}`}>
          <span
            className={`material-symbols-outlined ${isProcessing ? "text-[#ba1a1a]" : "text-[#2a14b4]"}`}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {isProcessing ? "warning" : "refresh"}
          </span>
        </div>
        <h2 className="font-headline text-xl font-bold text-[#1b1c1a]">
          {isProcessing ? "Cancel active scan?" : "Start a new review?"}
        </h2>
        <p className="text-sm text-[#464554] mt-2 leading-relaxed">
          {isProcessing
            ? "A review is currently in progress. Starting a new one will cancel the active scan."
            : "Your results are saved to Review History and can be accessed any time."}
        </p>
        <div className="mt-8 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-full border border-[#c7c4d7]/40 text-[#464554] font-semibold text-sm hover:bg-[#f5f3f0] transition-colors"
          >
            Exit
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-full bg-gradient-to-br from-[#2a14b4] to-[#4338ca] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            {isProcessing ? "Cancel Scan" : "Start New Review"}
          </button>
        </div>
      </div>
    </div>
  );
}
import { Nav } from "./components/Nav";
import type { AppTab } from "./components/Nav";
import { ReviewPage } from "./layout/ReviewPage";
import { ReviewHistoryPage } from "./layout/ReviewHistoryPage";
import { Dashboard } from "./components/dashboard/Dashboard";
import { usePrism } from "./hooks/usePrism";

function CuratorsTray({ stage, activeTab, onNewReview }: {
  stage: string;
  activeTab: AppTab;
  onNewReview: () => void;
}) {
  const isProcessing = stage === "processing";
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#fbf9f6]/70 backdrop-blur-xl rounded-full px-6 py-3 shadow-2xl flex items-center gap-8 border border-[#c7c4d7]/20">
      <div className="flex items-center gap-3 border-r border-[#c7c4d7]/30 pr-8">
        <div className={`w-2 h-2 rounded-full ${isProcessing ? "bg-emerald-500 animate-ping" : "bg-emerald-500"}`} />
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#464554]">
          {isProcessing ? "Active Scan" : "System Optimal"}
        </span>
      </div>
      <div className="flex gap-4 items-center">
        {(activeTab === "dashboard" || activeTab === "history") && (
          <button
            onClick={onNewReview}
            className="flex items-center gap-2 bg-[#2a14b4] px-4 py-2 rounded-full text-white text-xs font-semibold hover:bg-[#4338ca] transition-colors"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            New Analysis
          </button>
        )}
        <div className="w-px h-6 bg-[#c7c4d7]/30 mx-1" />
        <button className="p-2 text-[#777586] hover:text-[#2a14b4] transition-colors">
          <span className="material-symbols-outlined text-lg">refresh</span>
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>("review");
  const [confirmModal, setConfirmModal] = useState<{ isProcessing: boolean } | null>(null);
  const prism = usePrism();

  const handleSelectReview = (id: string) => {
    prism.loadHistoryReview(id);
    setActiveTab("review");
  };

  const handleNewReview = () => {
    if (prism.stage === "processing" || prism.stage === "completed") {
      setConfirmModal({ isProcessing: prism.stage === "processing" });
      return;
    }
    prism.setStage("landing");
    setActiveTab("review");
  };

  const confirmNewReview = () => {
    setConfirmModal(null);
    prism.setStage("landing");
    setActiveTab("review");
  };

  return (
    <>
      <Nav activeTab={activeTab} onTabChange={setActiveTab} onNewReview={handleNewReview} />
      {activeTab === "history" ? (
        <ReviewHistoryPage
          reviewHistory={prism.reviewHistory}
          onSelectReview={handleSelectReview}
          onDeleteReview={prism.deleteReview}
        />
      ) : activeTab === "dashboard" ? (
        <Dashboard
          reviewHistory={prism.reviewHistory}
          onSelectReview={handleSelectReview}
          onDeleteReview={prism.deleteReview}
          onViewAllReviews={() => setActiveTab("history")}
        />
      ) : (
        <ReviewPage prism={prism} />
      )}
      <CuratorsTray
        stage={prism.stage}
        activeTab={activeTab}
        onNewReview={handleNewReview}
      />
      {confirmModal && (
        <ConfirmNewReviewModal
          isProcessing={confirmModal.isProcessing}
          onConfirm={confirmNewReview}
          onCancel={() => setConfirmModal(null)}
        />
      )}
      {prism.notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#1b1c1a] text-white text-sm px-5 py-3 rounded-2xl shadow-xl">
          <span className="material-symbols-outlined text-amber-400 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
          <span>{prism.notification}</span>
          <button onClick={prism.clearNotification} className="text-white/50 hover:text-white ml-1 leading-none">✕</button>
        </div>
      )}
    </>
  );
}
