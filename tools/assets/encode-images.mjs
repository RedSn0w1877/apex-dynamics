// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.
//
// Stage: Blender's PNGs in .work/ -> AVIF + WebP stills and WebP textures in src/assets/apex/,
// then regenerate src/assets/apex/index.ts with each file's measured width and height
// (Turbopack misreads AVIF headers, so the manifest never trusts StaticImageData sizes).
//
// Run: node tools/assets/encode-images.mjs [--only hero,wind,...] [--dry]
//
// Every file carries an EXIF copyright. Every budget is enforced: if a file is over, the
// quality steps down (never below the floor below); if it is still over, the run fails
// and writes nothing for that file. Inside poster and cuts are flattened onto --night
// (#0b0c0a), the colour the live x-ray clears to; hero and wind keep their alpha.
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(here, "../..");
const require = createRequire(path.join(SITE, "package.json"));
const sharp = require("sharp");

const WORK = path.join(here, ".work");
const DEST = path.join(SITE, "src/assets/apex");
const NIGHT = "#0b0c0a";
const COPYRIGHT = "Copyright 2026 HVNF Studios. All rights reserved. Portfolio sample - do not redistribute.";
const EXIF = { IFD0: { Copyright: COPYRIGHT, Artist: "HVNF Studios", ImageDescription: "Apex Dynamics Prototype 04 (portfolio sample)" } };
const KB = 1024;

const AVIF = { quality: 55, effort: 6, chromaSubsampling: "4:4:4" };
const WEBP = { quality: 76, effort: 6, smartSubsample: true, alphaQuality: 90 };
const FLOOR = { avif: 36, webp: 56 };

// name, source PNG, widths (largest first, = the source width), flatten?, per-width AVIF budgets
const STILLS = [
  // The hero is the launch gate (and the LCP image): it starts at a higher AVIF quality and steps down only if over budget.
  { key: "hero", src: "still-hero.png", widths: [1800, 900], flatten: false, avif: { 1800: 60, 900: 30 }, avifQ: 70 },
  { key: "inside-poster", src: "still-inside.png", widths: [1600, 960], flatten: true, avif: { 1600: 40, 960: 24 } },
  ...[0, 1, 2, 3, 4, 5].map((i) => ({ key: `cut-${i}`, src: `still-cut-${i}.png`, widths: [1200, 720], flatten: true, avif: { 1200: 30, 720: 16 } })),
  { key: "wind", src: "still-wind.png", widths: [1600, 800], flatten: false, avif: { 1600: 50, 800: 25 } },
];
// WebP is the fallback for browsers without AVIF (the spec budgets AVIF only); it gets 2x the AVIF budget.
const WEBP_FACTOR = 2;
const TEXTURES = [
  { key: "atlas", src: "atlas.png", size: [2048, 2048], quality: 80, budget: 150, alpha: false },
  { key: "matcap", src: "matcap.png", size: [256, 256], quality: 85, budget: 12, alpha: false },
  { key: "shadow", src: "shadow.png", size: [512, 160], quality: 80, budget: 15, alpha: true },
];

const argv = process.argv.slice(2);
const only = argv.includes("--only") ? new Set(argv[argv.indexOf("--only") + 1].split(",")) : null;
const dry = argv.includes("--dry");
mkdirSync(DEST, { recursive: true });

const rows = [];
let failed = false;

async function fit(make, budgetKb, start, floor, label) {
  for (let q = start; q >= floor; q -= 4) {
    const buf = await make(q);
    if (buf.length <= budgetKb * KB) return { buf, q };
    if (q - 4 < floor) {
      console.error(`FAIL ${label}: ${(buf.length / KB).toFixed(1)} KB at quality ${q}, budget ${budgetKb} KB`);
      failed = true;
      return null;
    }
  }
  return null;
}

async function source(file, flatten) {
  const p = path.join(WORK, file);
  if (!existsSync(p)) throw new Error(`missing ${path.relative(SITE, p)}: run the Blender stage first`);
  let img = sharp(p);
  if (flatten) img = img.flatten({ background: NIGHT });
  return img;
}

for (const s of STILLS) {
  if (only && !only.has(s.key)) continue;
  const base = await source(s.src, s.flatten);
  const meta = await sharp(path.join(WORK, s.src)).metadata();
  if (meta.width !== s.widths[0]) throw new Error(`${s.src} is ${meta.width} px wide; expected ${s.widths[0]} (render at --scale 1)`);
  for (const w of s.widths) {
    const resized = () => base.clone().resize({ width: w, kernel: "lanczos3" }).withExif(EXIF);
    const avifBudget = s.avif[w];
    const a = await fit((q) => resized().avif({ ...AVIF, quality: q }).toBuffer(), avifBudget, s.avifQ ?? AVIF.quality, FLOOR.avif, `${s.key}-${w}.avif`);
    const webpBudget = Math.round(avifBudget * WEBP_FACTOR);
    const b = await fit((q) => resized().webp({ ...WEBP, quality: q }).toBuffer(), webpBudget, WEBP.quality, FLOOR.webp, `${s.key}-${w}.webp`);
    for (const [ext, r, budget] of [["avif", a, avifBudget], ["webp", b, webpBudget]]) {
      if (!r) continue;
      const out = path.join(DEST, `${s.key}-${w}.${ext}`);
      const m = await sharp(r.buf).metadata();
      if (!dry) writeFileSync(out, r.buf);
      rows.push({ file: path.basename(out), w: m.width, h: m.height, kb: r.buf.length / KB, budget, q: r.q });
    }
  }
}

for (const t of TEXTURES) {
  if (only && !only.has(t.key)) continue;
  const img = await source(t.src, !t.alpha);
  const make = (q) =>
    img
      .clone()
      .resize(t.size[0], t.size[1], { fit: "fill" })
      .withExif(EXIF)
      .webp({ quality: q, effort: 6, alphaQuality: 90, smartSubsample: true })
      .toBuffer();
  const r = await fit(make, t.budget, t.quality, FLOOR.webp, `${t.key}.webp`);
  if (!r) continue;
  const out = path.join(DEST, `${t.key}.webp`);
  const m = await sharp(r.buf).metadata();
  if (!dry) writeFileSync(out, r.buf);
  rows.push({ file: path.basename(out), w: m.width, h: m.height, kb: r.buf.length / KB, budget: t.budget, q: r.q });
}

for (const r of rows) {
  console.log(`${r.file.padEnd(26)} ${String(r.w).padStart(5)} x ${String(r.h).padEnd(5)} ${r.kb.toFixed(1).padStart(6)} KB / ${String(r.budget).padStart(3)} KB  q${r.q}`);
}
if (failed) {
  console.error("FAIL: at least one file is over budget; index.ts not regenerated.");
  process.exit(1);
}

// ------------------------------------------------------------------- manifest ---
const files = readdirSync(DEST).filter((f) => /\.(avif|webp)$/.test(f));
const size = {};
for (const f of files) {
  const m = await sharp(path.join(DEST, f)).metadata();
  size[f] = [m.width, m.height];
}
const ident = (f) =>
  f
    .replace(/\.(avif|webp)$/, (_, e) => `-${e}`)
    .split("-")
    .map((part, i) => (i ? part[0].toUpperCase() + part.slice(1) : part))
    .join("");
const need = (f) => {
  if (!size[f]) throw new Error(`index.ts needs ${f}, which is not in src/assets/apex`);
  return f;
};
const entry = (f) => `{ file: ${ident(need(f))}, width: ${size[f][0]}, height: ${size[f][1]} }`;
const stillTs = (key, widths, indent) => {
  const asc = [...widths].sort((x, y) => x - y);
  const pad = " ".repeat(indent);
  return [
    `{`,
    `${pad}  avif: [`,
    ...asc.map((w) => `${pad}    ${entry(`${key}-${w}.avif`)},`),
    `${pad}  ],`,
    `${pad}  webp: [`,
    ...asc.map((w) => `${pad}    ${entry(`${key}-${w}.webp`)},`),
    `${pad}  ],`,
    `${pad}}`,
  ].join("\n");
};
const imports = [];
for (const s of STILLS) {
  for (const w of [...s.widths].sort((x, y) => y - x)) {
    for (const ext of ["avif", "webp"]) imports.push(`import ${ident(`${s.key}-${w}.${ext}`)} from "./${s.key}-${w}.${ext}";`);
  }
}
for (const t of TEXTURES) imports.push(`import ${ident(`${t.key}.webp`)} from "./${t.key}.webp";`);

const ts = `// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

// Asset manifest for the stills and the x-ray textures. GENERATED by
// tools/assets/encode-images.mjs from the Blender renders (tools/assets/proto04.py);
// re-run it rather than hand-editing. Sizes are measured from the encoded files.
import type { StaticImageData } from "next/image";

${imports.join("\n")}

/**
 * One encoded file. Its size is written here, not read off the import: Turbopack
 * misreads AVIF headers, so StaticImageData.width is wrong for every AVIF.
 */
export type ImageFile = { file: StaticImageData; width: number; height: number };

/** One still in both formats, narrowest file first (AVIF first in a <picture>, WebP as the <img>). */
export type Still = { avif: readonly ImageFile[]; webp: readonly ImageFile[] };

export const STILLS: {
  /** Lateral side, toe right, rising -6°, alpha. 2:1. */
  hero: Still;
  /** CAMERA_LIVE at cut 0: the poster the live x-ray fades in over. 16:9, on --night. */
  insidePoster: Still;
  /** CAMERA_STILLS at each of the six CUT_STATIONS, index = station. 4:3, on --night. */
  cuts: readonly Still[];
  /** The left shoe, toe pointing left, level, alpha. 1600 x 560 viewBox for the streamlines. */
  wind: Still;
} = {
  hero: ${stillTs("hero", [1800, 900], 2)},
  insidePoster: ${stillTs("inside-poster", [1600, 960], 2)},
  cuts: [
${[0, 1, 2, 3, 4, 5].map((i) => `    ${stillTs(`cut-${i}`, [1200, 720], 4)},`).join("\n")}
  ],
  wind: ${stillTs("wind", [1600, 800], 2)},
};

/** The live x-ray's textures, fetched as ImageBitmaps by src (TEXTURES.atlas.file.src). */
export const TEXTURES: {
  /** Baked albedo x AO for all five layers, one shared UV atlas. */
  atlas: ImageFile;
  /** The lighting: a lit sphere sampled by normal. */
  matcap: ImageFile;
  /** Baked contact shadow for the ground quad (alpha). */
  shadow: ImageFile;
} = {
  atlas: ${entry("atlas.webp")},
  matcap: ${entry("matcap.webp")},
  shadow: ${entry("shadow.webp")},
};
`;
if (!dry) writeFileSync(path.join(DEST, "index.ts"), ts);
const total = files.reduce((n, f) => n + statSync(path.join(DEST, f)).size, 0);
console.log(`${dry ? "dry run, index.ts not written" : "index.ts regenerated"} (${files.length} files, ${(total / KB).toFixed(1)} KB in src/assets/apex)`);
