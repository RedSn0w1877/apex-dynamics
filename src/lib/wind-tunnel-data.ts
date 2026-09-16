// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

export type WindSpeedKey = 15 | 25 | 35;

export const WIND_SPEEDS: readonly WindSpeedKey[] = [15, 25, 35];

export const DRAG_COEFFICIENTS = {
  standard: 0.44,
  apex: 0.31,
} as const;

/**
 * Illustrative wind-tunnel figures for a portfolio concept, derived from the
 * standard drag-power relationship (power scales with velocity cubed). Not
 * measurements from a real facility.
 */
export function wattsSavedPerKm(speedKmh: WindSpeedKey): number {
  const v = speedKmh / 3.6; // km/h -> m/s
  const airDensity = 1.225;
  const frontalAreaM2 = 0.45;
  const dragPower = (cd: number) => 0.5 * airDensity * cd * frontalAreaM2 * v ** 3;
  const savedWatts = dragPower(DRAG_COEFFICIENTS.standard) - dragPower(DRAG_COEFFICIENTS.apex);
  return Math.round(savedWatts);
}
