import { useState, useEffect } from "react";

interface DashboardData {
  stats: {
    totalReviews: number;
    avgScore: number;
    totalCritical: number;
    totalWarnings: number;
    totalSuggestions: number;
    primaryRepo: string | null;
    primaryRepoCount: number;
  };
  findingsByAgent: Array<{ agent: string; count: number }>;
  reviewsByDay: Array<{ day: string; count: number }>;
  severitySplit: Array<{ severity: string; count: number }>;
  topIssues: Array<{ title: string; agent: string | null; severity: string; count: number }>;
}

const AGENT_META: Record<string, { label: string; color: string }> = {
  logic:       { label: "Logic",       color: "#bd9dff" },
  security:    { label: "Security",    color: "#ff6e84" },
  performance: { label: "Performance", color: "#4cc9a0" },
  pattern:     { label: "Pattern",     color: "#c38bf5" }
};

const SEVERITY_META: Record<string, { label: string; color: string }> = {
  critical:   { label: "Critical",   color: "#ff6e84" },
  warning:    { label: "Warning",    color: "#ffb800" },
  suggestion: { label: "Suggestion", color: "#bd9dff" }
};

function getLast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
}

function dayLabel(iso: string): string {
  return new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "short" });
}

function buildVelocityPath(days: string[], countMap: Map<string, number>): { line: string; fill: string } {
  const counts = days.map((d) => countMap.get(d) ?? 0);
  const max = Math.max(...counts, 1);
  const pts = counts.map((c, i) => ({
    x: days.length === 1 ? 200 : (i / (days.length - 1)) * 400,
    y: 190 - (c / max) * 170
  }));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const fill = `${line} L${pts[pts.length - 1].x.toFixed(1)} 200 L0 200 Z`;
  return { line, fill };
}

function buildDonut(severitySplit: Array<{ severity: string; count: number }>) {
  const total = severitySplit.reduce((s, r) => s + r.count, 0);
  if (total === 0) return { segments: [], total: 0 };
  let offset = 0;
  const order = ["critical", "warning", "suggestion"];
  const segments = order.map((sev) => {
    const row = severitySplit.find((r) => r.severity === sev);
    const pct = row ? (row.count / total) * 100 : 0;
    const seg = { severity: sev, pct, offset };
    offset += pct;
    return seg;
  });
  return { segments, total };
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d: unknown) => setData(d as DashboardData))
      .catch(() => {});
  }, []);

  const stats = data?.stats ?? {
    totalReviews: 0, avgScore: 0, totalCritical: 0,
    totalWarnings: 0, totalSuggestions: 0, primaryRepo: null, primaryRepoCount: 0
  };

  // Bar chart: findings by agent, normalized to % height
  const agentOrder = ["logic", "security", "performance", "pattern"];
  const agentCounts = agentOrder.map((a) => ({
    agent: a,
    count: data?.findingsByAgent.find((f) => f.agent === a)?.count ?? 0
  }));
  const maxAgentCount = Math.max(...agentCounts.map((a) => a.count), 1);

  // Velocity chart
  const last7 = getLast7Days();
  const countMap = new Map((data?.reviewsByDay ?? []).map((r) => [r.day, r.count]));
  const { line: velocityLine, fill: velocityFill } = buildVelocityPath(last7, countMap);
  const velocityPoints = last7.map((d) => countMap.get(d) ?? 0);
  const maxVelocity = Math.max(...velocityPoints, 1);

  // Donut chart
  const { segments: donutSegments, total: totalFindings } = buildDonut(data?.severitySplit ?? []);

  // Top issues
  const topIssues = data?.topIssues ?? [];

  const statCards = [
    {
      label: "Total Reviews",
      value: stats.totalReviews.toLocaleString(),
      change: "all time",
      changeType: "neutral" as const,
      icon: "history_edu"
    },
    {
      label: "Avg Score",
      value: stats.totalReviews === 0 ? "—" : stats.avgScore.toFixed(1),
      change: stats.totalReviews === 0 ? "no data yet" : `across ${stats.totalReviews} review${stats.totalReviews !== 1 ? "s" : ""}`,
      changeType: stats.avgScore >= 70 ? "positive" as const : "negative" as const,
      icon: "star"
    },
    {
      label: "Critical Findings",
      value: stats.totalCritical.toLocaleString(),
      change: stats.totalWarnings > 0 ? `${stats.totalWarnings} warnings` : "no warnings",
      changeType: stats.totalCritical === 0 ? "positive" as const : "negative" as const,
      icon: "warning"
    },
    {
      label: "Primary Repo",
      value: stats.primaryRepo ? stats.primaryRepo.split("/")[1] : "—",
      change: stats.primaryRepo ? `${stats.primaryRepoCount} review${stats.primaryRepoCount !== 1 ? "s" : ""}` : "no reviews yet",
      changeType: "neutral" as const,
      icon: "terminal"
    }
  ];

  return (
    <main className="flex-1 p-8 bg-[#0e0e0e] text-white relative overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div
        className="fixed top-0 right-0 w-[600px] h-[600px] pointer-events-none opacity-50"
        style={{ background: "radial-gradient(circle at center, rgba(189, 157, 255, 0.08) 0%, transparent 70%)" }}
      />

      <header className="mb-12 relative z-10 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold tracking-[-0.04em] mb-2">Intelligence Overview</h1>
          <p className="text-[#adaaaa] max-w-lg font-medium">
            Global analytics for PRISM engine detections and code quality velocity across all clusters.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="bg-[#131313] px-4 py-2 rounded border border-[#494847]/10 text-xs font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#bd9dff] animate-pulse" />
            LIVE FEED
          </div>
        </div>
      </header>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-12 relative z-10">
        {statCards.map((card, i) => (
          <div
            key={i}
            className="bg-[#131313] p-6 rounded-lg shadow-2xl relative group overflow-hidden border border-transparent hover:border-[#bd9dff]/10 transition-all"
          >
            <div className="flex justify-between items-start mb-4">
              <p className="text-xs font-bold uppercase tracking-widest text-[#adaaaa]">{card.label}</p>
              <span className="material-symbols-outlined text-[#bd9dff] text-xl">{card.icon}</span>
            </div>
            <div className="flex items-baseline gap-3 mb-4">
              <h2 className="text-3xl font-black tracking-tighter">{card.value}</h2>
              <span className={`text-xs font-bold ${card.changeType === "positive" ? "text-[#bd9dff]" : card.changeType === "negative" ? "text-[#ff6e84]" : "text-[#777575]"}`}>
                {card.change}
              </span>
            </div>
            {/* Mini sparkline: reviews volume bars */}
            {i === 0 && (
              <div className="h-8 w-full flex items-end gap-[2px]">
                {last7.map((d, j) => {
                  const c = countMap.get(d) ?? 0;
                  const h = maxVelocity === 0 ? 5 : Math.max((c / maxVelocity) * 100, c > 0 ? 8 : 5);
                  return (
                    <div
                      key={j}
                      className={`w-full rounded-t-sm ${c > 0 ? "bg-[#bd9dff]" : "bg-[#bd9dff]/20"}`}
                      style={{ height: `${h}%` }}
                    />
                  );
                })}
              </div>
            )}
            {/* Avg score bar */}
            {i === 1 && (
              <div className="h-8 w-full flex items-center justify-between px-1">
                <div className="w-full h-[2px] bg-[#bd9dff]/10 relative">
                  <div
                    className="absolute left-0 top-0 h-full bg-[#bd9dff] shadow-[0_0_8px_rgba(189,157,255,0.6)]"
                    style={{ width: `${Math.min(stats.avgScore, 100)}%` }}
                  />
                  <div
                    className="absolute -top-1 w-2 h-2 rounded-full bg-[#bd9dff] ring-4 ring-[#bd9dff]/20"
                    style={{ left: `calc(${Math.min(stats.avgScore, 100)}% - 4px)` }}
                  />
                </div>
              </div>
            )}
            {/* Critical trend line */}
            {i === 2 && (
              <svg className="w-full h-8" preserveAspectRatio="none" viewBox="0 0 100 40">
                <path
                  d={stats.totalCritical === 0 ? "M0 35 L100 35" : "M0 35 Q 20 35, 40 10 T 80 25 T 100 5"}
                  fill="none"
                  stroke={stats.totalCritical === 0 ? "#bd9dff" : "#ff6e84"}
                  strokeWidth="2"
                />
              </svg>
            )}
            {/* Primary repo tag */}
            {i === 3 && stats.primaryRepo && (
              <p className="text-[10px] font-mono text-[#777575] truncate">{stats.primaryRepo}</p>
            )}
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-12 relative z-10">
        {/* Findings by Agent */}
        <div className="bg-[#131313] rounded-xl p-8 shadow-2xl border border-white/5">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-xl font-semibold tracking-tight">Findings by Agent</h3>
            <div className="flex gap-3 flex-wrap">
              {agentOrder.map((a) => (
                <div key={a} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: AGENT_META[a].color }} />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#adaaaa]">{AGENT_META[a].label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="h-64 flex items-end justify-around gap-4 px-4">
            {agentCounts.map(({ agent, count }) => {
              const heightPct = Math.max((count / maxAgentCount) * 100, count > 0 ? 4 : 2);
              const meta = AGENT_META[agent];
              return (
                <div key={agent} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-xs font-mono text-[#777575]">{count}</span>
                  <div
                    className="w-full rounded-t-sm relative group transition-all"
                    style={{ height: `${heightPct}%`, backgroundColor: meta.color }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#201f1f] px-2 py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {count} finding{count !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex justify-around px-4 text-[10px] font-mono text-[#777575] uppercase tracking-widest">
            {agentOrder.map((a) => <span key={a}>{AGENT_META[a].label.slice(0, 4)}</span>)}
          </div>
        </div>

        {/* Review Velocity */}
        <div className="bg-[#131313] rounded-xl p-8 shadow-2xl border border-white/5">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-xl font-semibold tracking-tight">Review Velocity</h3>
            <div className="bg-[#262626] px-3 py-1 rounded-full text-[10px] font-bold text-[#bd9dff]">
              LAST 7 DAYS
            </div>
          </div>
          <div className="h-64 relative">
            <div className="absolute inset-0 flex flex-col justify-between opacity-5">
              {[0,1,2,3].map((i) => <div key={i} className="w-full h-[1px] bg-white" />)}
            </div>
            <svg className="w-full h-full relative z-10" preserveAspectRatio="none" viewBox="0 0 400 200">
              <defs>
                <linearGradient id="lineGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#bd9dff" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#bd9dff" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={velocityFill} fill="url(#lineGrad)" />
              <path d={velocityLine} fill="none" stroke="#bd9dff" strokeLinecap="round" strokeWidth="3" />
              {last7.map((d, i) => {
                const c = countMap.get(d) ?? 0;
                if (c === 0) return null;
                const x = last7.length === 1 ? 200 : (i / (last7.length - 1)) * 400;
                const y = 190 - (c / maxVelocity) * 170;
                return <circle key={d} cx={x} cy={y} r="4" fill="#bd9dff" />;
              })}
            </svg>
          </div>
          <div className="mt-6 flex justify-between px-2 text-[10px] font-mono text-[#777575] uppercase tracking-widest">
            {last7.map((d) => <span key={d}>{dayLabel(d)}</span>)}
          </div>
        </div>
      </div>

      {/* Severity Split + Top Issues */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12 relative z-10">
        {/* Donut */}
        <div className="bg-[#131313] rounded-xl p-8 shadow-2xl border border-white/5 lg:col-span-1">
          <h3 className="text-lg font-semibold tracking-tight mb-8">Severity Split</h3>
          <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" fill="transparent" r="15.9" stroke="#262626" strokeWidth="3" />
              {totalFindings === 0 ? (
                <circle cx="18" cy="18" fill="transparent" r="15.9" stroke="#262626" strokeDasharray="100 100" strokeWidth="3" />
              ) : (
                donutSegments.map((seg) => (
                  <circle
                    key={seg.severity}
                    cx="18" cy="18"
                    fill="transparent"
                    r="15.9"
                    stroke={SEVERITY_META[seg.severity]?.color ?? "#262626"}
                    strokeDasharray={`${seg.pct.toFixed(1)} 100`}
                    strokeDashoffset={`-${seg.offset.toFixed(1)}`}
                    strokeWidth="3"
                  />
                ))
              )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black">{totalFindings > 999 ? `${(totalFindings / 1000).toFixed(1)}k` : totalFindings}</span>
              <span className="text-[9px] text-[#777575] font-bold uppercase">findings</span>
            </div>
          </div>
          <div className="mt-8 space-y-3">
            {["critical", "warning", "suggestion"].map((sev) => {
              const row = data?.severitySplit.find((r) => r.severity === sev);
              const count = row?.count ?? 0;
              const pct = totalFindings > 0 ? `${((count / totalFindings) * 100).toFixed(0)}%` : "0%";
              const meta = SEVERITY_META[sev];
              return (
                <div key={sev} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} />
                    <span className="text-xs font-medium">{meta.label}</span>
                  </div>
                  <span className="text-xs font-mono">{pct}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Recurring Issues */}
        <div className="bg-[#131313] rounded-xl p-8 shadow-2xl border border-white/5 lg:col-span-2">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-semibold tracking-tight">Top Recurring Issues</h3>
            <span className="text-[10px] font-mono text-[#777575] uppercase tracking-tighter">
              Sorted by recurrence
            </span>
          </div>
          {topIssues.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <span className="material-symbols-outlined text-3xl text-[#adaaaa]/30 mb-2">bug_report</span>
              <p className="text-sm text-[#adaaaa]">No findings yet</p>
              <p className="text-xs text-[#777575] mt-1">Complete a review to see recurring patterns</p>
            </div>
          ) : (
            <div className="space-y-4">
              {topIssues.map((issue, i) => {
                const isCritical = issue.severity === "critical";
                const isWarning = issue.severity === "warning";
                const agentMeta = issue.agent ? AGENT_META[issue.agent] : null;
                return (
                  <div key={i} className="group flex items-center justify-between p-4 rounded-lg bg-[#201f1f]/30 hover:bg-[#201f1f]/60 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded flex items-center justify-center ${isCritical ? "bg-[#ff6e84]/10" : isWarning ? "bg-[#ffb800]/10" : "bg-[#bd9dff]/10"}`}>
                        <span
                          className={`material-symbols-outlined text-lg ${isCritical ? "text-[#ff6e84]" : isWarning ? "text-[#ffb800]" : "text-[#bd9dff]"}`}
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          {isCritical ? "security" : isWarning ? "cycle" : "network_check"}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">{issue.title}</h4>
                        <p className="text-xs text-[#adaaaa]">
                          {agentMeta ? `${agentMeta.label} agent` : "Multiple agents"}
                          {issue.count > 1 ? ` · found in ${issue.count} reviews` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm font-bold">{issue.count}</p>
                        <p className="text-[9px] uppercase tracking-widest text-[#777575]">Hits</p>
                      </div>
                      <span className="material-symbols-outlined text-[#777575] group-hover:text-white transition-colors">chevron_right</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer row */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        <div className="md:col-span-1 bg-gradient-to-br from-[#b28cff]/10 to-transparent p-8 rounded-xl border border-[#bd9dff]/5 flex flex-col justify-between h-48">
          <div>
            <h4 className="text-xl font-black italic tracking-tighter text-[#bd9dff]">Prism AI</h4>
            <p className="text-sm text-[#adaaaa] mt-2">
              Parallel agent analysis with human-in-the-loop steering. Powered by Cloudflare Workers AI.
            </p>
          </div>
          <p className="text-[10px] font-mono text-[#777575]">v1.0.0 · Cloudflare Workers</p>
        </div>
        <div className="bg-[#131313] p-8 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center">
          <span className="text-4xl font-black text-[#c38bf5]">
            {stats.totalReviews === 0 ? "—" : `${stats.totalSuggestions}`}
          </span>
          <p className="text-[10px] uppercase font-bold tracking-widest text-[#777575] mt-2">Total Suggestions</p>
        </div>
        <div className="bg-[#131313] p-8 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center">
          <span className="text-4xl font-black text-[#ff97b2]">
            {stats.totalReviews === 0 ? "—" : stats.totalWarnings}
          </span>
          <p className="text-[10px] uppercase font-bold tracking-widest text-[#777575] mt-2">Total Warnings</p>
        </div>
      </section>
    </main>
  );
}
