// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { SiteNav } from "@/components/sections/site-nav";
import { Hero } from "@/components/sections/hero";
import { TelemetryHud } from "@/components/sections/telemetry-hud";
import { ShoeLayers } from "@/components/sections/shoe-layers";
import { WindTunnel } from "@/components/sections/wind-tunnel";
import { Allocation } from "@/components/sections/allocation";
import { SiteFooter } from "@/components/sections/site-footer";
import { IntroSequence } from "@/components/ui/intro-sequence";

export default function Home() {
  return (
    <>
      {/*
        Client-only cold open. It renders nothing on the server and tears itself
        down on a timer, so the page below is always present and always reachable.
      */}
      <IntroSequence />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-20 focus:z-[60] focus:bg-volt focus:px-4 focus:py-2 focus:font-mono focus:text-xs focus:uppercase focus:text-void"
      >
        Skip to content
      </a>
      <SiteNav />
      <main id="main">
        <Hero />
        <TelemetryHud />
        <ShoeLayers />
        <WindTunnel />
        <Allocation />
      </main>
      <SiteFooter />
    </>
  );
}
