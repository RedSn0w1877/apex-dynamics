# Apex Dynamics — Prototype 04 · The race

> © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute. See [LICENSE](LICENSE).

A night-race poster for Prototype 04, a fictional carbon-plated trail racing shoe for 50K to 100 miles. You run the page like a course: the nav is the 30 km elevation profile with a runner dot on it, every section is a checkpoint with its kilometre and climb, and you sign up by pinning on a bib. It holds the HVNF portfolio's only WebGL scene: an x-ray section cut through the shoe in `#inside`.

Static export (Next 16, App Router, Turbopack) deployed to GitHub Pages at `/apex-dynamics/`.

## Run it

```bash
npm install
npm run dev -- -p 3001
```

Open http://localhost:3001 (port 3000 is kroma-labs). `npm run build` writes the static site to `out/`.

## How it fits together

| Piece | Where | What it does |
| --- | --- | --- |
| Course data | `src/lib/telemetry-data.ts`, `src/lib/course.ts` | The simulated 30 km course; checkpoints, climbs and the 255-byte ridge polyline every drawing shares |
| Shoe numbers | `src/lib/shoe-spec.ts`, `src/lib/shoe-layers.ts` | One source of truth for the 38/30 mm stack, the five layers (218 g), the cut stations and both cameras; the Blender tools read it too |
| Device tiers | `src/lib/device.ts`, `src/lib/use-client-flags.ts` | A pre-paint script sets `html.js`, `data-lite` and `data-embed`; hooks with fixed server snapshots, so markup never branches on motion |
| Course strip | `src/components/course/course-strip.tsx`, `runner-timeline.ts` | The nav: a scroll-driven WAAPI runner dot on the profile (an IntersectionObserver stepper where ScrollTimeline is missing) |
| Checkpoint gates | `src/components/course/checkpoint-gate.tsx` | Volt rule, `CP2 · KM 14 · 340 M` and the timing line, entering on a CSS view timeline |
| Start line | `src/components/sections/hero.tsx` | The poster standing on the course: the profile is the ground (with a night topo of contour lines), 218 G and its weight by part on the first summit, the plain sentence and stats (stack, drop, lugs and rubber) on the second, what the bib button does beside it, and the START flag at km 0 as the way in. CSS-only entrances, fixed-aspect numerals |
| Race digits | `src/components/ui/race-digits.tsx` | The one rolling number style: fixed cells, server-rendered, `update()` for per-frame values |
| Finish line | `src/components/sections/finish-line.tsx` | Volt band, time on course (computed once), legal links, fine print |
| Stills and textures | `src/assets/apex/` | AVIF/WebP stills and x-ray textures with an explicit-size manifest (Turbopack misreads AVIF sizes) |
| 3D pack | `public/proto04/proto04.bin` | Five Draco layers in one pack, fetched only near `#inside` on capable desktops |
| Asset tools | `tools/assets/` | Offline Blender and Node scripts that rebuild the pack, stills and streamlines (excluded from the app's TS and lint) |

## Rules this build keeps

- All copy is in the static HTML. Entrances run only under `html.js` with no motion preference, move `transform` only, and never start from opacity 0.
- Idle means idle: no timers, no rAF, no time-based animations, no WebGL draws.
- One WebGL context at most, and only in `#inside`. `three` may be imported only under `src/components/inside/`.
- gsap, lenis, motion, R3F/drei, border-beam, liquid-gooey, sonner and lucide-react are still in `package.json` (removing them needs a lockfile regeneration) but ESLint blocks every import of them.
- Every figure is simulated or illustrative; there are no testimonials, ratings or real trademarks.

## Note on the brief

The palette (warm night black, volt course marking) and the condensed italic type are this showcase's own identity, set by its brief rather than the studio's default industry palettes. That is intentional, not a deviation.
