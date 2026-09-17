"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

/**
 * A number whose digits pop in — blurred-to-sharp, staggered — but only on the
 * columns that actually changed, so 176 → 177 kicks one digit instead of three.
 *
 * Why GSAP instead of a motion `initial`: the digits are plain text nodes in
 * normal flow, fully painted before any JS runs. `gsap.fromTo` is the only
 * thing that ever offsets them, so a throttled tab, a failed hydration or a
 * slow device still shows a correct, readable number. A declarative
 * `initial={{ opacity: 0 }}` would ship opacity:0 in the HTML itself.
 *
 * The digit spans carry no whitespace between them, so the accessibility tree
 * and the clipboard both see "178" rather than "1 7 8".
 */

/** Don't restart the pop faster than the eye can resolve it (fast scrubbing). */
const MIN_GAP_MS = 90;

export function TelemetryOdometer({ value, className }: { value: number; className?: string }) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const previousRef = useRef(String(value));
  const lastAnimRef = useRef(0);
  const text = String(value);

  useEffect(() => {
    const root = rootRef.current;
    const previous = previousRef.current;
    const next = String(value);
    previousRef.current = next;

    if (!root || next === previous) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const now = performance.now();
    if (now - lastAnimRef.current < MIN_GAP_MS) return;
    lastAnimRef.current = now;

    // Compare right-aligned, the way a real odometer reads: 99 → 100 should
    // only re-kick the columns whose glyph genuinely differs.
    const cells = Array.from(root.querySelectorAll<HTMLSpanElement>("[data-digit]"));
    const changed = cells.filter((_, index) => {
      const fromRight = cells.length - 1 - index;
      return previous[previous.length - 1 - fromRight] !== next[next.length - 1 - fromRight];
    });
    if (changed.length === 0) return;

    // Rising values roll up from below, falling values drop in from above.
    const direction = Number(next) >= Number(previous) ? 1 : -1;

    gsap.fromTo(
      changed,
      { yPercent: 46 * direction, opacity: 0, filter: "blur(4px)" },
      {
        yPercent: 0,
        opacity: 1,
        filter: "blur(0px)",
        duration: 0.32,
        ease: "power3.out",
        stagger: 0.03,
        overwrite: "auto",
        clearProps: "transform,opacity,filter",
      },
    );
  }, [value]);

  return (
    <span ref={rootRef} className={className}>
      {text.split("").map((digit, index) => (
        // Positional key on purpose: the column stays put, only its glyph swaps,
        // which is what lets GSAP keep animating the same element.
        <span key={index} data-digit="" className="inline-block will-change-transform">
          {digit}
        </span>
      ))}
    </span>
  );
}
