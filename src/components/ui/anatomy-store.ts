// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

/**
 * Scroll-driven value for the anatomy sequence.
 *
 * Same trick as `src/lib/explode-store.ts`: a plain mutable object that GSAP
 * writes to on every scroll tick. Nothing here is React state, so scrubbing
 * through the pinned section costs zero re-renders — the section only re-renders
 * on the three frames where the active layer actually changes.
 */
export const anatomyStore = {
  /** 0 → 1 across the whole pinned sequence. Reset to 0 when the pin is torn down. */
  progress: 0,
};
