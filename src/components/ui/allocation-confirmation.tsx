"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";
import { EASE_OUT } from "@/components/ui/reveal";

const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";

/**
 * Resolves a reference code left to right out of scrambling glyphs.
 *
 * Render falls back to the finished code whenever no scramble frame is in
 * flight, so the code is correct on first paint and stays correct if the effect
 * never runs. Randomness lives in the interval callback — never in render,
 * which React 19's purity lint (rightly) rejects.
 */
function ScrambleCode({ text }: { text: string }) {
  const reduce = useReducedMotion();
  /** Transient scramble frame, tagged with the code it belongs to. */
  const [frameState, setFrameState] = useState<{ code: string; value: string } | null>(null);
  const display = frameState && frameState.code === text ? frameState.value : text;

  useEffect(() => {
    if (reduce) return;
    let frame = 0;
    const id = window.setInterval(() => {
      frame += 1;
      const revealed = Math.floor(frame / 2);
      if (revealed >= text.length) {
        window.clearInterval(id);
        setFrameState({ code: text, value: text });
        return;
      }
      setFrameState({
        code: text,
        value: text
          .split("")
          .map((char, i) =>
            i < revealed || char === "-" ? char : GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
          )
          .join(""),
      });
    }, 45);
    return () => window.clearInterval(id);
  }, [text, reduce]);

  return <span className="tabular-nums">{display}</span>;
}

/** Counts up to `to` on a rAF ramp. Renders the true value until a frame lands. */
function CountUp({ to, durationMs = 1100 }: { to: number; durationMs?: number }) {
  const reduce = useReducedMotion();
  const [frameState, setFrameState] = useState<{ target: number; value: number } | null>(null);
  const value = frameState && frameState.target === to ? frameState.value : to;

  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setFrameState({ target: to, value: Math.round(to * (1 - Math.pow(1 - t, 3))) });
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, durationMs, reduce]);

  return <span className="tabular-nums">{value}</span>;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.075, delayChildren: 0.12 } },
};

const row = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
};

/**
 * The end-of-transaction card. This whole panel only exists after a JS submit,
 * so a staggered entrance can't strand any content that would otherwise render.
 */
export function AllocationConfirmation({
  firstName,
  email,
  reference,
  distanceLabel,
  sizeEu,
  weightG,
  holdNumber,
  onEdit,
}: {
  firstName: string;
  email: string;
  reference: string;
  distanceLabel: string;
  sizeEu: string;
  weightG: number;
  holdNumber: number;
  onEdit: () => void;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      variants={reduce ? undefined : container}
      initial={reduce ? false : "hidden"}
      animate="show"
      className="relative p-6 md:p-10"
      role="status"
    >
      {/* Decorative: a volt rule wipes across the top of the card as it lands. */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[2px] origin-left bg-volt"
        initial={reduce ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.7, ease: EASE_OUT }}
      />

      <motion.div variants={reduce ? undefined : row} className="flex items-center gap-4">
        <motion.span
          className="flex h-11 w-11 items-center justify-center bg-volt text-void"
          initial={reduce ? false : { scale: 0.5, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 480, damping: 18, delay: 0.1 }}
        >
          <Check aria-hidden className="h-5 w-5" strokeWidth={2.5} />
        </motion.span>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-chalk/50">
          Hold confirmed — <span className="text-volt">Prototype 04</span>
        </span>
      </motion.div>

      <motion.h3
        variants={reduce ? undefined : row}
        className="mt-6 font-display text-3xl italic font-black uppercase tracking-tight text-chalk md:text-5xl"
      >
        Pair held, {firstName}.
      </motion.h3>

      <motion.p variants={reduce ? undefined : row} className="mt-3 max-w-lg text-[15px] leading-relaxed text-chalk/65">
        On a real allocation, sizing confirmation would land in <span className="text-chalk">{email}</span>&apos;s
        inbox within one business day.
      </motion.p>

      <motion.dl
        variants={reduce ? undefined : row}
        className="mt-8 grid gap-px border border-gridline bg-gridline sm:grid-cols-4"
      >
        <div className="bg-carbon px-4 py-3">
          <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-chalk/50">Reference</dt>
          <dd className="mt-1 font-mono text-lg text-volt">
            <ScrambleCode text={reference} />
          </dd>
        </div>
        <div className="bg-carbon px-4 py-3">
          <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-chalk/50">Distance</dt>
          <dd className="mt-1 text-sm text-chalk">{distanceLabel}</dd>
        </div>
        <div className="bg-carbon px-4 py-3">
          <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-chalk/50">Size</dt>
          <dd className="mt-1 text-sm text-chalk">EU {sizeEu}</dd>
        </div>
        <div className="bg-carbon px-4 py-3">
          <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-chalk/50">Weight</dt>
          <dd className="mt-1 text-sm tabular-nums text-chalk">{weightG} g</dd>
        </div>
      </motion.dl>

      <motion.p
        variants={reduce ? undefined : row}
        className="mt-6 font-display text-xl italic font-bold uppercase tracking-tight text-chalk"
      >
        Pair <span className="text-volt">
          <CountUp to={holdNumber} />
        </span>{" "}
        of 250 held for testing this season.
      </motion.p>

      <motion.p
        variants={reduce ? undefined : row}
        className="mt-5 font-mono text-[10px] uppercase leading-relaxed tracking-[0.16em] text-chalk/45"
      >
        Portfolio demo — no confirmation was sent, no data was saved.
      </motion.p>

      <motion.button
        variants={reduce ? undefined : row}
        type="button"
        onClick={onEdit}
        whileHover={reduce ? undefined : { x: -3 }}
        transition={{ type: "spring", stiffness: 480, damping: 22 }}
        className="mt-6 inline-flex h-11 items-center border border-gridline px-5 font-mono text-[11px] uppercase tracking-[0.16em] text-chalk transition-colors hover:border-volt hover:text-volt"
      >
        Edit request
      </motion.button>
    </motion.div>
  );
}
