"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { EASE_OUT } from "@/components/ui/reveal";

/**
 * Cinematic cold-open. Seven void panels sit over the (already rendered) page,
 * a counter races to 218 g, the wordmark stamps in, then the panels wipe away
 * on alternating axes with a volt edge riding each one out.
 *
 * Safety contract — the failure mode is "the overlay never appears", never
 * "the overlay never leaves":
 *   - Nothing renders on the server or on the first client render. The panels
 *     only mount from inside an effect, so a hydration failure means the page
 *     is simply visible with no intro.
 *   - Teardown is driven by a plain setTimeout, not by an animation callback.
 *     If `motion` never runs a single frame, the overlay still unmounts on
 *     schedule and the page is fully interactive.
 *   - The real page content is mounted behind this the entire time; nothing is
 *     gated on the intro finishing.
 */

const SESSION_KEY = "apex-intro-played";

/** Hard ceiling on the whole sequence. Panels finish their wipe at ~1.16s. */
const TOTAL_MS = 1200;

/** Counter ramp, ms. Ends well before the wipe starts. */
const COUNT_MS = 520;

/** When the shutter starts opening, seconds. */
const WIPE_AT = 0.6;

const PANELS = [0, 1, 2, 3, 4, 5, 6];

/** "APEX DYNAMICS" as words, so a real space survives the per-letter split. */
const WORDMARK = ["APEX", "DYNAMICS"] as const;

export function IntroSequence() {
  const [playing, setPlaying] = useState(false);
  const counterRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Reduced motion: skip the sequence outright, never mount it.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Only the first view of the session gets the cold open — coming back from
    // /legal/terms shouldn't replay it.
    try {
      if (window.sessionStorage.getItem(SESSION_KEY) === "1") return;
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* Private mode / storage blocked — play it, just don't remember it. */
    }

    setPlaying(true);

    const end = () => setPlaying(false);

    // The timer is the real teardown. Everything else is a courtesy skip.
    const timer = window.setTimeout(end, TOTAL_MS);
    window.addEventListener("pointerdown", end);
    window.addEventListener("keydown", end);
    window.addEventListener("wheel", end, { passive: true });
    window.addEventListener("touchstart", end, { passive: true });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", end);
      window.removeEventListener("keydown", end);
      window.removeEventListener("wheel", end);
      window.removeEventListener("touchstart", end);
    };
  }, []);

  useEffect(() => {
    if (!playing) return;
    const node = counterRef.current;
    if (!node) return;

    // Hand-rolled rAF ramp instead of a state-driven count: writing textContent
    // straight to the node keeps this off React's render path entirely.
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now: number) {
      const t = Math.min((now - start) / COUNT_MS, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      node.textContent = String(Math.round(eased * 218)).padStart(3, "0");
      if (t < 1) frame = requestAnimationFrame(tick);
    });

    return () => cancelAnimationFrame(frame);
  }, [playing]);

  if (!playing) return null;

  return (
    <div
      aria-hidden
      role="presentation"
      className="fixed inset-0 z-[90] overflow-hidden"
      data-copyright="© 2026 HVNF Studios — portfolio sample"
    >
      {/* The shutter. Each panel is its own collapsing box with a volt edge
          riding the closing side — the panels alternate up/down so the reveal
          reads as mechanical louvres rather than one curtain. */}
      <div className="absolute inset-0 flex">
        {PANELS.map((i) => {
          const up = i % 2 === 0;
          return (
            <div key={i} className="relative h-full flex-1">
              <motion.div
                initial={{ height: "100%" }}
                animate={{ height: "0%" }}
                transition={{ duration: 0.38, ease: EASE_OUT, delay: WIPE_AT + i * 0.03 }}
                className={`absolute inset-x-0 flex border-gridline bg-void ${
                  up ? "top-0 items-end border-r" : "bottom-0 items-start border-l"
                }`}
              >
                <span className="block h-[2px] w-full bg-volt" />
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* Title card. Lives above the panels and clears out just before they open. */}
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: EASE_OUT, delay: 0.52 }}
        className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6"
      >
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.06 }}
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-chalk/45"
        >
          Apex Dynamics — Prototype 04
        </motion.p>

        <span
          ref={counterRef}
          className="mt-3 block font-display text-[clamp(4.5rem,17vw,11rem)] font-black italic leading-[0.8] tracking-tighter text-volt tabular-nums"
        >
          000
        </span>

        <motion.span
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.04 }}
          className="mt-4 block h-px w-[min(74vw,620px)] origin-left bg-volt"
        />

        <span className="mt-4 flex flex-wrap justify-center overflow-hidden px-[0.15em] pt-[0.15em] font-display text-[clamp(1.5rem,5vw,2.75rem)] font-black italic uppercase leading-none tracking-tighter text-chalk">
          {WORDMARK.map((word, w) => (
            <span key={word}>
              {word.split("").map((letter, l) => (
                <motion.span
                  key={`${word}-${l}`}
                  initial={{ y: "110%" }}
                  animate={{ y: "0%" }}
                  transition={{
                    duration: 0.5,
                    ease: EASE_OUT,
                    delay: 0.08 + (w * 4 + l) * 0.022,
                  }}
                  className="inline-block"
                >
                  {letter}
                </motion.span>
              ))}
              {/* A real space character between the words, not CSS margin. */}
              {w < WORDMARK.length - 1 && " "}
            </span>
          ))}
        </span>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="absolute bottom-8 font-mono text-[10px] uppercase tracking-[0.18em] text-chalk/35"
        >
          Grams per shoe · Tap to skip
        </motion.p>
      </motion.div>
    </div>
  );
}
