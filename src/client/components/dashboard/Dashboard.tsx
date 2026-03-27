interface NavProps {
  activeTab: "review" | "dashboard";
  onTabChange: (tab: "review" | "dashboard") => void;
}

export function DashboardNav({ onTabChange }: NavProps) {
  return (
    <aside className="bg-[#131313] h-screen w-64 flex flex-col border-r border-[#bd9dff]/5 fixed left-0 top-16 py-8 justify-between hidden lg:flex">
      <div className="space-y-6">
        <div className="px-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#262626] rounded flex items-center justify-center">
              <span className="material-symbols-outlined text-[#bd9dff] text-lg">
                bolt
              </span>
            </div>
            <div>
              <p className="text-[#bd9dff] font-bold text-sm tracking-tight">
                AI Engine
              </p>
              <p className="text-xs text-[#777575] font-mono uppercase tracking-widest">
                v2.0.4-stable
              </p>
            </div>
          </div>
        </div>
        <nav className="space-y-1">
          <button
            onClick={() => onTabChange("review")}
            className="w-full flex items-center gap-3 text-gray-500 hover:text-gray-300 mx-2 px-4 py-3 hover:bg-[#1c1c1c] transition-all duration-200 translate-x-1 hover:translate-x-2 text-sm font-medium tracking-tight"
          >
            <span className="material-symbols-outlined text-lg">database</span>
            Repositories
          </button>
          <button
            onClick={() => onTabChange("review")}
            className="w-full flex items-center gap-3 text-gray-500 hover:text-gray-300 mx-2 px-4 py-3 hover:bg-[#1c1c1c] transition-all duration-200 translate-x-1 hover:translate-x-2 text-sm font-medium tracking-tight"
          >
            <span className="material-symbols-outlined text-lg">alt_route</span>
            Pull Requests
          </button>
          <button
            onClick={() => onTabChange("dashboard")}
            className="w-full flex items-center gap-3 text-[#bd9dff] bg-[#262626] rounded-md mx-2 px-4 py-3 translate-x-1 text-sm font-medium tracking-tight"
          >
            <span className="material-symbols-outlined text-lg">bar_chart</span>
            Analytics
          </button>
          <button
            onClick={() => onTabChange("review")}
            className="w-full flex items-center gap-3 text-gray-500 hover:text-gray-300 mx-2 px-4 py-3 hover:bg-[#1c1c1c] transition-all duration-200 translate-x-1 hover:translate-x-2 text-sm font-medium tracking-tight"
          >
            <span className="material-symbols-outlined text-lg">group</span>
            Team
          </button>
        </nav>
        <div className="px-4 mt-10">
          <button className="w-full bg-gradient-to-r from-[#bd9dff] to-[#8a4cfc] text-[#3c0089] font-bold text-xs uppercase tracking-widest py-3 rounded-md shadow-[0_0_15px_rgba(189,157,255,0.2)] hover:shadow-[0_0_25px_rgba(189,157,255,0.4)] transition-all">
            New Analysis
          </button>
        </div>
      </div>
      <div className="pb-20">
        <nav className="space-y-1">
          <button className="w-full flex items-center gap-3 text-gray-500 hover:text-gray-300 mx-2 px-4 py-3 hover:bg-[#1c1c1c] transition-all duration-200 text-sm font-medium tracking-tight">
            <span className="material-symbols-outlined text-lg">
              description
            </span>
            Docs
          </button>
          <button className="w-full flex items-center gap-3 text-gray-500 hover:text-gray-300 mx-2 px-4 py-3 hover:bg-[#1c1c1c] transition-all duration-200 text-sm font-medium tracking-tight">
            <span className="material-symbols-outlined text-lg">
              help_outline
            </span>
            Support
          </button>
        </nav>
      </div>
    </aside>
  );
}

interface StatCard {
  label: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  icon: string;
}

const statCards: StatCard[] = [
  {
    label: "Total Reviews",
    value: "1,289",
    change: "+12%",
    changeType: "positive",
    icon: "history_edu"
  },
  {
    label: "Avg Score",
    value: "94.2",
    change: "+2.4",
    changeType: "positive",
    icon: "star"
  },
  {
    label: "Critical Findings",
    value: "18",
    change: "-5%",
    changeType: "positive",
    icon: "warning"
  },
  {
    label: "Primary Repo",
    value: "prism-core-engine",
    change: "342 commits",
    changeType: "neutral",
    icon: "terminal"
  }
];

const barChartData = [
  { day: "Mon", logic: 84, security: 42 },
  { day: "Tue", logic: 60, security: 67 },
  { day: "Wed", logic: 40, security: 80 },
  { day: "Thu", logic: 80, security: 25 },
  { day: "Fri", logic: 75, security: 33 },
  { day: "Sat", logic: 100, security: 50 }
];

const recurringIssues = [
  {
    title: "Unencrypted PII Storage",
    description: "Detected in 12 repositories within the last 48h",
    hits: 84,
    severity: "error" as const
  },
  {
    title: "Complexity Threshold Exceeded",
    description: "Cognitive complexity > 15 in core utility modules",
    hits: 52,
    severity: "primary" as const
  },
  {
    title: "Missing API Idempotency",
    description: "POST endpoints lacking request identifiers",
    hits: 31,
    severity: "secondary" as const
  }
];

export function Dashboard() {
  return (
    <main className="flex-1 p-8 bg-[#0e0e0e] text-white relative overflow-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div
        className="fixed top-0 right-0 w-[600px] h-[600px] pointer-events-none opacity-50"
        style={{
          background:
            "radial-gradient(circle at center, rgba(189, 157, 255, 0.08) 0%, transparent 70%)"
        }}
      />

      <header className="mb-12 relative z-10 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold tracking-[-0.04em] mb-2">
            Intelligence Overview
          </h1>
          <p className="text-[#adaaaa] max-w-lg font-medium">
            Global analytics for PRISM engine detections and code quality
            velocity across all clusters.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="bg-[#131313] px-4 py-2 rounded border border-[#494847]/10 text-xs font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#bd9dff] animate-pulse" />
            LIVE FEED
          </div>
          <button className="bg-[#262626] px-4 py-2 rounded text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-[#2c2c2c] transition-colors">
            <span className="material-symbols-outlined text-sm">download</span>
            Export Report
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-12 relative z-10">
        {statCards.map((card, i) => (
          <div
            key={i}
            className="bg-[#131313] p-6 rounded-lg shadow-2xl relative group overflow-hidden border border-transparent hover:border-[#bd9dff]/10 transition-all"
          >
            <div className="flex justify-between items-start mb-4">
              <p className="text-xs font-bold uppercase tracking-widest text-[#adaaaa]">
                {card.label}
              </p>
              <span className="material-symbols-outlined text-[#bd9dff] text-xl">
                {card.icon}
              </span>
            </div>
            <div className="flex items-baseline gap-3 mb-4">
              <h2 className="text-3xl font-black tracking-tighter">
                {card.value}
              </h2>
              <span
                className={`text-xs font-bold ${card.changeType === "positive" ? "text-[#bd9dff]" : "text-[#ff6e84]"}`}
              >
                {card.change}
              </span>
            </div>
            {i === 0 && (
              <div className="h-8 w-full flex items-end gap-[2px]">
                {[50, 67, 50, 75, 85, 67, 100].map((h, j) => (
                  <div
                    key={j}
                    className={`w-full ${j === 4 || j === 6 ? "bg-[#bd9dff]" : "bg-[#bd9dff]/20"} h-[${h}%] rounded-t-sm`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            )}
            {i === 1 && (
              <div className="h-8 w-full flex items-center justify-between px-1">
                <div className="w-full h-[2px] bg-[#bd9dff]/10 relative">
                  <div className="absolute left-0 top-0 h-full w-[94%] bg-[#bd9dff] shadow-[0_0_8px_rgba(189,157,255,0.6)]" />
                  <div className="absolute right-[6%] -top-1 w-2 h-2 rounded-full bg-[#bd9dff] ring-4 ring-[#bd9dff]/20" />
                </div>
              </div>
            )}
            {i === 2 && (
              <svg
                className="w-full h-8"
                preserveAspectRatio="none"
                viewBox="0 0 100 40"
              >
                <path
                  d="M0 35 Q 20 35, 40 10 T 80 25 T 100 5"
                  fill="none"
                  stroke="#ff6e84"
                  strokeWidth="2"
                />
              </svg>
            )}
            {i === 3 && (
              <div className="flex -space-x-2 mt-4">
                {["JD", "AL", "RT"].map((initials, j) => (
                  <div
                    key={j}
                    className="w-6 h-6 rounded-full ring-2 ring-[#131313] bg-[#bd9dff]/20 flex items-center justify-center text-[8px] font-bold"
                  >
                    {initials}
                  </div>
                ))}
                <div className="w-6 h-6 rounded-full ring-2 ring-[#131313] bg-[#262626] flex items-center justify-center text-[8px] font-bold text-[#bd9dff]">
                  +14
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-12 relative z-10">
        <div className="bg-[#131313] rounded-xl p-8 shadow-2xl border border-white/5">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-xl font-semibold tracking-tight">
              Findings by Category
            </h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#bd9dff]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#adaaaa]">
                  Logic
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#c38bf5]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#adaaaa]">
                  Security
                </span>
              </div>
            </div>
          </div>
          <div className="h-64 flex items-end justify-between gap-6 px-4">
            {barChartData.map((data, i) => (
              <div key={i} className="flex-1 flex items-end gap-1 h-full">
                <div
                  className="w-full bg-[#bd9dff] rounded-t-sm relative group"
                  style={{ height: `${data.logic}%` }}
                >
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#201f1f] px-2 py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {data.logic} logic
                  </div>
                </div>
                <div
                  className="w-full bg-[#c38bf5] rounded-t-sm"
                  style={{ height: `${data.security}%` }}
                />
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-between px-4 text-[10px] font-mono text-[#777575] uppercase tracking-widest">
            {barChartData.map((d, i) => (
              <span key={i}>{d.day}</span>
            ))}
          </div>
        </div>

        <div className="bg-[#131313] rounded-xl p-8 shadow-2xl border border-white/5">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-xl font-semibold tracking-tight">
              Review Velocity
            </h3>
            <div className="bg-[#262626] px-3 py-1 rounded-full text-[10px] font-bold text-[#bd9dff]">
              TRAINING PHASE
            </div>
          </div>
          <div className="h-64 relative">
            <div className="absolute inset-0 flex flex-col justify-between opacity-5">
              <div className="w-full h-[1px] bg-white" />
              <div className="w-full h-[1px] bg-white" />
              <div className="w-full h-[1px] bg-white" />
              <div className="w-full h-[1px] bg-white" />
            </div>
            <svg
              className="w-full h-full relative z-10"
              preserveAspectRatio="none"
              viewBox="0 0 400 200"
            >
              <defs>
                <linearGradient id="lineGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#bd9dff" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#bd9dff" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0 180 C 50 160, 100 190, 150 140 S 250 20, 300 100 S 350 50, 400 20 L 400 200 L 0 200 Z"
                fill="url(#lineGrad)"
              />
              <path
                d="M0 180 C 50 160, 100 190, 150 140 S 250 20, 300 100 S 350 50, 400 20"
                fill="none"
                stroke="#bd9dff"
                strokeLinecap="round"
                strokeWidth="3"
              />
              <circle cx="150" cy="140" fill="#bd9dff" r="4" />
              <circle cx="300" cy="100" fill="#bd9dff" r="4" />
            </svg>
          </div>
          <div className="mt-6 flex justify-between px-2 text-[10px] font-mono text-[#777575] uppercase tracking-widest">
            <span>W12</span>
            <span>W13</span>
            <span>W14</span>
            <span>W15</span>
            <span>W16</span>
            <span>W17</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12 relative z-10">
        <div className="bg-[#131313] rounded-xl p-8 shadow-2xl border border-white/5 lg:col-span-1">
          <h3 className="text-lg font-semibold tracking-tight mb-8">
            Severity Split
          </h3>
          <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                fill="transparent"
                r="15.9"
                stroke="#262626"
                strokeWidth="3"
              />
              <circle
                cx="18"
                cy="18"
                fill="transparent"
                r="15.9"
                stroke="#ff6e84"
                strokeDasharray="25 100"
                strokeDashoffset="0"
                strokeWidth="3"
              />
              <circle
                cx="18"
                cy="18"
                fill="transparent"
                r="15.9"
                stroke="#bd9dff"
                strokeDasharray="45 100"
                strokeDashoffset="-25"
                strokeWidth="3"
              />
              <circle
                cx="18"
                cy="18"
                fill="transparent"
                r="15.9"
                stroke="#4d137b"
                strokeDasharray="30 100"
                strokeDashoffset="-70"
                strokeWidth="3"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black">2.4k</span>
              <span className="text-[9px] text-[#777575] font-bold uppercase">
                findings
              </span>
            </div>
          </div>
          <div className="mt-8 space-y-3">
            {[
              { label: "Critical", color: "#ff6e84", percent: "25%" },
              { label: "High", color: "#bd9dff", percent: "45%" },
              { label: "Moderate", color: "#4d137b", percent: "30%" }
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs font-medium">{item.label}</span>
                </div>
                <span className="text-xs font-mono">{item.percent}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#131313] rounded-xl p-8 shadow-2xl border border-white/5 lg:col-span-2">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-semibold tracking-tight">
              Top Recurring Issues
            </h3>
            <span className="text-[10px] font-mono text-[#777575] uppercase tracking-tighter">
              Sorted by recurrence
            </span>
          </div>
          <div className="space-y-4">
            {recurringIssues.map((issue, i) => (
              <div
                key={i}
                className="group flex items-center justify-between p-4 rounded-lg bg-[#201f1f]/30 hover:bg-[#201f1f]/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded flex items-center justify-center ${issue.severity === "error" ? "bg-[#a70138]/10" : issue.severity === "primary" ? "bg-[#bd9dff]/10" : "bg-[#612b8f]/10"}`}
                  >
                    <span
                      className={`material-symbols-outlined ${issue.severity === "error" ? "text-[#ff6e84]" : issue.severity === "primary" ? "text-[#bd9dff]" : "text-[#c38bf5]"} text-lg`}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {issue.severity === "error"
                        ? "security"
                        : issue.severity === "primary"
                          ? "cycle"
                          : "network_check"}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">{issue.title}</h4>
                    <p className="text-xs text-[#adaaaa]">
                      {issue.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm font-bold">{issue.hits}</p>
                    <p className="text-[9px] uppercase tracking-widest text-[#777575]">
                      Hits
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-[#777575] group-hover:text-white transition-colors">
                    chevron_right
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
        <div className="md:col-span-2 bg-gradient-to-br from-[#b28cff]/10 to-transparent p-8 rounded-xl border border-[#bd9dff]/5 flex flex-col justify-between h-48">
          <div>
            <h4 className="text-xl font-black italic tracking-tighter text-[#bd9dff]">
              Engine Update Available
            </h4>
            <p className="text-sm text-[#adaaaa] mt-2">
              v2.1.0-beta includes enhanced Rust ownership analysis and faster
              Go-routine leak detection.
            </p>
          </div>
          <button className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-[#bd9dff] hover:gap-4 transition-all">
            VIEW PATCH NOTES{" "}
            <span className="material-symbols-outlined">arrow_right_alt</span>
          </button>
        </div>
        <div className="bg-[#131313] p-8 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center">
          <span className="text-4xl font-black text-[#c38bf5]">99.9%</span>
          <p className="text-[10px] uppercase font-bold tracking-widest text-[#777575] mt-2">
            Analysis Uptime
          </p>
        </div>
        <div className="bg-[#131313] p-8 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center">
          <span className="text-4xl font-black text-[#ff97b2]">4.2ms</span>
          <p className="text-[10px] uppercase font-bold tracking-widest text-[#777575] mt-2">
            Inference Latency
          </p>
        </div>
      </section>
    </main>
  );
}
