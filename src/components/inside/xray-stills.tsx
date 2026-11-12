"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { useEffect, useRef } from "react";
import { STILLS, type ImageFile } from "@/assets/apex";
import { CUT_STATIONS } from "@/lib/shoe-spec";

/*
 * The x-ray without WebGL (lite, embedded, reduced motion, or a failed
 * context): six Cycles renders of the shoe cut at each station, from the same
 * camera project.ts reproduces, so the callouts land on the cut face. The
 * picture swaps sources by station; the browser keeps showing the old frame
 * until the new one has decoded, so a step never flashes empty. On idle, the
 * next station is fetched ahead in whichever format this browser picked.
 */

const srcSet = (files: readonly ImageFile[]) => files.map(({ file, width }) => `${file.src} ${width}w`).join(", ");

const PRELOADS = new Set<HTMLImageElement>();

/** The 4:3 box is the stage's height on desktop and the full width on phones. */
export const STILL_SIZES = "(max-width: 639px) 100vw, 75vw";

const STATION_ALT = [
  "Prototype 04 seen from behind the heel, whole, before the cut.",
  "Cut at the heel: the knit upper wraps a deep white foam block over the carbon plate, the carrier and the lugged outsole.",
  "Cut at the rear foot: the foam is still deep, the volt-edged plate runs under it.",
  "Cut at the midfoot: the stack has thinned and the plate sits lower in the sole.",
  "Cut at the forefoot: the stack is down to about 31 mm and the plate starts to fork.",
  "Cut at the toe: 30 mm of stack, the plate forked around the carrier, the lugs underneath.",
];

type Props = {
  station: number;
  className?: string;
  /** Receives the <img>, for measuring where the still is drawn. */
  onImg?: (img: HTMLImageElement | null) => void;
  onLoad?: () => void;
};

export function XrayStills({ station, className, onImg, onLoad }: Props) {
  const local = useRef<HTMLImageElement | null>(null);
  const still = STILLS.cuts[station] ?? STILLS.cuts[0];
  const fallback = still.webp[still.webp.length - 1];

  // Fetch the next station ahead on idle, in the format the visible still is using.
  useEffect(() => {
    const next = STILLS.cuts[station + 1];
    const img = local.current;
    if (!next || !img) return;
    const run = () => {
      const avif = /\.avif(\?|$)/.test(img.currentSrc);
      const ahead = new Image();
      // Held until it settles, so garbage collection can't cancel the fetch half way.
      PRELOADS.add(ahead);
      ahead.onload = ahead.onerror = () => PRELOADS.delete(ahead);
      ahead.decoding = "async";
      ahead.sizes = img.sizes || STILL_SIZES;
      ahead.srcset = srcSet(avif ? next.avif : next.webp);
    };
    const ric = window.requestIdleCallback as Window["requestIdleCallback"] | undefined;
    if (ric) {
      const id = window.requestIdleCallback(run, { timeout: 1500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(run, 300);
    return () => window.clearTimeout(id);
  }, [station]);

  return (
    <picture className={className}>
      <source type="image/avif" srcSet={srcSet(still.avif)} sizes={STILL_SIZES} />
      <img
        ref={(node) => {
          local.current = node;
          onImg?.(node);
        }}
        src={fallback.file.src}
        srcSet={srcSet(still.webp)}
        sizes={STILL_SIZES}
        width={fallback.width}
        height={fallback.height}
        alt={STATION_ALT[station] ?? STATION_ALT[0]}
        decoding="async"
        onLoad={onLoad}
        data-station={CUT_STATIONS[station]?.key}
      />
    </picture>
  );
}
