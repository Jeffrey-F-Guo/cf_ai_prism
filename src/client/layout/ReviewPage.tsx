import type { PrismState } from "../hooks/usePrism";
import { ChatSidebar } from "./ChatSidebar";
import { CenterPanel } from "./CenterPanel";

interface ReviewPageProps {
  prism: PrismState;
}

export function ReviewPage({ prism }: ReviewPageProps) {
  const isCompleted = prism.stage === "completed";

  return (
    <div className={`flex mt-20 bg-[#fbf9f6] ${isCompleted ? "h-[calc(100vh-5rem)] overflow-hidden" : "min-h-[calc(100vh-5rem)] flex-col"}`}>
      <CenterPanel
        stage={prism.stage}
        input={prism.input}
        setInput={prism.setInput}
        send={prism.send}
        isStreaming={prism.isStreaming}
        prMetadata={prism.prMetadata}
        agents={prism.agents}
        findings={prism.findings}
        reviewSummary={prism.reviewSummary}
        submitSteering={prism.submitSteering}
        onReplyToFinding={prism.quoteFinding}
        logs={prism.logs}
      />
      {isCompleted && <ChatSidebar {...prism} />}
    </div>
  );
}
