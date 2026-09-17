// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import * as THREE from "three";

/**
 * Procedural geometry for the Prototype 04 shoe.
 *
 * Every part is a "ring body": a stack of cross-sections swept from heel (u = 0)
 * to toe (u = 1). Each cross-section is a superellipse — a rounded rectangle whose
 * corner softness is one exponent — so the same builder makes a boxy outsole, a
 * flared foam midsole and a tapered upper. Measurements follow the spec: 38 mm heel,
 * 30 mm forefoot, 8 mm drop, with a rockered toe.
 */

export const SHOE_LENGTH = 3;
const X0 = -SHOE_LENGTH / 2;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const bump = (v: number, center: number, width: number) => Math.exp(-(((v - center) / width) ** 2));

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

const FOOTPRINT = [[0, 0.32], [0.22, 0.34], [0.45, 0.28], [0.68, 0.44], [0.84, 0.43], [1, 0.34]] as const;
/** Upper height, heel to toe: tall heel counter, ankle dip, instep, low toe box. */
const UPPER_HEIGHT = [[0, 0.56], [0.06, 0.66], [0.2, 0.5], [0.34, 0.56], [0.5, 0.52], [0.7, 0.34], [0.88, 0.22], [1, 0.1]] as const;

export const xAt = (u: number) => X0 + u * SHOE_LENGTH;

/** Half-width of the footprint. The sqrt terms round the heel and toe like arcs. */
export function halfWidth(u: number, medial: boolean) {
  const round = Math.sqrt(clamp01(u / 0.07)) * Math.sqrt(clamp01((1 - u) / 0.15));
  // The medial (arch) side is cut in at the waist, like a real last.
  const arch = medial ? 0.94 - 0.1 * bump(u, 0.45, 0.12) : 1;
  return curve(FOOTPRINT, u) * round * arch;
}

/** Toe spring + heel bevel: the whole sole curves up at both ends. */
export const rocker = (u: number) => 0.17 * smoothstep(0.66, 1, u) ** 2 + 0.05 * (1 - smoothstep(0, 0.12, u)) ** 2;

export const OUTSOLE_T = 0.05;
const MIDSOLE_HEEL = 0.32;
/** Midsole thins from 38 mm to 30 mm through the forefoot. */
export const midsoleThickness = (u: number) =>
  THREE.MathUtils.lerp(MIDSOLE_HEEL, MIDSOLE_HEEL * (30 / 38), smoothstep(0.2, 0.8, u));
const CARRIER_SHARE = 0.4;

const carrierTop = (u: number) => OUTSOLE_T + rocker(u) + midsoleThickness(u) * CARRIER_SHARE;
const midsoleTop = (u: number) => OUTSOLE_T + midsoleThickness(u) + rocker(u);
const upperBottom = (u: number) => midsoleTop(u) - 0.03;
const upperHeight = (u: number) => curve(UPPER_HEIGHT, u);

const spow = (v: number, p: number) => Math.sign(v) * Math.abs(v) ** p;

type Section = { bottom: number; top: number; widthScale: number };
type BodyOptions = {
  section: (u: number) => Section;
  /** Superellipse exponent — higher is boxier. */
  exponent: number;
  /** Flat-bottomed dome (the upper) instead of a full rounded slab. */
  dome?: boolean;
  /** Reshape width by height fraction (0 = bottom, 1 = top): flares, tapers, grooves. */
  profile?: (hf: number, u: number) => number;
  /** Cut the surface below a height fraction — turns a dome into a band (heel counter). */
  cap?: (u: number) => number;
  /** Faces to drop, e.g. the ankle opening. */
  hole?: (u: number, z: number, hf: number) => boolean;
  u0?: number;
  u1?: number;
  rings?: number;
  segments?: number;
};

function sectionPoint(opts: BodyOptions, u: number, a: number) {
  const { bottom, top, widthScale } = opts.section(u);
  const p = 2 / opts.exponent;
  const c = Math.cos(a);
  const sn = Math.sin(a);
  const h = top - bottom;
  let hf = opts.dome ? (sn > 0 ? Math.abs(sn) ** p : 0) : (spow(sn, p) + 1) / 2;
  if (opts.cap) hf = Math.min(hf, opts.cap(u));
  const y = opts.dome && sn <= 0 ? bottom + 0.01 * sn : bottom + h * hf;
  const w = halfWidth(u, c < 0) * widthScale * (opts.profile ? opts.profile(hf, u) : 1);
  return { y, z: w * spow(c, p), hf };
}

export function buildRingBody(opts: BodyOptions) {
  const { u0 = 0, u1 = 1, rings = 96, segments = 40, hole } = opts;
  const positions: number[] = [];
  const uvs: number[] = [];
  const meta: { u: number; z: number; hf: number }[] = [];

  for (let r = 0; r <= rings; r++) {
    const u = THREE.MathUtils.lerp(u0, u1, r / rings);
    for (let s = 0; s < segments; s++) {
      const pt = sectionPoint(opts, u, (s / segments) * Math.PI * 2);
      positions.push(xAt(u), pt.y, pt.z);
      uvs.push(u, s / segments);
      meta.push({ u, z: pt.z, hf: pt.hf });
    }
  }

  const indices: number[] = [];
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < segments; s++) {
      const a = r * segments + s;
      const b = r * segments + ((s + 1) % segments);
      const c = a + segments;
      const d = b + segments;
      if (hole) {
        const m = meta[a];
        const n = meta[d];
        if (hole((m.u + n.u) / 2, (m.z + n.z) / 2, (m.hf + n.hf) / 2)) continue;
      }
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/* ---------------------------------------------------------------- upper --- */

const UPPER_WIDTH = 0.95;
/** Narrower at the top, like a real last — this is what stops it reading as a loaf. */
const upperProfile = (hf: number, u: number) => 1 - (0.3 + 0.12 * bump(u, 0.2, 0.15)) * hf ** 2.2;

const upperOptions: BodyOptions = {
  exponent: 2.45,
  dome: true,
  profile: upperProfile,
  section: (u) => ({ bottom: upperBottom(u), top: upperBottom(u) + upperHeight(u), widthScale: UPPER_WIDTH }),
};

const COLLAR = { u: 0.2, lenU: 0.105, halfZ: 0.15 };
const inCollar = (u: number, z: number, scale = 1) =>
  ((u - COLLAR.u) / (COLLAR.lenU * scale)) ** 2 + (z / (COLLAR.halfZ * scale)) ** 2 < 1;

/** A point on the upper's surface, found by searching the cross-section angle. */
function upperSurface(u: number, z: number) {
  const side = z >= 0 ? 1 : -1;
  let lo = side > 0 ? 0 : Math.PI;
  let hi = Math.PI / 2;
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2;
    const pz = sectionPoint(upperOptions, u, mid).z;
    // z shrinks toward the crown (a = π/2) from either side.
    if (Math.abs(pz) > Math.abs(z)) lo = mid;
    else hi = mid;
  }
  return sectionPoint(upperOptions, u, (lo + hi) / 2);
}

const v3 = (u: number, y: number, z: number) => new THREE.Vector3(xAt(u), y, z);

/* ---------------------------------------------------------------- build --- */

export function buildShoeParts() {
  const outsole = buildRingBody({
    exponent: 7,
    profile: (hf) => 1.03 - 0.02 * hf,
    section: (u) => ({ bottom: rocker(u), top: rocker(u) + OUTSOLE_T + 0.01, widthScale: 1 }),
  });

  const carrier = buildRingBody({
    exponent: 5,
    // Flared base: wider at the ground for stability.
    profile: (hf) => 1.06 - 0.05 * hf,
    section: (u) => ({ bottom: OUTSOLE_T + rocker(u), top: carrierTop(u), widthScale: 1 }),
  });

  const foam = buildRingBody({
    exponent: 4,
    // Sculpted sidewall: a soft groove through the middle, rolled edge on top.
    profile: (hf) => 1.02 - 0.035 * bump(hf, 0.45, 0.16) - 0.03 * hf ** 3,
    section: (u) => ({ bottom: carrierTop(u) - 0.005, top: midsoleTop(u), widthScale: 1.0 }),
  });

  const plate = buildRingBody({
    exponent: 9,
    rings: 72,
    segments: 28,
    u0: 0.04,
    u1: 0.97,
    section: (u) => ({ bottom: carrierTop(u) - 0.004, top: carrierTop(u) + 0.02, widthScale: 0.9 }),
  });

  const hole = (u: number, z: number, hf: number) => hf > 0.55 && inCollar(u, z);
  const upper = buildRingBody({ ...upperOptions, rings: 140, segments: 64, hole });

  // Heel counter: a firmer shell wrapping the back, cut in a sweeping line.
  const heelCounter = buildRingBody({
    ...upperOptions,
    u0: 0,
    u1: 0.3,
    rings: 40,
    segments: 64,
    cap: (u) => THREE.MathUtils.lerp(0.8, 0.12, smoothstep(0.03, 0.3, u)),
    section: (u) => {
      const base = upperOptions.section(u);
      return { bottom: base.bottom - 0.004, top: base.bottom + (base.top - base.bottom) * 1.025, widthScale: UPPER_WIDTH * 1.03 };
    },
    hole: (u, z, hf) => hf > 0.55 && inCollar(u, z, 1.02),
  });

  // Toe bumper: rubberised wrap over the front of the toe box.
  const toeCap = buildRingBody({
    ...upperOptions,
    u0: 0.8,
    u1: 1,
    rings: 30,
    segments: 64,
    cap: (u) => THREE.MathUtils.lerp(0.18, 0.95, smoothstep(0.8, 0.98, u)),
    section: (u) => {
      const base = upperOptions.section(u);
      return { bottom: base.bottom - 0.004, top: base.bottom + (base.top - base.bottom) * 1.04, widthScale: UPPER_WIDTH * 1.035 };
    },
  });

  // Tongue: a raised padded strip down the instep that the laces sit on.
  const tongue = buildRingBody({
    exponent: 2.4,
    dome: true,
    u0: 0.27,
    u1: 0.7,
    rings: 40,
    segments: 40,
    section: (u) => {
      const s = upperSurface(u, 0);
      const t = smoothstep(0.27, 0.34, u) * (1 - smoothstep(0.64, 0.7, u));
      return { bottom: s.y - 0.08, top: s.y + 0.012 + 0.03 * t, widthScale: 0.4 };
    },
  });

  // Padded collar: a tube around the ankle opening, following the surface.
  const collarPoints: THREE.Vector3[] = [];
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const u = COLLAR.u + Math.cos(a) * COLLAR.lenU;
    const z = Math.sin(a) * COLLAR.halfZ;
    collarPoints.push(v3(u, upperSurface(u, z).y + 0.005, z));
  }
  const collar = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(collarPoints, true), 128, 0.038, 12, true);

  // Laces: flat criss-cross bars resting on the tongue, plus eyelet rails either side.
  const laces: THREE.BufferGeometry[] = [];
  const LACE_ROWS = 6;
  for (let k = 0; k < LACE_ROWS; k++) {
    const uc = 0.37 + k * 0.05;
    for (const dir of [1, -1]) {
      const pts: THREE.Vector3[] = [];
      for (let j = 0; j <= 8; j++) {
        const t = j / 8;
        const z = THREE.MathUtils.lerp(-0.12, 0.12, t);
        const u = uc + dir * (t - 0.5) * 0.04;
        const lift = 0.05 * Math.sin(t * Math.PI);
        pts.push(v3(u, upperSurface(u, z).y + 0.012 + lift, z));
      }
      const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.011, 6, false);
      laces.push(g);
    }
  }
  const rails = [-1, 1].map((side) => {
    const pts: THREE.Vector3[] = [];
    for (let j = 0; j <= 16; j++) {
      const u = THREE.MathUtils.lerp(0.34, 0.66, j / 16);
      const z = side * 0.13;
      pts.push(v3(u, upperSurface(u, z).y + 0.006, z));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.018, 8, false);
  });

  // Two speed lines sweeping up the lateral side.
  const stripes = [0.3, 0.46].map((start) => {
    const pts: THREE.Vector3[] = [];
    for (let j = 0; j <= 20; j++) {
      const t = j / 20;
      const u = THREE.MathUtils.lerp(0.3, 0.86, t);
      const a = THREE.MathUtils.lerp(start, start - 0.22, t);
      const p = sectionPoint(upperOptions, u, a);
      pts.push(v3(u, p.y, p.z * 1.012 + 0.003));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.008, 6, false);
  });

  // The fork: a dark channel splitting the plate's forefoot, following the rocker.
  const slotPoints: THREE.Vector3[] = [];
  for (let j = 0; j <= 12; j++) {
    const u = THREE.MathUtils.lerp(0.58, 0.95, j / 12);
    slotPoints.push(v3(u, carrierTop(u) + 0.02, 0));
  }
  const slot = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(slotPoints), 32, 0.02, 6, false);

  const tabTop = upperBottom(0.02) + upperHeight(0.02);
  return {
    outsole,
    carrier,
    foam,
    plate,
    slot,
    upper,
    heelCounter,
    toeCap,
    tongue,
    collar,
    laces,
    rails,
    stripes,
    heelTab: { x: xAt(0.012), y: tabTop },
  };
}

/** Lug positions for the outsole tread, deterministic so renders are stable. */
export function lugLayout() {
  const lugs: { x: number; y: number; z: number; rot: number }[] = [];
  for (let u = 0.07; u < 0.95; u += 0.055) {
    for (let z = -0.33; z <= 0.33; z += 0.11) {
      if (Math.abs(z) > halfWidth(u, z < 0) * 0.8) continue;
      lugs.push({ x: xAt(u), y: rocker(u) - 0.01, z, rot: z >= 0 ? 0.55 : -0.55 });
    }
  }
  return lugs;
}

/** A tileable knit pattern, used as a bump map so the upper reads as mesh fabric. */
export function makeKnitTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, size, size);
  // Offset rows of small cells, like an engineered knit.
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const x = col * 8 + (row % 2) * 4;
      const y = row * 8;
      ctx.fillStyle = "#e0e0e0";
      ctx.fillRect(x + 1, y + 1, 6, 5);
      ctx.fillStyle = "#303030";
      ctx.fillRect(x + 1, y + 6, 6, 1);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(70, 26);
  return texture;
}
