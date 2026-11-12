"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { RIDGE_H, RIDGE_W, ridgePoints } from "@/lib/course";
import { TELEMETRY } from "@/lib/telemetry-data";

/*
 * The course ridge: the 30 km elevation profile from telemetry-data.ts as one
 * 31-point polyline, stretched to its box (preserveAspectRatio none) with a
 * stroke that stays 1.5 px (non-scaling). The fill carries the identity's only
 * gradient: trail at the summit fading to night.
 *
 *   hero    the ground the start line stands on: raised high, with a night topo of
 *           contour lines behind and inside it, and the line drawing once on load
 *           (a clip-path reveal: Chrome mis-scales pathLength dashes on a
 *           non-scaling stroke, so a dashoffset draw breaks into stray dashes).
 *           It also carries the entrance's runner: a volt trail of the first
 *           climb (km 0 to the km 7 summit) and the dot that runs it, both hidden
 *           unless the entrance plays (globals.css). The START flag is a real
 *           link, so the hero places it, not this (this root is aria-hidden).
 *   chart   the base layer of the telemetry chart in #stride
 *   finish  above the finish band
 *
 * A client component on purpose, with no hooks: it is pure decoration, and a
 * server component's markup is paid twice (in the HTML and again in the RSC
 * payload). As a client component its SVG is in the HTML once.
 *
 * Size and place it with `className` (the root fills nothing by itself). The
 * .ridge classes live in globals.css. Each variant appears once per page, so the
 * ids stay unique.
 */

export type RidgeVariant = "hero" | "chart" | "finish";

const POINTS = ridgePoints(RIDGE_W, RIDGE_H);
const ELEV_Y = POINTS.split(" ").map((p) => Number(p.split(",")[1]));
const STEP = RIDGE_W / (ELEV_Y.length - 1);
const r1 = (v: number) => String(Math.round(v * 10) / 10);

/*
 * The night topo: copies of the course line, each one flattened (k) and lifted (d,
 * in viewBox units) so it can never cross the course: k·h + d > h for every height
 * h ≤ 44 whenever d > (1 − k)·44. Higher lines are flatter and fainter, like ridges
 * fading into the dark behind the course; two lower copies settle inside its fill.
 * Ridge tone only (1.44:1 on night): decoration, never information.
 *
 * Each group is ONE <path> of relative subpaths with the flattening baked in, not a
 * set of transformed <use> clones: a transformed clone with a non-scaling stroke is
 * re-tessellated on every paint of the hero.
 */
const contour = (k: number, d = 0) => {
  const y = ELEV_Y.map((h) => k * h + RIDGE_H * (1 - k) - d);
  return `M0 ${r1(y[0])}` + y.slice(1).map((v, i) => `l${r1(STEP)} ${r1(v - y[i])}`).join("");
};
const SKY_NEAR = [contour(0.8, 10), contour(0.64, 18)].join("");
const SKY_FAR = [contour(0.5, 25), contour(0.38, 31), contour(0.28, 36)].join("");
const GROUND = [contour(0.66), contour(0.36)].join("");

/** The first climb, km 0 to the km 7 summit: what the entrance's runner covers. */
const SUMMIT_KM = TELEMETRY.findIndex((s, i) => i > 0 && s.elevationM >= TELEMETRY[i + 1]?.elevationM);
const FIRST_CLIMB = POINTS.split(" ").slice(0, SUMMIT_KM + 1).join(" ");

export function Ridge({ variant, className }: { variant: RidgeVariant; className?: string }) {
  const fill = `ridge-fill-${variant}`;
  const hero = variant === "hero";
  return (
    <div aria-hidden="true" className={className ? `ridge ${className}` : "ridge"}>
      <svg viewBox={`0 0 ${RIDGE_W} ${RIDGE_H}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={fill} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#151714" />
            <stop offset="1" stopColor="#0B0C0A" />
          </linearGradient>
        </defs>
        {hero && <path d={SKY_FAR} className="ridge-topo ridge-sky ridge-far" />}
        {hero && <path d={SKY_NEAR} className="ridge-topo ridge-sky" />}
        <polygon points={`${POINTS} ${RIDGE_W},${RIDGE_H} 0,${RIDGE_H}`} fill={`url(#${fill})`} />
        {hero && <path d={GROUND} className="ridge-topo ridge-ground" />}
        <polyline points={POINTS} className={hero ? "ridge-line ridge-draw" : "ridge-line"} />
      </svg>
      {hero && (
        <>
          <div className="ridge-trail">
            <svg viewBox={`0 0 ${RIDGE_W} ${RIDGE_H}`} preserveAspectRatio="none">
              <polyline points={FIRST_CLIMB} />
            </svg>
          </div>
          <div className="ridge-runx">
            <div className="ridge-runy">
              <span />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
