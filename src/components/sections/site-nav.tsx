"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { useEffect, useState, useSyncExternalStore, type MouseEvent } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "motion/react";
import { Liquid } from "liquid-gooey";
import { EASE_OUT } from "@/components/ui/reveal";
import { useScrollTo } from "@/components/providers/smooth-scroll";
import { COPYRIGHT_SHORT } from "@/lib/copyright";

const LINKS = [
  { id: "telemetry", label: "Telemetry" },
  { id: "anatomy", label: "Anatomy" },
  { id: "wind-tunnel", label: "Wind tunnel" },
] as const;

/** Every tracked section, in document order — the active-state resolver relies on that order. */
const SECTION_IDS = ["top", "telemetry", "anatomy", "wind-tunnel", "allocation"] as const;
type SectionId = (typeof SECTION_IDS)[number];

const SECTION_LABEL: Record<SectionId, string> = {
  top: "Prototype 04",
  telemetry: "Telemetry",
  anatomy: "Anatomy",
  "wind-tunnel": "Wind tunnel",
  allocation: "Allocation",
};

/** Past this many px of downward scroll the bar is allowed to duck away. */
const HIDE_AFTER = 180;

// Hydration flag via useSyncExternalStore: a store that never changes, reporting
// `false` on the server and `true` on the client. Cheaper and lint-clean compared
// to a setState-in-effect mount flag.
const neverChanges = () => () => {};
const onClient = () => true;
const onServer = () => false;

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const [condensed, setCondensed] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [active, setActive] = useState<SectionId>("top");

  // The gooey blob is decorative and client-only — keeping it out of the server
  // render keeps its SVG filter layer from ever hitting hydration.
  const mounted = useSyncExternalStore(neverChanges, onClient, onServer);

  const reduce = useReducedMotion();
  const scrollTo = useScrollTo();
  const { scrollY, scrollYProgress } = useScroll();

  useMotionValueEvent(scrollY, "change", (y) => {
    const previous = scrollY.getPrevious() ?? 0;
    setCondensed(y > 24);

    // Never duck the bar out from under an open drawer.
    if (open) {
      setHidden(false);
      return;
    }
    if (y > previous && y > HIDE_AFTER) setHidden(true);
    else if (y < previous) setHidden(false);
  });

  useEffect(() => {
    const nodes = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (node): node is HTMLElement => node !== null,
    );
    if (nodes.length === 0) return;

    // A thin band across the middle of the viewport decides what's "in view".
    // Whichever tracked section straddles it wins, earliest in document order.
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        const next = SECTION_IDS.find((id) => visible.has(id));
        if (next) setActive(next);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  /** Hand anchor clicks to Lenis so the nav scrolls with the same easing as everything else. */
  const go = (id: SectionId) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setOpen(false);
    scrollTo(`#${id}`);
  };

  const barTransition = reduce ? { duration: 0 } : { duration: 0.35, ease: EASE_OUT };
  const indicatorTransition = reduce ? { duration: 0 } : { duration: 0.32, ease: EASE_OUT };

  return (
    <motion.header
      // `initial={false}` on purpose: the bar is at rest on first paint, so it
      // is never invisible because an entrance animation failed to run.
      initial={false}
      animate={{ y: hidden ? "-101%" : "0%" }}
      transition={barTransition}
      onFocus={() => setHidden(false)}
      className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300 ${
        condensed
          ? "border-gridline bg-void/90 backdrop-blur-md"
          : "border-gridline/60 bg-void/70 backdrop-blur-sm"
      }`}
    >
      <motion.nav
        aria-label="Primary"
        initial={false}
        animate={{ height: condensed ? 52 : 64 }}
        transition={barTransition}
        className="mx-auto flex max-w-[1440px] items-center justify-between gap-6 px-5 md:px-10"
      >
        <div className="flex min-w-0 items-center gap-3">
          <a
            href="#top"
            onClick={go("top")}
            className="flex shrink-0 items-center gap-2.5 font-display text-lg italic tracking-tight text-chalk"
          >
            <motion.span
              aria-hidden
              initial={false}
              animate={{ scaleY: condensed ? 2.4 : 1 }}
              transition={barTransition}
              className="block h-2.5 w-2.5 bg-volt"
            />
            APEX DYNAMICS
          </a>

          {/* Once condensed, the bar starts reporting where you are. */}
          <AnimatePresence mode="wait" initial={false}>
            {condensed && (
              <motion.span
                key={active}
                initial={reduce ? false : { opacity: 0, y: 7 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -7 }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
                className="hidden truncate border-l border-gridline pl-3 font-mono text-[10px] uppercase tracking-[0.18em] text-volt sm:block"
              >
                {SECTION_LABEL[active]}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-4 md:gap-8">
          <ul className="hidden items-center gap-7 md:flex">
            {LINKS.map((link) => (
              <li key={link.id} className="relative">
                <a
                  href={`#${link.id}`}
                  onClick={go(link.id)}
                  aria-current={active === link.id ? "true" : undefined}
                  className={`font-mono text-[11px] uppercase tracking-[0.18em] transition-colors ${
                    active === link.id ? "text-chalk" : "text-chalk/55 hover:text-chalk"
                  }`}
                >
                  {link.label}
                </a>
                {active === link.id && (
                  <motion.span
                    aria-hidden
                    layoutId="nav-active-rule"
                    transition={indicatorTransition}
                    className="absolute -bottom-2 left-0 block h-[2px] w-full bg-volt"
                  />
                )}
              </li>
            ))}
          </ul>

          <a
            href="#allocation"
            onClick={go("allocation")}
            className={`hidden h-9 items-center gap-1.5 px-4 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-void transition-colors sm:inline-flex ${
              active === "allocation" ? "bg-chalk" : "bg-volt hover:bg-chalk"
            }`}
          >
            Early access
            <ArrowUpRight aria-hidden className="h-3.5 w-3.5" strokeWidth={2.25} />
          </a>

          <div className="relative h-9 w-9 md:hidden">
            {/* Decorative gooey layer: a volt slab with a droplet that flicks
                off when the drawer opens. Strictly pointer-events-none and
                aria-hidden so the real <button> below stays the only control. */}
            {mounted && (
              <span aria-hidden className="pointer-events-none absolute inset-0 block">
                <Liquid
                  fill="#ccff00"
                  blur={5}
                  contrast={16}
                  filterPadding={30}
                  className="relative block h-9 w-9"
                >
                  <Liquid.Item className="absolute inset-0" transition="bouncy">
                    <span className="block h-9 w-9" />
                  </Liquid.Item>
                  <Liquid.Item
                    className="absolute left-[13px] top-[13px]"
                    x={open ? 16 : 0}
                    y={open ? -15 : 0}
                    transition="bouncy"
                  >
                    <span className="block h-2.5 w-2.5 rounded-full" />
                  </Liquid.Item>
                </Liquid>
              </span>
            )}

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? "Close menu" : "Open menu"}
              className={`relative z-10 flex h-9 w-9 items-center justify-center ${
                mounted ? "text-void" : "border border-gridline text-chalk"
              }`}
            >
              {open ? <X aria-hidden className="h-4 w-4" /> : <Menu aria-hidden className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Reading progress, pinned to the bar's own bottom edge. */}
      <motion.span
        aria-hidden
        style={{ scaleX: scrollYProgress }}
        className="absolute inset-x-0 bottom-[-1px] block h-[2px] origin-left bg-volt"
      />

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-nav"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className="overflow-hidden border-t border-gridline bg-void md:hidden"
          >
            <ul className="flex flex-col divide-y divide-gridline px-5">
              {LINKS.map((link) => (
                <li key={link.id}>
                  <a
                    href={`#${link.id}`}
                    onClick={go(link.id)}
                    aria-current={active === link.id ? "true" : undefined}
                    className={`flex items-center justify-between py-4 font-mono text-xs uppercase tracking-[0.18em] transition-colors ${
                      active === link.id ? "text-chalk" : "text-chalk/60 hover:text-chalk"
                    }`}
                  >
                    {link.label}
                    {active === link.id && <span aria-hidden className="block h-1.5 w-1.5 bg-volt" />}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href="#allocation"
                  onClick={go("allocation")}
                  className="flex items-center justify-between py-4 font-mono text-xs uppercase tracking-[0.18em] text-volt"
                >
                  Early access
                  <ArrowUpRight aria-hidden className="h-3.5 w-3.5" strokeWidth={2.25} />
                </a>
              </li>
            </ul>
            <p className="border-t border-gridline px-5 py-3 font-mono text-[9px] uppercase tracking-[0.16em] text-chalk/45">
              {COPYRIGHT_SHORT} · Do not redistribute
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
