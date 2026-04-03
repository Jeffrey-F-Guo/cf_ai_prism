import { useState } from "react";
import type { PRMetadata } from "../../../types/review";
import { CommitIcon } from "../shared/Icons";

// GitHub-style default identicon used when no avatar URL is available or image fails
function DefaultAvatar({ size = 28 }: { size?: number }) {
  const teal = "#6cc3d5";
  const bg = "#f0f0f0";
  // 5×5 symmetric grid — matches GitHub identicon aesthetic
  const cells = [
    [1, 0, 0, 0, 1],
    [0, 1, 0, 1, 0],
    [1, 0, 1, 0, 1],
    [0, 1, 1, 1, 0],
    [0, 1, 1, 1, 0],
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
      <rect width="10" height="10" fill={bg} />
      {cells.map((row, r) =>
        row.map((on, c) =>
          on ? <rect key={`${r}-${c}`} x={c * 2} y={r * 2} width="2" height="2" fill={teal} /> : null
        )
      )}
    </svg>
  );
}

function AvatarImg({ login, avatarUrl, size, style }: { login: string; avatarUrl: string; size: number; style?: React.CSSProperties }) {
  const [errored, setErrored] = useState(false);
  if (errored) {
    return (
      <div
        title={login}
        className="rounded-full border border-[#0e0e0e] shadow-sm overflow-hidden shrink-0"
        style={{ width: size, height: size, ...style }}
      >
        <DefaultAvatar size={size} />
      </div>
    );
  }
  return (
    <img
      src={`${avatarUrl}&s=56`}
      alt={login}
      title={login}
      onError={() => setErrored(true)}
      className="rounded-full border border-[#0e0e0e] shadow-sm object-cover shrink-0"
      style={{ width: size, height: size, ...style }}
    />
  );
}

function ContributorAvatars({ contributors }: { contributors: PRMetadata["contributors"] }) {
  if (contributors.length === 0) {
    return (
      <div className="rounded-full border border-[#0e0e0e] shadow-sm overflow-hidden shrink-0" style={{ width: 28, height: 28 }}>
        <DefaultAvatar size={28} />
      </div>
    );
  }
  const shown = contributors.slice(0, 3);
  return (
    <div className="flex items-center">
      {shown.map((c, i) => (
        <AvatarImg
          key={c.login}
          login={c.login}
          avatarUrl={c.avatarUrl}
          size={28}
          style={{ marginLeft: i > 0 ? -6 : 0, zIndex: shown.length - i }}
        />
      ))}
    </div>
  );
}

export function PRMetadataBar({
  title,
  repoName,
  prNumber,
  filesChanged,
  contributors
}: PRMetadata) {
  return (
    <div className="bg-[#201f1f]/40 backdrop-blur-xl p-4 rounded-xl border border-white/5 flex items-center justify-between shadow-2xl">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-[#262626] rounded-lg flex items-center justify-center text-[#777575] shrink-0">
          <CommitIcon size={16} />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-bold tracking-tight truncate max-w-[280px]">{title}</h1>
          <p className="text-[10px] font-mono text-[#777575] mt-0.5">
            {repoName} · <span className="text-[#adaaaa]">PR #{prNumber}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-5 shrink-0">
        <div className="text-right">
          <span className="block text-[10px] font-mono text-[#777575] uppercase tracking-wider">
            Files
          </span>
          <span className="text-sm font-bold text-[#bd9dff]">
            {filesChanged}
          </span>
        </div>
        <div className="h-8 w-px bg-white/10" />
        <div className="flex items-center gap-2">
          <ContributorAvatars contributors={contributors} />
          <span className="text-[10px] font-mono text-[#777575]">
            {contributors.length || "—"} author{contributors.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
