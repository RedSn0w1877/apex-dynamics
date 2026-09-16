"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { LogMark } from "@/components/brand/log-mark";
import { Reveal } from "@/components/ui/reveal";
import { TELEMETRY, TELEMETRY_MAX_ELEVATION, TELEMETRY_MAX_KM, sampleAt } from "@/lib/telemetry-data";

const VIEW_W = 1000;
const VIEW_H = 260;
const PAD_TOP = 20;
const PAD_BOTTOM = 20;

function elevationToY(elevationM: number): number {
  const usable = VIEW_H - PAD_TOP - PAD_BOTTOM;
  return VIEW_H - PAD_BOTTOM - (elevationM / TELEMETRY_MAX_ELEVATION) * usable;
}

function kmToX(km: number): number {
  return (km / TELEMETRY_MAX_KM) * VIEW_W;
}

const READOUTS = [
  { key: "heartRateBpm", label: "Heart rate", unit: "bpm" },
  { key: "groundContactMs", label: "Ground contact", unit: "ms" },
  { key: "cadenceSpm", label: "Cadence", unit: "spm" },
  { key: "energyReturnPct", label: "Energy return", unit: "%" },
] as const;

export function TelemetryHud() {
  const [km, setKm] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const reading = useMemo(() => sampleAt(km), [km]);

  const pathD = useMemo(() => {
    return TELEMETRY.map((sample, i) => `${i === 0 ? "M" : "L"} ${kmToX(sample.km)} ${elevationToY(sample.elevationM)}`).join(
      " ",
    );
  }, []);

  const areaD = `${pathD} L ${VIEW_W} ${VIEW_H} L 0 ${VIEW_H} Z`;

  const scrubFromPointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const fraction = (event.clientX - rect.left) / rect.width;
    setKm(Math.min(Math.max(fraction, 0), 1) * TELEMETRY_MAX_KM);
  };

  const markerX = kmToX(reading.km);
  const markerY = elevationToY(reading.elevationM);

  return (
    <section id="telemetry" className="border-b border-gridline">
      <div className="mx-auto max-w-[1440px] px-5 py-20 md:px-10 md:py-28">
        <LogMark log="02" title="Stride HUD — 30 km trail effort" />

        <div className="mt-10 grid gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <h2 className="font-display text-4xl italic font-black uppercase leading-[0.9] tracking-tighter text-chalk md:text-5xl">
              Scrub the <span className="text-volt">split.</span>
            </h2>
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-chalk/65">
              Drag across the elevation profile, or use the slider below it. Heart rate, ground contact time,
              cadence and energy return all respond to the climb in real time.
            </p>
          </Reveal>

          <div className="lg:col-span-8">
            <div className="border border-gridline bg-carbon p-4 md:p-6">
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
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight") setKm((v) => Math.min(TELEMETRY_MAX_KM, v + 1));
                  if (e.key === "ArrowLeft") setKm((v) => Math.max(0, v - 1));
                }}
              >
                <defs>
                  <linearGradient id="elevation-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ccff00" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#ccff00" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={areaD} fill="url(#elevation-fill)" />
                <path d={pathD} fill="none" stroke="#f5f5f5" strokeWidth={2} strokeOpacity={0.85} />
                <line x1={markerX} y1={0} x2={markerX} y2={VIEW_H} stroke="#ccff00" strokeWidth={1} strokeDasharray="4 4" />
                <circle cx={markerX} cy={markerY} r={6} fill="#ccff00" />
              </svg>

              <input
                type="range"
                min={0}
                max={TELEMETRY_MAX_KM}
                step={0.1}
                value={km}
                onChange={(e) => setKm(Number(e.target.value))}
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
                <div key={readout.key} className="bg-carbon px-4 py-4">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-chalk/50">{readout.label}</dt>
                  <dd className="mt-1.5 font-display text-2xl italic font-bold tabular-nums text-chalk">
                    {reading[readout.key]}
                    <span className="ml-1 text-sm not-italic text-chalk/50">{readout.unit}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
