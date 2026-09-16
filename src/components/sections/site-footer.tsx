// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import Link from "next/link";
import { COPYRIGHT_NOTICE, STUDIO } from "@/lib/copyright";

export function SiteFooter() {
  return (
    <footer className="bg-void">
      <div className="mx-auto grid max-w-[1440px] gap-12 px-5 py-16 md:grid-cols-12 md:px-10">
        <div className="md:col-span-5">
          <p className="flex items-center gap-2.5 font-display text-lg italic tracking-tight text-chalk">
            <span aria-hidden className="block h-2.5 w-2.5 bg-volt" />
            APEX DYNAMICS
          </p>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-chalk/60">
            Carbon-plated trail and endurance footwear, tested against real elevation and real wind, not marketing
            copy.
          </p>
        </div>

        <div className="md:col-span-3">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-chalk/50">Lab coordinates</h2>
          <address className="mt-4 text-sm not-italic leading-relaxed text-chalk/80">
            Chamonix, France
            <br />
            Boulder, Colorado, USA
            <br />
            <span className="font-mono text-xs text-chalk/50">Athlete roster: 14 active protocols</span>
          </address>
        </div>

        <div className="md:col-span-4">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-chalk/50">Testing notes</h2>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-chalk/60">
            <li>Wind tunnel figures from scale-model runs, not full-body live testing.</li>
            <li>Plate fatigue and outsole friction ratings per ASTM/ISO reference methods noted per spec.</li>
            <li>
              <Link href="/legal/terms" className="text-chalk underline decoration-gridline underline-offset-4 hover:decoration-chalk">
                Terms of use
              </Link>
              <span className="px-2 text-gridline">/</span>
              <Link href="/legal/privacy" className="text-chalk underline decoration-gridline underline-offset-4 hover:decoration-chalk">
                Privacy notice
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-gridline">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-5 py-6 font-mono text-[10px] uppercase leading-relaxed tracking-[0.16em] text-chalk/50 md:flex-row md:items-start md:justify-between md:px-10">
          <p className="text-chalk/70">{COPYRIGHT_NOTICE}</p>
          <p className="max-w-xl md:text-right">
            APEX DYNAMICS is a fictional brand designed and engineered by {STUDIO} as a portfolio concept.
            Specifications, wind-tunnel figures, testing protocols and pricing are illustrative. Copying,
            redistribution or reuse of this code, copy or design is prohibited.
          </p>
        </div>
      </div>
    </footer>
  );
}
