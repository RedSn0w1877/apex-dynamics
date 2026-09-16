// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

export type ShoeLayer = {
  id: string;
  index: string;
  name: string;
  weight: string;
  material: string;
  spec: string;
  summary: string;
  stressRating: string;
};

export const SHOE_LAYERS: readonly ShoeLayer[] = [
  {
    id: "upper",
    index: "01",
    name: "Vectran Monomesh Upper",
    weight: "42 g",
    material: "Vapor-permeable monomesh, welded overlays",
    spec: "0.4 mm filament / 78% open-air weave",
    summary:
      "A single-layer mesh under tension rather than stacked panels. Welded overlays lock the midfoot without adding a stitched seam to rub against.",
    stressRating: "Tear strength: 38 N (ASTM D2261)",
  },
  {
    id: "midsole",
    index: "02",
    name: "Dual-Density PEBA Foam + Carbon Wing Plate",
    weight: "168 g",
    material: "Supercritical-foamed PEBA, forked carbon-fiber plate",
    spec: "38 mm heel / 30 mm forefoot stack, 8 mm drop",
    summary:
      "Softer foam under the heel for landing, firmer under the forefoot for the plate to load against. The wing plate splits at the toe to let the forefoot flex on uneven ground instead of see-sawing.",
    stressRating: "Plate flex fatigue: 500,000 cycles, no delamination",
  },
  {
    id: "outsole",
    index: "03",
    name: "3.0 mm Micro-Lug Vibram Megagrip Outsole",
    weight: "58 g",
    material: "Vibram Megagrip compound, directional micro-lugs",
    spec: "3.0 mm lug depth / 62 Shore A",
    summary:
      "Short lugs bite loose trail without stacking mud in the tread. Megagrip's rubber compound holds its coefficient of friction on wet rock where standard compounds go glassy.",
    stressRating: "Wet-rock static friction: μ 0.72",
  },
] as const;
