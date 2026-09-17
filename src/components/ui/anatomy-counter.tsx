"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

const DURATION_MS = 700;

/** easeOutExpo — fast off the line, long settle. Reads like a scale coming to rest. */
const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

/**
 * A number that counts up to its value.
 *
 * React renders the real figure as the element's text, so the correct number is in
 * the DOM on first paint, during SSR, and if JS never runs at all. The count-up is
 * then written straight to the text node frame by frame — same zero-re-render
 * philosophy as the scroll stores, and it keeps the animation off React entirely
 * rather than firing sixty setStates a second.
 *
 * Under reduced motion the effect does nothing, which leaves React's own value
 * standing. The cleanup hands the node back holding the true figure.
 */
export function AnatomyCounter({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion();
  const el = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = el.current;
    if (!node || reduce) return;

    const start = performance.now();
    let frame = 0;

    const step = (now: number) => {
      const t = Math.min((now - start) / DURATION_MS, 1);
      node.textContent = String(Math.round(easeOutExpo(t) * value));
      if (t < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(frame);
      node.textContent = String(value);
    };
  }, [value, reduce]);

  // `tabular-nums` keeps the digits from reflowing as they tick.
  return (
    <span ref={el} className={`tabular-nums ${className ?? ""}`}>
      {value}
    </span>
  );
}
