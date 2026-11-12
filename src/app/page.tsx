// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { CourseStrip } from "@/components/course/course-strip";
import { Bib } from "@/components/sections/bib";
import { FinishLine } from "@/components/sections/finish-line";
import { Hero } from "@/components/sections/hero";
import { Inside } from "@/components/sections/inside";
import { TelemetryHud } from "@/components/sections/telemetry-hud";
import { WindTunnel } from "@/components/sections/wind-tunnel";

/*
 * The page is the race: the start line, four checkpoints, the finish. It stays a
 * server component; each section brings its own small client islands.
 *
 * No Suspense boundaries on purpose. They would let React hydrate section by
 * section, but this Next build's prerender outlines every boundary's HTML into a
 * hidden <div> that only an inline script reveals, so with JavaScript off the
 * page below the hero would be blank (measured in fixer round 1).
 */
export default function Home() {
  return (
    <>
      <a href="#main" className="skip">
        Skip to content
      </a>
      <CourseStrip />
      <main id="main">
        <Hero />
        <TelemetryHud />
        <Inside />
        <WindTunnel />
        <Bib />
      </main>
      <FinishLine />
    </>
  );
}
