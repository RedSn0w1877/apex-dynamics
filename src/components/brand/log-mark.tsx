// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { COPYRIGHT_SHORT } from "@/lib/copyright";

const TOTAL_LOGS = "06";

/** Telemetry-log-style section header. Doubles as the per-section copyright mark. */
export function LogMark({ log, title }: { log: string; title: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-gridline pb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-chalk/60">
      <span>
        <span className="text-chalk">
          LOG {log}/{TOTAL_LOGS}
        </span>{" "}
        — {title}
      </span>
      <span className="select-none text-chalk/45">{COPYRIGHT_SHORT} · Do not redistribute</span>
    </div>
  );
}
