"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { CheckpointGate } from "@/components/course/checkpoint-gate";
import { XrayController } from "@/components/inside/xray-controller";
import styles from "./inside.module.css";

/**
 * CP2 · KM 14 · INSIDE. The portfolio's one WebGL scene: a cutting plane runs
 * through Prototype 04 from heel to toe as you scroll, naming each of the five
 * layers as it reaches them until they add up to 218 g.
 *
 * This shell holds the gate, the head and the copy. The
 * sticky stage is the XrayController island, which ships as a static poster
 * plus the full layer list and tally in the HTML, and only on capable desktops
 * pulls the 3D chunk once the section is a viewport away.
 *
 * A client component with no state of its own: it is still rendered into the
 * static HTML (and reads fine without JS), but a server component's markup is
 * paid twice, in the HTML and again in the RSC payload, and this one is mostly
 * static markup. React hydrates server-component markup as host elements either
 * way, so this only adds the component call itself.
 */
export function Inside() {
  return (
    <section id="inside" aria-labelledby="inside-title" className={styles.inside}>
      <CheckpointGate cp={2} />
      <div className={styles.intro}>
        <h2 id="inside-title" className="t-display t-cp">
          Slice it open.
        </h2>
        <p className={styles.lead}>
          Scroll and a cutting plane runs through Prototype 04 from heel to toe. Watch 38 mm of cushion under your heel
          thin to 30 mm at the toe, the carbon plate fork under the forefoot, and five layers add up to 218 grams.
        </p>
      </div>
      <XrayController />
    </section>
  );
}
