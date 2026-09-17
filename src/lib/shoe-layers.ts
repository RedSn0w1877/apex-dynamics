// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

export type ShoeLayer = {
  id: string;
  index: string;
  /** Short, plain label. Drives the tab strip and the progress rail. */
  shortName: string;
  /** Full technical name. Used as the panel heading once the plain label has landed. */
  name: string;
  /** One plain-English line answering "which part of the shoe is this?" — no jargon allowed. */
  plainRole: string;
  weight: string;
  /** Same figure as `weight`, as a number, so the readout can count up to it. */
  weightGrams: number;
  material: string;
  spec: string;
  /** Opens with a sentence a non-runner understands, then earns the technical detail. */
  summary: string;
  stressRating: string;
};

export const SHOE_LAYERS: readonly ShoeLayer[] = [
  {
    id: "upper",
    index: "01",
    shortName: "The upper",
    name: "Vectran Monomesh Upper",
    plainRole: "The fabric that wraps your foot",
    weight: "42 g",
    weightGrams: 42,
    material: "Vapor-permeable monomesh, welded overlays",
    spec: "0.4 mm filament / 78% open-air weave",
    summary:
      "This is the part your foot actually sits inside, and it is one single stretched sheet of fabric rather than stacked, stitched panels — so there is no seam left to rub a blister over 50 km. The sheet is woven from 0.4 mm Vectran filament held under tension, and heat-welded overlays lock your midfoot down when the trail tilts sideways.",
    stressRating: "Tear strength: 38 N (ASTM D2261)",
  },
  {
    id: "midsole",
    index: "02",
    shortName: "The midsole",
    name: "Dual-Density PEBA Foam + Carbon Wing Plate",
    plainRole: "The cushioned slab you land on",
    weight: "126 g",
    weightGrams: 126,
    material: "Supercritical-foamed PEBA, forked carbon-fiber plate",
    spec: "38 mm heel / 30 mm forefoot stack, 8 mm drop",
    summary:
      "This is the thick cushioned slab between your foot and the ground, and it is deliberately not the same all the way through. Softer PEBA foam sits under the heel to swallow the landing; firmer foam sits under the forefoot so the carbon plate has something solid to spring off. That plate is forked at the toe, which lets the front of the shoe twist over roots and rock instead of see-sawing you off balance.",
    stressRating: "Plate flex fatigue: 500,000 cycles, no delamination",
  },
  {
    id: "outsole",
    index: "03",
    shortName: "The outsole",
    name: "3.0 mm Micro-Lug Vibram Megagrip Outsole",
    plainRole: "The rubber tread on the bottom",
    weight: "50 g",
    weightGrams: 50,
    material: "Vibram Megagrip compound, directional micro-lugs",
    spec: "3.0 mm lug depth / 62 Shore A",
    summary:
      "This is the rubber tread on the bottom — the only part of the shoe that ever touches the trail. The lugs are kept short at 3.0 mm so they bite into loose dirt without packing full of mud, and the Vibram Megagrip compound is the reason the shoe still holds on wet rock, where ordinary outsole rubber goes glassy.",
    stressRating: "Wet-rock static friction: μ 0.72",
  },
] as const;

/** 42 + 126 + 50 — ties back to the 218 g claim the hero makes. */
export const SHOE_TOTAL_GRAMS = SHOE_LAYERS.reduce((total, layer) => total + layer.weightGrams, 0);
