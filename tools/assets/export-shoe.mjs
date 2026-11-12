// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.
//
// Stage 1 of the asset pipeline: the procedural shoe -> .work/shoe-hi.obj for Blender.
// Run: node tools/assets/export-shoe.mjs   (Node 24 strips the TypeScript types itself)
//
// Writes named objects in Blender's axes, (x, y, z) three -> (x, -z, y) Blender, and
// .work/shoe-meta.json with everything proto04.py needs: the layer groups, the lug
// count, the heel badge frame, both cameras, the cut stations and the SHOE figures.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as Spec from "../../src/lib/shoe-spec.ts";
import { FORK, KEY_U1, buildShoeParts, forkHalf, keyHalf, lugLayout } from "./procedural-shoe.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const WORK = path.join(here, ".work");
mkdirSync(WORK, { recursive: true });

const toBlender = ([x, y, z]) => [x, -z, y];

function chunk(name, g, offset) {
  const pos = g.attributes.position;
  const lines = [`o ${name}`];
  for (let i = 0; i < pos.count; i++) {
    const [x, y, z] = toBlender([pos.getX(i), pos.getY(i), pos.getZ(i)]);
    lines.push(`v ${x.toFixed(5)} ${y.toFixed(5)} ${z.toFixed(5)}`);
  }
  const idx = g.index ? Array.from(g.index.array) : Array.from({ length: pos.count }, (_, i) => i);
  for (let i = 0; i < idx.length; i += 3) lines.push(`f ${idx[i] + 1 + offset} ${idx[i + 1] + 1 + offset} ${idx[i + 2] + 1 + offset}`);
  return { text: lines.join("\n"), count: pos.count, tris: idx.length / 3 };
}

const p = buildShoeParts();
const parts = [
  ["outsole", p.outsole],
  ...p.lugs.map((g, i) => [`lug_${i}`, g]),
  ["carrier", p.carrier],
  ["carrierKey", p.carrierKey],
  ["plate", p.plate],
  ["forkCutter", p.forkCutter],
  ["foam", p.foam],
  ["upper", p.upper],
  ["heelCounter", p.heelCounter],
  ["toeCap", p.toeCap],
  ["tongue", p.tongue],
  ["collar", p.collar],
  ...p.laces.map((g, i) => [`lace_${i}`, g]),
  ...p.rails.map((g, i) => [`rail_${i}`, g]),
  ...p.stripes.map((g, i) => [`stripe_${i}`, g]),
  ["heelBadge", p.heelBadge.geometry],
];

let offset = 0;
let tris = 0;
const out = ["# © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute."];
for (const [name, g] of parts) {
  const c = chunk(name, g, offset);
  out.push(c.text);
  offset += c.count;
  tris += c.tris;
}
writeFileSync(path.join(WORK, "shoe-hi.obj"), out.join("\n") + "\n");

const names = parts.map(([n]) => n);
const meta = {
  copyright: "© 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.",
  unit: "1 = 100 mm",
  axes: "Blender (x, -z, y) of three's (x, y, z)",
  // Each layer is joined and remeshed on its own; nothing crosses between groups.
  groups: {
    outsole: ["outsole", ...names.filter((n) => n.startsWith("lug_"))],
    carrier: ["carrier", "carrierKey"],
    plate: ["plate"],
    foam: ["foam"],
    upper: ["upper", "heelCounter", "toeCap", "tongue", "collar", "heelBadge", ...names.filter((n) => /^(lace|rail|stripe)_/.test(n))],
  },
  // Blender solidifies these open shells (offset -1, rim fill) before the remesh, in metres of scene units.
  solidify: { upper: 0.014, heelCounter: 0.01, toeCap: 0.01 },
  cutter: { plate: "forkCutter" },
  lugs: lugLayout().length,
  fork: FORK,
  heelBadge: {
    centre: toBlender(p.heelBadge.text.centre),
    normal: toBlender(p.heelBadge.text.normal),
    along: toBlender(p.heelBadge.text.along),
    capHeight: p.heelBadge.text.capHeight,
    depth: p.heelBadge.text.depth,
  },
  CAMERA_LIVE: Spec.CAMERA_LIVE,
  CAMERA_STILLS: Spec.CAMERA_STILLS,
  CUT_STATIONS: Spec.CUT_STATIONS,
  CUT_MAX_U: Spec.CUT_MAX_U,
  SHOE: Spec.SHOE,
  SHOE_LENGTH: Spec.SHOE_LENGTH,
  // Section cap colours (the x-ray's BackSide caps; shoe-layers.ts capColor).
  CAPS: { outsole: "#2B2F2A", carrier: "#6F746B", plate: "#CCFF00", foam: "#E9E9E2", upper: "#A2A79C" },
  // Stack at a few stations, for the stills report: heel 38, toe 30.
  // Profiles sampled along u (1001 points), for proto04.py's post-decimation clamp: it keeps the
  // low carrier (and its fork key) clear of the plate, which decimation alone does not guarantee.
  profile: {
    n: 1001,
    carrierTop: Array.from({ length: 1001 }, (_, i) => +Spec.carrierTop(i / 1000).toFixed(6)),
    slotHalf: Array.from({ length: 1001 }, (_, i) => { const u = i / 1000; return u < FORK.u0 ? 0 : +forkHalf(0)(u).toFixed(6); }),
    keyHalf: Array.from({ length: 1001 }, (_, i) => { const u = i / 1000; return u < FORK.u0 || u > KEY_U1 ? 0 : +keyHalf(u).toFixed(6); }),
  },
  stackMm: Spec.CUT_STATIONS.map((s) => ({ u: s.u, mm: +((Spec.midsoleTop(s.u) - Spec.rocker(s.u)) * Spec.UNIT_MM).toFixed(2) })),
};
writeFileSync(path.join(WORK, "shoe-meta.json"), JSON.stringify(meta, null, 1));

const heel = (Spec.midsoleTop(0.1) - Spec.rocker(0.1)) * Spec.UNIT_MM;
const fore = (Spec.midsoleTop(0.85) - Spec.rocker(0.85)) * Spec.UNIT_MM;
console.log(`shoe-hi.obj: ${parts.length} parts, ${offset} verts, ${tris} tris; ${meta.lugs} lugs`);
console.log(`stack heel ${heel.toFixed(1)} mm, forefoot ${fore.toFixed(1)} mm (spec ${Spec.SHOE.stackHeelMm}/${Spec.SHOE.stackForefootMm})`);
