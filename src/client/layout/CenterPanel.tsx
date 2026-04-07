import type {
  ReviewStage,
  Agent,
  Finding,
  PRMetadata,
  ReviewSummary,
  SteeringConfig
} from "../../types/review";
import { AgentIcon, type AgentType } from "../components/shared/Icons";
import { AgentCard } from "../components/review/AgentCard";
import { PRMetadataBar } from "../components/review/PRMetadataBar";
import { FindingCard } from "../components/review/FindingCard";
import { SteeringPanel } from "../components/review/SteeringPanel";

interface CenterPanelProps {
  stage: ReviewStage;
  prMetadata: PRMetadata | null;
  agents: Agent[];
  findings: Finding[];
  reviewSummary: ReviewSummary | null;
  submitSteering: (config: SteeringConfig) => void;
  onReplyToFinding: (finding: Finding) => void;
}

export function CenterPanel({
  stage,
  prMetadata,
  agents,
  findings,
  reviewSummary,
  submitSteering,
  onReplyToFinding
}: CenterPanelProps) {
  if (stage === "landing") {
    return (
      <section className="flex-1 relative flex items-center justify-center px-12 overflow-hidden transition-all duration-300">
        <div className="text-center z-10 space-y-7">
          <div>
            <h1 className="text-6xl md:text-7xl font-black tracking-[-0.06em] text-white mb-3 italic">
              PRISM
            </h1>
            <p className="text-[#777575] text-sm font-medium tracking-wide">
              Parallel AI agents. One clear verdict.
            </p>
          </div>

          <div className="flex gap-2 justify-center flex-wrap">
            {(["logic", "security", "performance", "pattern"] as AgentType[]).map((type) => (
              <div
                key={type}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#bd9dff]/15 bg-[#bd9dff]/5 text-[11px] font-medium text-[#bd9dff]/60"
              >
                <AgentIcon type={type} size={13} />
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </div>
            ))}
          </div>

          <p className="text-[10px] text-[#494847] font-mono tracking-widest uppercase">
            Paste a PR URL in the chat to begin →
          </p>
        </div>
        <div className="absolute left-0 right-0 h-px bg-[#bd9dff]/15 top-1/4" />
        <div className="absolute left-0 right-0 h-px bg-[#bd9dff]/8 top-3/4" />
      </section>
    );
  }

  if (stage === "steering") {
    if (!prMetadata) return null;
    return <SteeringPanel prMetadata={prMetadata} onSubmit={submitSteering} />;
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

      {/* {reviewSummary && <SummaryCard summary={reviewSummary} />} */}

      {/* Findings Grid */}
      <div className="grid grid-cols-1 gap-6 mt-6">
        {[...findings]
          .sort((a, b) => {
            const priority: Record<string, number> = { critical: 0, warning: 1, suggestion: 2, success: 3 };
            return (priority[a.severity] ?? 4) - (priority[b.severity] ?? 4);
          })
          .map((finding) => (
            <FindingCard key={finding.id} finding={finding} onReply={() => onReplyToFinding(finding)} />
          ))}
      </div>
    </section>
  );
}
