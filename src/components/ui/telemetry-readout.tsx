"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "@/lib/gsap";
import { TelemetryOdometer } from "@/components/ui/telemetry-odometer";

/**
 * One instrument tile in the HUD.
 *
 * The reading itself is always plain text in the DOM. Everything that reacts to
 * a change — the panel tint, the top accent rule — is a separate decorative
 * layer that GSAP flashes, so nothing about the number depends on an animation
 * having run.
 *
 * `sensitivity` is the delta that counts as a full-strength change for this
 * metric. Normalising by it means the tile that moved most *relative to its own
 * scale* glows hardest, which is how the eye gets told where to look — a 4 bpm
 * jump and a 4% energy swing are not the same event.
 */
export function TelemetryReadout({
  label,
  value,
  unit,
  sensitivity,
  children,
}: {
  label: string;
  value: number;
  unit: string;
  sensitivity: number;
  children?: ReactNode;
}) {
  const tintRef = useRef<HTMLSpanElement>(null);
  const ruleRef = useRef<HTMLSpanElement>(null);
  const previousRef = useRef(value);

  useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = value;
    if (previous === value) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const intensity = Math.min(1, Math.abs(value - previous) / Math.max(sensitivity, 1));

    if (tintRef.current) {
      gsap.fromTo(
        tintRef.current,
        { opacity: 0.12 + intensity * 0.5 },
        { opacity: 0, duration: 0.7, ease: "power2.out", overwrite: true },
      );
    }
    if (ruleRef.current) {
      gsap.fromTo(
        ruleRef.current,
        { scaleX: 0.2 + intensity * 0.8, opacity: 0.4 + intensity * 0.6 },
        { scaleX: 1, opacity: 0.16, duration: 0.6, ease: "power3.out", overwrite: true },
      );
    }
  }, [value, sensitivity]);

  return (
    <div className="relative bg-carbon px-4 py-4">
      {/* Decorative: the panel lighting up when its reading moves. */}
      <span
        ref={tintRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(204,255,0,0.32),transparent_72%)] opacity-0"
      />
      <span
        ref={ruleRef}
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px origin-left bg-volt opacity-[0.16]"
      />

      <dt className="relative font-mono text-[10px] uppercase tracking-[0.18em] text-chalk/50">{label}</dt>
      <dd className="relative mt-1.5 font-display text-2xl italic font-bold tabular-nums text-chalk">
        <TelemetryOdometer value={value} />
        {/* Real space so the value doesn't read as "142bpm" when copied or announced. */}{" "}
        <span className="text-sm not-italic text-chalk/50">{unit}</span>
        {children}
      </dd>
    </div>
  );
}
