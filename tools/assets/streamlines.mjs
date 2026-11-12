// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.
//
// Stage: streamlines around the wind still -> src/components/wind/streamlines.data.ts.
// Run: node tools/assets/streamlines.mjs [.work/wind-alpha.png]
//
// Ideal (potential) flow past the shoe's silhouette, so the lines bend around the real
// render rather than a guessed shape:
//   1. Obstacle mask: the still's alpha > 0.5, dilated by 2 cells, on a 400 x 140 grid
//      (4 px per cell in the 1600 x 560 frame).
//   2. Stream function psi by SOR (omega 1.9, 2000 sweeps) of Laplace's equation, with
//      psi = height on the top, left and right edges (uniform flow, left to right),
//      psi = 0 on the ground, psi = const on the shoe (the level of its stagnation point).
//   3. 48 evenly spaced levels traced by marching squares, simplified (RDP, 1.5 px),
//      written as relative 'l' commands at 1 decimal, each starting at its left end
//      so the dash animation runs with the air.
// Output must stay under 12 KB: it is loaded by dynamic import when #wind comes near.
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(here, "../..");
const require = createRequire(path.join(SITE, "package.json"));
const sharp = require("sharp");

const SRC = process.argv[2] || path.join(here, ".work/wind-alpha.png");
const OUT = path.join(SITE, "src/components/wind/streamlines.data.ts");
const VIEW_W = 1600;
const VIEW_H = 560;
const NX = 400;
const NY = 140;
const CELL = VIEW_W / NX;
const LEVELS = 48;
const OMEGA = 1.9;
const SWEEPS = 2000;
const EPS = 1.5;
const BUDGET = 12 * 1024;

// ---- 1. obstacle mask ------------------------------------------------------------
// wind-alpha.png is grey (alpha copied into RGB); a raw RGBA still works too, via its alpha channel.
const srcMeta = await sharp(SRC).metadata();
const alphaStats = srcMeta.hasAlpha ? (await sharp(SRC).stats()).channels[3] : null;
const useAlpha = alphaStats && alphaStats.min !== alphaStats.max;
const { data, info } = await sharp(SRC).extractChannel(useAlpha ? 3 : 0).resize(NX, NY, { kernel: "linear" }).raw().toBuffer({ resolveWithObject: true });
if (info.width !== NX || info.height !== NY) throw new Error("unexpected mask size");
let solid = new Uint8Array(NX * NY);
for (let i = 0; i < NX * NY; i++) solid[i] = data[i] > 127 ? 1 : 0;
for (let pass = 0; pass < 2; pass++) {
  const next = solid.slice();
  for (let y = 0; y < NY; y++) {
    for (let x = 0; x < NX; x++) {
      if (solid[y * NX + x]) continue;
      if ((x > 0 && solid[y * NX + x - 1]) || (x < NX - 1 && solid[y * NX + x + 1]) || (y > 0 && solid[(y - 1) * NX + x]) || (y < NY - 1 && solid[(y + 1) * NX + x])) next[y * NX + x] = 1;
    }
  }
  solid = next;
}
const solidCount = solid.reduce((n, v) => n + v, 0);
if (!solidCount) throw new Error("the wind still has no opaque pixels");

// Row 0 is the top of the image; psi is measured up from the ground (bottom row = 0).
const up = (row) => NY - 1 - row;
// The stagnation level. The shoe stands a few millimetres above the ground wall, so the
// dividing streamline sits at the bottom of that gap: only the gap's own share of the
// oncoming flow (psi = its height) passes underneath, and everything above goes over the top.
// (A level taken from the toe's height would force a third of the lines through the gap.)
let lowest = NY;
for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) if (solid[y * NX + x]) lowest = Math.min(lowest, up(y));
const PSI_BODY = Math.max(0, lowest);

// ---- 2. SOR ------------------------------------------------------------------------
const psi = new Float64Array(NX * NY);
const fixed = new Uint8Array(NX * NY);
for (let y = 0; y < NY; y++) {
  for (let x = 0; x < NX; x++) {
    const i = y * NX + x;
    if (y === NY - 1) {
      psi[i] = 0;
      fixed[i] = 1;
    } else if (y === 0 || x === 0 || x === NX - 1) {
      psi[i] = up(y);
      fixed[i] = 1;
    } else if (solid[i]) {
      psi[i] = PSI_BODY;
      fixed[i] = 1;
    } else {
      psi[i] = up(y);
    }
  }
}
let residual = 0;
for (let it = 0; it < SWEEPS; it++) {
  residual = 0;
  for (let y = 1; y < NY - 1; y++) {
    for (let x = 1; x < NX - 1; x++) {
      const i = y * NX + x;
      if (fixed[i]) continue;
      const r = (psi[i - 1] + psi[i + 1] + psi[i - NX] + psi[i + NX]) / 4 - psi[i];
      psi[i] += OMEGA * r;
      residual = Math.max(residual, Math.abs(r));
    }
  }
}

// ---- 3. contours -------------------------------------------------------------------
const top = up(0);
const levels = Array.from({ length: LEVELS }, (_, k) => ((k + 0.5) / LEVELS) * top);

function trace(level) {
  // Marching squares over node values. Each crossing sits on one grid edge, so the edge's key
  // identifies the point; cells link their two crossings, and the links are walked into lines.
  const P = new Map();
  const adj = new Map();
  const link = (p, q) => {
    P.set(p.k, p);
    P.set(q.k, q);
    (adj.get(p.k) || adj.set(p.k, []).get(p.k)).push(q.k);
    (adj.get(q.k) || adj.set(q.k, []).get(q.k)).push(p.k);
  };
  const pt = (x0, y0, x1, y1) => {
    const v0 = psi[y0 * NX + x0];
    const v1 = psi[y1 * NX + x1];
    const t = (level - v0) / (v1 - v0);
    const k = x0 === x1 ? `v${x0},${Math.min(y0, y1)}` : `h${Math.min(x0, x1)},${y0}`;
    return { k, x: (x0 + (x1 - x0) * t) * CELL + CELL / 2, y: (y0 + (y1 - y0) * t) * CELL + CELL / 2 };
  };
  for (let y = 0; y < NY - 1; y++) {
    for (let x = 0; x < NX - 1; x++) {
      const a = psi[y * NX + x] > level;
      const b = psi[y * NX + x + 1] > level;
      const c = psi[(y + 1) * NX + x + 1] > level;
      const d = psi[(y + 1) * NX + x] > level;
      const e = [];
      if (a !== b) e.push(pt(x, y, x + 1, y));
      if (b !== c) e.push(pt(x + 1, y, x + 1, y + 1));
      if (c !== d) e.push(pt(x, y + 1, x + 1, y + 1));
      if (d !== a) e.push(pt(x, y, x, y + 1));
      if (e.length === 2) link(e[0], e[1]);
      else if (e.length === 4) {
        link(e[0], e[1]);
        link(e[2], e[3]);
      }
    }
  }
  const seen = new Set();
  const lines = [];
  // Open lines first (they start on the frame's edge), then any closed loops.
  const starts = [...adj.keys()].sort((p, q) => adj.get(p).length - adj.get(q).length);
  for (const start of starts) {
    if (seen.has(start)) continue;
    const line = [P.get(start)];
    seen.add(start);
    let cur = start;
    for (;;) {
      const next = adj.get(cur).find((k) => !seen.has(k));
      if (!next) break;
      seen.add(next);
      line.push(P.get(next));
      cur = next;
    }
    if (line.length > 4) lines.push(line);
  }
  return lines;
}

function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  let max = 0;
  let idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs(dy * pts[i].x - dx * pts[i].y + b.x * a.y - b.y * a.x) / len;
    if (d > max) {
      max = d;
      idx = i;
    }
  }
  if (max <= eps) return [a, b];
  return [...rdp(pts.slice(0, idx + 1), eps).slice(0, -1), ...rdp(pts.slice(idx), eps)];
}

const r1 = (v) => {
  const s = (Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, "");
  return s === "-0" ? "0" : s;
};
const paths = [];
for (const level of levels) {
  for (let line of trace(level)) {
    if (line[0].x > line[line.length - 1].x) line = line.reverse();
    // Keep only lines that cross most of the frame: short loops in corners are solver noise.
    if (line[line.length - 1].x - line[0].x < VIEW_W * 0.5) continue;
    const s = rdp(line, EPS);
    let d = `M${r1(s[0].x)} ${r1(s[0].y)}l`;
    let px = Math.round(s[0].x * 10) / 10;
    let py = Math.round(s[0].y * 10) / 10;
    const parts = [];
    for (let i = 1; i < s.length; i++) {
      const x = Math.round(s[i].x * 10) / 10;
      const y = Math.round(s[i].y * 10) / 10;
      parts.push(`${r1(x - px)} ${r1(y - py)}`);
      px = x;
      py = y;
    }
    d += parts.join(" ").replace(/ -/g, "-");
    paths.push(d);
  }
}

const ts = `// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

// Streamlines around the wind still, in the still's own 1600 x 560 viewBox. GENERATED by
// tools/assets/streamlines.mjs: ideal flow past the render's silhouette (stream function by
// SOR, ${LEVELS} levels, marching squares, RDP ${EPS} px). Illustrative, not a wind-tunnel
// measurement. Loaded by dynamic import, never in the first bundle. Don't hand-edit.
export const STREAMLINES: { readonly viewBox: string; readonly paths: readonly string[] } = {
  viewBox: "0 0 ${VIEW_W} ${VIEW_H}",
  paths: [
${paths.map((p) => `    "${p}",`).join("\n")}
  ],
};
`;
const bytes = Buffer.byteLength(ts);
console.log(`streamlines: ${paths.length} paths, psi body ${PSI_BODY.toFixed(1)} of ${top}, residual ${residual.toExponential(2)}, obstacle ${solidCount} cells, ${(bytes / 1024).toFixed(1)} KB`);
if (bytes > BUDGET) {
  console.error(`FAIL: streamlines.data.ts is ${(bytes / 1024).toFixed(1)} KB, over 12 KB. Raise EPS or lower LEVELS.`);
  process.exit(1);
}
if (process.argv.includes("--dry")) process.exit(0);
writeFileSync(OUT, ts);
console.log("wrote", path.relative(SITE, OUT));
