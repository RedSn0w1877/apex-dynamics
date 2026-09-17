"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { memo, useEffect, useState } from "react";
import { motion } from "motion/react";
import { LazyStackScene } from "@/components/three/lazy-stack-scene";
import { airflowStore } from "@/lib/explode-store";
import { LogMark } from "@/components/brand/log-mark";
import { Reveal, EASE_OUT } from "@/components/ui/reveal";
import { DRAG_COEFFICIENTS, WIND_SPEEDS, wattsSavedPerKm, type WindSpeedKey } from "@/lib/wind-tunnel-data";

const MAX_CD = 0.5;

const BarRow = memo(function BarRow({ label, cd, color }: { label: string; cd: number; color: string }) {
  const widthPct = (cd / MAX_CD) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between font-mono text-[11px] uppercase tracking-[0.16em] text-chalk/60">
        <span>{label}</span>
        <span className="text-chalk">Drag {cd.toFixed(2)}</span>
      </div>
      <div className="mt-2 h-3 bg-gridline">
        <motion.div
          className="h-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          whileInView={{ width: `${widthPct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: EASE_OUT }}
        />
      </div>
    </div>
  );
});

export function WindTunnel() {
  const [speed, setSpeed] = useState<WindSpeedKey>(25);
  const saved = wattsSavedPerKm(speed);

  // Drive the particle field straight from the selected wind speed: pick 35 km/h
  // and the air visibly rips. Written to a plain object so the Canvas doesn't
  // re-render on every toggle.
  useEffect(() => {
    airflowStore.value = speed / 25;
  }, [speed]);

  return (
    <section id="wind-tunnel" className="border-b border-gridline">
      <div className="mx-auto max-w-[1440px] px-5 py-20 md:px-10 md:py-28">
        <LogMark log="04" title="Wind tunnel comparator" />

        <div className="mt-10 grid gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <h2 className="font-display text-4xl italic font-black uppercase leading-[0.9] tracking-tighter text-chalk md:text-5xl">
              Less drag. <span className="text-volt">Free speed.</span>
            </h2>
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-chalk/65">
              Every shoe shoves air out of the way, and that costs you energy. A narrower toe box and a lower
              profile shove less. We ran both shoes in a scale-model wind tunnel — this is the power you stop
              wasting at race pace.
            </p>
          </Reveal>

          <div className="lg:col-span-8">
            {/* Live airflow over the stack — speed is bound to the toggle below. */}
            <div className="mb-px h-[260px] border border-gridline bg-void md:h-[320px]">
              <LazyStackScene
                airflow={airflowStore}
                cameraPosition={[0, 0.9, 5.2]}
                target={[0, 0.2, 0]}
                particleCount={1900}
                parallax={0.12}
              />
            </div>
            <div className="border border-gridline bg-carbon p-6 md:p-8">
              <div className="flex flex-col gap-6">
                <BarRow label="Standard trainer" cd={DRAG_COEFFICIENTS.standard} color="#3f3f46" />
                <BarRow label="Apex Pro" cd={DRAG_COEFFICIENTS.apex} color="#ccff00" />
              </div>

              <div className="mt-8 border-t border-gridline pt-6">
                <div role="radiogroup" aria-label="Wind velocity" className="flex flex-wrap gap-2">
                  {WIND_SPEEDS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={speed === v}
                      onClick={() => setSpeed(v)}
                      className={`h-10 border px-4 font-mono text-xs uppercase tracking-[0.16em] transition-colors ${
                        speed === v
                          ? "border-volt bg-volt text-void"
                          : "border-gridline text-chalk/60 hover:border-chalk/40 hover:text-chalk"
                      }`}
                    >
                      {v} km/h
                    </button>
                  ))}
                </div>

                <div className="mt-6 flex items-end justify-between gap-4">
                  <p className="max-w-sm text-sm leading-relaxed text-chalk/65">
                    Estimated power saved from drag reduction alone, holding pace and position constant.
                  </p>
                  <p className="shrink-0 text-right">
                    <span className="block font-display text-4xl italic font-black tabular-nums text-volt">{saved}W</span>
                    <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-chalk/50">
                      saved per km
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
