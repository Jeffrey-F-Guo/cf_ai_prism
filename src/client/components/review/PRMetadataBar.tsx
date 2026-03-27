import type { PRMetadata } from "../../hooks/usePrism";

export function PRMetadataBar({
  title,
  repoName,
  prNumber,
  filesChanged,
  contributors
}: PRMetadata) {
  return (
    <div className="bg-[#201f1f]/40 backdrop-blur-xl p-4 rounded-xl border border-white/5 flex items-center justify-between shadow-2xl">
      <div className="flex items-center gap-4">
        <div className="bg-[#262626] p-2 rounded">
          <span className="material-symbols-outlined text-gray-400">
            commit
          </span>
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight">{title}</h1>
          <p className="text-[10px] font-mono text-[#adaaaa]">
            {repoName} • PR #{prNumber}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="text-right">
          <span className="block text-[10px] font-mono text-[#adaaaa] uppercase">
            Files Changed
          </span>
          <span className="text-sm font-bold text-[#bd9dff]">
            {filesChanged} Files
          </span>
        </div>
        <div className="h-8 w-px bg-white/10" />
        <div className="flex -space-x-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-6 h-6 rounded-full bg-[#262626] border border-[#0e0e0e]"
            />
          ))}
          <div className="w-6 h-6 rounded-full bg-[#262626] border border-[#0e0e0e] flex items-center justify-center text-[8px] font-bold">
            +{contributors}
          </div>
        </div>
      </div>
    </div>
  );
}
