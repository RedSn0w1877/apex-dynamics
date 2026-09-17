"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { motion, useReducedMotion } from "motion/react";
import { EASE_OUT } from "@/components/ui/reveal";

/**
 * A single volt scan sweeping top-to-bottom across the panel each time the layer
 * changes — the "readout re-acquiring" beat between cross-sections.
 *
 * The sweeping element is full-height with the bright band centred inside it, so
 * translating it from -100% to 100% carries the band cleanly off both edges at
 * any panel height. Pure transform, so it stays on the compositor.
 *
 * Decorative only: `aria-hidden`, and it disappears entirely under reduced motion.
 */
export function AnatomyScanline({ runKey }: { runKey: string }) {
  const reduce = useReducedMotion();
  if (reduce) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      <motion.div
        key={runKey}
        className="absolute inset-x-0 top-0 h-full"
        style={{
          background:
            "linear-gradient(180deg, transparent 42%, rgba(204,255,0,0.10) 48%, rgba(204,255,0,0.55) 50%, rgba(204,255,0,0.10) 52%, transparent 58%)",
        }}
        initial={{ y: "-100%", opacity: 0.9 }}
        animate={{ y: "100%", opacity: 0 }}
        transition={{ duration: 0.85, ease: EASE_OUT }}
      />
    </div>
  );
}
