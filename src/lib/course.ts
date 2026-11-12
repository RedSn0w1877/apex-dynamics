// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { TELEMETRY, TELEMETRY_MAX_ELEVATION, TELEMETRY_MAX_KM } from "./telemetry-data";

/**
 * The page is a 30 km race: the hero is the start line, each middle section is
 * a checkpoint at its kilometre, and the footer is the finish. Everything here
 * is derived from the simulated course in telemetry-data.ts, so the climbs on
 * the gates, the profile in the strip and the telemetry chart always agree.
 */

export type CheckpointId = "stride" | "inside" | "wind" | "bib";
export type Checkpoint = { readonly cp: 1 | 2 | 3 | 4; readonly km: number; readonly id: CheckpointId; readonly label: string };

export const CHECKPOINTS: readonly Checkpoint[] = [
  { cp: 1, km: 6, id: "stride", label: "Stride" },
  { cp: 2, km: 14, id: "inside", label: "Inside" },
  { cp: 3, km: 22, id: "wind", label: "Wind" },
  { cp: 4, km: 29, id: "bib", label: "Bib" },
];

/** Cumulative positive elevation gain from the start to `km`, in metres. */
export function climbTo(km: number): number {
  const end = Math.min(Math.max(km, 0), TELEMETRY_MAX_KM);
  let gain = 0;
  for (let i = 1; i <= Math.ceil(end); i++) {
    const rise = TELEMETRY[i].elevationM - TELEMETRY[i - 1].elevationM;
    if (rise > 0) gain += rise * Math.min(1, end - (i - 1));
  }
  return Math.round(gain);
}

export const FINISH = { km: TELEMETRY_MAX_KM, climbM: climbTo(TELEMETRY_MAX_KM) } as const;

/**
 * Fraction of the profile's height kept clear above the summit and below the
 * valley floor, so the stroke and the runner dot never touch the box edge.
 */
const RIDGE_PAD = 2 / 46;

/** x for a kilometre: a 0–1 fraction of the width by default, or pixels/units if `w` is given. */
export const kmToX = (km: number, w = 1) => (km / TELEMETRY_MAX_KM) * w;

/** y for an elevation, measured down from the top: a 0–1 fraction by default, or units if `h` is given. */
export const elevToY = (elevationM: number, h = 1) =>
  h * (1 - RIDGE_PAD - (elevationM / TELEMETRY_MAX_ELEVATION) * (1 - 2 * RIDGE_PAD));

const oneDecimal = (v: number) => String(Math.round(v * 10) / 10);

/**
 * The 31-point course polyline for an SVG `points` attribute, one vertex per km,
 * at one decimal (about 255 bytes for a 300 × 46 viewBox). Draw it with
 * preserveAspectRatio="none" and vector-effect="non-scaling-stroke".
 */
export const ridgePoints = (w: number, h: number) =>
  TELEMETRY.map((s) => `${oneDecimal(kmToX(s.km, w))},${oneDecimal(elevToY(s.elevationM, h))}`).join(" ");

/** The shared ridge viewBox: every course drawing uses it, so they all line up. */
export const RIDGE_W = 300;
export const RIDGE_H = 46;
