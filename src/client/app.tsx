import { useState } from "react";
import { Nav } from "./components/Nav";
import { ReviewPage } from "./layout/ReviewPage";
import { Dashboard } from "./components/dashboard/Dashboard";
import { usePrism } from "./hooks/usePrism";

function CuratorsTray({ stage, activeTab, onNewReview }: {
  stage: string;
  activeTab: "review" | "dashboard";
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
        {activeTab === "dashboard" && (
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
  const [activeTab, setActiveTab] = useState<"review" | "dashboard">("review");
  const prism = usePrism();

  return (
    <>
      <Nav activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab === "dashboard" ? (
        <Dashboard
          reviewHistory={prism.reviewHistory}
          onSelectReview={(id) => {
            prism.loadHistoryReview(id);
            setActiveTab("review");
          }}
        />
      ) : (
        <ReviewPage prism={prism} />
      )}
      <CuratorsTray
        stage={prism.stage}
        activeTab={activeTab}
        onNewReview={() => setActiveTab("review")}
      />
    </>
  );
}
