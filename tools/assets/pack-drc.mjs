// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.
//
// Stage: the plain low GLB from Blender -> public/proto04/proto04.bin, one Draco pack.
// Run: node tools/assets/pack-drc.mjs [in.glb] [out.bin]
//
// Format (read by src/components/inside/xray-scene.ts):
//   [u32 LE headerLen][UTF-8 JSON header][drc blob][drc blob]...
//   header = { v: 1, copyright, unit: '1 = 100 mm', layers: [{ name, offset, length, tris, verts, bbox }] }
// Offsets are relative to the end of the header. Layers in stack order: outsole, carrier,
// plate, foam, upper. Each blob is a standalone draco3d 1.5.7 mesh (edgebreaker, speed 0/5,
// quantisation 14 position / 10 normal / 12 UV) that three's glTF-variant decoder reads.
// Fails over 120 KB: GitHub Pages doesn't gzip .bin, and Draco barely gzips anyway.
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(here, "../..");
// draco3d lives in the studio root's node_modules (the site doesn't depend on it).
const draco3d = require(path.resolve(SITE, "../node_modules/draco3d"));

const BUDGET = 120 * 1024;
const ORDER = ["outsole", "carrier", "plate", "foam", "upper"];
const COPYRIGHT = "© 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.";
const [glbPath = path.join(here, ".work/proto04-low.glb"), outPath = path.join(SITE, "public/proto04/proto04.bin")] = process.argv.slice(2);

const glb = readFileSync(glbPath);
if (glb.readUInt32LE(0) !== 0x46546c67) throw new Error(`${glbPath} is not a GLB`);
const jsonLen = glb.readUInt32LE(12);
const json = JSON.parse(glb.subarray(20, 20 + jsonLen).toString("utf8"));
const binStart = 20 + jsonLen + 8;
const bin = glb.subarray(binStart);
const COMP = { 5126: Float32Array, 5123: Uint16Array, 5125: Uint32Array, 5121: Uint8Array };
const NCOMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
function accessor(i) {
  const a = json.accessors[i];
  const bv = json.bufferViews[a.bufferView];
  const T = COMP[a.componentType];
  const off = (bv.byteOffset || 0) + (a.byteOffset || 0);
  const n = a.count * NCOMP[a.type];
  return new T(bin.buffer.slice(bin.byteOffset + off, bin.byteOffset + off + n * T.BYTES_PER_ELEMENT));
}

const enc = await draco3d.createEncoderModule({});
const byName = {};
for (const node of json.nodes) if (node.mesh !== undefined) byName[node.name] = json.meshes[node.mesh];
const blobs = [];
const layers = [];
let offset = 0;
for (const name of ORDER) {
  if (!byName[name]) throw new Error(`layer ${name} missing from ${glbPath}`);
  const prims = byName[name].primitives;
  if (prims.length !== 1) throw new Error(`layer ${name} has ${prims.length} primitives; expected 1`);
  const prim = prims[0];
  const pos = accessor(prim.attributes.POSITION);
  const nor = accessor(prim.attributes.NORMAL);
  const uv = accessor(prim.attributes.TEXCOORD_0);
  const idx = accessor(prim.indices);
  const builder = new enc.MeshBuilder();
  const mesh = new enc.Mesh();
  const nPts = pos.length / 3;
  builder.AddFacesToMesh(mesh, idx.length / 3, Uint32Array.from(idx));
  builder.AddFloatAttributeToMesh(mesh, enc.POSITION, nPts, 3, pos);
  builder.AddFloatAttributeToMesh(mesh, enc.NORMAL, nPts, 3, nor);
  builder.AddFloatAttributeToMesh(mesh, enc.TEX_COORD, nPts, 2, uv);
  const e = new enc.Encoder();
  e.SetSpeedOptions(0, 5);
  e.SetEncodingMethod(enc.MESH_EDGEBREAKER_ENCODING);
  e.SetAttributeQuantization(enc.POSITION, 14);
  e.SetAttributeQuantization(enc.NORMAL, Number(process.env.NORMAL_BITS || 10));
  e.SetAttributeQuantization(enc.TEX_COORD, 12);
  const out = new enc.DracoInt8Array();
  const len = e.EncodeMeshToDracoBuffer(mesh, out);
  if (!len) throw new Error(`draco failed on ${name}`);
  const buf = Buffer.alloc(len);
  for (let i = 0; i < len; i++) buf[i] = out.GetValue(i) & 0xff;
  const mn = [Infinity, Infinity, Infinity];
  const mx = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      mn[k] = Math.min(mn[k], pos[i + k]);
      mx[k] = Math.max(mx[k], pos[i + k]);
    }
  }
  layers.push({ name, offset, length: len, tris: idx.length / 3, verts: nPts, bbox: [...mn, ...mx].map((v) => +v.toFixed(4)) });
  blobs.push(buf);
  offset += len;
  enc.destroy(out);
  enc.destroy(e);
  enc.destroy(mesh);
  enc.destroy(builder);
}

const header = Buffer.from(JSON.stringify({ v: 1, copyright: COPYRIGHT, unit: "1 = 100 mm", layers }), "utf8");
const lenBuf = Buffer.alloc(4);
lenBuf.writeUInt32LE(header.length, 0);
const pack = Buffer.concat([lenBuf, header, ...blobs]);

for (const l of layers) {
  console.log(`${l.name.padEnd(8)} tris ${String(l.tris).padStart(5)}  verts ${String(l.verts).padStart(5)}  bytes ${String(l.length).padStart(6)}  B/tri ${(l.length / l.tris).toFixed(2)}`);
}
const kb = (pack.length / 1024).toFixed(1);
console.log(`PACK ${pack.length} B (${kb} KB of ${BUDGET / 1024} KB budget), gzip ${gzipSync(pack, { level: 9 }).length} B, header ${header.length} B`);
if (pack.length > BUDGET) {
  console.error(`FAIL: proto04.bin is ${kb} KB, over the 120 KB budget. Lower the upper's target (proto04.py -- layers --target-upper 8000) or NORMAL_BITS=9.`);
  process.exit(1);
}
mkdirSync(path.dirname(outPath), { recursive: true });
writeFileSync(outPath, pack);
console.log("wrote", path.relative(SITE, outPath));
