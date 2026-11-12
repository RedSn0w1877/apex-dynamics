// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import type { CSSProperties, Ref } from "react";
import { SPONSOR_LINE } from "@/lib/copyright";
import { RIDGE_H, RIDGE_W, ridgePoints } from "@/lib/course";
import {
  PIN_BOX,
  PIN_CLASP,
  PIN_COIL,
  PIN_WIRE,
  bibCode,
  bibLabel,
  bibLineText,
  bibName,
  weightLine,
  type Distance,
  type Size,
} from "./bib-data";
import styles from "./bib-card.module.css";

/*
 * The field-test bib, live: white Tyvek rotated -3°, four pin holes, the volt
 * band, the name, the wave line, the big wave·size code, the course profile and
 * the perforated timing tab with the sponsor line (the race's fine print, HVNF's notice).
 *
 * Everything is sized in container units, so the bib is one printed object
 * that scales with its column, and a long name shrinks to fit (--len). It is a
 * single image to assistive tech (role="img"), with a sentence for a name. No
 * hooks: it renders on the server and re-renders as the visitor types.
 */

type BibCardProps = {
  name: string;
  distance: Distance;
  size: Size;
  pinned: boolean;
  /** The stamp has landed (its entrance animation ended): the moment for the confetti. */
  onStamped?: () => void;
  ref?: Ref<HTMLDivElement>;
};

const HOLES = [0, 1, 2, 3] as const;
const COURSE = ridgePoints(RIDGE_W, RIDGE_H);

function SafetyPin() {
  return (
    <svg className={styles.pin} viewBox={`0 0 ${PIN_BOX.w} ${PIN_BOX.h}`} aria-hidden="true">
      <path d={PIN_WIRE} className={styles.wire} />
      <path d={PIN_COIL} className={styles.wire} />
      <path d={PIN_CLASP} className={styles.clasp} />
    </svg>
  );
}

export function BibCard({ name, distance, size, pinned, onStamped, ref }: BibCardProps) {
  const shown = bibName(name);
  return (
    <div
      ref={ref}
      role="img"
      aria-label={bibLabel(name, distance, size, pinned)}
      className={`on-light ${styles.card}`}
      data-pinned={pinned ? "" : undefined}
    >
      <div className={styles.face}>
        {HOLES.map((i) => (
          <span key={i} className={styles.hole} style={{ "--i": i } as CSSProperties}>
            {pinned && <SafetyPin />}
          </span>
        ))}

        <p className={`t-label ${styles.band}`}>FIELD TEST 2026 · PROTOTYPE 04</p>

        <p
          className={`t-display ${styles.name}`}
          data-blank={name.trim() ? undefined : ""}
          style={{ "--len": Math.max(shown.length, 9) } as CSSProperties}
        >
          {shown}
        </p>
        <p className={`t-label ${styles.line}`}>{bibLineText(distance, size)}</p>

        <p className={`t-display ${styles.code}`}>{bibCode(distance.wave, size)}</p>

        {/* The course you're entered on, printed like a race bib's profile: the same 30 km line as the page. */}
        <svg className={styles.course} viewBox={`0 0 ${RIDGE_W} ${RIDGE_H}`} preserveAspectRatio="none" aria-hidden="true">
          <polyline points={COURSE} />
        </svg>

        {pinned && (
          <p className={`t-display ${styles.stamp}`} onAnimationEnd={onStamped}>
            Registered
          </p>
        )}

        <div className={styles.tab}>
          {/* No viewBox: user units are pixels, so the 2 6 perforation never stretches. */}
          <svg className={styles.perf} aria-hidden="true">
            <line x1="0" y1="1" x2="100%" y2="1" />
          </svg>
          <p className={`t-label ${styles.weight}`}>{weightLine(size)}</p>
          <p className={styles.sponsor}>{SPONSOR_LINE}</p>
        </div>
      </div>
    </div>
  );
}
