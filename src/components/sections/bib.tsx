"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { BibCard } from "@/components/bib/bib-card";
import {
  DEFAULT_DISTANCE,
  DEFAULT_SIZE,
  DISTANCES,
  ERROR_ORDER,
  SIZES,
  distanceById,
  firstName,
  validateBib,
  type BibEntry,
  type BibErrorKey,
  type BibErrors,
  type DistanceId,
  type Size,
} from "@/components/bib/bib-data";
import { CheckpointGate } from "@/components/course/checkpoint-gate";
import { AllocationField, AllocationFieldError } from "@/components/ui/allocation-field";
import { Glyph } from "@/components/ui/glyph";
import { sitePath } from "@/lib/base-path";
import { useHydrated } from "@/lib/use-client-flags";
import styles from "./bib.module.css";

/*
 * CP4 · KM 29 · PIN ON YOUR BIB: the conversion. The bib on the left is drawn
 * live from the form on the right, and pinning it is the whole flow: the stamp
 * lands, the four pins drop in, a short burst of race-coloured confetti, and a
 * confirmation that says plainly that nothing was sent.
 *
 * Privacy by construction: the form has no action, the text inputs have no
 * name, and submit stays disabled until React has hydrated, so without JS an
 * Enter key can't submit anything. Everything lives in this component's state.
 */

const ID: Record<BibErrorKey, string> = { name: "bib-name", email: "bib-email", consent: "bib-consent" };
const ERR = (key: BibErrorKey) => `${ID[key]}-error`;
/** If the stamp's animationend never comes (animations off in the browser), the burst still fires. */
const CONFETTI_FALLBACK_MS = 700;

const INITIAL: BibEntry = { name: "", email: "", distance: DEFAULT_DISTANCE, size: DEFAULT_SIZE, consent: false };

type Status = "editing" | "pinned";

async function fireConfetti(origin: { x: number; y: number }) {
  const { default: confetti } = await import("canvas-confetti");
  confetti({
    particleCount: 90,
    spread: 70,
    origin,
    colors: ["#CCFF00", "#F2F3EC", "#0B0C0A"],
    scalar: 0.9,
    disableForReducedMotion: true,
  });
}

export function Bib() {
  const hydrated = useHydrated();
  const [entry, setEntry] = useState<BibEntry>(INITIAL);
  const [errors, setErrors] = useState<BibErrors>({});
  const [tried, setTried] = useState(false);
  const [shakeToken, setShakeToken] = useState(0);
  const [status, setStatus] = useState<Status>("editing");
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const consentRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const lastConsentShake = useRef(0);
  const confettiDue = useRef(false);

  /** One burst per pin, from the card, at the moment the stamp lands. */
  const burst = useCallback(() => {
    if (!confettiDue.current) return;
    confettiDue.current = false;
    const box = cardRef.current?.getBoundingClientRect();
    const origin = box
      ? { x: (box.left + box.width / 2) / window.innerWidth, y: (box.top + box.height / 2) / window.innerHeight }
      : { x: 0.5, y: 0.6 };
    fireConfetti(origin).catch(() => undefined);
  }, []);
  const focusNameNext = useRef(false);

  const distance = distanceById(entry.distance);
  const pinned = status === "pinned";

  /** Update one field; once a submit has failed, re-check as the visitor fixes things. */
  function update<K extends keyof BibEntry>(key: K, value: BibEntry[K]) {
    const next = { ...entry, [key]: value };
    setEntry(next);
    if (tried) setErrors(validateBib(next));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateBib(entry);
    setErrors(found);
    setTried(true);
    const first = ERROR_ORDER.find((key) => found[key]);
    if (first) {
      setShakeToken((t) => t + 1);
      document.getElementById(ID[first])?.focus();
      return;
    }
    setStatus("pinned");
  }

  // The consent row shakes like the text fields do (one WAAPI run per failed submit).
  useEffect(() => {
    if (shakeToken === lastConsentShake.current) return;
    lastConsentShake.current = shakeToken;
    if (!errors.consent || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    consentRef.current?.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-9px)" },
        { transform: "translateX(7px)" },
        { transform: "translateX(-4px)" },
        { transform: "translateX(2px)" },
        { transform: "translateX(0)" },
      ],
      { duration: 450, easing: "cubic-bezier(.2, .9, .1, 1)" },
    );
  }, [shakeToken, errors.consent]);

  // Pinned: move focus to the confirmation, then (motion and a top-level page only) the confetti.
  useEffect(() => {
    if (!pinned) {
      if (focusNameNext.current) {
        focusNameNext.current = false;
        document.getElementById(ID.name)?.focus();
      }
      return;
    }
    // The form just collapsed into a short confirmation, so bring it into view (below the strip,
    // via scroll-padding), then hand it focus without a second jump.
    doneRef.current?.scrollIntoView({ block: "nearest" });
    doneRef.current?.focus({ preventScroll: true });
    const root = document.documentElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || root.hasAttribute("data-embed")) return;
    // The burst fires when the stamp lands (onStamped); this is only the safety net.
    confettiDue.current = true;
    const timer = window.setTimeout(burst, CONFETTI_FALLBACK_MS);
    return () => {
      window.clearTimeout(timer);
      confettiDue.current = false;
    };
  }, [pinned, burst]);

  async function onSave() {
    setSaving(true);
    setSaveFailed(false);
    try {
      const { saveBibPng } = await import("@/components/bib/bib-png");
      await saveBibPng({ name: entry.name, distance, size: entry.size, pinned: true });
    } catch {
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  }

  function onEdit() {
    focusNameNext.current = true;
    setStatus("editing");
  }

  return (
    <section id="bib" aria-labelledby="bib-title" className={styles.section}>
      <CheckpointGate cp={4} />

      <div className={styles.head}>
        <h2 id="bib-title" className={`t-display t-cp ${styles.title}`}>
          Pin on your bib.
        </h2>
        <div className={styles.intro}>
          <p>Prototype 04 is in field testing. Pin on your bib and we&apos;ll send a pair to run in.</p>
          <p className={styles.price}>
            <strong>Not on sale yet.</strong> Expected price at launch: $250. A field-test bib is free.
          </p>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.bibCol}>
          <div className={styles.sticky}>
            <BibCard
              ref={cardRef}
              name={entry.name}
              distance={distance}
              size={entry.size}
              pinned={pinned}
              onStamped={burst}
            />
          </div>
        </div>

        <div className={styles.formCol}>
          {!pinned && (
            <form noValidate onSubmit={onSubmit} className={styles.form} aria-label="Field-test bib">
              <AllocationField
                id={ID.name}
                errorId={ERR("name")}
                label="Name on the bib"
                value={entry.name}
                onChange={(v) => update("name", v)}
                error={errors.name}
                shakeToken={shakeToken}
                autoComplete="name"
              />
              <AllocationField
                id={ID.email}
                errorId={ERR("email")}
                label="Email for the timing chip"
                value={entry.email}
                onChange={(v) => update("email", v)}
                error={errors.email}
                shakeToken={shakeToken}
                type="email"
                inputMode="email"
                autoComplete="email"
              />

              <fieldset className={styles.group}>
                <legend className={`t-label ${styles.legend}`}>Distance</legend>
                <div className={styles.tiles}>
                  {DISTANCES.map((d) => (
                    <label key={d.id} className={styles.tile}>
                      <input
                        type="radio"
                        name="distance"
                        value={d.id}
                        checked={entry.distance === d.id}
                        onChange={() => update("distance", d.id as DistanceId)}
                        className={styles.radio}
                      />
                      <span className={styles.tileFace}>
                        <span className={`t-display ${styles.tileWord}`}>{d.tile}</span>
                        <span className={`t-label ${styles.tileSub}`}>{d.sub}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className={styles.group} aria-describedby="bib-size-note">
                <legend className={`t-label ${styles.legend}`}>EU size</legend>
                <div className={styles.sizes}>
                  {SIZES.map((s) => (
                    <label key={s} className={styles.size}>
                      <input
                        type="radio"
                        name="size"
                        value={s}
                        checked={entry.size === s}
                        onChange={() => update("size", s as Size)}
                        className={styles.radio}
                      />
                      <span className={`t-display ${styles.sizeFace}`}>{s}</span>
                    </label>
                  ))}
                </div>
                <p id="bib-size-note" className={styles.note}>
                  Runs true to size. Most testers stay in their road size.
                </p>
              </fieldset>

              <div ref={consentRef} className={styles.consent} data-invalid={errors.consent ? "" : undefined}>
                <label className={styles.check}>
                  <input
                    id={ID.consent}
                    type="checkbox"
                    checked={entry.consent}
                    onChange={(e) => update("consent", e.target.checked)}
                    aria-invalid={Boolean(errors.consent)}
                    aria-describedby={errors.consent ? ERR("consent") : undefined}
                    className={styles.checkInput}
                  />
                  <span className={styles.box} aria-hidden="true">
                    <svg viewBox="0 0 12 12">
                      <path d="M2.2 6.4 4.9 9 9.8 3.2" />
                    </svg>
                  </span>
                  <span className={styles.checkText}>
                    I know this is a demo, not a real order, and I&apos;ve read the{" "}
                    <a href={sitePath("/legal/terms")} className={styles.inlineLink}>
                      terms
                    </a>{" "}
                    and{" "}
                    <a href={sitePath("/legal/privacy")} className={styles.inlineLink}>
                      privacy notice
                    </a>
                    .
                  </span>
                </label>
                <AllocationFieldError id={ERR("consent")} message={errors.consent} />
              </div>

              <div className={styles.submitRow}>
                <button type="submit" disabled={!hydrated} className={`t-display ${styles.submit}`}>
                  <span>
                    Pin it on
                    <Glyph name="ne" />
                  </span>
                </button>
                <p className={styles.small}>Portfolio demo. Nothing you type leaves your browser.</p>
                <p className={`${styles.small} ${styles.nojs}`}>Pinning needs JavaScript. Your bib is drawn in your browser.</p>
              </div>
            </form>
          )}

          <div role="status" className={styles.status}>
            {pinned && (
              <div className={styles.done}>
                <h3 ref={doneRef} tabIndex={-1} className={`t-display ${styles.doneTitle}`}>
                  {`You're on the start list, ${firstName(entry.name)}.`}
                </h3>
                <p className={styles.doneText}>
                  On a real field test, your timing-chip email would land in <strong>{entry.email.trim()}</strong> within a
                  day. This is a portfolio demo, so nothing was sent.
                </p>
                <div className={styles.doneActions}>
                  <button type="button" onClick={onSave} disabled={saving} className={`t-display ${styles.submit}`}>
                    <span>
                      Save your bib (PNG)
                      <Glyph name="down" />
                    </span>
                  </button>
                  <button type="button" onClick={onEdit} className={`t-label ${styles.edit}`}>
                    Edit details
                  </button>
                </div>
                {saveFailed && <p className={styles.small}>This browser couldn&apos;t draw the image. Try again, or take a screenshot of your bib.</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
