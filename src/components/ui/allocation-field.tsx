"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { useEffect, useRef, type InputHTMLAttributes } from "react";
import styles from "@/components/sections/bib.module.css";

/*
 * A text field for the bib form, on a timing-line underline with no box. The
 * motion is all CSS: the label lifts 2 px on :focus-within, a volt rule wipes
 * in under the field while it has focus or an error, and the error line slides
 * in. The one scripted piece is the shake when a submit lands on a field that's
 * wrong: one WAAPI animation per failed submit, skipped under reduced motion.
 *
 * The field never depends on any of that: with no JS, no CSS animation support
 * or reduced motion, it renders and works the same. Styles live with the bib
 * section (bib.module.css), its only user.
 */

/** Validation message for a single field: a plain line, shown only after a submit found a problem. */
export function AllocationFieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className={styles.fieldError}>
      {message}
    </p>
  ) : null;
}

const SHAKE: Keyframe[] = [
  { transform: "translateX(0)" },
  { transform: "translateX(-9px)" },
  { transform: "translateX(7px)" },
  { transform: "translateX(-4px)" },
  { transform: "translateX(2px)" },
  { transform: "translateX(0)" },
];

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
  const rowRef = useRef<HTMLDivElement>(null);
  const lastShake = useRef(shakeToken);
  const filled = value.trim().length > 0;

  // Shake once per failed submit (a new token), never because the message text changed.
  useEffect(() => {
    if (shakeToken === lastShake.current) return;
    lastShake.current = shakeToken;
    if (!error || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    rowRef.current?.animate(SHAKE, { duration: 450, easing: "cubic-bezier(.2, .9, .1, 1)" });
  }, [shakeToken, error]);

  return (
    <div ref={rowRef} className={styles.field} data-invalid={error ? "" : undefined}>
      <div className={styles.fieldTop}>
        <label htmlFor={id} className={`t-label ${styles.fieldLabel}`}>
          {label}
        </label>
        <span aria-hidden="true" className={`t-label ${styles.fieldStatus}`} data-state={error ? "check" : filled ? "ok" : "required"}>
          {error ? "Check" : filled ? "OK" : "Required"}
        </span>
      </div>

      <div className={styles.fieldLine}>
        {/* No name attribute, on purpose: personal data can never be serialised into a URL. */}
        <input
          id={id}
          type={type}
          value={value}
          autoComplete={autoComplete}
          inputMode={inputMode}
          placeholder={placeholder}
          spellCheck={false}
          maxLength={type === "email" ? 120 : 40}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={styles.input}
        />
      </div>

      <AllocationFieldError id={errorId} message={error} />
    </div>
  );
}
