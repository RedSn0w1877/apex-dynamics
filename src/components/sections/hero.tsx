"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { memo, useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Marquee } from "@/components/ui/marquee";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { LazyStackScene } from "@/components/three/lazy-stack-scene";
import { LogMark } from "@/components/brand/log-mark";
import { EASE_OUT } from "@/components/ui/reveal";
import { gsap, useGSAP } from "@/lib/gsap";
import { explodeStore } from "@/lib/explode-store";

const TICKER_ITEMS = [
  "218 G PER SHOE",
  "38 MM HEEL / 30 MM FOREFOOT",
  "8 MM DROP",
  "84% ENERGY RETURN",
  "BUILT FOR 50K TO 100 MILES",
] as const;

const BADGES = [
  { label: "Weight", value: "218 g" },
  { label: "Stack height", value: "38 / 30 mm" },
  { label: "Built for", value: "50K – 100 mi" },
] as const;

const KINETIC_INITIAL = { y: "105%" };
const KINETIC_ANIMATE = { y: "0%" };

/**
 * One line of the headline, revealed word by word. The h1 carries the plain-text
 * aria-label; this is the aria-hidden visual layer.
 */
const KineticWords = memo(function KineticWords({
  words,
  startIndex,
  className,
}: {
  words: string[];
  startIndex: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <span aria-hidden className={`block ${className ?? ""}`}>
      {words.map((word, i) => {
        const delay = 0.1 + (startIndex + i) * 0.06;
        return (
          <span key={word}>
            <span className="-mr-[0.14em] -mt-[0.2em] inline-block overflow-hidden pb-[0.05em] pr-[0.14em] pt-[0.2em] align-bottom">
              <motion.span
                className="inline-block"
                initial={reduce ? false : KINETIC_INITIAL}
                animate={KINETIC_ANIMATE}
                transition={{ duration: 0.7, ease: EASE_OUT, delay }}
              >
                {word}
              </motion.span>
            </span>
            {/* A real space character, not just CSS margin, so selecting or copying this text doesn't run words together. */}
            {i < words.length - 1 && " "}
        </span>
      )})}
    </span>
  );
});

export function Hero() {
  const section = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      // Scroll scrubs the stack apart and back together — the whole hero is one
      // timeline rather than a set of independent triggers, so it reads as a shot.
      gsap
        .timeline({
          scrollTrigger: {
            trigger: section.current,
            start: "top top",
            end: "+=55%",
            scrub: 0.7,
            invalidateOnRefresh: true,
          },
        })
        .to(explodeStore, { value: 1, ease: "power2.inOut", duration: 1 });

      return () => {
        explodeStore.value = 0;
      };
    },
    { scope: section },
  );

  return (
    <section id="top" ref={section} className="relative border-b border-gridline pt-16">
      <div className="mx-auto max-w-[1440px] px-5 pt-10 md:px-10">
        <LogMark log="01" title="Prototype 04 — race day telemetry" />
      </div>

      <div className="mx-auto max-w-[1440px] px-5 pb-14 pt-10 md:px-10 md:pb-20 md:pt-14">
        {/* Asymmetric split: type carries the left, the spec diagram anchors the right. */}
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
              Prototype 04 — Carbon-plated trail racing shoe
            </p>
            <h1
              aria-label="218 grams between you and the mountain."
              className="mt-5 font-display text-[clamp(2.75rem,5.6vw,5rem)] italic font-black uppercase leading-[0.86] tracking-tighter text-chalk"
            >
              <KineticWords words={["218", "grams"]} startIndex={0} className="text-volt" />
              <KineticWords words={["between", "you", "and", "the", "mountain."]} startIndex={2} />
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="mt-7 max-w-lg text-[15px] leading-relaxed text-chalk/65"
            >
              Prototype 04 is a trail racing shoe built for 50K and longer. A carbon plate under the forefoot gives
              back 84% of the energy you put into every stride, so the last hour of a race feels closer to the
              first. Everything below is the test data behind that number.
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
          </div>

          {/*
            No entrance animation on this panel. The diagram is content, not decoration —
            gating it behind JS makes it vanish on a throttled tab or a failed hydration.
          */}
          <div className="lg:col-span-5">
            <div className="border border-gridline bg-carbon">
              <div className="flex items-baseline justify-between border-b border-gridline px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-chalk/50">
                <span>Fig. 01 — Prototype 04, exploded</span>
                <span className="text-chalk">Scroll to separate</span>
              </div>
              {/* Live 3D: the shoe pulls apart into its five layers as the hero timeline scrubs. */}
              <div className="h-[320px] md:h-[440px]">
                <LazyStackScene explode={explodeStore} />
              </div>
            </div>
          </div>
        </div>

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
