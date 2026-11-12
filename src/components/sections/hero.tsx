"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { Fragment, type CSSProperties } from "react";
import { STILLS, type ImageFile } from "@/assets/apex";
import { Ridge } from "@/components/course/ridge";
import { Glyph } from "@/components/ui/glyph";
import { RaceDigits } from "@/components/ui/race-digits";
import { TIMING_LINE } from "@/lib/copyright";
import { CHECKPOINTS, FINISH } from "@/lib/course";
import { LAYER_BY_ID, SHOE_TOTAL_GRAMS, TALLY_ORDER } from "@/lib/shoe-layers";
import { OUTSOLE_RUBBER, SHOE } from "@/lib/shoe-spec";
import { HeroParallax } from "./hero-parallax";
import styles from "./hero.module.css";

/*
 * The start line: a night-race poster standing on the course. The 30 km profile
 * is the ground of the screen: the 218 stands on its first summit, the plain
 * sentence and the stats on its second, the shoe runs across the valley, and
 * the START flag at km 0 is the way in.
 *
 * Everything is server-rendered and visible without JS. Entrances are CSS only
 * (transform, never opacity) and run only under html.js with no motion
 * preference. On desktop every piece is absolutely placed in vw/svh and the
 * numerals sit in a fixed-aspect box, so a font swap can't move anything.
 * No WebGL here: the site's one 3D scene waits in #inside.
 *
 * A client component with no state of its own: it is still rendered into the
 * static HTML (and reads fine without JS), but a server component's markup is
 * paid twice, in the HTML and again in the RSC payload, and this one is mostly
 * static markup. React hydrates server-component markup as host elements either
 * way, so this only adds the component call itself.
 */

// Widths come from the manifest, not the import: Turbopack misreads AVIF sizes.
const srcSet = (files: readonly ImageFile[]) => files.map(({ file, width }) => `${file.src} ${width}w`).join(", ");
const SIZES = "(max-width: 639px) 112vw, (max-width: 1023px) 70vw, 100vw";

const FIGURES = [
  { value: `${SHOE.stackHeelMm}/${SHOE.stackForefootMm}`, label: "mm of cushion, heel / toe" },
  { value: String(SHOE.dropMm), label: "mm drop" },
  { value: String(SHOE.lugMm), label: `mm lugs, ${OUTSOLE_RUBBER} rubber` },
] as const;

const PARTS = TALLY_ORDER.map((id) => ({ id, grams: LAYER_BY_ID[id].weightGrams }));
const PARTS_SPOKEN = `Weight by part at EU ${SHOE.baseSizeEu}: ${PARTS.map((p) => `${p.id} ${p.grams} g`).join(", ")}; ${SHOE_TOTAL_GRAMS} g in all.`;

export function Hero() {
  const { avif, webp } = STILLS.hero;
  const still = webp[webp.length - 1];
  return (
    <section id="start" className={styles.hero}>
      <Ridge variant="hero" className={styles.ridge} />

      <h1 className={`t-label ${styles.h1}`}>
        Prototype 04 — a carbon-plated <span className={styles.volt}>trail racing shoe</span> for 50K to 100 miles.
      </h1>

      {/*
        Two layers in one fixed-aspect box: "218" sits behind the shoe and the volt "G" in front
        of it, so the shoe can never cover the unit. data-par: the pointer parallax moves these.
      */}
      <div aria-hidden="true" className={styles.nums}>
        <div className={`${styles.numScroll} ${styles.back}`} data-par="num">
          <div className={styles.numLoad}>218</div>
        </div>
        <div className={`${styles.numScroll} ${styles.front}`} data-par="num">
          <div className={styles.numLoad}>
            <span className={styles.g}>G</span>
          </div>
        </div>
      </div>

      {/*
        The 218, weighed part by part: the same five layers #inside cuts open. One aria-hidden
        row styled by element (b = the part, i = the operator), so its markup stays small; the
        spoken version is the line above it. On load the terms roll up left to right.
      */}
      <div className={styles.parts}>
        <p className="vh">{PARTS_SPOKEN}</p>
        <p aria-hidden="true" className={`t-label ${styles.partsRow}`}>
          {PARTS.map((part, i) => (
            <Fragment key={part.id}>
              {i > 0 && <i>+</i>}
              <span style={{ "--i": i } as CSSProperties}>
                <RaceDigits value={part.grams} format="00" silent className={styles.partNum} />
                <b>{part.id}</b>
              </span>
            </Fragment>
          ))}
          <i>=</i>
          <span style={{ "--i": PARTS.length } as CSSProperties}>
            <span className={styles.partNum}>
              <RaceDigits value={SHOE_TOTAL_GRAMS} format="000" silent />
              {" G"}
            </span>
            <b>{`at EU ${SHOE.baseSizeEu}`}</b>
          </span>
        </p>
      </div>

      {/*
        The plain sentence finishes the giant number ("218 G … with a carbon plate and 3 mm
        lugs"), so the weight is said once, big, and not three times. Then the three figures,
        and the old slogan, demoted to one quiet line under them.
      */}
      <div className={styles.claim}>
        <p className={`t-display ${styles.plain}`}>
          <span className="vh">{`${SHOE.weightG} grams `}</span>
          {/* Non-breaking space keeps the number with its unit. */}
          {`with a carbon plate and ${SHOE.lugMm} mm lugs.`}
        </p>
        <ul className={styles.figs}>
          {FIGURES.map((fig) => (
            <li key={fig.label} className={styles.fig}>
              <span className={`t-display ${styles.figNum}`}>{fig.value}</span>
              <span className={`t-label ${styles.figLabel}`}>{fig.label}</span>
            </li>
          ))}
        </ul>
        <p className={`t-label ${styles.tag}`}>
          <span className="vh">218 </span>Grams between you and the mountain.
        </p>
      </div>

      <picture className={styles.shoe} data-par="shoe">
        <source type="image/avif" srcSet={srcSet(avif)} sizes={SIZES} />
        <img
          src={still.file.src}
          srcSet={srcSet(webp)}
          sizes={SIZES}
          width={still.width}
          height={still.height}
          fetchPriority="high"
          alt="Prototype 04 from the side: dark knit upper with volt stripes, white foam midsole, black lugged outsole."
        />
      </picture>

      <div className={styles.cta}>
        <a href="#bib" className={`t-display ${styles.bib}`} aria-describedby="bib-what">
          <span>
            Get your bib
            <Glyph name="ne" />
          </span>
        </a>
        <p id="bib-what" className={styles.what}>
          <strong>Not on sale yet.</strong> Prototype 04 is in field testing: pin on a bib and we&apos;ll send you a pair
          to run in. Expected price at launch: $250.
        </p>
      </div>

      {/* The START flag at km 0 of the profile is the way into the course. */}
      <a href="#stride" className={styles.start}>
        <Glyph name="flag" className={styles.flag} />
        <span className={styles.startText}>
          <span className={`t-label ${styles.startRun}`}>
            Run the course
            <Glyph name="down" />
          </span>
          <span className={`t-label ${styles.startMeta}`}>
            {`${FINISH.km} km · ${FINISH.climbM} m of climbing · ${CHECKPOINTS.length} checkpoints`}
          </span>
        </span>
      </a>

      <p aria-hidden="true" className={`t-label ${styles.timing}`}>
        {TIMING_LINE}
      </p>
      <HeroParallax />
    </section>
  );
}
