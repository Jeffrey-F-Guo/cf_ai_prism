export function LandingPage() {
  return (
    <div className="flex h-[calc(100vh-64px)] bg-[#0e0e0e] text-white overflow-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {/* Left Panel: Chat/Interaction (30%) */}
      <section className="w-[30%] bg-[#131313] border-r border-[#494847]/10 flex flex-col">
        <div className="p-6 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="space-y-6">
            <div className="space-y-2 opacity-40">
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#bd9dff]">
                Session Log
              </p>
              <p className="text-sm font-mono italic">Awaiting deployment...</p>
            </div>
          </div>
        </div>
        {/* Input Layer */}
        <div className="p-6 bg-gradient-to-t from-[#131313] to-transparent">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-[#bd9dff]/20 rounded-lg blur opacity-0 group-focus-within:opacity-100 transition duration-500" />
            <div className="relative bg-[#1a1919]/70 backdrop-blur-xl border border-[#494847]/20 rounded-lg p-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-[#bd9dff]/50">
                link
              </span>
              <input
                className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-[#adaaaa]/50"
                placeholder="Paste a PR URL to deploy your review agents."
                type="text"
              />
              <button className="bg-[#bd9dff] text-[#3c0089] p-1.5 rounded-md hover:bg-[#8a4cfc] transition-colors">
                <span className="material-symbols-outlined text-sm">send</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Center Panel: Live Agent Status (45%) */}
      <section className="w-[45%] relative flex items-center justify-center px-12 overflow-hidden">
        <div className="text-center z-10">
          <h1 className="text-6xl md:text-7xl font-black tracking-[-0.06em] text-white mb-4 italic">
            PRISM
          </h1>
        </div>

        {/* Subtle Scanning Lines */}
        <div className="absolute left-0 right-0 h-px bg-[#bd9dff]/20 top-1/4" />
        <div className="absolute left-0 right-0 h-px bg-[#bd9dff]/10 top-3/4" />
      </section>

      {/* Right Panel: Summary/History (25%) */}
      <section className="w-[25%] bg-[#0e0e0e] flex flex-col border-l border-[#494847]/10">
        <div className="p-8 border-b border-[#494847]/10">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/60">
            Repository Insights
          </h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-[#201f1f] rounded-2xl flex items-center justify-center opacity-30">
            <span className="material-symbols-outlined text-4xl">mist</span>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-white">No previous reviews</p>
            <p className="text-xs text-[#adaaaa] max-w-[180px]">
              Deploy an agent to start analyzing this repository's architectural patterns.
            </p>
          </div>
          <button className="mt-4 px-6 py-2 bg-[#262626] border border-[#494847]/30 text-[10px] font-bold uppercase tracking-widest hover:border-[#bd9dff]/50 transition-colors">
            View Docs
          </button>
        </div>

        {/* Tonal Footer Info */}
        <div className="p-8 bg-[#131313]/50 space-y-4">
          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest opacity-40">
            <span>Engine Status</span>
            <span className="text-[#bd9dff] flex items-center gap-1">
              <span className="w-1 h-1 bg-[#bd9dff] rounded-full animate-pulse" />
              Stable
            </span>
          </div>
          <div className="h-1 bg-[#262626] rounded-full overflow-hidden">
            <div className="h-full bg-[#bd9dff]/40 w-1/3" />
          </div>
          <p className="text-[9px] text-[#adaaaa] leading-relaxed">
            PRISM AI v2.0.4-stable
          </p>
        </div>
      </section>
    </div>
  );
}
