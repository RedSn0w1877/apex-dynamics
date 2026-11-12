"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { useEffect } from "react";
import { prefersReducedMotion } from "@/lib/device";

/**
 * Pointer parallax on the start line: the numerals drift up to ±16 px with the
 * pointer and the shoe ±10 px the other way, so the poster has depth; a fast
 * sideways flick leans the numerals up to 3° (the same lean they take on the
 * way out). Each axis is a critically damped spring (stiffness 170, damping 26),
 * so the motion keeps its momentum when the pointer changes its mind.
 *
 * It writes `translate` (and the lean's `transform`) straight onto the moving
 * elements, never a custom property on #start, so nothing else in the hero
 * restyles. The rAF runs only while a spring is moving and stops once settled:
 * idle is 0 rAF. Mouse and trackpad only, never with reduced motion or on lite
 * devices. Renders nothing.
 */

const STIFFNESS = 170;
const DAMPING = 26;
const NUM = { x: 16, y: 8 };
const SHOE = { x: 10, y: 6 };
const LEAN_MAX = 3; // degrees
const LEAN_PER_VELOCITY = 0.004; // degrees per (unit/s) of the spring's x velocity, in px

type Axis = { x: number; v: number; goal: number };

export function HeroParallax() {
  useEffect(() => {
    const section = document.getElementById("start");
    if (!section) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (prefersReducedMotion() || document.documentElement.hasAttribute("data-lite")) return;

    const nums = [...section.querySelectorAll<HTMLElement>("[data-par='num']")];
    const leans = [...section.querySelectorAll<HTMLElement>("[data-par='num'] > *")];
    const shoe = section.querySelector<HTMLElement>("[data-par='shoe']");
    if (!nums.length || !shoe) return;

    const ax: Axis = { x: 0, v: 0, goal: 0 };
    const ay: Axis = { x: 0, v: 0, goal: 0 };
    let frame = 0;
    let last = 0;
    let box = section.getBoundingClientRect();
    let stale = false;

    const integrate = (a: Axis, dt: number) => {
      const accel = -STIFFNESS * (a.x - a.goal) - DAMPING * a.v;
      a.v += accel * dt;
      a.x += a.v * dt;
    };
    const settled = (a: Axis) => Math.abs(a.v) < 0.01 && Math.abs(a.x - a.goal) < 0.0005;

    const write = () => {
      nums.forEach((el) => (el.style.translate = `${(-ax.x * NUM.x).toFixed(2)}px ${(-ay.x * NUM.y).toFixed(2)}px`));
      shoe.style.translate = `${(ax.x * SHOE.x).toFixed(2)}px ${(ay.x * SHOE.y).toFixed(2)}px`;
      const lean = Math.max(-LEAN_MAX, Math.min(LEAN_MAX, ax.v * NUM.x * LEAN_PER_VELOCITY));
      leans.forEach((el) => (el.style.transform = Math.abs(lean) < 0.01 ? "" : `skewX(${lean.toFixed(2)}deg)`));
    };

    const step = (now: number) => {
      // Fixed 1/120 s sub-steps keep the spring stable on a long frame; a stalled tab clamps to 50 ms.
      let dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      while (dt > 0) {
        const h = Math.min(dt, 1 / 120);
        integrate(ax, h);
        integrate(ay, h);
        dt -= h;
      }
      if (settled(ax) && settled(ay)) {
        ax.x = ax.goal;
        ay.x = ay.goal;
        ax.v = ay.v = 0;
        write();
        frame = 0;
        return;
      }
      write();
      frame = requestAnimationFrame(step);
    };

    const request = () => {
      if (frame) return;
      last = performance.now();
      frame = requestAnimationFrame(step);
    };

    const clamp = (v: number) => Math.min(1, Math.max(-1, v));
    const onEnter = () => {
      box = section.getBoundingClientRect();
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      if (stale) {
        box = section.getBoundingClientRect();
        stale = false;
      }
      ax.goal = clamp(((event.clientX - box.left) / box.width) * 2 - 1);
      ay.goal = clamp(((event.clientY - box.top) / box.height) * 2 - 1);
      request();
    };
    const onLeave = () => {
      ax.goal = 0;
      ay.goal = 0;
      request();
    };
    // The box moves with scroll: mark it stale and re-read it on the next move, never per scroll event.
    const onScroll = () => {
      stale = true;
    };

    section.addEventListener("pointerenter", onEnter);
    section.addEventListener("pointermove", onMove, { passive: true });
    section.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      section.removeEventListener("pointerenter", onEnter);
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
      [...nums, shoe].forEach((el) => (el.style.translate = ""));
      leans.forEach((el) => (el.style.transform = ""));
    };
  }, []);

  return null;
}
