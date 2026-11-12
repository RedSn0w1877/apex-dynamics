// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

/*
 * CP3 · Wind, in numbers. Illustrative maths for a portfolio concept, never
 * wind-tunnel measurements.
 *
 * The honest model looks at the pair of shoes, not the whole runner: drag power
 * is 0.5 · ρ · Cd · A · v³, and the saving is the difference between a standard
 * trainer's drag coefficient and Prototype 04's, on the shoe's own frontal area.
 *   ρ   1.225 kg/m³, sea-level air
 *   A   0.0095 m², one shoe seen from the front
 *   v   1.5 × running speed: a foot in its swing moves faster than the runner
 *   0.6 the share of a stride a foot spends swinging through the air
 *   × 2 two shoes
 * That gives 0.2 / 1.0 / 2.8 W at 15 / 25 / 35 km/h. (The old maths put a shoe's
 * drag coefficient on a 0.45 m² whole body and claimed 3 / 12 / 33 W.)
 */

export type WindSpeedKey = 15 | 25 | 35;

export const WIND_SPEEDS: readonly WindSpeedKey[] = [15, 25, 35];

/** The speed the section opens on. */
export const DEFAULT_WIND_SPEED: WindSpeedKey = 25;

export const DRAG_COEFFICIENTS = {
  standard: 0.44,
  apex: 0.31,
} as const;

const AIR_DENSITY = 1.225;
const SHOE_FRONTAL_AREA_M2 = 0.0095;
const FOOT_AIRSPEED_FACTOR = 1.5;
const SWING_SHARE = 0.6;

/** Watts a pair of Prototype 04s saves over a standard trainer at a running speed, to one decimal. */
export function wattsSavedPerPair(kmh: number): number {
  const footAirspeed = (FOOT_AIRSPEED_FACTOR * kmh) / 3.6; // m/s
  const saved =
    2 *
    0.5 *
    AIR_DENSITY *
    (DRAG_COEFFICIENTS.standard - DRAG_COEFFICIENTS.apex) *
    SHOE_FRONTAL_AREA_M2 *
    footAirspeed ** 3 *
    SWING_SHARE;
  return Math.round(saved * 10) / 10;
}

/*
 * The streamline dashes travel 108 / 216 / 288 viewBox units (3 / 6 / 8 dash periods of
 * 36) in their one 6 s run at 15 / 25 / 35 km/h: static keyframes flow-15/25/35 in
 * wind-tunnel.module.css, so the dashes stop exactly where a fresh run would start.
 */

/** The wry line under the watts, per speed. */
export const WRY_LINES: Record<WindSpeedKey, string> = {
  15: "A fifth of a watt. Call it a rounding error.",
  25: "About a watt. You won't feel it. Your splits might.",
  35: "Nearly three watts. Downhill with the wind behind you, that's free speed.",
};
