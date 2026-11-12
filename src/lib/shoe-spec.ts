// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

/**
 * Prototype 04 in numbers: the single source of truth for the shoe's geometry,
 * the figures the copy quotes, and both cameras (the live x-ray in #inside and
 * the Blender stills). No imports on purpose, so the browser, the Node asset
 * tools in tools/assets and the Blender export all read this one file.
 *
 * Units: 1 scene unit = 100 mm, so the 300 mm shoe is 3 units long, centred on
 * x = 0. `u` runs along the shoe from the heel (0) to the toe (1).
 *
 * Stack, bottom to top, at any u (gaps ignored here; the asset tools subtract
 * SHOE.gapMm so the five layers never touch):
 *   outsole  rocker(u) .................. rocker(u) + OUTSOLE_T   (lugs hang below)
 *   carrier  carrierBottom(u) ........... carrierTop(u)
 *   plate    plateBottom(u) ............. foamBottom(u)           (2.2 mm)
 *   foam     foamBottom(u) .............. midsoleTop(u)
 *   upper    upperBottom(u) ............. upperBottom(u) + upperHeight(u)
 * Outsole base + midsole = 38 mm under the heel and 30 mm under the forefoot.
 */

export const UNIT_MM = 100;

export const SHOE = {
  lengthMm: 300,
  stackHeelMm: 38,
  stackForefootMm: 30,
  dropMm: 8,
  outsoleBaseMm: 4,
  lugMm: 3.0,
  plateMm: 2.2,
  /** The carrier's share of the midsole once the plate is taken out. */
  carrierShare: 0.4,
  /** Clearance between neighbouring layers, so section caps never show lit faces. */
  gapMm: 0.3,
  weightG: 218,
  weightStepG: 4,
  baseSizeEu: 43,
} as const;

/** The outsole compound's name (fictional, like the brand): the hero's stat row and the x-ray quote it. */
export const OUTSOLE_RUBBER = "ApexTack";

/** The five layers, in stack order from the ground up. */
export const LAYER_IDS = ["outsole", "carrier", "plate", "foam", "upper"] as const;
export type LayerId = (typeof LAYER_IDS)[number];

export const SHOE_LENGTH = SHOE.lengthMm / UNIT_MM;
const X0 = -SHOE_LENGTH / 2;

export const OUTSOLE_T = SHOE.outsoleBaseMm / UNIT_MM;
export const PLATE_T = SHOE.plateMm / UNIT_MM;
export const LUG_T = SHOE.lugMm / UNIT_MM;
export const GAP = SHOE.gapMm / UNIT_MM;

/* ------------------------------------------------------------ profile maths --- */

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const bump = (v: number, center: number, width: number) => Math.exp(-(((v - center) / width) ** 2));

/** Cosine interpolation through [u, value] control points: smooth, no overshoot. */
export function curve(points: readonly (readonly [number, number])[], u: number) {
  if (u <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [u1, v1] = points[i];
    const [u0, v0] = points[i - 1];
    if (u <= u1) {
      const t = (1 - Math.cos(((u - u0) / (u1 - u0)) * Math.PI)) / 2;
      return v0 + (v1 - v0) * t;
    }
  }
  return points[points.length - 1][1];
}

/** Half-width of the footprint along the shoe (scene units). */
export const FOOTPRINT = [[0, 0.32], [0.22, 0.34], [0.45, 0.28], [0.68, 0.44], [0.84, 0.43], [1, 0.34]] as const;
/** Upper height, heel to toe: tall heel counter, ankle dip, instep, low toe box. */
export const UPPER_HEIGHT = [[0, 0.56], [0.06, 0.66], [0.2, 0.5], [0.34, 0.56], [0.5, 0.52], [0.7, 0.34], [0.88, 0.22], [1, 0.1]] as const;

export const xAt = (u: number) => X0 + u * SHOE_LENGTH;

/** Half-width of the footprint. The sqrt terms round the heel and toe like arcs. */
export function halfWidth(u: number, medial: boolean) {
  const round = Math.sqrt(clamp01(u / 0.07)) * Math.sqrt(clamp01((1 - u) / 0.15));
  // The medial (arch) side is cut in at the waist, like a real last.
  const arch = medial ? 0.94 - 0.1 * bump(u, 0.45, 0.12) : 1;
  return curve(FOOTPRINT, u) * round * arch;
}

/** Toe spring and heel bevel: the whole sole curves up at both ends. */
export const rocker = (u: number) => 0.17 * smoothstep(0.66, 1, u) ** 2 + 0.05 * (1 - smoothstep(0, 0.12, u)) ** 2;

/** Carrier + plate + foam: 34 mm under the heel, 26 mm under the forefoot. */
export const midsoleThickness = (u: number) => lerp(0.34, 0.26, smoothstep(0.2, 0.8, u));

export const carrierBottom = (u: number) => rocker(u) + OUTSOLE_T;
/** The carrier takes 40% of the midsole once the plate's 2.2 mm is taken out. */
export const carrierTop = (u: number) => carrierBottom(u) + SHOE.carrierShare * (midsoleThickness(u) - PLATE_T);
export const plateBottom = carrierTop;
export const foamBottom = (u: number) => carrierTop(u) + PLATE_T;
export const midsoleTop = (u: number) => carrierBottom(u) + midsoleThickness(u);
/** The upper sits flat on the foam: no sag into it, so the layers stay disjoint. */
export const upperBottom = midsoleTop;
export const upperHeight = (u: number) => curve(UPPER_HEIGHT, u);

/** Cushion under the foot at u, in mm: outsole base plus midsole. 38 at the heel, 30 at the toe. */
export const stackAtMm = (u: number) => lerp(SHOE.stackHeelMm, SHOE.stackForefootMm, smoothstep(0.2, 0.8, u));

/** Bottom and top of one layer's section at u (scene units, lugs and gaps ignored). */
export function layerSpan(layer: LayerId, u: number): readonly [number, number] {
  switch (layer) {
    case "outsole":
      return [rocker(u), carrierBottom(u)];
    case "carrier":
      return [carrierBottom(u), carrierTop(u)];
    case "plate":
      return [plateBottom(u), foamBottom(u)];
    case "foam":
      return [foamBottom(u), midsoleTop(u)];
    case "upper":
      return [upperBottom(u), upperBottom(u) + upperHeight(u)];
  }
}

/* ------------------------------------------------------------ the x-ray cut --- */

/** The cut never goes past the toe box, so there is always some shoe left to look at. */
export const CUT_MAX_U = 0.86;

export type CutStation = { readonly u: number; readonly key: string; readonly names: LayerId | null };

/** One stop per still. Each station after the first names one more layer, in tally order. */
export const CUT_STATIONS: readonly CutStation[] = [
  { u: 0, key: "whole", names: null },
  { u: 0.12, key: "heel", names: "upper" },
  { u: 0.25, key: "rear", names: "foam" },
  { u: 0.45, key: "mid", names: "plate" },
  { u: 0.62, key: "fore", names: "carrier" },
  { u: 0.82, key: "toe", names: "outsole" },
];

/** Cut plane position along x for a cut at u. */
export const cutX = (u: number) => xAt(u);

/**
 * Where a layer's callout pins at a cut: on the cut face, half way up the
 * layer's section, on the lateral side (+z, the side facing both cameras).
 */
export function layerAnchor(layer: LayerId, u: number): readonly [number, number, number] {
  const [bottom, top] = layerSpan(layer, u);
  return [cutX(u), (bottom + top) / 2, 0.55 * halfWidth(u, false)];
}

/* ----------------------------------------------------------------- cameras --- */

export type ShoeCamera = {
  /** Vertical field of view, degrees. */
  readonly fov: number;
  readonly pos: readonly [number, number, number];
  readonly target: readonly [number, number, number];
  readonly aspect: number;
};

/** The live three.js camera in #inside (three's axes: y up, +z towards the viewer). */
export const CAMERA_LIVE: ShoeCamera = { fov: 24, pos: [-3.55, 1.5, 2.65], target: [0.3, 0.36, 0], aspect: 16 / 9 };

/**
 * The camera for the six 4:3 cut stills (Blender converts (x, y, z) to (x, -z, y)).
 * fov 28, not 22: at 22 the heel-side stations sat about 15 degrees off-axis against a 14.5
 * degree half-width, so station 1's cut face fell off the left edge of its still.
 */
export const CAMERA_STILLS: ShoeCamera = { fov: 28, pos: [-3.2, 1.35, 2.35], target: [0.3, 0.34, 0], aspect: 4 / 3 };

/* ------------------------------------------------------------------ sizing --- */

/** 218 g at EU 43, 4 g more or less per size. */
export const weightForSize = (eu: number) => SHOE.weightG + (eu - SHOE.baseSizeEu) * SHOE.weightStepG;
