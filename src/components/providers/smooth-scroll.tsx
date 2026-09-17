"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import Lenis from "lenis";
import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

type ScrollTarget = string | HTMLElement | number;
type ScrollTo = (target: ScrollTarget, options?: { offset?: number }) => void;

const NAV_OFFSET = -64;

const SmoothScrollContext = createContext<ScrollTo>(() => {});

export const useScrollTo = () => useContext(SmoothScrollContext);

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // Respect OS-level "reduce motion": native scrolling, ScrollTrigger still works.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
    lenisRef.current = lenis;

    // Every Lenis scroll re-measures ScrollTrigger so pins and scrubs stay locked.
    lenis.on("scroll", ScrollTrigger.update);

    // One clock for both: GSAP's ticker drives Lenis (GSAP is seconds, Lenis wants ms).
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  const scrollTo = useCallback<ScrollTo>((target, options) => {
    const offset = options?.offset ?? NAV_OFFSET;
    const lenis = lenisRef.current;
    if (lenis) {
      lenis.scrollTo(target, { offset, duration: 1.3 });
      return;
    }
    const element = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
    const top =
      typeof element === "number"
        ? element
        : element
          ? element.getBoundingClientRect().top + window.scrollY + offset
          : 0;
    window.scrollTo({ top });
  }, []);

  return <SmoothScrollContext.Provider value={scrollTo}>{children}</SmoothScrollContext.Provider>;
}
