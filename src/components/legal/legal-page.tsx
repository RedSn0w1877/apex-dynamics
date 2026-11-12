// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import type { ReactNode } from "react";
import { CourseStrip } from "@/components/course/course-strip";
import { FinishLine } from "@/components/sections/finish-line";
import styles from "./legal-page.module.css";

export type LegalSection = { heading: string; body: ReactNode };

export function LegalPage({ title, updated, sections }: { title: string; updated: string; sections: LegalSection[] }) {
  return (
    <>
      <a href="#main" className="skip">
        Skip to content
      </a>
      <CourseStrip variant="legal" />
      <main id="main" className={styles.main}>
        <h1 className={`t-label ${styles.h1}`}>{title}</h1>
        <p className={`t-label ${styles.updated}`}>Last updated {updated}</p>
        <div className={styles.sections}>
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className={`t-label ${styles.h2}`}>{section.heading}</h2>
              <div className={styles.body}>{section.body}</div>
            </section>
          ))}
        </div>
      </main>
      <FinishLine onHome={false} />
    </>
  );
}
