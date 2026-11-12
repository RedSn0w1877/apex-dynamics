// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import {
  CAMERA_STILLS,
  CUT_MAX_U,
  CUT_STATIONS,
  cutX,
  halfWidth,
  layerAnchor,
  stackAtMm,
  upperBottom,
  upperHeight,
  type LayerId,
  type ShoeCamera,
} from "@/lib/shoe-spec";

/*
 * The x-ray's camera maths without three.js, so the stills path (lite, embed,
 * reduced motion) never pulls the 3D chunk. projectStill() reproduces exactly
 * what Blender's camera saw for the six 4:3 cut stills; liveFrame() is the one
 * place the live camera's framing rules live, shared with xray-scene.ts so the
 * poster it fades over and the canvas agree.
 */

type Vec3 = readonly [number, number, number];

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/**
 * A point in the scene to [x, y] in 0..1 of the camera's frame (0,0 top-left),
 * for a camera looking at its target with y up and no roll.
 */
export function projectWith(cam: ShoeCamera, p: Vec3, aspect = cam.aspect): readonly [number, number] {
  const forward = norm(sub(cam.target, cam.pos));
  const right = norm(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  const d = sub(p, cam.pos);
  const depth = dot(d, forward);
  const t = Math.tan((cam.fov * Math.PI) / 360);
  const nx = dot(d, right) / (depth * t * aspect);
  const ny = dot(d, up) / (depth * t);
  return [(nx + 1) / 2, (1 - ny) / 2];
}

/** Where a point lands on the 4:3 cut stills, in 0..1 of the image. */
export const projectStill = (p: Vec3) => projectWith(CAMERA_STILLS, p);

/** The poster and the live canvas are both framed for 16:9. */
const POSTER_ASPECT = 16 / 9;

/**
 * The live camera for a stage of this aspect.
 * - Wider than 16:9: the poster is cropped top and bottom by object-fit: cover,
 *   so narrow the vertical fov to keep the poster's horizontal framing.
 * - Narrower than 1.6: dolly back along the view (spec 6.2), at most 1.9x, so
 *   the toe isn't cut off; the poster is scaled by 1 / dolly to match.
 */
export function liveFrame(fov: number, aspect: number): { fov: number; dolly: number } {
  if (aspect > POSTER_ASPECT) {
    const t = Math.tan((fov * Math.PI) / 360) * (POSTER_ASPECT / aspect);
    return { fov: (Math.atan(t) * 360) / Math.PI, dolly: 1 };
  }
  return { fov, dolly: aspect < 1.6 ? Math.min(1.9, 1.6 / aspect) : 1 };
}

/* --------------------------------------------------------------- stations --- */

const STATION_U = CUT_STATIONS.map((s) => s.u);

/** The last station at or before a cut position: the one whose layer was most recently named. */
export function stationAt(u: number): number {
  let i = 0;
  for (let k = 1; k < STATION_U.length; k++) if (STATION_U[k] <= u + 1e-4) i = k;
  return i;
}

/** The scroll share each station gets: six equal stops along the track. */
export const STATION_COUNT = CUT_STATIONS.length;

/**
 * Scroll progress (0..1 along the track) to a cut position, with a short dwell
 * at every station. A straight p · CUT_MAX_U line reached the toe station only
 * in the last 5% of the track (about 65 px), too fast to read its callout; here
 * every station owns a sixth of the scroll, holds still for the first third of
 * it, then eases on to the next. The scene's damping smooths the corners.
 */
export function cutForScroll(p: number): number {
  const s = Math.min(Math.max(p, 0), 1) * STATION_COUNT;
  const i = Math.min(Math.floor(s), STATION_COUNT - 1);
  const f = s - i;
  const from = STATION_U[i];
  const to = i + 1 < STATION_COUNT ? STATION_U[i + 1] : CUT_MAX_U;
  const t = Math.min(Math.max((f - 1 / 3) / (2 / 3), 0), 1);
  return from + (to - from) * t * t * (3 - 2 * t);
}

/** Lite scroll stepping: the same six equal stops, as station indices. */
export const stationForScroll = (p: number) =>
  Math.min(STATION_COUNT - 1, Math.floor(Math.min(Math.max(p, 0), 1) * STATION_COUNT));

const STATION_WORDS = ["whole shoe", "heel", "rear foot", "midfoot", "forefoot", "toe"] as const;
const STATION_TAIL = ["", " of cushion", "", "", ", plate starts to fork", ", plate forked"] as const;

/** Cushion in whole millimetres at a cut, floored: 38, 37, 34, 31, 30 at the stations. */
export const cushionMm = (u: number) => Math.floor(stackAtMm(u) + 1e-6);

/** The slider's spoken value: 'heel, 38 mm of cushion', 'forefoot, 31 mm, plate starts to fork'. */
export function valueText(station: number, u: number): string {
  if (station === 0) return STATION_WORDS[0];
  return `${STATION_WORDS[station]}, ${cushionMm(u)} mm${STATION_TAIL[station]}`;
}

/**
 * Where a callout pins. layerAnchor() puts every pin half way up its layer at 55% of the
 * half-width, which lands inside the solid sole layers; the upper is a hollow knit ring, so
 * its pin goes on the lateral wall, a third of the way up, instead of floating in the void.
 */
export function calloutAnchor(id: LayerId, u: number): Vec3 {
  if (id !== "upper") return layerAnchor(id, u);
  return [cutX(u), upperBottom(u) + upperHeight(u) * 0.32, 0.93 * halfWidth(u, false)];
}
