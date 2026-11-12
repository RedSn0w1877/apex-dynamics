// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import type { ReactNode } from "react";

/*
 * The arrows and marks the Sofia Sans latin subsets don't have (the black
 * up-pointing triangle U+25B2 and the arrows U+2197, U+2190, U+2192), drawn as
 * tiny inline SVGs so they never fall back to a system font. Never type those
 * characters in copy: use <Glyph name="…"/>. Sized by the .glyph class in
 * globals.css (0.72em, currentColor), and always decorative (aria-hidden).
 */

export type GlyphName = "climb" | "ne" | "down" | "up" | "left" | "flag";

const LINE = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "square" } as const;

const SHAPES: Record<GlyphName, ReactNode> = {
  // the climb triangle: cumulative metres climbed
  climb: <path d="M6 1.4 11.4 10.6H.6z" />,
  // north-east arrow: go there
  ne: <path {...LINE} d="M2.4 9.6 9 3M4.2 2.6h5.2v5.2" />,
  // down arrow: run on down the page
  down: <path {...LINE} d="M6 1.2v9.2M2.2 6.8 6 10.6l3.8-3.8" />,
  // up arrow: back up to the start
  up: <path {...LINE} d="M6 10.8V1.6M2.2 5.2 6 1.4l3.8 3.8" />,
  // left arrow: back
  left: <path {...LINE} d="M10.8 6H1.6M5.2 2.2 1.4 6l3.8 3.8" />,
  // the start/finish flag: pole and pennant
  flag: (
    <>
      <path d="M1.4 0h1.5v12H1.4z" />
      <path d="M2.9.6h8.5L8.6 3.7l2.8 3.1H2.9z" />
    </>
  ),
};

export function Glyph({ name, className }: { name: GlyphName; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      fill="currentColor"
      className={className ? `glyph ${className}` : "glyph"}
    >
      {SHAPES[name]}
    </svg>
  );
}
