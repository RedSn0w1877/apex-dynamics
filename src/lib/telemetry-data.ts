// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

/**
 * One simulated 30 km trail effort, sampled every km. Illustrative data for a
 * portfolio concept — not a real athlete's file. Elevation is what drives the
 * story: heart rate, ground contact time and cadence all react to the climbs.
 */
export type TelemetrySample = {
  km: number;
  elevationM: number;
  heartRateBpm: number;
  groundContactMs: number;
  cadenceSpm: number;
  energyReturnPct: number;
};

const RAW_ELEVATION = [
  0, 40, 95, 150, 210, 260, 300, 340, 300, 250, 190, 130, 90, 60, 40, 70, 130, 200, 280, 360, 420, 460, 430, 370, 300,
  230, 160, 100, 50, 10, 0,
];

function heartRateFor(climbRate: number, km: number): number {
  const base = 142 + km * 0.35;
  const climbLoad = Math.max(0, climbRate) * 5.2;
  return Math.round(Math.min(178, base + climbLoad));
}

function groundContactFor(climbRate: number): number {
  // Climbing lengthens ground contact (more push per step); descending shortens it.
  const base = 182;
  return Math.round(Math.min(210, Math.max(162, base + climbRate * 3.4)));
}

function cadenceFor(climbRate: number): number {
  const base = 182;
  return Math.round(Math.min(194, Math.max(168, base - climbRate * 2.6)));
}

function energyReturnFor(climbRate: number): number {
  // The carbon plate gives the most back on flat-to-downhill turnover.
  const base = 84;
  return Math.round(Math.min(88, Math.max(76, base - Math.max(0, climbRate) * 1.4)));
}

export const TELEMETRY: readonly TelemetrySample[] = RAW_ELEVATION.map((elevationM, i) => {
  const prev = RAW_ELEVATION[Math.max(0, i - 1)];
  const climbRate = elevationM - prev;
  return {
    km: i,
    elevationM,
    heartRateBpm: heartRateFor(climbRate, i),
    groundContactMs: groundContactFor(climbRate),
    cadenceSpm: cadenceFor(climbRate),
    energyReturnPct: energyReturnFor(climbRate),
  };
});

export const TELEMETRY_MAX_ELEVATION = Math.max(...TELEMETRY.map((s) => s.elevationM));
export const TELEMETRY_MAX_KM = TELEMETRY.length - 1;

/** The summit of the route — computed once at parse time, not per render. */
export const TELEMETRY_PEAK = TELEMETRY.reduce(
  (best, sample) => (sample.elevationM > best.elevationM ? sample : best),
  TELEMETRY[0]
);

/** Linear-interpolated reading at any point along the route, for smooth scrubbing. */
export function sampleAt(km: number): TelemetrySample {
  const clamped = Math.min(Math.max(km, 0), TELEMETRY_MAX_KM);
  const i0 = Math.floor(clamped);
  const i1 = Math.min(i0 + 1, TELEMETRY_MAX_KM);
  const t = clamped - i0;
  const a = TELEMETRY[i0];
  const b = TELEMETRY[i1];
  const lerp = (x: number, y: number) => x + (y - x) * t;
  return {
    km: clamped,
    elevationM: lerp(a.elevationM, b.elevationM),
    heartRateBpm: Math.round(lerp(a.heartRateBpm, b.heartRateBpm)),
    groundContactMs: Math.round(lerp(a.groundContactMs, b.groundContactMs)),
    cadenceSpm: Math.round(lerp(a.cadenceSpm, b.cadenceSpm)),
    energyReturnPct: Math.round(lerp(a.energyReturnPct, b.energyReturnPct)),
  };
}
