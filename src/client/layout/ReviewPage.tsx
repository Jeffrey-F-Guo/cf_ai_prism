import { usePrism } from "../hooks/usePrism";
import { ChatSidebar } from "./ChatSidebar";
import { CenterPanel } from "./CenterPanel";
import { RepositoryPanel } from "./RepositoryPanel";

export function ReviewPage() {
  const prism = usePrism();

  return (
    <div className="flex h-[calc(100vh-64px)] bg-[#0e0e0e] text-white overflow-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <ChatSidebar {...prism} />
      <CenterPanel stage={prism.stage} />
      <RepositoryPanel
        rightCollapsed={prism.rightCollapsed}
        setRightCollapsed={prism.setRightCollapsed}
        stage={prism.stage}
        hasHistoryRecords={prism.hasHistoryRecords}
      />
    </div>
  );
}
