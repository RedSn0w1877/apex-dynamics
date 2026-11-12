"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { CheckpointGate } from "@/components/course/checkpoint-gate";
import { Ridge } from "@/components/course/ridge";
import { RaceDigits, type RaceDigitsHandle } from "@/components/ui/race-digits";
import { CHECKPOINTS, FINISH, RIDGE_H, RIDGE_W, elevToY, kmToX, ridgePoints } from "@/lib/course";
import { TELEMETRY, TELEMETRY_MAX_KM, TELEMETRY_PEAK, sampleAt, type TelemetrySample } from "@/lib/telemetry-data";
import styles from "./telemetry-hud.module.css";

/*
 * CP1 · KM 6 · STRIDE: run the 30 km course on a full-bleed elevation chart and
 * watch four numbers react to the hills.
 *
 * The render budget is the point of this rewrite:
 *  - The marker and the travelled line move only through --p and --y on the
 *    plot (translate and clip-path, both on the compositor). The position
 *    readout writes its digits straight to the DOM through RaceDigits' ref.
 *  - React state is the km rounded to 0.5, so React renders at most once per
 *    half kilometre (60 times over the whole course) to roll the four readouts.
 *  - One 2.4 s auto-run plays the course when the visitor arrives at the chart
 *    (in view, settled, no scroll in flight), then stops: no loop, no scroll
 *    scrub. Any touch, drag or key takes over.
 *  - The pulse ring animates only under [data-moving], cleared 3 s after the
 *    last move, so an idle chart runs nothing at all.
 * Without JS, everything renders at km 0 (142 / 182 / 182 / 84).
 */

const POINTS = ridgePoints(RIDGE_W, RIDGE_H);
const MAX = TELEMETRY_MAX_KM;
const AUTO_MS = 2400;
const IDLE_MS = 3000;
const AXIS = [0, 10, 20, 30] as const;

const clampKm = (km: number) => Math.min(MAX, Math.max(0, km));
const bucketOf = (km: number) => Math.round(km * 2) / 2;
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
/** The pulse period follows the heart rate, quantised to 6 bpm so it doesn't restart on every bucket. */
const bpmStep = (bpm: number) => Math.round(bpm / 6) * 6;
const elevAt = (km: number) => TELEMETRY[km].elevationM;

const READOUTS = [
  { key: "heartRateBpm", label: "heart rate · beats a minute", format: "000", hero: true },
  { key: "groundContactMs", label: "foot on the ground · milliseconds", format: "000", hero: false },
  { key: "cadenceSpm", label: "steps a minute", format: "000", hero: false },
  { key: "energyReturnPct", label: "energy handed back · %", format: "00", hero: false },
] as const satisfies readonly { key: keyof TelemetrySample; label: string; format: "000" | "00"; hero: boolean }[];

const valueText = (km: number, s: TelemetrySample) =>
  `Kilometre ${km}, ${Math.round(s.elevationM)} metres up, heart rate ${s.heartRateBpm}`;

/** The plot's starting position, written once by React; after that only applyKm touches --p and --y. */
const PLOT_START = { "--p": 0, "--y": elevToY(TELEMETRY[0].elevationM) } as CSSProperties;

const pos = (x: number, y?: number): CSSProperties => {
  const vars: Record<string, number> = { "--x": x };
  if (y !== undefined) vars["--cy"] = y;
  return vars as CSSProperties;
};

export function TelemetryHud() {
  const [bucket, setBucket] = useState(0);
  const reading = sampleAt(bucket);

  const plotRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<HTMLInputElement>(null);
  const kmDigits = useRef<RaceDigitsHandle | null>(null);
  const elevDigits = useRef<RaceDigitsHandle | null>(null);
  const kmRef = useRef(0);
  const bucketRef = useRef(0);
  const engagedRef = useRef(false);
  const rafRef = useRef(0);
  const idleRef = useRef(0);

  const applyKm = useCallback((raw: number) => {
    const km = clampKm(raw);
    kmRef.current = km;
    const sample = sampleAt(km);
    const plot = plotRef.current;
    if (plot) {
      plot.style.setProperty("--p", String(kmToX(km)));
      plot.style.setProperty("--y", String(elevToY(sample.elevationM)));
      plot.setAttribute("data-moving", "");
    }
    kmDigits.current?.update(km);
    elevDigits.current?.update(sample.elevationM);
    if (rangeRef.current) rangeRef.current.value = String(km);

    window.clearTimeout(idleRef.current);
    idleRef.current = window.setTimeout(() => plotRef.current?.removeAttribute("data-moving"), IDLE_MS);

    const next = bucketOf(km);
    if (next !== bucketRef.current) {
      bucketRef.current = next;
      setBucket(next);
    }
  }, []);

  /** The visitor's hands win: stop the auto-run for good. */
  const takeOver = useCallback(() => {
    engagedRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }, []);

  /*
   * The one auto-run belongs to the visitor's first real arrival, not to the first pixel
   * of overlap. It starts once the chart is three-quarters in view, has stayed there
   * 300 ms, and no scroll is in flight (a smooth anchor jump flying past #stride, or a
   * fast wheel, never spends it). If the visitor leaves before it finishes, it resets
   * to km 0 and re-arms; once it has played to the end, or the visitor's hands take
   * over, it is done for good. Skipped under reduced motion.
   */
  useEffect(() => {
    const target = plotRef.current;
    if (!target || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let inView = false;
    let dwell = 0;
    let lastScroll = 0;
    let done = false;
    const DWELL_MS = 300;
    const QUIET_MS = 150;

    const onScroll = () => {
      lastScroll = performance.now();
    };
    const stop = () => {
      done = true;
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(dwell);
    };
    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        if (engagedRef.current) return stop();
        const t = Math.min(1, (now - start) / AUTO_MS);
        applyKm(easeInOutCubic(t) * MAX);
        if (t < 1) rafRef.current = requestAnimationFrame(tick);
        else {
          rafRef.current = 0;
          stop();
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    };
    const tryStart = () => {
      dwell = 0;
      if (done || !inView || rafRef.current) return;
      if (engagedRef.current) return stop();
      const since = performance.now() - lastScroll;
      if (since < QUIET_MS) {
        dwell = window.setTimeout(tryStart, QUIET_MS - since);
        return;
      }
      run();
    };
    const io = new IntersectionObserver(
      (entries) => {
        const on = entries.some((e) => e.isIntersecting);
        if (on && !inView) {
          inView = true;
          dwell = window.setTimeout(tryStart, DWELL_MS);
        } else if (!on && inView) {
          inView = false;
          window.clearTimeout(dwell);
          // Left mid-run without touching it: back to the start line, ready for a real arrival.
          if (rafRef.current && !engagedRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = 0;
            applyKm(0);
          }
        }
      },
      { threshold: 0.75 },
    );
    window.addEventListener("scroll", onScroll, { passive: true });
    io.observe(target);
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(dwell);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.clearTimeout(idleRef.current);
    };
  }, [applyKm]);

  const fromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    applyKm(((event.clientX - box.left) / box.width) * MAX);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    takeOver();
    event.currentTarget.setPointerCapture(event.pointerId);
    fromPointer(event);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) fromPointer(event);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 5 : 1;
    const km = kmRef.current;
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") next = km + step;
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = km - step;
    else if (event.key === "PageUp") next = km + 5;
    else if (event.key === "PageDown") next = km - 5;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = MAX;
    if (next === null) return;
    event.preventDefault();
    takeOver();
    // Keys land on whole kilometres, so the readouts and the spoken value always agree.
    applyKm(Math.round(next));
  };

  const onRange = (event: FormEvent<HTMLInputElement>) => {
    takeOver();
    applyKm(Number(event.currentTarget.value));
  };

  return (
    <section id="stride" aria-labelledby="stride-title" className={styles.stride}>
      <CheckpointGate cp={1} />

      <div className={styles.head}>
        <h2 id="stride-title" className={`t-display t-cp ${styles.title}`}>
          What 30 km of hills does to you.
        </h2>
        <div className={styles.intro}>
          <p>
            {`A simulated 30 km trail run with ${FINISH.climbM} m of climbing. Drag the runner along the course and watch the hills go to work: heart rate climbs, each foot stays down longer, steps get shorter, and the plate keeps handing energy back.`}
          </p>
          <p className={styles.hint}>Drag or click the chart, or use the arrow keys. Shift jumps 5 km.</p>
        </div>
      </div>

      <div className={styles.chart}>
        <div className={styles.band}>
          <p aria-hidden="true" className={`t-display ${styles.pos}`}>
            <RaceDigits ref={kmDigits} value={0} format="00.0" />
            <span className={styles.unit}>km</span>
            <span className={styles.sep}>·</span>
            <RaceDigits ref={elevDigits} value={0} format="000" />
            <span className={styles.unit}>m</span>
          </p>
          <p className={`t-label ${styles.peak}`} style={pos(kmToX(TELEMETRY_PEAK.km))}>
            {`High point · ${TELEMETRY_PEAK.elevationM} m`}
          </p>
        </div>

        <div
          ref={plotRef}
          className={styles.plot}
          style={{ ...PLOT_START, "--bpm": bpmStep(reading.heartRateBpm) } as CSSProperties}
          role="slider"
          tabIndex={0}
          aria-label="Position on the 30 km course"
          aria-valuemin={0}
          aria-valuemax={MAX}
          aria-valuenow={bucket}
          aria-valuetext={valueText(bucket, reading)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onKeyDown={onKeyDown}
        >
          <Ridge variant="chart" className={styles.ridge} />

          {/* The run so far: the same polyline in volt, revealed up to the marker. */}
          <div aria-hidden="true" className={styles.travel}>
            <svg viewBox={`0 0 ${RIDGE_W} ${RIDGE_H}`} preserveAspectRatio="none">
              <polygon points={`${POINTS} ${RIDGE_W},${RIDGE_H} 0,${RIDGE_H}`} className={styles.travelFill} />
              <polyline points={POINTS} className={styles.travelLine} />
            </svg>
          </div>

          <span aria-hidden="true" className={styles.leader} style={pos(kmToX(TELEMETRY_PEAK.km), elevToY(TELEMETRY_PEAK.elevationM))} />

          {CHECKPOINTS.map((c) => (
            <span key={c.id} aria-hidden="true" className={styles.cp} style={pos(kmToX(c.km), elevToY(elevAt(c.km)))}>
              <span className={`t-label ${styles.cpLabel}`}>{`CP${c.cp}`}</span>
            </span>
          ))}

          <div aria-hidden="true" className={styles.mx}>
            <span className={styles.dash} />
            <div className={styles.my}>
              <span className={styles.pulse} />
              <span className={styles.dot} />
            </div>
          </div>
        </div>

        <div aria-hidden="true" className={styles.axis}>
          {AXIS.map((km) => (
            <span key={km} className={`t-label ${styles.tick}`} style={pos(kmToX(km))}>{`${km} km`}</span>
          ))}
        </div>

        {/* A drag handle for pointers only: the chart above is the one accessible slider. */}
        <input
          ref={rangeRef}
          type="range"
          min={0}
          max={MAX}
          step={0.1}
          defaultValue={0}
          tabIndex={-1}
          aria-hidden="true"
          onInput={onRange}
          className={styles.range}
        />
      </div>

      <dl className={styles.readouts}>
        {READOUTS.map((r) => (
          <div key={r.key} className={r.hero ? `${styles.readout} ${styles.hero}` : styles.readout}>
            <dt className={`t-label ${styles.label}`}>{r.label}</dt>
            <dd className={styles.value}>
              <RaceDigits value={reading[r.key]} format={r.format} />
            </dd>
          </div>
        ))}
      </dl>

      <p className={styles.note}>Simulated data. Not a real athlete&apos;s file.</p>
    </section>
  );
}
