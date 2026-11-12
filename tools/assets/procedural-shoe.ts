// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

/**
 * Procedural geometry for Prototype 04, for the offline asset pipeline only.
 * (Moved here from src/components/three/shoe-geometry.ts: the site no longer
 * builds the shoe in the browser, it decodes the Draco pack this feeds.)
 *
 * Every number comes from src/lib/shoe-spec.ts: 38/30 mm stack, 3.0 mm lugs,
 * 2.2 mm plate, 0.3 mm gaps. Three.js axes: y up, +x toward the toe, +z is the
 * lateral side (the side both cameras look at). 1 unit = 100 mm.
 *
 * The five layers are DISJOINT BY CONSTRUCTION. Neighbours share one boundary
 * function and the lower one stops SHOE.gapMm short of it, so the x-ray's
 * back-face section caps never show a lit face from the layer next door. No
 * cross-layer booleans anywhere (they took 403 s and broke manifoldness).
 *
 *   outsole  rocker ...................... rocker + OUTSOLE_T - gap   (+ 81 lugs below)
 *   carrier  carrierBottom ............... carrierTop - gap           (+ the fork key)
 *   plate    carrierTop .................. foamBottom - gap           (fork cut in Blender)
 *   foam     foamBottom .................. midsoleTop - gap
 *   upper    midsoleTop (flat floor) ..... + upperHeight
 *
 * Every part is a closed solid: ring bodies get fan caps, tubes get end caps,
 * so Blender's voxel remesh sees a clean inside and outside.
 */

import * as THREE from "three";

import {
  GAP,
  LUG_T,
  OUTSOLE_T,
  PLATE_T,
  SHOE,
  SHOE_LENGTH,
  bump,
  carrierBottom,
  carrierTop,
  clamp01,
  foamBottom,
  halfWidth,
  lerp,
  midsoleTop,
  rocker,
  smoothstep,
  upperBottom,
  upperHeight,
  xAt,
} from "../../src/lib/shoe-spec.ts";

export { SHOE, SHOE_LENGTH };

const spow = (v: number, p: number) => Math.sign(v) * Math.abs(v) ** p;

/* ------------------------------------------------------------ ring bodies --- */

type Section = { bottom: number; top: number; widthScale: number };
type BodyOptions = {
  section: (u: number) => Section;
  /** Superellipse exponent: higher is boxier. */
  exponent: number;
  /** Flat-floored dome (the upper) instead of a full rounded slab. */
  dome?: boolean;
  /** Reshape width by height fraction (0 = bottom, 1 = top): flares, tapers, grooves. */
  profile?: (hf: number, u: number) => number;
  /** Clamp the surface below a height fraction: turns a dome into a band (heel counter). */
  cap?: (u: number) => number;
  /** Faces to drop, e.g. the ankle opening. */
  hole?: (u: number, z: number, hf: number) => boolean;
  u0?: number;
  u1?: number;
  rings?: number;
  segments?: number;
  /** Fan-cap both end rings (default). Open bands that Blender solidifies leave them off. */
  capEnds?: boolean;
};

function sectionPoint(opts: BodyOptions, u: number, a: number) {
  const { bottom, top, widthScale } = opts.section(u);
  const p = 2 / opts.exponent;
  const c = Math.cos(a);
  const sn = Math.sin(a);
  let hf = opts.dome ? (sn > 0 ? Math.abs(sn) ** p : 0) : (spow(sn, p) + 1) / 2;
  if (opts.cap) hf = Math.min(hf, opts.cap(u));
  // The dome's floor is flat and sits exactly on its bottom: no sag into the foam.
  const y = bottom + (top - bottom) * hf;
  // A 0.2 mm floor on the width keeps the end rings from collapsing onto one line (clean booleans).
  const w = Math.max(halfWidth(u, c < 0), 0.002) * widthScale * (opts.profile ? opts.profile(hf, u) : 1);
  return { y, z: w * spow(c, p), hf };
}

/** Fan-cap one ring of `segments` vertices starting at `start` (skipped if it has collapsed to a line). */
function fanCap(positions: number[], indices: number[], start: number, segments: number, flip: boolean) {
  let cx = 0;
  let cy = 0;
  let cz = 0;
  for (let s = 0; s < segments; s++) {
    const i = (start + s) * 3;
    cx += positions[i];
    cy += positions[i + 1];
    cz += positions[i + 2];
  }
  const centre = positions.length / 3;
  positions.push(cx / segments, cy / segments, cz / segments);
  // A ring of zero width still gets a fan, so the body stays closed; Blender's remesh cleans the sliver.
  for (let s = 0; s < segments; s++) {
    const a = start + s;
    const b = start + ((s + 1) % segments);
    if (flip) indices.push(centre, b, a);
    else indices.push(centre, a, b);
  }
}

export function buildRingBody(opts: BodyOptions) {
  const { u0 = 0, u1 = 1, rings = 96, segments = 40, hole, capEnds = true } = opts;
  const positions: number[] = [];
  const meta: { u: number; z: number; hf: number }[] = [];

  for (let r = 0; r <= rings; r++) {
    const u = lerp(u0, u1, r / rings);
    for (let s = 0; s < segments; s++) {
      const pt = sectionPoint(opts, u, (s / segments) * Math.PI * 2);
      positions.push(xAt(u), pt.y, pt.z);
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
  if (capEnds) {
    fanCap(positions, indices, 0, segments, true);
    fanCap(positions, indices, rings * segments, segments, false);
  }

  return toGeometry(positions, indices);
}

function toGeometry(positions: number[], indices: number[]) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** three's TubeGeometry is open at both ends; close it with two fans. */
function cappedTube(curve: THREE.Curve<THREE.Vector3>, tubular: number, radius: number, radial: number) {
  const tube = new THREE.TubeGeometry(curve, tubular, radius, radial, false);
  const pos = Array.from(tube.attributes.position.array as Float32Array);
  const idx = Array.from(tube.index!.array as ArrayLike<number>);
  const ring = radial + 1; // TubeGeometry repeats the seam vertex
  for (const [start, flip] of [[0, false], [tubular * ring, true]] as const) {
    const centre = curve.getPointAt(start === 0 ? 0 : 1);
    const ci = pos.length / 3;
    pos.push(centre.x, centre.y, centre.z);
    for (let s = 0; s < radial; s++) {
      const a = start + s;
      const b = start + s + 1;
      if (flip) idx.push(ci, a, b);
      else idx.push(ci, b, a);
    }
  }
  tube.dispose();
  return toGeometry(pos, idx);
}

/** A closed box swept along u with a constant half-width: the fork cutter and its key. */
function sweptStrip(u0: number, u1: number, halfW: (u: number) => number, bottom: (u: number) => number, top: (u: number) => number, rings = 48) {
  const positions: number[] = [];
  const indices: number[] = [];
  // Four corners per ring: (-w, bottom) (w, bottom) (w, top) (-w, top), counter-clockwise seen from the toe.
  for (let r = 0; r <= rings; r++) {
    const u = lerp(u0, u1, r / rings);
    const w = halfW(u);
    const x = xAt(u);
    positions.push(x, bottom(u), -w, x, bottom(u), w, x, top(u), w, x, top(u), -w);
  }
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < 4; s++) {
      const a = r * 4 + s;
      const b = r * 4 + ((s + 1) % 4);
      const c = a + 4;
      const d = b + 4;
      indices.push(a, b, c, b, d, c);
    }
  }
  const last = rings * 4;
  indices.push(0, 3, 2, 0, 2, 1, last, last + 1, last + 2, last, last + 2, last + 3);
  return toGeometry(positions, indices);
}

/* ------------------------------------------------------------------- upper --- */

const UPPER_WIDTH = 0.95;
/** Narrower at the top, like a real last: this is what stops it reading as a loaf. */
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
    if (Math.abs(pz) > Math.abs(z)) lo = mid;
    else hi = mid;
  }
  return sectionPoint(upperOptions, u, (lo + hi) / 2);
}

const v3 = (u: number, y: number, z: number) => new THREE.Vector3(xAt(u), y, z);

/* --------------------------------------------------------------- the fork --- */

/** The plate's forefoot fork: a 12 mm slot down the centreline from u 0.58 to the toe. */
export const FORK = { u0: 0.58, u1: 1.02, halfWidth: 0.06 };
/** The carrier key stops just short of the toe tip and never gets wider than the sole there. */
export const KEY_U1 = 0.995;
/** The slot's rounded root, so the fork reads as engineered rather than sawn. */
export const forkHalf = (inset: number) => (u: number) =>
  Math.max(0.004, (FORK.halfWidth - inset) * Math.sqrt(clamp01((u - FORK.u0 - inset / SHOE_LENGTH) / 0.025)));
/** The carrier key's half-width: the slot minus the gap, never wider than the sole at the toe. */
export const keyHalf = (u: number) => Math.min(forkHalf(GAP)(u), halfWidth(u, true) * 0.85);

/* ------------------------------------------------------------------ build --- */

export type ShoeParts = ReturnType<typeof buildShoeParts>;

export function buildShoeParts() {
  // Outsole base: 4 mm minus the gap. The lugs hang below it (see lugLayout).
  const outsole = buildRingBody({
    exponent: 7,
    rings: 160,
    segments: 48,
    profile: (hf) => 1.03 - 0.02 * hf,
    section: (u) => ({ bottom: rocker(u), top: rocker(u) + OUTSOLE_T - GAP, widthScale: 1 }),
  });

  const carrier = buildRingBody({
    exponent: 5,
    rings: 160,
    segments: 48,
    // Flared base: wider at the ground for stability.
    profile: (hf) => 1.06 - 0.05 * hf,
    section: (u) => ({ bottom: carrierBottom(u), top: carrierTop(u) - GAP, widthScale: 1 }),
  });

  // The carrier's key: fills the plate's fork (shrunk by the gap on every side) and
  // dips 1 mm into the carrier so the remesh fuses the two into one solid.
  const carrierKey = sweptStrip(
    FORK.u0,
    KEY_U1,
    keyHalf,
    (u) => carrierTop(u) - GAP - 0.01,
    (u) => foamBottom(u) - GAP,
  );

  // Full width, so its edge shows as a thin line on the sidewall between carrier and foam.
  const plate = buildRingBody({
    exponent: 9,
    rings: 140,
    segments: 40,
    section: (u) => ({ bottom: carrierTop(u), top: carrierTop(u) + PLATE_T - GAP, widthScale: 1.012 }),
  });

  // The fork cutter, built in place along the plate's centreline (Blender subtracts it from the
  // plate only). Taller than the plate so the EXACT boolean never meets a coplanar face.
  const forkCutter = sweptStrip(
    FORK.u0,
    FORK.u1,
    forkHalf(0),
    (u) => carrierTop(u) - 0.006,
    (u) => foamBottom(u) + 0.004,
  );

  const foam = buildRingBody({
    exponent: 4,
    rings: 160,
    segments: 48,
    // Sculpted sidewall: a soft groove through the middle, rolled edge on top.
    profile: (hf) => 1.02 - 0.035 * bump(hf, 0.45, 0.16) - 0.03 * hf ** 3,
    section: (u) => ({ bottom: foamBottom(u), top: midsoleTop(u) - GAP, widthScale: 1 }),
  });

  const hole = (u: number, z: number, hf: number) => hf > 0.55 && inCollar(u, z);
  const upper = buildRingBody({ ...upperOptions, rings: 200, segments: 128, hole });

  // Heel counter: a firmer shell wrapping the back, cut in a sweeping line. Its floor is
  // the upper's floor, so it never dips into the foam. It is an OPEN band: the faces the
  // clamp flattens into a lid across the foot opening are dropped, and so are its end fans,
  // so no hidden shelf shows inside the x-ray's cuts. Blender solidifies it 1 mm.
  const counterCap = (u: number) => lerp(0.8, 0.12, smoothstep(0.03, 0.3, u));
  const heelCounter = buildRingBody({
    ...upperOptions,
    u0: 0,
    u1: 0.3,
    // Dense, so the clamped cut line along its top edge renders as a smooth sweep, not a zig-zag.
    rings: 120,
    segments: 256,
    cap: counterCap,
    capEnds: false,
    section: (u) => {
      const base = upperOptions.section(u);
      return { bottom: base.bottom, top: base.bottom + (base.top - base.bottom) * 1.025, widthScale: UPPER_WIDTH * 1.03 };
    },
    // Walls only: no lid, no floor (the upper has its own), so solidify can never push into the foam.
    hole: (u, z, hf) => hf <= 0.002 || hf >= counterCap(u) - 0.002 || (hf > 0.55 && inCollar(u, z, 1.02)),
  });

  // Toe bumper: a rubberised wrap over the front of the toe box. An open band too, for the same reason.
  const toeCapTop = (u: number) => lerp(0.18, 0.95, smoothstep(0.8, 0.98, u));
  const toeCap = buildRingBody({
    ...upperOptions,
    u0: 0.8,
    u1: 1,
    rings: 60,
    segments: 256,
    cap: toeCapTop,
    capEnds: false,
    hole: (u, _z, hf) => hf <= 0.002 || hf >= toeCapTop(u) - 0.002,
    section: (u) => {
      const base = upperOptions.section(u);
      return { bottom: base.bottom, top: base.bottom + (base.top - base.bottom) * 1.04, widthScale: UPPER_WIDTH * 1.035 };
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

  // Padded collar: a closed tube around the ankle opening, following the surface.
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
        const z = lerp(-0.12, 0.12, t);
        const u = uc + dir * (t - 0.5) * 0.04;
        const lift = 0.05 * Math.sin(t * Math.PI);
        pts.push(v3(u, upperSurface(u, z).y + 0.012 + lift, z));
      }
      laces.push(cappedTube(new THREE.CatmullRomCurve3(pts), 16, 0.011, 6));
    }
  }
  const rails = [-1, 1].map((side) => {
    const pts: THREE.Vector3[] = [];
    for (let j = 0; j <= 16; j++) {
      const u = lerp(0.34, 0.66, j / 16);
      const z = side * 0.13;
      pts.push(v3(u, upperSurface(u, z).y + 0.006, z));
    }
    return cappedTube(new THREE.CatmullRomCurve3(pts), 48, 0.018, 8);
  });

  // Two speed lines sweeping up the lateral side.
  const stripes = [0.3, 0.46].map((start) => {
    const pts: THREE.Vector3[] = [];
    for (let j = 0; j <= 20; j++) {
      const t = j / 20;
      const u = lerp(0.3, 0.86, t);
      const a = lerp(start, start - 0.22, t);
      const p = sectionPoint(upperOptions, u, a);
      pts.push(v3(u, p.y, p.z * 1.012 + 0.003));
    }
    return cappedTube(new THREE.CatmullRomCurve3(pts), 60, 0.008, 6);
  });

  return {
    outsole,
    lugs: lugLayout().map(lugGeometry),
    carrier,
    carrierKey,
    plate,
    forkCutter,
    foam,
    upper,
    heelCounter,
    toeCap,
    tongue,
    collar,
    laces,
    rails,
    stripes,
    heelBadge: heelBadge(),
  };
}

/* ------------------------------------------------------------------- lugs --- */

export type Lug = { u: number; x: number; z: number; rot: number };

/** 81 chevron lugs, 7.5 x 5.0 mm, staggered rows. Deterministic, so every render matches. */
export function lugLayout(): Lug[] {
  const lugs: Lug[] = [];
  const DU = 0.06;
  const DZ = 0.1;
  let row = 0;
  for (let u = 0.04; u <= 0.955; u += DU, row++) {
    const offset = (row % 2) * (DZ / 2);
    for (let z = -0.5 + offset; z <= 0.5; z += DZ) {
      const hw = halfWidth(u, z < 0);
      if (Math.abs(z) + 0.03 > hw * 0.86) continue;
      // Spread the rows out so the perimeter lugs sit flush with the outsole's edge: from the
      // side the tread reads as a row of teeth, as on a real trail outsole. 0.041 is a rotated
      // lug's half-extent across the shoe.
      const spread = Math.sign(z) * Math.min(Math.abs(z) * 1.12, hw * 1.01 - 0.041);
      lugs.push({ u, x: xAt(u), z: spread, rot: z >= 0 ? 0.55 : -0.55 });
    }
  }
  if (lugs.length !== 81) throw new Error(`lugLayout: expected 81 lugs, got ${lugs.length}`);
  return lugs;
}

const LUG = { length: 0.075, width: 0.05, overlap: 0.002, draft: 0.82 };

/**
 * One lug: a drafted block (its ground face is 82% of its root), rotated into a chevron,
 * with every corner following the rocker so lugs on the toe spring stand square to it.
 * Root 0.2 mm inside the outsole base, tip 3.0 mm below it.
 */
function lugGeometry(lug: Lug) {
  const c = Math.cos(lug.rot);
  const s = Math.sin(lug.rot);
  const corners: number[] = [];
  for (const [scale, depth] of [[LUG.draft, -LUG_T], [1, LUG.overlap]] as const) {
    for (const [lx, lz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
      const ox = (lx * LUG.length * scale) / 2;
      const oz = (lz * LUG.width * scale) / 2;
      const x = lug.x + ox * c - oz * s;
      const z = lug.z + ox * s + oz * c;
      const u = clamp01((x - xAt(0)) / SHOE_LENGTH);
      corners.push(x, rocker(u) + depth, z);
    }
  }
  // 0-3 ground face, 4-7 root face.
  const idx = [0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6];
  for (let k = 0; k < 4; k++) {
    const a = k;
    const b = (k + 1) % 4;
    idx.push(a, a + 4, b + 4, a, b + 4, b);
  }
  return toGeometry(corners, idx);
}

/* -------------------------------------------------------------- heel badge --- */

/**
 * The heel badge: a rigid, flat, rounded plate clipped onto the LATERAL heel counter,
 * where the hero and the cut stills can see it. Blender debosses 'HVNF' 0.4 mm into its
 * face (the studio's watermark, per the spec's heel-tab deboss). The plate is fitted to
 * the counter: its face is the counter's best-fit plane pushed 1 mm proud of the highest
 * point underneath, and it roots 3 mm into the shell, so it never floats.
 */
function heelBadge() {
  const U0 = 0.085;
  const U1 = 0.2;
  const HF0 = 0.19;
  const HF1 = 0.39;
  const PROUD = 0.01;
  const ROOT = 0.03;
  const RADIUS = 0.03;
  const counter = (u: number, hf: number) => {
    const a = Math.asin(Math.min(1, hf ** (upperOptions.exponent / 2)));
    const base = upperOptions.section(u);
    const opts: BodyOptions = {
      ...upperOptions,
      section: () => ({ bottom: base.bottom, top: base.bottom + (base.top - base.bottom) * 1.025, widthScale: UPPER_WIDTH * 1.03 }),
    };
    const p = sectionPoint(opts, u, a);
    return new THREE.Vector3(xAt(u), p.y, p.z);
  };
  // Best-fit plane through the patch's four corners and centre.
  const uc = (U0 + U1) / 2;
  const hc = (HF0 + HF1) / 2;
  const c = counter(uc, hc);
  const ex = counter(U1, hc).sub(counter(U0, hc)).normalize();
  const eyRaw = counter(uc, HF1).sub(counter(uc, HF0));
  const n = new THREE.Vector3().crossVectors(ex, eyRaw).normalize();
  if (n.z < 0) n.negate();
  const ey = new THREE.Vector3().crossVectors(n, ex).normalize();
  // Highest point of the counter above that plane, over the patch.
  let lift = 0;
  for (let i = 0; i <= 12; i++) {
    for (let j = 0; j <= 12; j++) {
      const q = counter(lerp(U0, U1, i / 12), lerp(HF0, HF1, j / 12));
      lift = Math.max(lift, q.sub(c).dot(n));
    }
  }
  const front = c.clone().addScaledVector(n, lift + PROUD);
  const halfS = counter(U1, hc).sub(counter(U0, hc)).length() / 2;
  const halfT = eyRaw.length() / 2;
  // Rounded-rectangle outline in (s, t), counter-clockwise seen from outside.
  const outline: [number, number][] = [];
  const corners: [number, number, number][] = [
    [halfS - RADIUS, -halfT + RADIUS, -Math.PI / 2],
    [halfS - RADIUS, halfT - RADIUS, 0],
    [-halfS + RADIUS, halfT - RADIUS, Math.PI / 2],
    [-halfS + RADIUS, -halfT + RADIUS, Math.PI],
  ];
  for (const [cs, ct, a0] of corners) {
    for (let k = 0; k <= 6; k++) {
      const a = a0 + (k / 6) * (Math.PI / 2);
      outline.push([cs + RADIUS * Math.cos(a), ct + RADIUS * Math.sin(a)]);
    }
  }
  const positions: number[] = [];
  const indices: number[] = [];
  const at = (s: number, t: number, depth: number) => {
    const p = front.clone().addScaledVector(ex, s).addScaledVector(ey, t).addScaledVector(n, -depth);
    positions.push(p.x, p.y, p.z);
  };
  const K = outline.length;
  for (const [s, t] of outline) at(s, t, 0);
  for (const [s, t] of outline) at(s, t, PROUD + lift + ROOT);
  at(0, 0, 0);
  at(0, 0, PROUD + lift + ROOT);
  const fc = 2 * K;
  const bc = 2 * K + 1;
  for (let k = 0; k < K; k++) {
    const a = k;
    const b = (k + 1) % K;
    indices.push(fc, a, b);
    indices.push(bc, b + K, a + K);
    indices.push(a, a + K, b, b, a + K, b + K);
  }
  return {
    geometry: toGeometry(positions, indices),
    /** Where the lettering sits (three axes): the badge's front face, its normal and its reading direction. */
    text: {
      centre: [front.x, front.y, front.z] as const,
      normal: [n.x, n.y, n.z] as const,
      along: [ex.x, ex.y, ex.z] as const,
      capHeight: 0.062,
      depth: 0.004,
    },
  };
}
