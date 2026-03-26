import { AgentCard } from "../components/review/AgentCard";
import { PRMetadataBar } from "../components/review/PRMetadataBar";
import { FindingCard, type FindingSeverity } from "../components/review/FindingCard";

interface CenterPanelProps {
  stage: "landing" | "processing" | "completed";
}

interface Finding {
  severity: FindingSeverity;
  title: string;
  description: string;
  fileLocation?: string;
  codeDiff?: { type: "addition" | "deletion" | "unchanged"; code: string }[];
}

const mockFindings: Finding[] = [
  {
    severity: "critical",
    title: "Insecure Session Token Generation",
    description: "The use of Math.random() for token generation is cryptographically insecure. Use crypto.getRandomValues() to prevent session hijacking via token prediction.",
    fileLocation: "src/auth/session.ts:L42",
    codeDiff: [
      { type: "deletion", code: "const token = Math.random().toString(36);" },
      { type: "addition", code: "const token = crypto.randomUUID();" },
    ],
  },
  {
    severity: "warning",
    title: "Potential Memory Leak in Logger",
    description: "Event listeners are being attached within the request handler without cleanup. This will cause heap exhaustion under high load.",
    fileLocation: "src/api/middleware.ts:L114",
  },
  {
    severity: "suggestion",
    title: "Extract Constants",
    description: "Hardcoded timeout values found. Moving these to a configuration file would improve maintainability across environments.",
    fileLocation: "src/lib/utils.ts:L12",
  },
  {
    severity: "success",
    title: "Optimal Complexity Scores",
    description: "Cyclomatic complexity is below the threshold for all new functions. Excellent separation of concerns.",
    fileLocation: "Project-wide",
  },
];

export function CenterPanel({ stage }: CenterPanelProps) {
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
        <PRMetadataBar
          prTitle="feat: implement-distributed-caching"
          repoName="prism-ai / core-engine"
          prNumber={842}
          filesChanged={8}
          contributors={3}
        />

        <div className="grid grid-cols-1 gap-4 mt-8">
          <AgentCard
            icon="security"
            iconColor="error"
            title="Security Agent"
            subtitle="Scanning for vulnerabilities..."
            status="analyzing"
            tasks={[
              { id: "1", text: 'Checking encryption constants in `auth/vault.go`', status: "active" },
              { id: "2", text: "Verifying cross-origin policy changes in `api/middleware.ts`", status: "pending" },
              { id: "3", text: "Evaluating SQL injection surface area", status: "pending" },
            ]}
          />
          <AgentCard
            icon="psychology"
            iconColor="primary"
            title="Logic & Edge Cases"
            subtitle="Evaluating business rules..."
            status="analyzing"
            tasks={[
              { id: "1", text: "Validating cache invalidation logic on high-concurrency", status: "active" },
              { id: "2", text: "Checking race conditions in `worker/sync.go`", status: "pending" },
            ]}
          />
          <AgentCard
            icon="speed"
            iconColor="secondary"
            title="Performance Profiler"
            subtitle="Measuring complexity overhead..."
            status="analyzing"
            tasks={[
              { id: "1", text: "Simulating O(n) impact on large dataset fetch", status: "active" },
            ]}
          />
          <AgentCard
            icon="hub"
            iconColor="primary"
            title="Pattern Recognition"
            subtitle="Ensuring repo consistency..."
            status="queued"
            tasks={[
              { id: "1", text: "Waiting for Security completion...", status: "pending" },
            ]}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="flex-1 overflow-y-auto p-8 transition-all duration-300 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <PRMetadataBar
        prTitle="feat: implement-distributed-caching"
        repoName="prism-ai / core-engine"
        prNumber={842}
        filesChanged={8}
        contributors={3}
      />

      {/* Review Complete Header */}
      <div className="mt-8 mb-6">
        <h1 className="text-4xl font-bold tracking-[-0.04em] text-white mb-2">
          Review Complete
        </h1>
        <p className="text-[#adaaaa] flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">history</span>
          Review complete in 12s • $0.004 cost
        </p>
      </div>

      {/* Findings Grid */}
      <div className="grid grid-cols-1 gap-6">
        {mockFindings.map((finding, index) => (
          <FindingCard
            key={index}
            severity={finding.severity}
            title={finding.title}
            description={finding.description}
            fileLocation={finding.fileLocation}
            codeDiff={finding.codeDiff}
          />
        ))}
      </div>
    </section>
  );
}
