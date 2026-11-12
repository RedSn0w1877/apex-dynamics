<!-- © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute. -->

# Prototype 04 asset pipeline

Offline tools that turn the procedural shoe into everything the site ships for it: the hero
still, the x-ray poster and cut stills, the wind still, the Draco pack the live x-ray
decodes, its baked textures, and the wind streamlines. Nothing here runs in the browser or
in `next build`. The folder is excluded from `tsconfig.json` and ESLint, and intermediates go to
`tools/assets/.work/` (gitignored).

Every figure comes from `src/lib/shoe-spec.ts`: the 38/30 mm stack, 3.0 mm lugs, 2.2 mm
plate, 0.3 mm layer gaps, both cameras and the six cut stations. Change it there, then re-run
from step 1.

## Run order

Run from the site folder. Blender always goes through the shared slot runner
(`TOOLS/blender.mjs`), one stage per call, so the single machine-wide Blender slot is held
for minutes, not the whole pipeline.

| # | command | writes | time* |
|---|---|---|---|
| 1 | `node tools/assets/export-shoe.mjs` | `.work/shoe-hi.obj`, `.work/shoe-meta.json` | 2 s |
| 2 | `node TOOLS/blender.mjs tools/assets/proto04.py -- layers` | `.work/proto04-low.glb`, `.work/layers.blend` | ~3 min |
| 2b | `node TOOLS/blender.mjs tools/assets/proto04.py -- verify` | `.work/verify-report.json` (BVH overlaps between layers, manifold report) | 30 s |
| 3 | `node tools/assets/pack-drc.mjs` | `public/proto04/proto04.bin` | 3 s |
| 4 | `node TOOLS/blender.mjs tools/assets/proto04.py -- bake` | `.work/atlas.png` | ~6 min |
| 5 | `node TOOLS/blender.mjs tools/assets/proto04.py -- matcap` | `.work/matcap.png` | 20 s |
| 6 | `node TOOLS/blender.mjs tools/assets/proto04.py -- shadow` | `.work/shadow.png` | 30 s |
| 7 | `node TOOLS/blender.mjs tools/assets/proto04.py -- stills hero` (then `inside`, `cuts`, `wind`) | `.work/still-*.png`, `.work/wind-alpha.png` | 2–8 min each |
| 8 | `node tools/assets/encode-images.mjs` | `src/assets/apex/*.avif/webp`, `src/assets/apex/index.ts` | 1 min |
| 9 | `node tools/assets/streamlines.mjs` | `src/components/wind/streamlines.data.ts` | 3 s |

\* On the studio laptop, CPU Cycles. `TOOLS` is the studio's scratchpad `tools` folder.

Draft renders: `-- stills hero --spp 16 --scale 0.5 --tag -draft` writes
`.work/still-hero-draft.png` and leaves the real one alone. Cuts take `--stations 1,4,5`.
The hero framing takes `--dist --elev --yaw --roll --tx --tz`, its sculpt `--spring --toe --bevel
--tongue` (`--sculpt 0` turns it off) and its rim `--rim --rim-size --under`. The defaults keep the
shoe inside x 16.6–84.6 % and y 18.8–71.7 % of the frame (the heel, x 16.6–32 %, tops out at
21.9 %), which `hero.module.css` (`--shoe-w`, `--shoe-top`, `.shoe` left) is tuned to. If you change
them, re-measure the alpha box and re-run the hero layout check (`pw/hero-layout.js`).

## What each piece does

- **`procedural-shoe.ts`**: the shoe as closed solids. It moved here from
  `src/components/three/shoe-geometry.ts`. The five layers are disjoint by construction:
  each one stops 0.3 mm short of the next, so the x-ray's back-face section caps never show a
  lit face from the layer next door. There are no cross-layer booleans anywhere: they took
  403 s and broke manifoldness. Ring bodies and tubes get fan caps. It also builds the
  81 chevron lugs (7.5 × 5.0 mm, 3.0 mm deep, 0.2 mm into the base, perimeter lugs flush with
  the edge), the 12 mm plate-fork cutter from u 0.58 to the toe, the carrier key that fills the
  fork (minus the gap), and the heel badge. The heel counter and toe cap are open bands
  (walls only, no lid, no floor) so they never form a hidden shelf inside the x-ray's cuts and
  can never be solidified down into the foam.
- **`export-shoe.mjs`**: writes the OBJ in Blender's axes (three's `(x, y, z)` is Blender's
  `(x, -z, y)`) and a meta file with the layer groups, cameras, cut stations and cap colours.
- **`proto04.py`** (Blender 5.0):
  - **layers**: welds each part and points its normals outward. It solidifies the upper
    (1.4 mm) and the counter and toe cap (1.0 mm), then cuts the plate's fork (EXACT, plate
    only). Each layer is joined, voxel remeshed (5 / 5 / 3 / 5 / 4 mm × 0.1), decimated to
    6000 / 1500 / 1000 / 4000 / 9000 tris and triangulated, and the stage **asserts 0
    non-manifold and 0 boundary edges** (exit 1 otherwise). All five are unwrapped into one
    atlas (smart project 80°, pack with rotation), smoothed by angle 40° and exported as a plain
    GLB. The hi set is the parts themselves, unremeshed, so each keeps its own material for
    the bake and the stills.
  - **bake**: diffuse colour from the hi materials, selected-to-active per layer (cage 0.4 mm),
    times AO baked on the low layers (64 samples, 3 cm), mixed `albedo × mix(1, AO, 0.85)` into a
    2048² atlas.
  - **matcap / shadow**: a lit #8A8F98 sphere (white key, cool fill, volt rim), and a top-down
    contact shadow sized to the live ground quad (3.4 × 1.15).
  - **stills**: Cycles, 96 spp, OIDN, AgX.
    - hero: lateral, toe right, alpha; the camera 8° below the sole plane (the lugs read as
      teeth), rolled −3°, no floor. Hero only, the hi parts are sculpted first (`hero_sculpt`):
      toe spring (17 mm), a rounded toe (squashed toward a low centre line over the last 16 %),
      a heel bevel (15 mm) and a taller tongue. Every move is monotonic in z for a given x, so
      the layers keep their order and gaps. A softer, wider volt rim and a cool under-light.
      The x-ray pack, poster, cuts and wind still keep the unsculpted shoe.
    - inside: `CAMERA_LIVE`.
    - cuts: `CAMERA_STILLS` at each station. Each hi part is cut by an EXACT box whose flat
      emission is the layer's cap colour, transferred to the cut faces. The boolean runs with
      self-intersection and hole tolerance on, because solidified shells fold over themselves
      at the collar and toe. Each cut is logged and checked (`CUT WARN` if the box survives).
    - wind: the mirrored left shoe, toe left, orthographic, plus its alpha mask.
    - The heel badge's `HVNF` deboss (0.4 mm, Blender's built-in font) is the studio
      watermark. It is pre-mirrored for the wind still, so it still reads correctly.
- **`pack-drc.mjs`**: draco3d 1.5.7 from the studio root, edgebreaker, speed 0/5, quantisation
  14/10/12. Pack format: `[u32 LE headerLen][JSON header][drc blobs]`. The header is
  `{ v, copyright, unit, layers: [{ name, offset, length, tris, verts, bbox }] }`, in stack order.
  The run fails over 120 KB (GitHub Pages doesn't gzip `.bin`).
- **`encode-images.mjs`**: sharp from the site's node_modules. AVIF q55 (the hero starts at q70)
  and WebP q76, both with an EXIF copyright. The inside poster and cuts are flattened onto
  `--night`. If a file is over budget, quality steps down; if it's still over, the run fails.
  It regenerates `src/assets/apex/index.ts` with measured sizes, because Turbopack misreads
  AVIF headers.
- **`streamlines.mjs`**: ideal flow past the wind still's silhouette. It builds a 400 × 140
  mask (alpha > 0.5, dilated 2 cells) and solves the stream function by SOR (ω 1.9,
  2000 sweeps). Boundary conditions: ψ = height on the top, left and right edges, 0 on the
  ground, and the stagnation level on the shoe. It then traces 48 contours (marching
  squares), simplifies them (RDP 1.5 px) and writes relative paths at 1 decimal. The run
  fails over 12 KB.

## Budgets (enforced)

| file | budget |
|---|---|
| `proto04.bin` | ≤ 120 KB |
| `atlas.webp` / `matcap.webp` / `shadow.webp` | ≤ 150 / 12 / 15 KB |
| hero AVIF | ≤ 60 KB at 1800, ≤ 30 KB at 900 |
| inside poster AVIF | ≤ 40 KB at 1600, ≤ 24 KB at 960 |
| each cut AVIF | ≤ 30 KB at 1200, ≤ 16 KB at 720 |
| wind AVIF | ≤ 50 KB at 1600, ≤ 25 KB at 800 |
| WebP fallbacks | 2 × the AVIF budget |
| `streamlines.data.ts` | ≤ 12 KB |
