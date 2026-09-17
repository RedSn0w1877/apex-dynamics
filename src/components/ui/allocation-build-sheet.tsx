"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { EASE_OUT } from "@/components/ui/reveal";

export type BuildSheetRow = {
  /** Stable row identity — the *value* is what changes and animates. */
  id: string;
  label: string;
  value: string;
};

/**
 * Live summary of the pair the visitor is configuring. Every time the distance
 * or size changes, the affected values roll over like a departure board.
 *
 * `AnimatePresence initial={false}` matters here: the first render paints the
 * values plainly, so the sheet is readable even if no animation ever runs.
 * Only later *changes* animate.
 */
export function AllocationBuildSheet({
  rows,
  lugMm,
  lugMaxMm,
}: {
  rows: BuildSheetRow[];
  lugMm: number;
  lugMaxMm: number;
}) {
  const reduce = useReducedMotion();

  return (
    <div className="mt-8 max-w-sm border border-gridline bg-void">
      <div className="flex items-center justify-between border-b border-gridline px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-chalk/50">
        <span className="text-chalk">Build sheet</span>
        <span className="flex items-center gap-2">
          <motion.span
            aria-hidden
            className="block h-1.5 w-1.5 bg-volt"
            animate={reduce ? undefined : { opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
          Updates live
        </span>
      </div>

      <dl>
        {rows.map((row) => (
          <div key={row.id} className="flex items-center justify-between gap-4 border-b border-gridline px-4 py-3">
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-chalk/50">{row.label}</dt>
            <dd className="relative h-5 min-w-0 flex-1 overflow-hidden text-right">
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                  key={row.value}
                  initial={reduce ? false : { y: 16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={reduce ? { opacity: 0 } : { y: -16, opacity: 0 }}
                  transition={{ duration: 0.32, ease: EASE_OUT }}
                  className="block truncate text-sm tabular-nums text-chalk"
                >
                  {row.value}
                </motion.span>
              </AnimatePresence>
            </dd>
          </div>
        ))}
      </dl>

      <div className="px-4 py-4">
        <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-chalk/50">
          <span>Grip depth</span>
          <span className="text-chalk">
            {lugMm.toFixed(1)}
            {/* Real space so this isn't read or copied as "4.5mm". */}{" "}
            mm
          </span>
        </div>
        <div className="mt-2 h-[3px] w-full bg-gridline">
          <motion.span
            aria-hidden
            className="block h-full origin-left bg-volt"
            initial={false}
            animate={{ scaleX: Math.min(1, lugMm / lugMaxMm) }}
            transition={{ type: "spring", stiffness: 220, damping: 26 }}
          />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-chalk/45">
          Deeper lugs bite soft ground on long mountain days; shallower lugs roll faster on hardpack.
        </p>
      </div>
    </div>
  );
}
