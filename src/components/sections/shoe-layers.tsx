"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { LogMark } from "@/components/brand/log-mark";
import { Reveal, EASE_OUT } from "@/components/ui/reveal";
import { SHOE_LAYERS } from "@/lib/shoe-layers";

export function ShoeLayers() {
  const [activeId, setActiveId] = useState(SHOE_LAYERS[0].id);
  const active = SHOE_LAYERS.find((layer) => layer.id === activeId) ?? SHOE_LAYERS[0];

  return (
    <section id="anatomy" className="border-b border-gridline bg-carbon">
      <div className="mx-auto max-w-[1440px] px-5 py-20 md:px-10 md:py-28">
        <LogMark log="03" title="Anatomy of velocity" />

        <div className="mt-10 grid gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <h2 className="font-display text-4xl italic font-black uppercase leading-[0.9] tracking-tighter text-chalk md:text-5xl">
              Three layers, <span className="text-volt">peeled back.</span>
            </h2>
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-chalk/65">
              Every gram is accounted for. Select a layer to open its cross-section, mechanical stress rating, and
              why it&apos;s built that way.
            </p>
          </Reveal>

          <div className="lg:col-span-8">
            <div role="tablist" aria-label="Shoe construction layer" className="grid grid-cols-1 border border-gridline sm:grid-cols-3">
              {SHOE_LAYERS.map((layer) => {
                const selected = layer.id === activeId;
                return (
                  <button
                    key={layer.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls={`layer-panel-${layer.id}`}
                    onClick={() => setActiveId(layer.id)}
                    className={`relative flex items-center justify-between gap-3 border-gridline px-5 py-4 text-left transition-colors not-last:border-b sm:not-last:border-b-0 sm:not-last:border-r ${
                      selected ? "bg-void text-chalk" : "text-chalk/55 hover:text-chalk"
                    }`}
                  >
                    {selected && (
                      <motion.span
                        layoutId="layer-tab-highlight"
                        className="absolute inset-x-0 bottom-0 h-[2px] bg-volt"
                        transition={{ duration: 0.35, ease: EASE_OUT }}
                      />
                    )}
                    <span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-volt">{layer.index}</span>
                      <span className="mt-1 block font-display text-sm italic font-bold uppercase tracking-tight">
                        {layer.name}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-chalk/50">{layer.weight}</span>
                  </button>
                );
              })}
            </div>

            <div className="relative overflow-hidden border-x border-b border-gridline bg-void">
              {/* A decorative "peel line" — the seam this cross-section pulls back from. */}
              <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#ccff00_50%,transparent)] opacity-40" />
              <AnimatePresence mode="wait">
                <motion.div
                  key={active.id}
                  id={`layer-panel-${active.id}`}
                  role="tabpanel"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.35, ease: EASE_OUT }}
                  className="grid gap-8 p-6 md:grid-cols-2 md:p-8"
                >
                  <div>
                    <p className="max-w-md text-[15px] leading-relaxed text-chalk/70">{active.summary}</p>
                    <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.16em] text-volt">{active.stressRating}</p>
                  </div>
                  <dl className="grid grid-cols-2 gap-px border border-gridline bg-gridline self-start">
                    <div className="bg-carbon px-4 py-3.5">
                      <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-chalk/50">Material</dt>
                      <dd className="mt-1 text-sm text-chalk">{active.material}</dd>
                    </div>
                    <div className="bg-carbon px-4 py-3.5">
                      <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-chalk/50">Spec</dt>
                      <dd className="mt-1 text-sm text-chalk">{active.spec}</dd>
                    </div>
                    <div className="bg-carbon px-4 py-3.5">
                      <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-chalk/50">Weight</dt>
                      <dd className="mt-1 text-sm text-chalk">{active.weight}</dd>
                    </div>
                    <div className="bg-carbon px-4 py-3.5">
                      <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-chalk/50">Layer</dt>
                      <dd className="mt-1 text-sm text-chalk">{active.index} / 03</dd>
                    </div>
                  </dl>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
