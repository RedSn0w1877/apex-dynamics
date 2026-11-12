// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { SHOE, weightForSize } from "@/lib/shoe-spec";

/*
 * Everything the field-test bib knows: the three waves, the eight sizes, the
 * code printed on the bib and the form's validation. Nothing here counts other
 * runners: the code is built only from the visitor's own choices, so it can't
 * imply a waiting list or a numbered allocation.
 */

export type DistanceId = "marathon" | "50k" | "100mi";
export type Wave = "A" | "B" | "C";

export type Distance = {
  readonly id: DistanceId;
  readonly wave: Wave;
  /** The tile's big word in the form. */
  readonly tile: string;
  /** The tile's small line. */
  readonly sub: string;
  /** What the bib prints. */
  readonly bibLine: string;
  /** What a screen reader hears in the bib's description. */
  readonly spoken: string;
};

export const DISTANCES: readonly Distance[] = [
  { id: "marathon", wave: "A", tile: "MARATHON", sub: "wave A · 42.2 km", bibLine: "MARATHON", spoken: "marathon" },
  { id: "50k", wave: "B", tile: "50K", sub: "wave B · 50 km", bibLine: "50K", spoken: "50K" },
  { id: "100mi", wave: "C", tile: "100 MI", sub: "wave C · 161 km", bibLine: "100 MILES", spoken: "100 miles" },
];

export const SIZES = [40, 41, 42, 43, 44, 45, 46, 47] as const;
export type Size = (typeof SIZES)[number];

export const DEFAULT_DISTANCE: DistanceId = "50k";
export const DEFAULT_SIZE: Size = SHOE.baseSizeEu as Size;

export const distanceById = (id: DistanceId): Distance => DISTANCES.find((d) => d.id === id) ?? DISTANCES[1];

export { weightForSize };

/** The big code on the bib: wave and size, e.g. "C·43". */
export const bibCode = (wave: Wave, size: Size) => `${wave}·${size}`;

/** The saved image's file name: apex-bib-C43.png. */
export const bibFileName = (wave: Wave, size: Size) => `apex-bib-${wave}${size}.png`;

/** The tear-off tab's weight line, computed from the shoe's own numbers. */
export const weightLine = (size: Size) => `${weightForSize(size)} g at EU ${size} · +${SHOE.weightStepG} g a size`;

/** The name as the bib prints it, or the blank it shows until something is typed. */
export const bibName = (name: string) => name.trim().toUpperCase() || "YOUR NAME";

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? "";

export const bibLineText = (distance: Distance, size: Size) => `WAVE ${distance.wave} · ${distance.bibLine} · EU ${size}`;

/** The bib card's accessible name, e.g. "Your bib: Ana Ruiz, wave C, 100 miles, EU 43". */
export function bibLabel(name: string, distance: Distance, size: Size, pinned: boolean) {
  const who = name.trim() || "no name yet";
  return `Your bib: ${who}, wave ${distance.wave}, ${distance.spoken}, EU ${size}${pinned ? ". Registered." : ""}`;
}

/* -------------------------------------------------------------- the form --- */

export type BibEntry = {
  name: string;
  email: string;
  distance: DistanceId;
  size: Size;
  consent: boolean;
};

export type BibErrorKey = "name" | "email" | "consent";
export type BibErrors = Partial<Record<BibErrorKey, string>>;

/** In the order the form shows them, so focus lands on the first one that's wrong. */
export const ERROR_ORDER: readonly BibErrorKey[] = ["name", "email", "consent"];

export const MESSAGES: Record<BibErrorKey, string> = {
  name: "Put a name on the bib: two letters or more.",
  email: "Use an email like name@example.com.",
  consent: "Tick the box so we know you've read the terms.",
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateBib(entry: BibEntry): BibErrors {
  const errors: BibErrors = {};
  if (entry.name.trim().length < 2) errors.name = MESSAGES.name;
  if (!EMAIL.test(entry.email.trim())) errors.email = MESSAGES.email;
  if (!entry.consent) errors.consent = MESSAGES.consent;
  return errors;
}

/* ------------------------------------------------------------- the pins --- */

/*
 * A safety pin lying across a pin hole, in a 40 × 12 box: the clasp, then the
 * wire running out to the coil and back. One set of paths for the card's inline
 * SVG and the saved PNG (drawn with Path2D), so the two always match.
 */
export const PIN_BOX = { w: 40, h: 12 } as const;
export const PIN_CLASP = "M1 2.6h8.4v6.8H1z";
export const PIN_WIRE = "M9.4 4.2h24.4a3.2 3.2 0 0 1 0 6.4H9.4";
/** Each pin's angle in degrees, holes in order top-left, top-right, bottom-left, bottom-right. */
export const PIN_ANGLES = [-14, 194, -78, -102] as const;
export const PIN_COIL = "M33.8 7.4m-2.3 0a2.3 2.3 0 1 0 4.6 0a2.3 2.3 0 1 0-4.6 0";
