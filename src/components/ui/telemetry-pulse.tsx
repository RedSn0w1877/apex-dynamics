"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { motion, useReducedMotion } from "motion/react";

/**
 * A beat indicator that actually keeps time with the heart rate on screen: one
 * contraction plus one expanding ring per beat, at 60 / bpm seconds.
 *
 * Purely ornamental, so it's `aria-hidden` — the bpm number beside it is the
 * real content, and this never gates it.
 *
 * The bpm is quantised before it becomes a duration. Rewriting the duration on
 * every scrub frame would restart the loop 60 times a second, which reads as
 * jitter rather than as a pulse.
 */
export function TelemetryPulse({ bpm, className = "" }: { bpm: number; className?: string }) {
  const reduce = useReducedMotion();
  const quantised = Math.min(220, Math.max(40, Math.round(bpm / 6) * 6));
  const beat = 60 / quantised;

  if (reduce) {
    return <span aria-hidden className={`inline-block size-2.5 shrink-0 rounded-full bg-volt ${className}`} />;
  }

  return (
    <span aria-hidden className={`relative inline-flex size-2.5 shrink-0 items-center justify-center ${className}`}>
      <motion.span
        className="absolute inset-0 rounded-full border border-volt"
        animate={{ scale: [1, 2.8], opacity: [0.7, 0] }}
        transition={{ duration: beat, repeat: Infinity, ease: "easeOut" }}
      />
      <motion.span
        className="size-full rounded-full bg-volt"
        animate={{ scale: [1, 1.5, 0.9, 1] }}
        transition={{ duration: beat, repeat: Infinity, ease: "easeOut", times: [0, 0.1, 0.28, 1] }}
      />
    </span>
  );
}
