// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { Glyph } from "@/components/ui/glyph";
import { TIMING_LINE } from "@/lib/copyright";
import { CHECKPOINTS, climbTo } from "@/lib/course";
import styles from "./checkpoint-gate.module.css";

/**
 * The first child of every middle section: a full-width volt rule, the
 * checkpoint's kilometre and climb (computed from the course data), and the
 * timing line, the race's fine print. The course strip reads `data-cp` to know
 * where each checkpoint starts on the page.
 */
export function CheckpointGate({ cp }: { cp: 1 | 2 | 3 | 4 }) {
  const { km } = CHECKPOINTS[cp - 1];
  const climb = climbTo(km);
  return (
    <div className={styles.gate} data-cp={cp}>
      <p className={`t-display ${styles.head}`}>
        <span aria-hidden="true">
          {`CP${cp} · KM ${km} · `}
          <Glyph name="climb" />
          {` ${climb} M`}
        </span>
        <span className="vh">{`Checkpoint ${cp}: kilometre ${km}, ${climb} metres climbed.`}</span>
      </p>
      <p aria-hidden="true" className={`t-label ${styles.timing}`}>
        {TIMING_LINE}
      </p>
    </div>
  );
}
