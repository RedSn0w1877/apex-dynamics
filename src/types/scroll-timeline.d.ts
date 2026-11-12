// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

/*
 * Scroll-driven animations, which TypeScript 5.9's lib.dom does not ship yet.
 * Only the parts the course strip uses. Feature-test with `"ScrollTimeline" in
 * window` before constructing one: Firefox (by default) and older Safari lack it.
 */

type ScrollAxis = "block" | "inline" | "x" | "y";

interface ScrollTimelineOptions {
  source?: Element | null;
  axis?: ScrollAxis;
}

interface ScrollTimeline extends AnimationTimeline {
  readonly source: Element | null;
  readonly axis: ScrollAxis;
}

declare const ScrollTimeline: {
  prototype: ScrollTimeline;
  new (options?: ScrollTimelineOptions): ScrollTimeline;
};
