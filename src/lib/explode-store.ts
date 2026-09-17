// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

/**
 * Plain mutable objects shared between GSAP and React Three Fiber.
 * GSAP scrubs these values as you scroll; the 3D scene reads them every frame.
 * Keeping them outside React state means scrolling triggers zero re-renders.
 */
export const explodeStore = { value: 0 };

/** 0–1 airflow intensity for the wind tunnel particle field. */
export const airflowStore = { value: 0.35 };
