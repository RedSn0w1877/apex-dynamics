"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Glyph } from "@/components/ui/glyph";
import { sitePath } from "@/lib/base-path";
import { CHECKPOINTS, RIDGE_H, RIDGE_W, elevToY, kmToX, ridgePoints } from "@/lib/course";
import { TELEMETRY, TELEMETRY_MAX_KM } from "@/lib/telemetry-data";
import { startAnchorGlide } from "./anchor-glide";
import { startRunner } from "./runner-timeline";
import styles from "./course-strip.module.css";

/*
 * The nav is the course: the whole page drawn as the 30 km profile, with a volt
 * runner dot that travels it as you scroll and CP ticks that jump to their
 * sections. Never hides, condenses or collapses into a hamburger. Every piece
 * is server-rendered (the dot starts at km 0), so it reads fine without JS.
 */

const POINTS = ridgePoints(RIDGE_W, RIDGE_H);
const STATUS = ["Start", "CP1 · Stride", "CP2 · Inside", "CP3 · Wind", "CP4 · Bib", "Finish"];
const CP_NAMES = ["Stride", "Inside the shoe", "Wind", "Pin on your bib"];

function Course() {
  const [stop, setStop] = useState(0);
  const profile = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLSpanElement>(null);
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const bib = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!profile.current || !dot.current || !outer.current || !inner.current) return;
    return startRunner({ profile: profile.current, dot: dot.current, outer: outer.current, inner: inner.current }, setStop);
  }, []);

  useEffect(() => startAnchorGlide(), []);

  /*
   * One bib action per screen: the strip's tag steps aside while the hero's own bib button
   * or the bib form itself is on screen (below the strip), and comes back once neither is.
   * Without JS the tag simply stays (the hidden state lives under html.js).
   */
  useEffect(() => {
    const tag = bib.current;
    const targets = [document.querySelector('#start a[href="#bib"]'), document.getElementById("bib")].filter(
      (el): el is Element => el !== null,
    );
    if (!tag || !targets.length) return;
    const strip = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--strip")) || 56;
    const showing = new Set<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) showing.add(e.target);
          else showing.delete(e.target);
        }
        tag.toggleAttribute("data-shown", showing.size === 0);
      },
      { rootMargin: `-${Math.round(strip)}px 0px 0px 0px` },
    );
    for (const t of targets) io.observe(t);
    return () => io.disconnect();
  }, []);

  return (
    <header className={styles.strip}>
      <nav aria-label="Course" className={styles.nav}>
        <a href="#start" aria-label="Apex Dynamics, back to the start" className={`t-display ${styles.mark}`}>
          APEX
        </a>
        {/* Says what the line is before anyone has to decode it. */}
        <p aria-hidden="true" className={`t-label ${styles.legend}`}>
          The course
          <span>{`${TELEMETRY_MAX_KM} km, ${CHECKPOINTS.length} checkpoints`}</span>
        </p>
        <div ref={profile} className={styles.profile}>
          <svg aria-hidden="true" viewBox={`0 0 ${RIDGE_W} ${RIDGE_H}`} preserveAspectRatio="none" className={styles.line}>
            <polyline points={POINTS} />
          </svg>
          <div ref={outer} aria-hidden="true" className={styles.outer}>
            <div ref={inner} className={styles.inner}>
              <svg viewBox={`0 0 ${RIDGE_W} ${RIDGE_H}`} preserveAspectRatio="none" className={styles.run}>
                <polyline points={POINTS} />
              </svg>
            </div>
          </div>
          {CHECKPOINTS.map((c, i) => (
            <a
              key={c.id}
              href={`#${c.id}`}
              aria-label={`Checkpoint ${c.cp}, kilometre ${c.km}: ${CP_NAMES[i]}`}
              aria-current={stop === i + 1 ? "location" : undefined}
              className={styles.cp}
              style={{ "--cx": `${(kmToX(c.km) * 100).toFixed(2)}%`, "--cy": elevToY(TELEMETRY[c.km].elevationM).toFixed(3) } as CSSProperties}
            >
              <span className={styles.tick} />
              <span className={`t-label ${styles.cpl}`}>
                {`CP${c.cp}`}
                <span className={styles.cpName}>{` · ${c.label}`}</span>
              </span>
            </a>
          ))}
          <span ref={dot} aria-hidden="true" className={styles.dot} />
        </div>
        <p aria-hidden="true" className={`t-label ${styles.status}`}>
          {STATUS[stop]}
        </p>
        <a ref={bib} href="#bib" className={`t-display ${styles.bib}`}>
          <span>Get your bib</span>
        </a>
      </nav>
    </header>
  );
}

/** Legal pages: the strip collapses to the wordmark and a way back to the start line. */
function LegalStrip() {
  return (
    <header className={styles.strip}>
      <nav aria-label="Course" className={styles.legal}>
        <span className={`t-display ${styles.mark}`}>APEX</span>
        <a href={sitePath("/")} className={`t-label ${styles.back}`}>
          <Glyph name="left" />
          back to the start line
        </a>
      </nav>
    </header>
  );
}

export function CourseStrip({ variant = "course" }: { variant?: "course" | "legal" }) {
  return variant === "legal" ? <LegalStrip /> : <Course />;
}
