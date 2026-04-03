import { PrismLogo, SettingsIcon, PersonIcon } from "./shared/Icons";

interface NavProps {
  activeTab: "review" | "dashboard";
  onTabChange: (tab: "review" | "dashboard") => void;
}

export function Nav({ activeTab, onTabChange }: NavProps) {
  return (
    <header className="sticky top-0 z-50 bg-[#131313]/70 backdrop-blur-xl border-b border-[#bd9dff]/10 shadow-[0_4px_20px_rgba(189,157,255,0.05)] flex items-center justify-between w-full px-8 h-16">
      <div className="text-xl font-black text-[#bd9dff] tracking-tighter flex items-center gap-2 uppercase select-none">
        <PrismLogo size={20} />
        PRISM
      </div>

      <nav className="hidden md:flex items-center gap-1">
        {(["review", "dashboard"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`relative px-4 py-1.5 font-bold tracking-[0.06em] uppercase text-[11px] rounded transition-all duration-200 ${
              activeTab === tab
                ? "text-[#bd9dff]"
                : "text-[#777575] hover:text-[#adaaaa]"
            }`}
          >
            {tab === "review" ? "Review" : "Dashboard"}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-[#bd9dff] rounded-full" />
            )}
          </button>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <button className="w-8 h-8 flex items-center justify-center rounded-lg text-[#777575] hover:text-[#adaaaa] hover:bg-[#262626]/60 transition-all duration-200">
          <SettingsIcon size={16} />
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#bd9dff] to-[#8a4cfc] border border-[#bd9dff]/30 shadow-[0_0_12px_rgba(189,157,255,0.2)] flex items-center justify-center text-white/80">
          <PersonIcon size={15} />
        </div>
      </div>
    </header>
  );
}
