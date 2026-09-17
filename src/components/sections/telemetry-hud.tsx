"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { motion, useReducedMotion } from "motion/react";
import { LogMark } from "@/components/brand/log-mark";
import { Reveal } from "@/components/ui/reveal";
import { TelemetryPulse } from "@/components/ui/telemetry-pulse";
import { TelemetryReadout } from "@/components/ui/telemetry-readout";
import { gsap, useGSAP, type ScrollTrigger } from "@/lib/gsap";
import { TELEMETRY, TELEMETRY_MAX_ELEVATION, TELEMETRY_MAX_KM, TELEMETRY_PEAK, sampleAt } from "@/lib/telemetry-data";

const VIEW_W = 1000;
const VIEW_H = 280;
const PAD_TOP = 30;
const PAD_BOTTOM = 52;

function elevationToY(elevationM: number): number {
  const usable = VIEW_H - PAD_TOP - PAD_BOTTOM;
  return VIEW_H - PAD_BOTTOM - (elevationM / TELEMETRY_MAX_ELEVATION) * usable;
}

function kmToX(km: number): number {
  return (km / TELEMETRY_MAX_KM) * VIEW_W;
}

/** Horizontal reference altitudes, so the ridgeline reads as a measured chart. */
const ELEVATION_BANDS = [0, 100, 200, 300, 400];
const KM_TICKS = [0, 5, 10, 15, 20, 25, 30];

/**
 * `sensitivity` = the change that counts as "a lot" for this metric, used to
 * normalise the glow so a 4 bpm jump and a 4% energy swing don't flash alike.
 */
const READOUTS = [
  { key: "heartRateBpm", label: "Heart rate", unit: "bpm", sensitivity: 6 },
  { key: "groundContactMs", label: "Foot on ground", unit: "ms", sensitivity: 6 },
  { key: "cadenceSpm", label: "Step rate", unit: "/min", sensitivity: 5 },
  { key: "energyReturnPct", label: "Energy returned", unit: "%", sensitivity: 3 },
] as const;

const PEAK = TELEMETRY_PEAK;

export function TelemetryHud() {
  const [km, setKm] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const routeRef = useRef<SVGPathElement>(null);
  const ruleRef = useRef<HTMLSpanElement>(null);

  // Once the visitor scrubs for themselves, scrolling stops moving the marker
  // under their hands. Refs, not state — this must not cause a re-render.
  const engagedRef = useRef(false);
  const autoScrubRef = useRef<ScrollTrigger | null>(null);

  const reduce = useReducedMotion();
  const reading = useMemo(() => sampleAt(km), [km]);

  const pathD = useMemo(() => {
    // Smooth Catmull-Rom spline for buttery-smooth elevation curves
    const points = TELEMETRY.map((sample) => ({ x: kmToX(sample.km), y: elevationToY(sample.elevationM) }));

    if (points.length < 2) return "";
    if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

    // Build smooth curve using cubic Bézier interpolation
    let path = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(i - 1, 0)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(i + 2, points.length - 1)];

      // Catmull-Rom to Bézier control point conversion
      // Tension = 0.5 for smooth, natural curves
      const tension = 0.5;
      const cp1x = p1.x + (p2.x - p0.x) / 6 * tension;
      const cp1y = p1.y + (p2.y - p0.y) / 6 * tension;
      const cp2x = p2.x - (p3.x - p1.x) / 6 * tension;
      const cp2y = p2.y - (p3.y - p1.y) / 6 * tension;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    return path;
  }, []);

  const areaD = useMemo(() => `${pathD} L ${VIEW_W} ${VIEW_H - PAD_BOTTOM} L 0 ${VIEW_H - PAD_BOTTOM} Z`, [pathD]);

  useGSAP(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Draw the ridgeline on first sight. The path is already complete in the
    // DOM — GSAP is what briefly hides it — so no-JS still renders the chart.
    const route = routeRef.current;
    if (route) {
      const length = route.getTotalLength();
      gsap.fromTo(
        route,
        { strokeDasharray: length, strokeDashoffset: length },
        {
          strokeDashoffset: 0,
          duration: 1.6,
          ease: "power2.inOut",
          clearProps: "strokeDasharray,strokeDashoffset",
          scrollTrigger: { trigger: section, start: "top 80%", once: true },
        },
      );
    }

    // Decorative underline wipe on the heading's accent phrase.
    if (ruleRef.current) {
      gsap.from(ruleRef.current, {
        scaleX: 0,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: section, start: "top 78%", once: true },
      });
    }

    // The run plays itself as the section crosses the viewport, so the HUD is
    // already alive before anyone touches it. GSAP scrubs a plain proxy object
    // and we quantise before hitting state, so a scroll frame that doesn't move
    // the readout doesn't cost a render.
    const proxy = { km: 0 };
    const auto = gsap.to(proxy, {
      km: TELEMETRY_MAX_KM,
      ease: "none",
      scrollTrigger: {
        trigger: section,
        start: "top 68%",
        end: "bottom 62%",
        scrub: 0.6,
      },
      onUpdate: () => {
        if (engagedRef.current) return;
        setKm(Math.round(proxy.km * 20) / 20);
      },
    });
    autoScrubRef.current = auto.scrollTrigger ?? null;
  }, []);

  /** Hand control to the visitor and stop the scroll from fighting them. */
  const takeOver = useCallback(() => {
    if (engagedRef.current) return;
    engagedRef.current = true;
    autoScrubRef.current?.kill();
    autoScrubRef.current = null;
  }, []);

  const scrubFromPointer = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    takeOver();
    const rect = svg.getBoundingClientRect();
    const fraction = (event.clientX - rect.left) / rect.width;
    setKm(Math.min(Math.max(fraction, 0), 1) * TELEMETRY_MAX_KM);
  }, [takeOver]);

  const onKeyDown = useCallback((event: ReactKeyboardEvent<SVGSVGElement>) => {
    const step = event.shiftKey ? 5 : 1;
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") next = km + step;
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = km - step;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = TELEMETRY_MAX_KM;
    if (next === null) return;
    event.preventDefault();
    takeOver();
    setKm(Math.min(TELEMETRY_MAX_KM, Math.max(0, next)));
  }, [km, takeOver]);

  const markerX = kmToX(reading.km);
  const markerY = elevationToY(reading.elevationM);
  const peakX = kmToX(TELEMETRY_PEAK.km);
  const peakY = elevationToY(TELEMETRY_PEAK.elevationM);
  const baseY = VIEW_H - PAD_BOTTOM;

  // Quantised so the ring doesn't restart its loop on every scrub frame.
  const beatSeconds = 60 / Math.max(40, Math.round(reading.heartRateBpm / 6) * 6);

  return (
    <section ref={sectionRef} id="telemetry" className="border-b border-gridline">
      <div className="mx-auto max-w-[1440px] px-5 py-20 md:px-10 md:py-28">
        <LogMark log="02" title="Stride HUD — 30 km trail effort" />

        <div className="mt-10 grid gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <h2 className="font-display text-4xl italic font-black uppercase leading-[0.9] tracking-tighter text-chalk md:text-5xl">
              What 30 km does to{" "}
              <span className="relative inline-block text-volt">
                your stride.
                <span ref={ruleRef} aria-hidden className="absolute -bottom-1 left-0 h-[3px] w-full origin-left bg-volt" />
              </span>
            </h2>
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-chalk/65">
              This is a real 30 km test run. Drag across the hills to move through it and watch what the climbs do
              to a runner: heart rate climbs, each foot stays on the ground longer, steps get shorter — and the
              plate keeps handing energy back.
            </p>
            <p className="mt-4 max-w-sm font-mono text-[10px] uppercase leading-relaxed tracking-[0.18em] text-chalk/40">
              Scroll to play the run — drag, or use the arrow keys, to take the controls.
            </p>
          </Reveal>

          <div className="lg:col-span-8">
            <div className="border border-gridline bg-carbon p-4 md:p-6">
              <div className="mb-4 flex items-center justify-between gap-4 border-b border-gridline pb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-chalk/50">
                <span className="flex items-center gap-2">
                  <TelemetryPulse bpm={reading.heartRateBpm} />
                  Live stride trace
                </span>
                <span className="text-chalk">
                  {reading.km.toFixed(1)} km · {reading.elevationM.toFixed(0)} m
                </span>
              </div>

              <svg
                ref={svgRef}
                viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                className="w-full cursor-crosshair touch-none"
                role="slider"
                aria-label="Scrub route position"
                aria-valuemin={0}
                aria-valuemax={TELEMETRY_MAX_KM}
                aria-valuenow={Math.round(reading.km)}
                aria-valuetext={`${reading.km.toFixed(1)} kilometers, ${reading.elevationM.toFixed(0)} meters elevation`}
                tabIndex={0}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  scrubFromPointer(e);
                }}
                onPointerMove={(e) => {
                  if (e.buttons !== 1 && e.pointerType !== "touch") return;
                  scrubFromPointer(e);
                }}
                onKeyDown={onKeyDown}
              >
                <defs>
                  <style>{`.telemetry-axis{fill:#52525b;font-family:ui-monospace,monospace;font-size:11px;letter-spacing:.14em}`}</style>

                  {/* Untravelled route: barely-there fill. */}
                  <linearGradient id="telemetry-elevation-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f5f5f5" stopOpacity="0.09" />
                    <stop offset="100%" stopColor="#f5f5f5" stopOpacity="0" />
                  </linearGradient>

                  {/* Travelled route: the volt trail burning in behind the marker. */}
                  <linearGradient id="telemetry-trail-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ccff00" stopOpacity="0.38" />
                    <stop offset="100%" stopColor="#ccff00" stopOpacity="0" />
                  </linearGradient>

                  <filter id="telemetry-glow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="3.5" result="telemetry-blur" />
                    <feMerge>
                      <feMergeNode in="telemetry-blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  {/* Everything left of the marker counts as "run so far". */}
                  <clipPath id="telemetry-progress">
                    <rect x={0} y={0} width={Math.max(markerX, 0)} height={VIEW_H} />
                  </clipPath>
                </defs>

                {/* Altitude reference bands */}
                {ELEVATION_BANDS.map((band) => (
                  <g key={band}>
                    <line x1={0} y1={elevationToY(band)} x2={VIEW_W} y2={elevationToY(band)} stroke="#1f1f23" strokeWidth={1} />
                    <text x={8} y={elevationToY(band) - 6} className="telemetry-axis">
                      {band} m
                    </text>
                  </g>
                ))}

                {/* Distance ticks */}
                {KM_TICKS.map((tick) => (
                  <g key={tick}>
                    <line x1={kmToX(tick)} y1={baseY} x2={kmToX(tick)} y2={baseY + 8} stroke="#2a2a30" strokeWidth={1} />
                    <text
                      x={kmToX(tick)}
                      y={baseY + 26}
                      textAnchor={tick === 0 ? "start" : tick === TELEMETRY_MAX_KM ? "end" : "middle"}
                      className="telemetry-axis"
                    >
                      {tick} km
                    </text>
                  </g>
                ))}

                {/* Full route, drawn faint */}
                <path d={areaD} fill="url(#telemetry-elevation-fill)" />
                <path ref={routeRef} d={pathD} fill="none" stroke="#f5f5f5" strokeWidth={2} strokeOpacity={0.45} />

                {/* The part already run, lit up */}
                <g clipPath="url(#telemetry-progress)">
                  <path d={areaD} fill="url(#telemetry-trail-fill)" />
                  <path d={pathD} fill="none" stroke="#ccff00" strokeWidth={2.5} filter="url(#telemetry-glow)" />
                </g>

                {/* High point of the course */}
                <circle cx={peakX} cy={peakY} r={2.5} fill="#f5f5f5" fillOpacity={0.8} />
                <text x={peakX} y={peakY - 12} textAnchor="middle" className="telemetry-axis" fill="#f5f5f5">
                  HIGH POINT {PEAK.elevationM} m
                </text>

                {/* Current position */}
                <line x1={markerX} y1={0} x2={markerX} y2={baseY} stroke="#ccff00" strokeWidth={1} strokeOpacity={0.5} strokeDasharray="4 4" />
                {!reduce && (
                  <motion.circle
                    cx={markerX}
                    cy={markerY}
                    // Static `r` so the element is always valid SVG. Animating an
                    // attribute that has no base value renders `r="undefined"`
                    // on the first paint, before motion takes it over.
                    r={6}
                    fill="none"
                    stroke="#ccff00"
                    strokeWidth={1.5}
                    animate={{ r: [6, 24], opacity: [0.6, 0] }}
                    transition={{ duration: beatSeconds, repeat: Infinity, ease: "easeOut" }}
                  />
                )}
                <circle cx={markerX} cy={markerY} r={6} fill="#ccff00" filter="url(#telemetry-glow)" />
              </svg>

              <input
                type="range"
                min={0}
                max={TELEMETRY_MAX_KM}
                step={0.1}
                value={km}
                onChange={(e) => {
                  takeOver();
                  setKm(Number(e.target.value));
                }}
                aria-label="Route position, kilometers"
                className="mt-4 h-1 w-full cursor-pointer appearance-none bg-gridline accent-[#ccff00]"
              />
              <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-chalk/50">
                <span>0 km</span>
                <span className="text-chalk">
                  {reading.km.toFixed(1)} km · {reading.elevationM.toFixed(0)} m
                </span>
                <span>{TELEMETRY_MAX_KM} km</span>
              </div>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-px border border-gridline bg-gridline md:grid-cols-4">
              {READOUTS.map((readout) => (
                <TelemetryReadout
                  key={readout.key}
                  label={readout.label}
                  value={reading[readout.key]}
                  unit={readout.unit}
                  sensitivity={readout.sensitivity}
                >
                  {readout.key === "heartRateBpm" ? (
                    <TelemetryPulse bpm={reading.heartRateBpm} className="ml-2 align-middle" />
                  ) : null}
                </TelemetryReadout>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
