"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { motion, useReducedMotion } from "motion/react";

/**
 * The oversized layer numeral parked behind the anatomy panel.
 *
 * Two independent motions stacked on one element, which is what gives it depth:
 *
 * 1. The outer window drifts on `--anatomy-progress`, a CSS custom property that
 *    GSAP writes straight to the DOM on every scroll tick. No React involved, so
 *    this is free — it costs one style write per frame and zero re-renders.
 * 2. The inner column springs between numerals whenever the active layer changes,
 *    wiping the old number up and out of the clipping window.
 *
 * Entirely decorative, so it is `aria-hidden` and safe to gate behind animation —
 * the real "01 / 03" figure lives as text in the spec grid.
 */
export function AnatomyKineticNumber({
  items,
  activeIndex,
}: {
  items: readonly string[];
  activeIndex: number;
}) {
  const reduce = useReducedMotion();

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute right-0 top-1/2 z-0 hidden -translate-y-1/2 select-none overflow-hidden pr-2 pl-[0.12em] font-display text-[clamp(9rem,20vw,19rem)] italic font-black uppercase leading-none tracking-tighter lg:block"
      // Counter-scroll drift. Falls back to 0 wherever the pin never runs
      // (small screens, reduced motion), which simply parks it dead centre.
      style={{
        height: "1em",
        transform: "translateY(calc(-50% + var(--anatomy-progress, 0) * -3.5rem))",
      }}
    >
      <motion.div
        animate={{ y: `${-activeIndex * 100}%` }}
        transition={
          reduce
            ? { duration: 0 }
            : { type: "spring", stiffness: 130, damping: 21, mass: 0.9 }
        }
      >
        {items.map((item) => (
          <div
            key={item}
            className="flex h-[1em] items-center justify-end text-transparent"
            // Outline-only numerals: presence without competing with the copy.
            style={{ WebkitTextStroke: "1px rgba(204, 255, 0, 0.22)" }}
          >
            {item}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
