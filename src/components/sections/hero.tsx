"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Marquee } from "@/components/ui/marquee";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { LogMark } from "@/components/brand/log-mark";
import { EASE_OUT } from "@/components/ui/reveal";

const TICKER_ITEMS = [
  "PROPULSION MATRIX",
  "218G RACE WEIGHT",
  "DUAL CARBON FORK",
  "84% ENERGY RETURN",
  "VO2 MAX TESTED",
] as const;

const BADGES = [
  { label: "Elevation gain", value: "+1,240 m" },
  { label: "Pace", value: "2:48 /km" },
  { label: "Lactate", value: "3.8 mmol/L" },
] as const;

export function Hero() {
  const reduce = useReducedMotion();

  return (
    <section id="top" className="relative border-b border-gridline pt-16">
      <div className="mx-auto max-w-[1440px] px-5 pt-10 md:px-10">
        <LogMark log="01" title="Prototype 04 — race day telemetry" />
      </div>

      <div className="mx-auto max-w-[1440px] px-5 pb-14 pt-10 md:px-10 md:pb-20 md:pt-14">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">Apex Pro / Prototype 04</p>
        <h1 className="mt-5 max-w-4xl font-display text-[clamp(2.75rem,7.5vw,6.5rem)] italic font-black uppercase leading-[0.86] tracking-tighter text-chalk">
          {"Engineered for".split(" ").map((word, i) => (
            <span key={word} className="mr-[0.24em] inline-block overflow-hidden pb-[0.05em] align-bottom last:mr-0">
              <motion.span
                className="inline-block"
                initial={reduce ? false : { y: "105%" }}
                animate={{ y: "0%" }}
                transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.1 + i * 0.06 }}
              >
                {word}
              </motion.span>
            </span>
          ))}
          <span className="block text-volt">
            {"oxygen debt.".split(" ").map((word, i) => (
              <span key={word} className="mr-[0.24em] inline-block overflow-hidden pb-[0.05em] align-bottom last:mr-0">
                <motion.span
                  className="inline-block"
                  initial={reduce ? false : { y: "105%" }}
                  animate={{ y: "0%" }}
                  transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.3 + i * 0.06 }}
                >
                  {word}
                </motion.span>
              </span>
            ))}
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-7 max-w-md text-[15px] leading-relaxed text-chalk/65"
        >
          A forked carbon plate splits at the toe so the forefoot flexes on uneven ground instead of see-sawing.
          Dual-density PEBA foam gives 84% energy return without giving up ground feel on technical descents.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.9 }}
          className="mt-9 flex flex-wrap items-center gap-5"
        >
          <MagneticButton
            href="#allocation"
            className="inline-flex h-14 items-center gap-2 bg-volt px-7 font-mono text-xs font-bold uppercase tracking-[0.16em] text-void transition-colors hover:bg-chalk"
          >
            Explore Prototype 04
            <ArrowUpRight aria-hidden className="h-4 w-4" strokeWidth={2.5} />
          </MagneticButton>
          <a
            href="#anatomy"
            className="font-mono text-xs uppercase tracking-[0.18em] text-chalk/60 underline decoration-gridline underline-offset-4 transition-colors hover:text-chalk hover:decoration-chalk"
          >
            See the build
          </a>
        </motion.div>

        <dl className="mt-12 grid grid-cols-1 gap-px border border-gridline bg-gridline sm:grid-cols-3">
          {BADGES.map((badge) => (
            <div key={badge.label} className="bg-void px-5 py-4">
              <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-chalk/50">{badge.label}</dt>
              <dd className="mt-1.5 font-display text-xl italic font-bold tabular-nums text-chalk">{badge.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="border-t border-gridline bg-carbon py-3.5">
        <Marquee>
          {TICKER_ITEMS.map((item) => (
            <span key={item} className="mx-4 flex items-center font-mono text-xs uppercase tracking-[0.22em] text-chalk/70">
              {item}
              <span aria-hidden className="ml-4 text-volt">
                {"//"}
              </span>
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
