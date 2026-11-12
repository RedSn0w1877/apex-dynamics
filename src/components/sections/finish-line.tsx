"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { FinishTime } from "@/components/course/finish-time";
import { Ridge } from "@/components/course/ridge";
import { Glyph } from "@/components/ui/glyph";
import { sitePath } from "@/lib/base-path";
import { COPYRIGHT_NOTICE } from "@/lib/copyright";
import { FINISH } from "@/lib/course";
import styles from "./finish-line.module.css";

/**
 * The footer is the finish line: the course ridge runs out into a volt band,
 * then the time this visit took, the way back, the legal links and the race's
 * fine print. On the legal pages `onHome` is false: no course clock, and "back
 * to the start line" goes home. Plain links (lib/base-path.ts sitePath explains why
 * not next/link).
 *
 * A client component with no state of its own: it is still rendered into the
 * static HTML (and reads fine without JS), but a server component's markup is
 * paid twice, in the HTML and again in the RSC payload, and this one is mostly
 * static markup. React hydrates server-component markup as host elements either
 * way, so this only adds the component call itself.
 */
export function FinishLine({ onHome = true }: { onHome?: boolean }) {
  return (
    <footer id="finish" className={styles.finish}>
      <Ridge variant="finish" className={styles.ridge} />
      <div className={`on-light ${styles.band}`}>
        <p className={`t-display ${styles.bandText}`}>
          <span aria-hidden="true">
            {`FINISH · ${FINISH.km} KM · `}
            <Glyph name="climb" />
            {` ${FINISH.climbM} M`}
          </span>
          <span className="vh">{`Finish: ${FINISH.km} kilometres, ${FINISH.climbM} metres climbed.`}</span>
        </p>
      </div>
      <div className={styles.below}>
        {onHome && <FinishTime className={`t-label ${styles.time}`} />}
        <ul className={styles.links}>
          <li>
            {onHome ? (
              <a href="#start" className={`t-label ${styles.link}`}>
                Back to the start line
                <Glyph name="up" />
              </a>
            ) : (
              <a href={sitePath("/")} className={`t-label ${styles.link}`}>
                Back to the start line
                <Glyph name="up" />
              </a>
            )}
          </li>
          <li>
            <a href={sitePath("/legal/terms")} className={`t-label ${styles.link}`}>
              Terms
            </a>
          </li>
          <li>
            <a href={sitePath("/legal/privacy")} className={`t-label ${styles.link}`}>
              Privacy
            </a>
          </li>
        </ul>
        <p className={styles.note}>
          Apex Dynamics is a fictional brand; Prototype 04 is a concept and every figure is simulated.
        </p>
        <p className={`t-label ${styles.copy}`}>{COPYRIGHT_NOTICE}</p>
      </div>
    </footer>
  );
}
