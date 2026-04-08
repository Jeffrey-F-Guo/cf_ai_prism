import { useState } from "react";
import type { PRMetadata } from "../../../types/review";

function DefaultAvatar({ size = 28 }: { size?: number }) {
  const teal = "#6cc3d5";
  const bg = "#f0f0f0";
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
        className="rounded-full border border-[#c7c4d7]/30 overflow-hidden shrink-0"
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
      className="rounded-full border border-[#c7c4d7]/30 object-cover shrink-0"
      style={{ width: size, height: size, ...style }}
    />
  );
}

export function PRMetadataBar({ title, repoName, prNumber, filesChanged, contributors }: PRMetadata) {
  const shown = contributors.slice(0, 3);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_16px_32px_-4px_rgba(27,28,26,0.04)] flex items-center justify-between border border-[#c7c4d7]/15">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-10 h-10 bg-[#efeeeb] rounded-xl flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[#2a14b4] text-lg">pull_request_closed</span>
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-bold tracking-tight text-[#1b1c1a] truncate max-w-[320px]">{title}</h2>
          <p className="text-[10px] font-mono text-[#777586] mt-0.5">
            {repoName} · <span className="text-[#464554]">PR #{prNumber}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6 shrink-0">
        <div className="text-right">
          <span className="block text-[10px] font-bold uppercase tracking-widest text-[#464554]">Files</span>
          <span className="text-sm font-bold text-[#2a14b4]">{filesChanged}</span>
        </div>
        <div className="w-px h-8 bg-[#c7c4d7]/30" />
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            {shown.length > 0 ? (
              shown.map((c, i) => (
                <AvatarImg
                  key={c.login}
                  login={c.login}
                  avatarUrl={c.avatarUrl}
                  size={28}
                  style={{ marginLeft: i > 0 ? -6 : 0, zIndex: shown.length - i }}
                />
              ))
            ) : (
              <div className="rounded-full border border-[#c7c4d7]/30 overflow-hidden" style={{ width: 28, height: 28 }}>
                <DefaultAvatar size={28} />
              </div>
            )}
          </div>
          <span className="text-[10px] font-mono text-[#777586]">
            {contributors.length || "—"} author{contributors.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
