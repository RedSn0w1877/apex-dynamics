"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { STILLS, type ImageFile } from "@/assets/apex";
import { CheckpointGate } from "@/components/course/checkpoint-gate";
import { WindFlow } from "@/components/wind/wind-flow";
import { DRAG_COEFFICIENTS } from "@/lib/wind-tunnel-data";
import styles from "./wind-tunnel.module.css";

/**
 * CP3 · KM 22 · WIND. No second WebGL context: a Cycles still of the left shoe
 * (toe pointing left, so the air runs left to right) with generated
 * streamlines drawn over it in the same 1600 x 560 frame, three speed tiles,
 * two drag rules and the watts it's worth. Every figure is illustrative.
 *
 * A client component with no state of its own: it is still rendered into the
 * static HTML (and reads fine without JS), but a server component's markup is
 * paid twice, in the HTML and again in the RSC payload, and this one is mostly
 * static markup. React hydrates server-component markup as host elements either
 * way, so this only adds the component call itself.
 */

const srcSet = (files: readonly ImageFile[]) => files.map(({ file, width }) => `${file.src} ${width}w`).join(", ");

const BARS = [
  { key: "standard", label: `Standard trainer · drag ${DRAG_COEFFICIENTS.standard.toFixed(2)}`, width: "88%" },
  { key: "apex", label: `Prototype 04 · drag ${DRAG_COEFFICIENTS.apex.toFixed(2)}`, width: "62%" },
] as const;

export function WindTunnel() {
  const { avif, webp } = STILLS.wind;
  const img = webp[webp.length - 1];

  const still = (
    <picture className={styles.still}>
      <source type="image/avif" srcSet={srcSet(avif)} sizes="100vw" />
      <img
        src={img.file.src}
        srcSet={srcSet(webp)}
        sizes="100vw"
        width={img.width}
        height={img.height}
        loading="lazy"
        decoding="async"
        alt="Prototype 04 from the side, toe pointing into the wind: a low, slim toe and a smooth heel."
      />
    </picture>
  );

  const bars = (
    <div className={styles.bars}>
      {BARS.map((bar) => (
        <div key={bar.key} className={styles.bar} data-kind={bar.key}>
          <span className={styles.rule} style={{ width: bar.width }} aria-hidden="true" />
          <p className={`t-label ${styles.barLabel}`}>{bar.label}</p>
        </div>
      ))}
    </div>
  );

  return (
    <section id="wind" aria-labelledby="wind-title" className={styles.wind}>
      <CheckpointGate cp={3} />
      <div className={styles.intro}>
        <h2 id="wind-title" className="t-display t-cp">
          Wind at race pace.
        </h2>
        <p className={styles.lead}>
          Kilometre 22. Your calves have opinions now, and the air is pushing back. A slimmer toe and a lower profile
          shove less of it out of the way. Pick a pace to see what that&apos;s worth.
        </p>
      </div>
      <WindFlow still={still} bars={bars} />
      <p className={styles.footnote}>
        Illustrative maths: drag power grows with air speed cubed. Not wind-tunnel measurements.
      </p>
    </section>
  );
}
