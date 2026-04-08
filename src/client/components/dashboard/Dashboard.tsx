import { useState, useEffect } from "react";
import type { ReviewHistoryItem } from "../../../types/review";

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

function buildDonut(severitySplit: Array<{ severity: string; count: number }>) {
  const total = severitySplit.reduce((s, r) => s + r.count, 0);
  if (total === 0) return { segments: [], total: 0 };
  let offset = 0;
  const order = ["critical", "warning", "suggestion", "success"];
  const segments = order.map((sev) => {
    const row = severitySplit.find((r) => r.severity === sev);
    const pct = row ? (row.count / total) * 100 : 0;
    const seg = { severity: sev, pct, offset };
    offset += pct;
    return seg;
  });
  return { segments, total };
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ba1a1a",
  warning: "#f59e0b",
  suggestion: "#2a14b4",
  success: "#10b981"
};

const AGENT_META: Record<string, { label: string; pct: number }> = {
  security:    { label: "Security",         pct: 94 },
  logic:       { label: "Logic",            pct: 82 },
  performance: { label: "Performance",      pct: 76 },
  pattern:     { label: "Pattern Compliance", pct: 88 }
};

interface DashboardProps {
  reviewHistory: ReviewHistoryItem[];
  onSelectReview: (id: string) => void;
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-[#ba1a1a]";
}

function scoreDotColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-400";
  return "bg-[#ba1a1a]";
}


export function Dashboard({ reviewHistory, onSelectReview }: DashboardProps) {
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

  const last7 = getLast7Days();
  const countMap = new Map((data?.reviewsByDay ?? []).map((r) => [r.day, r.count]));
  const velocityPoints = last7.map((d) => countMap.get(d) ?? 0);
  const maxVelocity = Math.max(...velocityPoints, 1);

  const { segments: donutSegments, total: totalFindings } = buildDonut(data?.severitySplit ?? []);
  const topIssues = data?.topIssues ?? [];

  return (
    <main className="mt-20 min-h-screen bg-[#fbf9f6]">
      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Header */}
        <header className="mb-12 flex justify-between items-end">
          <div>
            <h1 className="font-headline text-5xl text-[#1b1c1a] mb-2 tracking-tight">Executive Dashboard</h1>
            <p className="text-[#464554] font-light text-lg">
              Global analytics across all reviews and code quality trends.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-3 bg-[#f5f3f0] px-4 py-2 rounded-xl border border-[#c7c4d7]/20">
            <div className="h-8 w-8 rounded-lg bg-[#2a14b4] flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>memory</span>
            </div>
            <div>
              <p className="font-headline text-sm text-[#2a14b4] leading-tight">All Reviews</p>
              <p className="text-[8px] uppercase tracking-widest text-[#777586]">global</p>
            </div>
          </div>
        </header>

        {/* KPI row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#c7c4d7]/15 flex flex-col gap-1">
            <span className="text-[#464554] text-sm font-medium">Total Reviews</span>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-semibold text-[#1b1c1a]">{stats.totalReviews}</span>
              <span className="text-emerald-600 text-sm font-bold">all time</span>
            </div>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#c7c4d7]/15 flex flex-col gap-1">
            <span className="text-[#464554] text-sm font-medium">Avg Score</span>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-semibold text-[#1b1c1a]">
                {stats.totalReviews === 0 ? "—" : stats.avgScore.toFixed(1)}
              </span>
              <span className="text-stone-400 text-sm">/ 100</span>
            </div>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#c7c4d7]/15 flex flex-col gap-1">
            <span className="text-[#464554] text-sm font-medium">Total Warnings</span>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-semibold text-[#1b1c1a]">{stats.totalWarnings}</span>
              <span className="text-[#ba1a1a] text-sm font-bold">
                {stats.totalWarnings > 0 ? "flagged" : "clean"}
              </span>
            </div>
          </div>
          <div className="bg-[#2a14b4] text-white p-8 rounded-2xl shadow-lg flex flex-col gap-1">
            <span className="text-white/70 text-sm font-medium">Critical Issues</span>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-semibold">{stats.totalCritical}</span>
              <span className="material-symbols-outlined text-white/50 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>priority_high</span>
            </div>
          </div>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-12 gap-8 mb-12">
          {/* Score trend / velocity */}
          <div className="col-span-12 lg:col-span-8 bg-[#f5f3f0] p-8 rounded-2xl">
            <div className="flex justify-between items-center mb-10">
              <h2 className="font-headline text-2xl text-[#1b1c1a]">Review Velocity</h2>
              <div className="bg-white rounded-full px-4 py-1.5 text-xs font-semibold shadow-sm text-[#1b1c1a]">
                Last 7 Days
              </div>
            </div>
            <div className="h-48 flex items-end justify-between gap-2 mb-4">
              {last7.map((d, i) => {
                const c = countMap.get(d) ?? 0;
                const h = maxVelocity === 0 ? 5 : Math.max((c / maxVelocity) * 100, c > 0 ? 8 : 5);
                const isLast = i === last7.length - 1;
                return (
                  <div key={d} className="w-full flex flex-col items-center gap-1 h-full justify-end">
                    <div
                      className={`w-full rounded-t-lg relative group transition-all ${isLast ? "bg-[#2a14b4]" : "bg-[#2a14b4]/20"}`}
                      style={{ height: `${h}%` }}
                    >
                      {c > 0 && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#1b1c1a] text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          {c} review{c !== 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-stone-400 uppercase tracking-widest px-1">
              {last7.map((d) => <span key={d}>{dayLabel(d)}</span>)}
            </div>
          </div>

          {/* Finding distribution donut */}
          <div className="col-span-12 lg:col-span-4 bg-white p-8 rounded-2xl border border-[#c7c4d7]/15 flex flex-col justify-between">
            <h2 className="font-headline text-2xl text-[#1b1c1a] mb-8">Finding Distribution</h2>
            <div className="relative w-48 h-48 mx-auto mb-8">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e4e2df" strokeDasharray="100 100" strokeWidth="3" />
                {totalFindings === 0 ? null : donutSegments.map((seg) => (
                  <circle
                    key={seg.severity}
                    cx="18" cy="18" r="15.9155"
                    fill="none"
                    stroke={SEVERITY_COLORS[seg.severity] ?? "#c7c4d7"}
                    strokeDasharray={`${seg.pct.toFixed(1)} 100`}
                    strokeDashoffset={`-${seg.offset.toFixed(1)}`}
                    strokeWidth="3"
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-[#1b1c1a]">
                  {totalFindings > 999 ? `${(totalFindings / 1000).toFixed(1)}k` : totalFindings}
                </span>
                <span className="text-[10px] text-[#777586] uppercase">Total Items</span>
              </div>
            </div>
            <div className="space-y-3">
              {["critical", "warning", "suggestion", "success"].map((sev) => {
                const row = data?.severitySplit.find((r) => r.severity === sev);
                const count = row?.count ?? 0;
                return (
                  <div key={sev} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[sev] }} />
                      <span className="capitalize text-[#1b1c1a]">{sev}</span>
                    </div>
                    <span className="font-semibold text-[#1b1c1a]">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Agent performance */}
          <div className="col-span-12 lg:col-span-5 bg-[#f5f3f0] p-8 rounded-2xl">
            <h2 className="font-headline text-2xl text-[#1b1c1a] mb-8">Agent Performance</h2>
            <div className="space-y-8">
              {Object.entries(AGENT_META).map(([key, meta]) => {
                const agentData = data?.findingsByAgent.find((f) => f.agent === key);
                const total = data?.findingsByAgent.reduce((s, r) => s + r.count, 0) ?? 0;
                const pct = total > 0 && agentData ? Math.round((agentData.count / total) * 100) : meta.pct;
                return (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-2 font-medium text-[#1b1c1a]">
                      <span>{meta.label}</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-2 w-full bg-stone-200 rounded-full overflow-hidden">
                      <div className="h-full bg-[#2a14b4] rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top recurring issues */}
          <div className="col-span-12 lg:col-span-7 bg-white p-8 rounded-2xl border border-[#c7c4d7]/15">
            <h2 className="font-headline text-2xl text-[#1b1c1a] mb-8">Top Recurring Issues</h2>
            {topIssues.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <span className="material-symbols-outlined text-[#c7c4d7] text-4xl mb-2">bug_report</span>
                <p className="text-sm text-[#464554]">No findings yet</p>
                <p className="text-xs text-[#777586] mt-1">Complete a review to see recurring patterns</p>
              </div>
            ) : (
              <div className="space-y-4">
                {topIssues.map((issue, i) => {
                  const rankColors = ["bg-[#ba1a1a]/10 text-[#ba1a1a]", "bg-amber-400/10 text-amber-600", "bg-[#2a14b4]/10 text-[#2a14b4]"];
                  return (
                    <div key={i} className="flex items-center justify-between p-4 bg-[#fbf9f6] rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${rankColors[i] ?? "bg-[#efeeeb] text-[#464554]"}`}>
                          {String(i + 1).padStart(2, "0")}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-[#1b1c1a]">{issue.title}</h4>
                          <p className="text-xs text-[#777586]">
                            {issue.agent ? `${issue.agent} agent` : "Multiple agents"}
                          </p>
                        </div>
                      </div>
                      <span className="bg-[#efeeeb] px-3 py-1 rounded-full text-xs font-bold text-[#464554]">
                        {issue.count} {issue.count === 1 ? "occurrence" : "occurrences"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Review history table */}
        <section className="mt-16">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="font-headline text-3xl text-[#1b1c1a]">Recent Review History</h2>
              <p className="text-[#777586] text-sm mt-1">Click any row to load the full review.</p>
            </div>
          </div>

          {reviewHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-2xl border border-[#c7c4d7]/15">
              <span className="material-symbols-outlined text-[#c7c4d7] text-5xl mb-4">history</span>
              <p className="text-[#464554] font-medium">No reviews yet</p>
              <p className="text-xs text-[#777586] mt-1">Complete your first review to see history here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-4">
                <thead className="text-[10px] uppercase tracking-widest text-[#777586]">
                  <tr>
                    <th className="px-6 pb-2">PR Title</th>
                    <th className="px-6 pb-2">Repository</th>
                    <th className="px-6 pb-2">Score</th>
                    <th className="px-6 pb-2">Date</th>
                    <th className="px-6 pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewHistory.map((item) => {
                    const score = item.score ?? 0;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => onSelectReview(item.id)}
                        className="bg-white group hover:shadow-md transition-shadow cursor-pointer"
                      >
                        <td className="px-6 py-5 rounded-l-2xl font-medium text-[#1b1c1a] max-w-[280px] truncate">
                          {item.prTitle}
                        </td>
                        <td className="px-6 py-5 text-[#464554] font-mono text-sm">PR #{item.prNumber}</td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${scoreDotColor(score)}`} />
                            <span className={`font-semibold ${scoreColor(score)}`}>{score}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-[#464554] text-sm">{item.timeAgo}</td>
                        <td className="px-6 py-5 rounded-r-2xl">
                          {score >= 80 ? (
                            <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-[10px] font-bold uppercase">Passed</span>
                          ) : score >= 60 ? (
                            <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-[10px] font-bold uppercase">Warning</span>
                          ) : (
                            <span className="bg-[#ffdad6] text-[#93000a] px-3 py-1 rounded-full text-[10px] font-bold uppercase">Failed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
