// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import type { Metadata } from "next";
import { CourseStrip } from "@/components/course/course-strip";
import { FinishLine } from "@/components/sections/finish-line";
import { Glyph } from "@/components/ui/glyph";
import { sitePath } from "@/lib/base-path";
import styles from "@/components/legal/legal-page.module.css";

/*
 * Off course: GitHub Pages serves this for every unknown URL under /apex-dynamics/.
 * Same shell as the legal pages (the collapsed strip, one column, the finish band
 * with the full notice), so a mistyped link still lands inside the race.
 */

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <>
      <a href="#main" className="skip">
        Skip to content
      </a>
      <CourseStrip variant="legal" />
      <main id="main" className={styles.main}>
        <h1 className={`t-label ${styles.h1}`}>Off course.</h1>
        <p className={styles.lead}>This page isn&apos;t on the course. Head back to the start line.</p>
        <a href={sitePath("/")} className={`t-label ${styles.home}`}>
          <Glyph name="left" />
          Back to the start line
        </a>
      </main>
      <FinishLine onHome={false} />
    </>
  );
}
