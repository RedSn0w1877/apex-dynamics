// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import * as THREE from "three";

/**
 * Procedural geometry for the Prototype 04 shoe.
 *
 * Every part is a "ring body": a stack of cross-sections swept from heel (u = 0)
 * to toe (u = 1). Each cross-section is a superellipse — a rounded rectangle whose
 * corner softness is one exponent — so the same builder makes a boxy outsole, a
 * soft foam midsole and a domed upper. The measurements follow the spec: 38 mm heel,
 * 30 mm forefoot, 8 mm drop, with a rockered toe.
 */

export const SHOE_LENGTH = 3;
const X0 = -SHOE_LENGTH / 2;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Cosine interpolation through [u, value] control points — smooth, no overshoot. */
function curve(points: readonly (readonly [number, number])[], u: number) {
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

const FOOTPRINT = [[0, 0.34], [0.25, 0.35], [0.45, 0.29], [0.68, 0.46], [0.85, 0.44], [1, 0.36]] as const;
const UPPER_HEIGHT = [[0, 0.5], [0.08, 0.6], [0.34, 0.58], [0.5, 0.54], [0.7, 0.36], [0.88, 0.22], [1, 0.12]] as const;

export const xAt = (u: number) => X0 + u * SHOE_LENGTH;

/** Half-width of the footprint. The sqrt terms round the heel and toe like arcs. */
export function halfWidth(u: number, medial: boolean) {
  const round = Math.sqrt(clamp01(u / 0.09)) * Math.sqrt(clamp01((1 - u) / 0.16));
  // The medial (arch) side is cut in at the waist, like a real last.
  const arch = medial ? 0.94 - 0.08 * Math.exp(-(((u - 0.45) / 0.12) ** 2)) : 1;
  return curve(FOOTPRINT, u) * round * arch;
}

/** Toe spring + heel bevel: the whole sole curves up at both ends. */
export const rocker = (u: number) => 0.16 * smoothstep(0.68, 1, u) ** 2 + 0.05 * (1 - smoothstep(0, 0.12, u)) ** 2;

export const OUTSOLE_T = 0.06;
const MIDSOLE_HEEL = 0.3;
/** Midsole thins from 38 mm to 30 mm through the forefoot. */
export const midsoleThickness = (u: number) =>
  THREE.MathUtils.lerp(MIDSOLE_HEEL, MIDSOLE_HEEL * (30 / 38), smoothstep(0.2, 0.8, u));
export const CARRIER_SHARE = 0.42;

export const midsoleTop = (u: number) => OUTSOLE_T + midsoleThickness(u) + rocker(u);
export const upperBottom = (u: number) => midsoleTop(u) - 0.02;
export const upperHeight = (u: number) => curve(UPPER_HEIGHT, u);

type Section = { bottom: number; top: number; widthScale: number };
type BodyOptions = {
  section: (u: number) => Section;
  /** Superellipse exponent — higher is boxier. */
  exponent: number;
  /** Flat-bottomed dome (the upper) instead of a full rounded slab. */
  dome?: boolean;
  rings?: number;
  segments?: number;
};

const spow = (v: number, p: number) => Math.sign(v) * Math.abs(v) ** p;

export function buildRingBody({ section, exponent, dome = false, rings = 96, segments = 40 }: BodyOptions) {
  const positions: number[] = [];
  const indices: number[] = [];
  const p = 2 / exponent;

  for (let r = 0; r <= rings; r++) {
    const u = r / rings;
    const { bottom, top, widthScale } = section(u);
    for (let s = 0; s < segments; s++) {
      const a = (s / segments) * Math.PI * 2;
      const c = Math.cos(a);
      const sn = Math.sin(a);
      const w = halfWidth(u, c < 0) * widthScale;
      const z = w * spow(c, p);
      const y = dome
        ? bottom + (sn > 0 ? (top - bottom) * Math.abs(sn) ** p : 0.01 * sn)
        : (bottom + top) / 2 + ((top - bottom) / 2) * spow(sn, p);
      positions.push(xAt(u), y, z);
    }
  }

  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < segments; s++) {
      const a = r * segments + s;
      const b = r * segments + ((s + 1) % segments);
      const c = a + segments;
      const d = b + segments;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Height of the upper's surface at a given point — used to seat laces and trim on it. */
export function upperSurfaceY(u: number, z: number, exponent: number) {
  const w = halfWidth(u, z < 0) * 0.96;
  const c = clamp01(Math.abs(z) / Math.max(w, 1e-4)) ** (exponent / 2);
  const s = Math.sqrt(1 - c * c);
  return upperBottom(u) + upperHeight(u) * s ** (2 / exponent);
}

export const UPPER_EXPONENT = 2.6;

export function buildShoeParts() {
  const outsole = buildRingBody({
    exponent: 7,
    section: (u) => ({ bottom: rocker(u), top: rocker(u) + OUTSOLE_T + 0.01, widthScale: 1 }),
  });
  const carrier = buildRingBody({
    exponent: 5,
    section: (u) => {
      const base = OUTSOLE_T + rocker(u);
      return { bottom: base, top: base + midsoleThickness(u) * CARRIER_SHARE, widthScale: 1.02 };
    },
  });
  const foam = buildRingBody({
    exponent: 4,
    section: (u) => {
      const base = OUTSOLE_T + rocker(u) + midsoleThickness(u) * CARRIER_SHARE;
      return { bottom: base, top: midsoleTop(u), widthScale: 1.04 - 0.05 * smoothstep(0.3, 1, u) };
    },
  });
  const plate = buildRingBody({
    exponent: 9,
    rings: 72,
    segments: 28,
    section: (u) => {
      const base = OUTSOLE_T + rocker(u) + midsoleThickness(u) * CARRIER_SHARE;
      return { bottom: base, top: base + 0.022, widthScale: 0.84 };
    },
  });
  const upper = buildRingBody({
    exponent: UPPER_EXPONENT,
    dome: true,
    rings: 110,
    segments: 56,
    section: (u) => ({ bottom: upperBottom(u), top: upperBottom(u) + upperHeight(u), widthScale: 0.96 }),
  });

  // Padded collar: a tube traced around the ankle opening, seated on the upper.
  const collarPoints: THREE.Vector3[] = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const u = 0.2 + Math.cos(a) * 0.1;
    const z = Math.sin(a) * 0.19;
    collarPoints.push(new THREE.Vector3(xAt(u), upperSurfaceY(u, z, UPPER_EXPONENT) + 0.01, z));
  }
  const collar = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(collarPoints, true), 96, 0.042, 12, true);

  // The dark opening inside the collar.
  const openingShape = new THREE.Shape();
  collarPoints.forEach((pt, i) => (i === 0 ? openingShape.moveTo(pt.x, pt.z) : openingShape.lineTo(pt.x, pt.z)));
  const opening = new THREE.ShapeGeometry(openingShape, 4);
  opening.rotateX(Math.PI / 2);
  const openingY = upperBottom(0.2) + upperHeight(0.2) * 0.92;
  opening.translate(0, openingY, 0);

  // Laces: criss-crossing tubes that hug the instep.
  const laces = [];
  for (let k = 0; k < 6; k++) {
    const uc = 0.4 + k * 0.052;
    const dir = k % 2 === 0 ? 1 : -1;
    const pts: THREE.Vector3[] = [];
    for (let j = 0; j <= 10; j++) {
      const t = j / 10;
      const z = THREE.MathUtils.lerp(-0.13, 0.13, t);
      const u = uc + dir * (t - 0.5) * 0.035;
      pts.push(new THREE.Vector3(xAt(u), upperSurfaceY(u, z, UPPER_EXPONENT) + 0.014, z));
    }
    laces.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.013, 6, false));
  }

  // Two speed lines along the lateral side.
  const stripes = [0.34, 0.5].map((height) => {
    const pts: THREE.Vector3[] = [];
    for (let j = 0; j <= 16; j++) {
      const u = THREE.MathUtils.lerp(0.26, 0.82, j / 16);
      const w = halfWidth(u, false) * 0.96;
      const s = height - (j / 16) * 0.12;
      const c = Math.sqrt(1 - s * s);
      const z = w * c ** (2 / UPPER_EXPONENT) + 0.004;
      const y = upperBottom(u) + upperHeight(u) * s ** (2 / UPPER_EXPONENT);
      pts.push(new THREE.Vector3(xAt(u), y, z));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.009, 6, false);
  });

  // The fork: a dark channel splitting the plate's forefoot, following the rocker.
  const slotPoints: THREE.Vector3[] = [];
  for (let j = 0; j <= 12; j++) {
    const u = THREE.MathUtils.lerp(0.6, 0.93, j / 12);
    const y = OUTSOLE_T + rocker(u) + midsoleThickness(u) * CARRIER_SHARE + 0.024;
    slotPoints.push(new THREE.Vector3(xAt(u), y, 0));
  }
  const slot = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(slotPoints), 32, 0.018, 6, false);
  slot.scale(1, 0.5, 1);

  return { outsole, carrier, foam, plate, upper, collar, opening, laces, stripes, slot };
}

export const heelTop = () => upperBottom(0.015) + upperHeight(0.015);

/** Lug positions for the outsole tread, deterministic so renders are stable. */
export function lugLayout() {
  const lugs: { x: number; y: number; z: number; rot: number }[] = [];
  for (let u = 0.07; u < 0.95; u += 0.058) {
    for (let z = -0.36; z <= 0.36; z += 0.12) {
      const limit = halfWidth(u, z < 0) * 0.78;
      if (Math.abs(z) > limit) continue;
      lugs.push({ x: xAt(u), y: rocker(u) - 0.012, z, rot: z >= 0 ? 0.55 : -0.55 });
    }
  }
  return lugs;
}
