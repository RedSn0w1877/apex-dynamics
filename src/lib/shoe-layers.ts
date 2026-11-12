// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { OUTSOLE_RUBBER, SHOE, type LayerId } from "./shoe-spec";

export type ShoeLayer = {
  id: LayerId;
  /** Short, plain label: the first thing a visitor reads. */
  shortName: string;
  /** One plain-English line answering "which part of the shoe is this?". No jargon. */
  plainRole: string;
  /** The technical name, earned after the plain line. */
  techName: string;
  weightGrams: number;
  /** Colour of this layer's face in the x-ray section cut (matches the --cap-* tokens). */
  capColor: string;
  /** The CUT_STATIONS index at which the x-ray names this layer. */
  station: number;
};

/** Bottom to top, the order the layers stack in (and the order of the 3D pack). */
export const SHOE_LAYERS: readonly ShoeLayer[] = [
  {
    id: "outsole",
    shortName: "The outsole",
    plainRole: "The rubber tread that grips the trail",
    techName: `${SHOE.lugMm.toFixed(1)} mm lugs in ${OUTSOLE_RUBBER}, a sticky wet-rock rubber`,
    weightGrams: 50,
    capColor: "#2B2F2A",
    station: 5,
  },
  {
    id: "carrier",
    shortName: "The carrier",
    plainRole: "The firmer foam the plate rests on",
    techName: "Firm EVA blend, keyed into the plate's fork",
    weightGrams: 12,
    capColor: "#6F746B",
    station: 4,
  },
  {
    id: "plate",
    shortName: "The plate",
    plainRole: "The stiff spring under your foot",
    techName: "2.2 mm carbon-fibre plate, forked under the forefoot",
    weightGrams: 22,
    capColor: "#CCFF00",
    station: 3,
  },
  {
    id: "foam",
    shortName: "The foam",
    plainRole: "The soft cushion you land on",
    techName: "Supercritical-foamed PEBA",
    weightGrams: 92,
    capColor: "#E9E9E2",
    station: 2,
  },
  {
    id: "upper",
    shortName: "The upper",
    plainRole: "The fabric that wraps your foot",
    techName: "Engineered knit in high-strength polymer thread",
    weightGrams: 42,
    capColor: "#A2A79C",
    station: 1,
  },
];

export const LAYER_BY_ID = Object.fromEntries(SHOE_LAYERS.map((layer) => [layer.id, layer])) as Record<
  LayerId,
  ShoeLayer
>;

/** The order the x-ray names the layers in as the cut runs heel to toe: 42 + 92 + 22 + 12 + 50. */
export const TALLY_ORDER: readonly LayerId[] = ["upper", "foam", "plate", "carrier", "outsole"];

/** 218: ties the five layers back to the hero's claim. */
export const SHOE_TOTAL_GRAMS = SHOE_LAYERS.reduce((total, layer) => total + layer.weightGrams, 0);

if (process.env.NODE_ENV !== "production" && SHOE_TOTAL_GRAMS !== SHOE.weightG) {
  throw new Error(`shoe-layers.ts: the layers add up to ${SHOE_TOTAL_GRAMS} g, but SHOE.weightG is ${SHOE.weightG} g.`);
}
