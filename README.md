# APEX DYNAMICS — Prototype 04 Showcase

> © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute. See [LICENSE](LICENSE).

Portfolio piece #2: an elite carbon-plated trail racer brand. Kinetic italic typography, a scrubbable race-telemetry HUD, peel-away construction spec cards, and a wind-tunnel comparator. Deliberately lighter stack than [kroma-labs](../kroma-labs) — no 3D/WebGL here, just Tailwind + `motion/react`.

## Run it

```bash
npm install
npm run dev -- -p 3001
```

Open http://localhost:3001 (port 3000 is kroma-labs).

## How it fits together

| Piece | Where | What it does |
| --- | --- | --- |
| Ticker | `src/components/ui/marquee.tsx` | Endless horizontal scroll via two duplicated copies + CSS keyframe |
| Magnetic CTA | `src/components/ui/magnetic-button.tsx` | Button leans toward the cursor via spring-smoothed motion values |
| Stride HUD | `src/lib/telemetry-data.ts`, `src/components/sections/telemetry-hud.tsx` | Illustrative 30 km dataset, linear-interpolated for smooth scrubbing (drag, click, or arrow keys on the SVG; synced range input) |
| Anatomy cards | `src/lib/shoe-layers.ts`, `src/components/sections/shoe-layers.tsx` | Tabbed cross-section spec sheets with `AnimatePresence` crossfade |
| Wind tunnel | `src/lib/wind-tunnel-data.ts`, `src/components/sections/wind-tunnel.tsx` | Drag-power physics (power ∝ v³) driving a watts-saved readout |
| Copyright marks | `src/components/brand/*`, `src/lib/copyright.ts` | Watermark rail, log marks, copy attribution, print watermark |

## Note on the brief

This build follows the studio's own anti-vibe-coding rules with one exception baked in by design: the palette (void black / acid volt / carbon) and kinetic italic type were specified directly in the brief for this piece, overriding the default vertical palettes in the studio CLAUDE.md — intentional, not a deviation.
