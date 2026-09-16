"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * A continuous horizontal ticker, the way a race timing board scrolls splits.
 * Two copies of the content sit side by side and the whole track slides left
 * by exactly one copy's width, then jumps back to 0 — because both copies are
 * identical, the jump is invisible and the scroll reads as endless.
 * Respects reduced motion by holding the track still.
 */
export function Marquee({ children, durationS = 22 }: { children: ReactNode; durationS?: number }) {
  const reduce = useReducedMotion();
  return (
    <div className="overflow-hidden" aria-hidden>
      <div
        className="flex w-max"
        style={
          reduce
            ? undefined
            : { animation: `marquee ${durationS}s linear infinite` }
        }
      >
        <span className="flex shrink-0 items-center">{children}</span>
        <span className="flex shrink-0 items-center">{children}</span>
      </div>
    </div>
  );
}
