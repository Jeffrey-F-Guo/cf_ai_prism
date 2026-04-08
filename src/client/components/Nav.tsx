interface NavProps {
  activeTab: "review" | "dashboard";
  onTabChange: (tab: "review" | "dashboard") => void;
}

export function Nav({ activeTab, onTabChange }: NavProps) {
  return (
    <header className="fixed top-0 w-full z-50 h-20 flex items-center justify-between px-12 bg-[#fbf9f6]/70 backdrop-blur-xl shadow-[0_16px_32px_-4px_rgba(27,28,26,0.04)]">
      <div className="flex items-center gap-12">
        <span className="font-headline text-2xl font-bold tracking-tight text-[#1b1c1a]">
          Prism
        </span>

        <nav className="hidden md:flex items-center gap-8">
          {(["dashboard", "review"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`font-headline text-base pb-1 transition-colors duration-200 ${
                activeTab === tab
                  ? "text-[#4338ca] border-b-2 border-[#4338ca]"
                  : "text-[#464554] font-medium hover:text-[#4338ca]"
              }`}
            >
              {tab === "review" ? "Active Analysis" : "Dashboard"}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-6">
        <button
          onClick={() => onTabChange("review")}
          className="bg-gradient-to-br from-[#2a14b4] to-[#4338ca] text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:opacity-90 transition-opacity shadow-sm"
        >
          New Review
        </button>
        <div className="flex items-center gap-3 text-[#464554]">
          <span className="material-symbols-outlined cursor-pointer hover:text-[#2a14b4] transition-colors text-xl">notifications</span>
          <span className="material-symbols-outlined cursor-pointer hover:text-[#2a14b4] transition-colors text-xl">account_circle</span>
        </div>
      </div>
    </header>
  );
}
