import { useEffect, useRef } from "react";
import type { LogEntry } from "../../../types/review";

interface ActivityLogProps {
  logs: LogEntry[];
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function ActivityLog({ logs }: ActivityLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-3 shrink-0">
        Activity
      </h3>
      <div className="flex-1 overflow-y-auto font-mono text-[10px] leading-relaxed space-y-0.5 pr-1">
        {logs.length === 0 ? (
          <p className="text-[#494847] italic">Waiting for workflow...</p>
        ) : (
          logs.map((entry) => (
            <div key={entry.id} className="flex gap-2 items-start">
              <span className="text-[#494847] shrink-0 tabular-nums">
                {formatTime(entry.ts)}
              </span>
              <span className="text-[#adaaaa] break-all">{entry.message}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
