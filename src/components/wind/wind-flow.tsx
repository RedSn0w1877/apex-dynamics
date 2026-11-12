"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "@/components/sections/wind-tunnel.module.css";
import { RaceDigits } from "@/components/ui/race-digits";
import { prefersReducedMotion } from "@/lib/device";
import {
  DEFAULT_WIND_SPEED,
  WIND_SPEEDS,
  WRY_LINES,
  wattsSavedPerPair,
  type WindSpeedKey,
} from "@/lib/wind-tunnel-data";

/*
 * CP3 · Wind, the island. Holds the air speed, and with it the watts and the
 * wry line. The streamlines are generated data (tools/assets/streamlines.mjs)
 * fetched by dynamic import a viewport ahead, so they never sit in the HTML or
 * the first bundle; without JS the still and the copy stand on their own.
 *
 * The flow is the whole animation budget: when the figure comes into view, and
 * again on each speed change, the streamline group is re-keyed so its dashes
 * run exactly 6 s and stop (keyframes per speed in wind-tunnel.module.css). The
 * travel is a whole number of dash periods, so the dashes come to rest exactly
 * where they started: nothing jumps and nothing keeps running. Reduced motion
 * and lite devices: no flow at all, just the dashes.
 */

type Props = {
  /** The wind still (a <picture>), drawn under the streamlines in the same 1600 x 560 frame. */
  still: ReactNode;
  /** The two static drag rules, rendered on the server. */
  bars: ReactNode;
};

type Streamlines = { viewBox: string; paths: readonly string[] };

/**
 * Each line starts its dashes at its own point in the 36-unit period (a golden-ratio walk),
 * so neighbouring lines never line their dashes up into vertical columns. The phase is baked
 * into the dasharray itself ("0, gap, 14, rest": a zero dash, then the 14-unit dash shifted
 * by `gap`), so the CSS keyframes stay static and Chrome never resolves a var() per frame.
 */
const dashes = (i: number) => {
  const gap = (i * 0.618034 * 22) % 22;
  return `0 ${gap.toFixed(1)} 14 ${(22 - gap).toFixed(1)}`;
};

export function WindFlow({ still, bars }: Props) {
  const [speed, setSpeed] = useState<WindSpeedKey>(DEFAULT_WIND_SPEED);
  const [lines, setLines] = useState<Streamlines | null>(null);
  /** 0 = never run; each increment re-keys the group, which restarts its one 6 s run. */
  const [run, setRun] = useState(0);
  const figureRef = useRef<HTMLDivElement>(null);

  // Fetch the streamlines a viewport ahead.
  useEffect(() => {
    const figure = figureRef.current;
    if (!figure) return;
    let cancelled = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        import("./streamlines.data")
          .then((m) => {
            if (!cancelled) setLines(m.STREAMLINES);
          })
          .catch(() => {
            /* No streamlines: the still and the numbers carry the section. */
          });
      },
      { rootMargin: "100% 0px" },
    );
    io.observe(figure);
    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, []);

  // The first run, once the figure is a third in view.
  useEffect(() => {
    const figure = figureRef.current;
    if (!figure || prefersReducedMotion()) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        setRun((r) => (r === 0 ? 1 : r));
      },
      { threshold: 0.35 },
    );
    io.observe(figure);
    return () => io.disconnect();
  }, []);

  const choose = (next: WindSpeedKey) => {
    setSpeed(next);
    if (!prefersReducedMotion()) setRun((r) => r + 1);
  };

  const watts = wattsSavedPerPair(speed);
  const viewBox = lines?.viewBox ?? "0 0 1600 560";

  return (
    <>
      <div ref={figureRef} className={styles.figure}>
        {still}
        <svg className={styles.lines} viewBox={viewBox} aria-hidden="true" focusable="false">
          {lines && lines.paths.length > 0 && (
            <g key={run} className={run > 0 ? styles.flow : undefined} data-speed={speed}>
              {lines.paths.map((d, i) => (
                <path key={i} d={d} strokeDasharray={dashes(i)} />
              ))}
            </g>
          )}
        </svg>
      </div>

      <div className={styles.panel}>
        <div className={styles.controls}>
          <fieldset className={styles.speeds}>
            <legend className={`t-label ${styles.legend}`}>Air speed</legend>
            <div className={styles.tiles}>
              {WIND_SPEEDS.map((k) => (
                <label key={k} className={styles.tile}>
                  <input
                    className="vh"
                    type="radio"
                    name="wind-speed"
                    value={k}
                    checked={speed === k}
                    onChange={() => choose(k)}
                  />
                  <span className={styles.tileFace}>
                    <span className={`t-display ${styles.tileNum}`}>{k}</span>
                    <span className={`t-label ${styles.tileUnit}`}>km/h</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {bars}
        </div>

        <div className={styles.result} aria-live="polite" aria-atomic="true">
          <p className={`t-display ${styles.watts}`}>
            <RaceDigits value={watts} format="0.0" />
            <span className={styles.unit}>W</span>
          </p>
          <p className={`t-label ${styles.wattsLabel}`}>{`saved per pair at ${speed} km/h · illustrative`}</p>
          <p className={`t-label ${styles.wry}`}>{WRY_LINES[speed]}</p>
        </div>
      </div>
    </>
  );
}
