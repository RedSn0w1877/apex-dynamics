// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { prefersReducedMotion } from "@/lib/device";
import { CHECKPOINTS, elevToY, kmToX } from "@/lib/course";
import { TELEMETRY_MAX_KM, sampleAt } from "@/lib/telemetry-data";

/*
 * The runner dot on the course strip.
 *
 * LIVE (ScrollTimeline, no reduced motion): ONE WAAPI animation per element,
 * driven by the page's scroll position, so the dot runs on the compositor with
 * zero main-thread work per scroll frame. Keyframes are one per kilometre
 * (31): the profile has a vertex per km and the anchors below all fall on whole
 * km, so linear interpolation between keyframes follows the drawn line exactly.
 *
 *   anchors: scroll 0 = km 0; each gate's top (minus the scroll padding, i.e.
 *   exactly where a CP link or an anchor jump lands) = km 6 / 14 / 22 / 29;
 *   the bottom of the page = km 30.
 *
 * Built after fonts are ready and rebuilt (old animations cancelled first) when
 * the body or the window resizes, debounced 250 ms.
 *
 * FALLBACK (no ScrollTimeline, or reduced motion): the dot steps from
 * checkpoint to checkpoint as the section observer reports them.
 *
 * In both modes an IntersectionObserver over the six stops (#start, the four
 * checkpoint sections, #finish) reports the current stop, for the status label
 * and aria-current. That changes at most six times down the page.
 */

export type RunnerParts = {
  /** The profile box the dot rides over (the polyline fills it). */
  profile: HTMLElement;
  dot: HTMLElement;
  /** The travelled course: an overflow-hidden window and the volt line inside it. */
  outer: HTMLElement;
  inner: HTMLElement;
};

/** Kilometre of each stop: start, CP1–CP4, finish. */
export const STOP_KM = [0, ...CHECKPOINTS.map((c) => c.km), TELEMETRY_MAX_KM] as const;
const STOP_IDS = ["start", ...CHECKPOINTS.map((c) => c.id), "finish"];

const point = (km: number, w: number, h: number) => ({ x: kmToX(km, w), y: elevToY(sampleAt(km).elevationM, h) });
const outerAt = (km: number) => `translateX(${((km / TELEMETRY_MAX_KM - 1) * 100).toFixed(2)}%)`;
const innerAt = (km: number) => `translateX(${((1 - km / TELEMETRY_MAX_KM) * 100).toFixed(2)}%)`;
const px = (v: number) => `${v.toFixed(1)}px`;

export function startRunner(parts: RunnerParts, onStop: (index: number) => void): () => void {
  const { profile, dot, outer, inner } = parts;
  const live = !prefersReducedMotion() && "ScrollTimeline" in window;
  const root = document.documentElement;
  let animations: Animation[] = [];
  let current = -1;
  let timer = 0;
  let disposed = false;

  /* ---------------------------------------------------------------- fallback --- */

  function place(km: number) {
    const { width, height } = profile.getBoundingClientRect();
    const { x, y } = point(km, width, height);
    dot.style.setProperty("--x", px(x));
    dot.style.setProperty("--y", px(y));
    outer.style.transform = outerAt(km);
    inner.style.transform = innerAt(km);
  }

  /* -------------------------------------------------------------------- live --- */

  function build() {
    for (const animation of animations) animation.cancel();
    animations = [];
    const maxScroll = root.scrollHeight - root.clientHeight;
    if (maxScroll <= 0) return;
    const pad = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
    const { width, height } = profile.getBoundingClientRect();

    // [km, scrollY] pairs, never decreasing in scroll.
    const anchors: [number, number][] = [[0, 0]];
    for (const c of CHECKPOINTS) {
      const gate = document.querySelector(`[data-cp="${c.cp}"]`) ?? document.getElementById(c.id);
      if (!gate) continue;
      const top = gate.getBoundingClientRect().top + window.scrollY - pad;
      anchors.push([c.km, Math.min(Math.max(top, anchors[anchors.length - 1][1]), maxScroll)]);
    }
    anchors.push([TELEMETRY_MAX_KM, maxScroll]);

    const scrollFor = (km: number) => {
      for (let i = 1; i < anchors.length; i++) {
        const [k1, s1] = anchors[i];
        const [k0, s0] = anchors[i - 1];
        if (km <= k1) return k1 === k0 ? s1 : s0 + ((km - k0) / (k1 - k0)) * (s1 - s0);
      }
      return maxScroll;
    };

    const dotFrames: Keyframe[] = [];
    const outerFrames: Keyframe[] = [];
    const innerFrames: Keyframe[] = [];
    let last = 0;
    for (let km = 0; km <= TELEMETRY_MAX_KM; km++) {
      const offset = Math.min(1, Math.max(last, scrollFor(km) / maxScroll));
      last = offset;
      const { x, y } = point(km, width, height);
      dotFrames.push({ offset, transform: `translate(${px(x)}, ${px(y)})` });
      outerFrames.push({ offset, transform: outerAt(km) });
      innerFrames.push({ offset, transform: innerAt(km) });
    }

    const options: KeyframeAnimationOptions = {
      timeline: new ScrollTimeline({ source: root, axis: "block" }),
      fill: "both",
      easing: "linear",
    };
    // From here the animation's transform positions the dot, so zero the static km-0 offset
    // (without the fallback's transition) in the same frame the animations start.
    dot.style.transition = "none";
    dot.style.setProperty("--x", "0px");
    dot.style.setProperty("--y", "0px");
    animations = [dot.animate(dotFrames, options), outer.animate(outerFrames, options), inner.animate(innerFrames, options)];
  }

  function refresh() {
    if (disposed) return;
    if (live) build();
    else if (current >= 0) place(STOP_KM[current]);
  }

  function schedule() {
    window.clearTimeout(timer);
    timer = window.setTimeout(refresh, 250);
  }

  /* ----------------------------------------------------- which stop is current --- */

  const stops = STOP_IDS.map((id) => document.getElementById(id));
  const showing = new Set<number>();
  let atFinish = false;

  function pick() {
    const next = atFinish ? stops.length - 1 : showing.size ? Math.max(...showing) : current;
    if (next < 0 || next === current) return;
    current = next;
    onStop(next);
    if (!live) place(STOP_KM[next]);
  }

  /*
   * "Here" is the last stop whose top has crossed into the top 30% of the viewport, the
   * band a CP link or an anchor jump lands its gate in. Watching a band at the top
   * (rather than the middle) keeps a short section current after a jump to it, even
   * when the next section's top is already on screen below it.
   */
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const index = stops.indexOf(entry.target as HTMLElement);
        if (entry.isIntersecting) showing.add(index);
        else showing.delete(index);
      }
      pick();
    },
    { rootMargin: "0px 0px -70% 0px" },
  );
  for (const stop of stops) if (stop) observer.observe(stop);

  // The footer is shorter than a screen, so its top may never reach that band: the
  // finish counts once the whole finish line is in view (the bottom of the page).
  const finish = stops[stops.length - 1];
  const finishObserver = new IntersectionObserver(
    ([entry]) => {
      atFinish = entry.intersectionRatio >= 0.98;
      pick();
    },
    { threshold: [0, 0.98] },
  );
  if (finish) finishObserver.observe(finish);

  // The body observer catches layout changes (fonts, late content, width); the window
  // listener catches a height-only resize, which moves the bottom anchor but not the body.
  const resize = new ResizeObserver(schedule);
  resize.observe(document.body);
  window.addEventListener("resize", schedule, { passive: true });
  document.fonts?.ready.then(schedule);

  return () => {
    disposed = true;
    window.clearTimeout(timer);
    observer.disconnect();
    finishObserver.disconnect();
    resize.disconnect();
    window.removeEventListener("resize", schedule);
    for (const animation of animations) animation.cancel();
    animations = [];
    dot.style.removeProperty("--x");
    dot.style.removeProperty("--y");
    dot.style.removeProperty("transition");
    outer.style.transform = "";
    inner.style.transform = "";
  };
}
