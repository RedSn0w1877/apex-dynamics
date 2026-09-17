"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { useCallback, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import { BorderBeam } from "border-beam";
import { LogMark } from "@/components/brand/log-mark";
import { EASE_OUT } from "@/components/ui/reveal";
import { AnatomyCounter } from "@/components/ui/anatomy-counter";
import { AnatomyKineticNumber } from "@/components/ui/anatomy-kinetic-number";
import { AnatomyScanline } from "@/components/ui/anatomy-scanline";
import { anatomyStore } from "@/components/ui/anatomy-store";
import { useScrollTo } from "@/components/providers/smooth-scroll";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { SHOE_LAYERS, SHOE_TOTAL_GRAMS } from "@/lib/shoe-layers";

const COUNT = SHOE_LAYERS.length;
const LAYER_NUMERALS = SHOE_LAYERS.map((layer) => layer.index);

/** Extra scroll distance the pin holds for, in viewport heights. ~0.85vh per layer. */
const PIN_VH = 2.55;

/*
 * All of these start from the "show" state on first paint.
 *
 * `AnimatePresence initial={false}` means the panel that is present on mount
 * renders at rest — no `opacity: 0` is ever committed to the server HTML, so the
 * spec copy is readable on a throttled tab, a failed hydration, or with JS off.
 * Only the *swaps* animate, which is exactly where the motion is wanted.
 */
const panelVariants: Variants = {
  enter: { opacity: 0, x: 28 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.45, ease: EASE_OUT, staggerChildren: 0.045, delayChildren: 0.05 },
  },
  leave: { opacity: 0, x: -20, transition: { duration: 0.22, ease: EASE_OUT } },
};

const rowVariants: Variants = {
  enter: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } },
  leave: { opacity: 0, transition: { duration: 0.15 } },
};

const wordVariants: Variants = {
  enter: { y: "105%" },
  show: { y: "0%", transition: { duration: 0.5, ease: EASE_OUT } },
  leave: { y: "-105%", transition: { duration: 0.2, ease: EASE_OUT } },
};

/**
 * The technical layer name, wiped in word by word.
 *
 * The `h3` carries the plain-text `aria-label` and the visual layer is hidden from
 * assistive tech, and real space characters are emitted between the words so that
 * copying this heading gives "Vectran Monomesh Upper", not "VectranMonomeshUpper".
 */
function KineticName({ name }: { name: string }) {
  const words = name.split(" ");
  return (
    <h3
      aria-label={name}
      className="font-display text-[clamp(1.6rem,3.1vw,2.6rem)] italic font-black uppercase leading-[0.95] tracking-tighter text-chalk"
    >
      <span aria-hidden>
        {words.map((word, i) => (
          <span key={`${word}-${i}`}>
            <span className="inline-block overflow-hidden pb-[0.06em] align-bottom">
              <motion.span className="inline-block" variants={wordVariants}>
                {word}
              </motion.span>
            </span>
            {i < words.length - 1 && " "}
          </span>
        ))}
      </span>
    </h3>
  );
}

export function ShoeLayers() {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const trigger = useRef<ScrollTrigger | null>(null);
  const indexRef = useRef(0);

  const [activeIndex, setActiveIndex] = useState(0);
  const active = SHOE_LAYERS[activeIndex];
  const reduce = useReducedMotion();
  const scrollTo = useScrollTo();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // Pinning is a desktop affordance. On phones it fights the address bar, and
      // under reduced motion a scroll-jacked section is the last thing you want —
      // both fall back to the plain tab panel, which is fully functional on its own.
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const stageEl = stage.current;
        if (!stageEl) return;

        const st = ScrollTrigger.create({
          trigger: section.current,
          start: "top top",
          end: () => `+=${window.innerHeight * PIN_VH}`,
          pin: stageEl,
          pinSpacing: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const p = self.progress;
            anatomyStore.progress = p;
            // Straight to the DOM as a custom property: the kinetic numeral and the
            // progress rail both read it in CSS, so scrubbing never touches React.
            stageEl.style.setProperty("--anatomy-progress", p.toFixed(4));

            const next = Math.min(COUNT - 1, Math.max(0, Math.floor(p * COUNT)));
            if (next !== indexRef.current) {
              indexRef.current = next;
              setActiveIndex(next);
            }
          },
        });

        trigger.current = st;

        return () => {
          trigger.current = null;
          anatomyStore.progress = 0;
          stageEl.style.removeProperty("--anatomy-progress");
        };
      });

      return () => {
        mm.revert();
        anatomyStore.progress = 0;
      };
    },
    { scope: section },
  );

  /**
   * Manual override. Click or arrow-key a tab and it selects immediately, then
   * drives the scroll position to the matching slice of the pinned timeline — so
   * the pointer and the scrollbar never disagree about which layer is open.
   * Without a live pin (mobile, reduced motion) it is just a tab.
   */
  const select = useCallback(
    (i: number) => {
      indexRef.current = i;
      setActiveIndex(i);

      const st = trigger.current;
      if (!st) return;
      const target = st.start + (st.end - st.start) * ((i + 0.5) / COUNT);
      scrollTo(target, { offset: 0 });
    },
    [scrollTo],
  );

  const onTabKeyDown = useCallback((event: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const last = COUNT - 1;
    let next = -1;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = i === last ? 0 : i + 1;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = i === 0 ? last : i - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;

    if (next < 0) return;
    event.preventDefault();
    select(next);
    tabRefs.current[next]?.focus();
  }, [select]);

  return (
    <section id="anatomy" ref={section} className="relative border-b border-gridline bg-carbon">
      {/* The pinned stage. GSAP writes `--anatomy-progress` here; everything inside inherits it. */}
      <div ref={stage} className="relative flex min-h-screen flex-col justify-center overflow-hidden">
        <AnatomyKineticNumber items={LAYER_NUMERALS} activeIndex={activeIndex} />

        <div
          className="relative z-10 mx-auto w-full max-w-[1440px] px-5 py-14 md:px-10 md:py-16"
          // Fallback for the rail wherever the pin never runs: step the bar by
          // whichever layer is open instead of by scroll position.
          style={{ "--anatomy-step": ((activeIndex + 1) / COUNT).toFixed(4) } as CSSProperties}
        >
          <LogMark log="03" title="Anatomy of velocity" />

          <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-4">
              <h2 className="font-display text-4xl italic font-black uppercase leading-[0.9] tracking-tighter text-chalk md:text-5xl">
                Three layers, <span className="text-volt">peeled back.</span>
              </h2>
              <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-chalk/65">
                A running shoe is really just three parts stacked together: the fabric that wraps your foot, the
                cushioned slab underneath it, and the rubber that touches the trail. Keep scrolling to take
                Prototype 04 apart one part at a time.
              </p>

              {/* Scroll rail. Reads the GSAP custom property, falling back to the active step. */}
              <div className="mt-8">
                <div aria-hidden className="relative h-px w-full bg-gridline">
                  <div
                    className="absolute inset-y-0 left-0 w-full origin-left bg-volt"
                    style={{ transform: "scaleX(var(--anatomy-progress, var(--anatomy-step, 0)))" }}
                  />
                </div>
                <div className="mt-3 flex justify-between font-mono text-[10px] uppercase tracking-[0.18em]">
                  {SHOE_LAYERS.map((layer, i) => (
                    <span key={layer.id} className={i === activeIndex ? "text-volt" : "text-chalk/40"}>
                      {layer.index}
                    </span>
                  ))}
                </div>
                <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-chalk/50">
                  All three together {/* real space, so this doesn't read as "together218 g" */}
                  <span className="text-chalk">{SHOE_TOTAL_GRAMS} g per shoe</span>
                </p>
              </div>
            </div>

            <div className="lg:col-span-8">
              <div
                role="tablist"
                aria-label="Shoe construction layer"
                aria-orientation="horizontal"
                className="grid grid-cols-1 border border-gridline sm:grid-cols-3"
              >
                {SHOE_LAYERS.map((layer, i) => {
                  const selected = i === activeIndex;
                  return (
                    <button
                      key={layer.id}
                      ref={(el) => {
                        tabRefs.current[i] = el;
                      }}
                      type="button"
                      role="tab"
                      id={`layer-tab-${layer.id}`}
                      aria-selected={selected}
                      aria-controls={`layer-panel-${layer.id}`}
                      tabIndex={selected ? 0 : -1}
                      onClick={() => select(i)}
                      onKeyDown={(event) => onTabKeyDown(event, i)}
                      className={`relative flex flex-col items-start gap-1 border-gridline px-5 py-4 text-left transition-colors not-last:border-b sm:not-last:border-b-0 sm:not-last:border-r ${
                        selected ? "bg-void text-chalk" : "text-chalk/55 hover:bg-void/40 hover:text-chalk"
                      }`}
                    >
                      {selected && (
                        <motion.span
                          layoutId="layer-tab-highlight"
                          className="absolute inset-x-0 bottom-0 h-[2px] bg-volt"
                          transition={{ duration: 0.35, ease: EASE_OUT }}
                        />
                      )}
                      <span className="flex w-full items-baseline justify-between gap-3">
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-volt">
                          {layer.index}
                        </span>
                        <span className="font-mono text-[11px] text-chalk/50">{layer.weight}</span>
                      </span>
                      {/* Plain label first. The Vectran/PEBA/Vibram naming waits for the panel. */}
                      <span className="font-display text-base italic font-bold uppercase tracking-tight">
                        {layer.shortName}
                      </span>
                      <span className="text-[12px] leading-snug text-chalk/50">{layer.plainRole}</span>
                    </button>
                  );
                })}
              </div>

              <BorderBeam
                size="line"
                colorVariant="sunset"
                theme="dark"
                strength={0.6}
                borderRadius={0}
                active={!reduce}
                className="block w-full"
              >
                <div className="relative overflow-hidden border-x border-b border-gridline bg-void">
                  <AnatomyScanline runKey={active.id} />

                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={active.id}
                      id={`layer-panel-${active.id}`}
                      role="tabpanel"
                      aria-labelledby={`layer-tab-${active.id}`}
                      tabIndex={0}
                      variants={panelVariants}
                      initial="enter"
                      animate="show"
                      exit="leave"
                      className="grid gap-7 p-6 md:grid-cols-2 md:p-8"
                    >
                      <div>
                        <motion.p
                          variants={rowVariants}
                          className="font-mono text-[10px] uppercase tracking-[0.18em] text-volt"
                        >
                          {active.plainRole}
                        </motion.p>
                        <div className="mt-3">
                          <KineticName name={active.name} />
                        </div>
                        <motion.p
                          variants={rowVariants}
                          className="mt-4 max-w-md text-[15px] leading-relaxed text-chalk/70"
                        >
                          {active.summary}
                        </motion.p>
                        <motion.p
                          variants={rowVariants}
                          className="mt-5 font-mono text-[11px] uppercase tracking-[0.16em] text-volt"
                        >
                          {active.stressRating}
                        </motion.p>
                      </div>

                      <dl className="grid grid-cols-2 gap-px self-start border border-gridline bg-gridline">
                        <motion.div variants={rowVariants} className="bg-carbon px-4 py-3.5">
                          <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-chalk/50">
                            Material
                          </dt>
                          <dd className="mt-1 text-sm text-chalk">{active.material}</dd>
                        </motion.div>
                        <motion.div variants={rowVariants} className="bg-carbon px-4 py-3.5">
                          <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-chalk/50">Spec</dt>
                          <dd className="mt-1 text-sm text-chalk">{active.spec}</dd>
                        </motion.div>
                        <motion.div variants={rowVariants} className="bg-carbon px-4 py-3.5">
                          <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-chalk/50">Weight</dt>
                          <dd className="mt-1 font-display text-2xl italic font-bold text-volt">
                            <AnatomyCounter value={active.weightGrams} />
                            {/* Real space so this is announced as "42 g", not "42g". */}{" "}
                            <span className="text-sm not-italic text-chalk/50">g</span>
                          </dd>
                        </motion.div>
                        <motion.div variants={rowVariants} className="bg-carbon px-4 py-3.5">
                          <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-chalk/50">Layer</dt>
                          <dd className="mt-1 text-sm text-chalk">
                            {active.index} / 0{COUNT}
                          </dd>
                        </motion.div>
                      </dl>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </BorderBeam>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
