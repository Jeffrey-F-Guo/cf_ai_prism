interface NavProps {
  activeTab: "review" | "dashboard";
  onTabChange: (tab: "review" | "dashboard") => void;
}

export function Nav({ activeTab, onTabChange }: NavProps) {
  return (
    <header className="sticky top-0 z-50 bg-[#131313]/70 backdrop-blur-xl border-b border-[#bd9dff]/10 shadow-[0_4px_20px_rgba(189,157,255,0.05)] flex items-center justify-between w-full px-8 h-16">
      <div className="text-xl font-black text-[#bd9dff] tracking-tighter flex items-center gap-2 uppercase">
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
          filter_vintage
        </span>
        PRISM
      </div>
      <nav className="hidden md:flex items-center gap-8">
        <button
          onClick={() => onTabChange("review")}
          className={`font-bold tracking-[-0.04em] uppercase text-xs transition-colors ${
            activeTab === "review"
              ? "text-[#bd9dff] border-b-2 border-[#bd9dff] pb-1"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Review
        </button>
        <button
          onClick={() => onTabChange("dashboard")}
          className={`font-bold tracking-[-0.04em] uppercase text-xs transition-colors ${
            activeTab === "dashboard"
              ? "text-[#bd9dff] border-b-2 border-[#bd9dff] pb-1"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Dashboard
        </button>
      </nav>
      <div className="flex items-center gap-4">
        <button className="hover:bg-[#262626]/50 transition-all duration-300 p-2 rounded">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="hover:bg-[#262626]/50 transition-all duration-300 p-2 rounded">
          <span className="material-symbols-outlined">settings</span>
        </button>
        <div className="w-8 h-8 rounded-full bg-[#262626] overflow-hidden border border-[#bd9dff]/20">
          <div className="w-full h-full bg-gradient-to-br from-[#bd9dff] to-[#c38bf5]" />
        </div>
      </div>
    </header>
  );
}
