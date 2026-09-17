"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { useEffect, useState, type InputHTMLAttributes } from "react";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "motion/react";
import { EASE_OUT } from "@/components/ui/reveal";

/**
 * Validation message for a single field.
 *
 * Only ever rendered after client-side validation has already run, so the
 * enter animation can't hide anything that would otherwise be readable.
 */
export function AllocationFieldError({ id, message }: { id: string; message?: string }) {
  return (
    <AnimatePresence initial={false}>
      {message ? (
        <motion.p
          key="error"
          id={id}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25, ease: EASE_OUT }}
          className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-volt"
        >
          {message}
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}

/**
 * A text input with the reservation-desk treatment: the label lifts and brightens
 * on focus, a volt rule wipes in under the field, a status glyph flips to OK once
 * there's something valid in it, and the whole row shakes when a submit lands on
 * it while invalid.
 *
 * The input itself is never animation-gated — motion only ever touches decoration
 * (the underline) or a transform on the wrapper, so the field renders and works
 * even if no animation ever runs.
 */
export function AllocationField({
  id,
  errorId,
  label,
  value,
  onChange,
  error,
  shakeToken,
  type = "text",
  autoComplete,
  inputMode,
  placeholder,
}: {
  id: string;
  errorId: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  /** Incremented by the form on every failed submit, to re-fire the shake. */
  shakeToken: number;
  type?: "text" | "email";
  autoComplete?: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  placeholder?: string;
}) {
  const reduce = useReducedMotion();
  const controls = useAnimationControls();
  const [focused, setFocused] = useState(false);
  const filled = value.trim().length > 0;

  useEffect(() => {
    if (reduce || !error || shakeToken === 0) return;
    controls.start({
      x: [0, -9, 7, -4, 2, 0],
      transition: { duration: 0.45, ease: "easeOut" },
    });
  }, [shakeToken, error, reduce, controls]);

  return (
    <motion.div animate={controls} className="relative">
      <div className="flex items-baseline justify-between gap-3">
        <motion.label
          htmlFor={id}
          animate={reduce ? undefined : { y: focused ? -2 : 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 26 }}
          className={`inline-block font-mono text-[10px] uppercase tracking-[0.18em] transition-colors duration-300 ${
            error ? "text-volt" : focused ? "text-chalk" : "text-chalk/50"
          }`}
        >
          {label}
        </motion.label>
        <span
          aria-hidden
          className={`font-mono text-[9px] uppercase tracking-[0.18em] transition-colors duration-300 ${
            error ? "text-volt" : filled ? "text-volt/80" : "text-chalk/25"
          }`}
        >
          {error ? "Check" : filled ? "OK" : "Required"}
        </span>
      </div>

      <div className="relative mt-2">
        <input
          id={id}
          type={type}
          value={value}
          autoComplete={autoComplete}
          inputMode={inputMode}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className="h-12 w-full border border-gridline bg-void px-4 text-sm text-chalk transition-colors duration-300 placeholder:text-chalk/30 hover:border-chalk/40 focus:border-chalk/70 aria-[invalid=true]:border-volt/70"
        />
        {/* Decorative: volt rule wipes left-to-right while the field holds focus. */}
        <motion.span
          aria-hidden
          initial={false}
          animate={{ scaleX: focused || error ? 1 : 0 }}
          transition={{ duration: 0.45, ease: EASE_OUT }}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-left bg-volt"
        />
      </div>

      <AllocationFieldError id={errorId} message={error} />
    </motion.div>
  );
}
