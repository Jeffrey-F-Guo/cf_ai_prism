import type {
  ReviewStage,
  Agent,
  Finding,
  PRMetadata,
  ReviewSummary
} from "../hooks/usePrism";
import { AgentCard } from "../components/review/AgentCard";
import { PRMetadataBar } from "../components/review/PRMetadataBar";
import { FindingCard } from "../components/review/FindingCard";

interface CenterPanelProps {
  stage: ReviewStage;
  prMetadata: PRMetadata | null;
  agents: Agent[];
  findings: Finding[];
  reviewSummary: ReviewSummary | null;
}

export function CenterPanel({
  stage,
  prMetadata,
  agents,
  findings,
  reviewSummary
}: CenterPanelProps) {
  if (stage === "landing") {
    return (
      <section className="flex-1 relative flex items-center justify-center px-12 overflow-hidden transition-all duration-300">
        <div className="text-center z-10">
          <h1 className="text-6xl md:text-7xl font-black tracking-[-0.06em] text-white mb-4 italic">
            PRISM
          </h1>
        </div>
        <div className="absolute left-0 right-0 h-px bg-[#bd9dff]/20 top-1/4" />
        <div className="absolute left-0 right-0 h-px bg-[#bd9dff]/10 top-3/4" />
      </section>
    );
  }

  if (stage === "processing") {
    return (
      <section className="flex-1 overflow-y-auto p-8 transition-all duration-300 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {prMetadata && <PRMetadataBar {...prMetadata} />}

        <div className="grid grid-cols-1 gap-4 mt-8">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="flex-1 overflow-y-auto p-8 transition-all duration-300 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {prMetadata && <PRMetadataBar {...prMetadata} />}

      {/* Review Complete Header */}
      <div className="mt-8 mb-6">
        <h1 className="text-4xl font-bold tracking-[-0.04em] text-white mb-2">
          Review Complete
        </h1>
        <p className="text-[#adaaaa] flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">history</span>
          {reviewSummary?.duration && reviewSummary?.cost
            ? `Review complete in ${reviewSummary.duration} • ${reviewSummary.cost} cost`
            : "Review complete"}
        </p>
      </div>

      {/* Findings Grid */}
      <div className="grid grid-cols-1 gap-6">
        {findings.map((finding) => (
          <FindingCard key={finding.id} finding={finding} />
        ))}
      </div>
    </section>
  );
}
