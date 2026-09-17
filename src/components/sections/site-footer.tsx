"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUp } from "lucide-react";
import { Marquee } from "@/components/ui/marquee";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { COPYRIGHT_NOTICE, COPYRIGHT_SHORT, STUDIO } from "@/lib/copyright";

const BRAND = "APEX DYNAMICS";

const TICKER_ITEMS = [
  "PROTOTYPE 04 — CARBON-PLATED TRAIL RACING SHOE",
  "218 G PER SHOE",
  "84% ENERGY RETURN",
  "50K TO 100 MILES",
  `${COPYRIGHT_SHORT} — PORTFOLIO SAMPLE, DO NOT REDISTRIBUTE`,
] as const;

const LABS = [
  {
    city: "Chamonix, France",
    coords: "45.9237° N · 6.8694° E",
    zone: "Europe/Paris",
    note: "Alpine vertical loop",
  },
  {
    city: "Boulder, Colorado, USA",
    coords: "40.0150° N · 105.2705° W",
    zone: "America/Denver",
    note: "Altitude and heat block",
  },
] as const;

/**
 * Local time at each test lab, like a clock wall in a control room.
 * Placeholder dashes render on the server and on first paint, so the clock can
 * never cause a hydration mismatch — and the coordinates beside it are plain
 * text that never depends on JS.
 */
function useLabClocks() {
  const [times, setTimes] = useState<string[]>(() => LABS.map(() => "--:--:--"));

  useEffect(() => {
    const tick = () =>
      setTimes(
        LABS.map((lab) =>
          new Intl.DateTimeFormat("en-GB", {
            timeZone: lab.zone,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          }).format(new Date()),
        ),
      );
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return times;
}

/**
 * The end-title wordmark: oversized display type where every letter floats on its
 * own delay and lifts to volt under the cursor, with a light bar sweeping across.
 *
 * The letters are never animation-gated — they render at full opacity and their
 * natural position, so a stalled or skipped animation costs motion, not content.
 * The heading carries a plain-text aria-label and the visual layer emits real
 * space characters, so this copies and reads as "APEX DYNAMICS".
 */
function KineticBrand() {
  const reduce = useReducedMotion();

  return (
    <div className="relative">
      <h2
        aria-label={BRAND}
        className="font-display text-[clamp(2.75rem,12.5vw,11rem)] italic font-black uppercase leading-[0.82] tracking-tighter text-chalk"
      >
        <span aria-hidden className="flex flex-wrap">
          {BRAND.split("").map((char, i) =>
            char === " " ? (
              // A real space character, not just a gap, so the wordmark copies correctly.
              <span key={`space-${i}`} className="inline-block w-[0.2em] whitespace-pre">
                {" "}
              </span>
            ) : (
              <motion.span
                key={`${char}-${i}`}
                className="inline-block"
                initial={false}
                animate={reduce ? undefined : { y: [0, -7, 0] }}
                transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut", delay: i * 0.09 }}
                whileHover={
                  reduce
                    ? undefined
                    : { y: -16, color: "#ccff00", transition: { type: "spring", stiffness: 520, damping: 16 } }
                }
              >
                {char}
              </motion.span>
            ),
          )}
        </span>
      </h2>

      {/* Decorative sweep, clipped to its own layer so hovering letters aren't cut off. */}
      {reduce ? null : (
        <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <motion.span
            className="absolute inset-y-0 w-[12%] -skew-x-12 bg-volt/10"
            initial={{ x: "-40%" }}
            animate={{ x: "880%" }}
            transition={{ duration: 7, repeat: Infinity, ease: "linear", repeatDelay: 1.4 }}
          />
        </span>
      )}
    </div>
  );
}

/** Legal link with a volt rule that wipes in on hover. Stays a next/link. */
function LegalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="group relative inline-block text-chalk">
      {children}
      <span aria-hidden className="absolute inset-x-0 -bottom-0.5 h-px bg-gridline" />
      <span
        aria-hidden
        className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-volt transition-transform duration-300 group-hover:scale-x-100"
      />
    </Link>
  );
}

export function SiteFooter() {
  const reduce = useReducedMotion();
  const times = useLabClocks();

  return (
    <footer className="bg-void">
      <div className="border-t border-gridline bg-carbon py-3.5">
        <Marquee durationS={30}>
          {TICKER_ITEMS.map((item) => (
            <span
              key={item}
              className="mx-4 flex items-center font-mono text-xs uppercase tracking-[0.22em] text-chalk/60"
            >
              {item}
              <span aria-hidden className="ml-4 text-volt">
                {"//"}
              </span>
            </span>
          ))}
        </Marquee>
      </div>

      <div className="mx-auto max-w-[1440px] px-5 pb-10 pt-14 md:px-10 md:pb-14 md:pt-20">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-gridline pb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-chalk/50">
          <span className="text-chalk">End of log 06/06 — run complete</span>
          <span className="select-none text-chalk/45">{COPYRIGHT_SHORT} · Do not redistribute</span>
        </div>

        <div className="mt-8">
          <KineticBrand />
        </div>

        <div className="mt-10 grid gap-12 border-t border-gridline pt-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-chalk/50">
              <motion.span
                aria-hidden
                className="block h-2 w-2 bg-volt"
                animate={reduce ? undefined : { opacity: [1, 0.25, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              Still testing
            </p>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-chalk/60">
              Carbon-plated trail and endurance footwear, tested against real elevation and real wind, not
              marketing copy.
            </p>
            <div className="mt-7">
              <MagneticButton
                href="#top"
                className="inline-flex h-12 items-center gap-2 border border-gridline px-6 font-mono text-[11px] uppercase tracking-[0.18em] text-chalk transition-colors hover:border-volt hover:text-volt"
              >
                Back to the start line
                <ArrowUp aria-hidden className="h-4 w-4" strokeWidth={2.5} />
              </MagneticButton>
            </div>
          </div>

          <div className="md:col-span-3">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-chalk/50">Lab coordinates</h2>
            <div className="mt-4 border-t border-gridline">
              {LABS.map((lab, i) => (
                <motion.div
                  key={lab.city}
                  whileHover={reduce ? undefined : { x: 4 }}
                  transition={{ type: "spring", stiffness: 420, damping: 28 }}
                  className="group border-b border-gridline py-3"
                >
                  <address className="text-sm not-italic leading-relaxed text-chalk/80 transition-colors group-hover:text-chalk">
                    {lab.city}
                  </address>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-chalk/45">
                    {lab.coords}
                  </p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-chalk/45">
                    <span className="text-volt tabular-nums">{times[i]}</span> local · {lab.note}
                  </p>
                </motion.div>
              ))}
              <p className="py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-chalk/45">
                Athlete roster: 14 active protocols
              </p>
            </div>
          </div>

          <div className="md:col-span-4">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-chalk/50">Testing notes</h2>
            <ul className="mt-4 space-y-2 text-sm leading-relaxed text-chalk/60">
              <li>Wind tunnel figures from scale-model runs, not full-body live testing.</li>
              <li>Plate fatigue and outsole friction ratings per ASTM/ISO reference methods noted per spec.</li>
              <li className="pt-1">
                <LegalLink href="/legal/terms">Terms of use</LegalLink>
                <span className="px-2 text-gridline">/</span>
                <LegalLink href="/legal/privacy">Privacy notice</LegalLink>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/*
        Legal plate. Deliberately plain and never animation-gated: the copyright
        and the fictional-brand disclosure have to render, full stop.
      */}
      <div className="border-t border-gridline">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-5 py-6 font-mono text-[10px] uppercase leading-relaxed tracking-[0.16em] text-chalk/50 md:flex-row md:items-start md:justify-between md:px-10">
          <p className="text-chalk/70">{COPYRIGHT_NOTICE}</p>
          <p className="max-w-xl md:text-right">
            APEX DYNAMICS is a fictional brand designed and engineered by {STUDIO} as a portfolio concept.
            Specifications, wind-tunnel figures, testing protocols and pricing are illustrative. Copying,
            redistribution or reuse of this code, copy or design is prohibited.
          </p>
        </div>
      </div>
    </footer>
  );
}
