"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { useCallback, useSyncExternalStore } from "react";
import { LITE_QUERIES, isEmbedded, isLiteDevice } from "./device";

/**
 * Client flags built on useSyncExternalStore with FIXED server snapshots, so the
 * server render and the hydrating render always agree (that disagreement is
 * what threw React #418 under reduced motion). The real answer lands on the
 * next commit.
 *
 * Rule: no markup branches on motion preference. Motion lives in CSS media
 * queries; read matchMedia in effects and handlers. Use these hooks for modes
 * that genuinely need JS (submit enabled, live x-ray vs stills).
 */

const subscribeNothing = () => () => {};

/** False on the server and during hydration, true after. Server snapshot: false. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
}

/** A media query as a boolean. Server snapshot: false. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    useCallback(
      (notify: () => void) => {
        const list = window.matchMedia(query);
        list.addEventListener("change", notify);
        return () => list.removeEventListener("change", notify);
      },
      [query],
    ),
    () => window.matchMedia(query).matches,
    () => false,
  );
}

function subscribeVisibility(notify: () => void) {
  document.addEventListener("visibilitychange", notify);
  return () => document.removeEventListener("visibilitychange", notify);
}

/** Whether the tab is visible. Server snapshot: true. */
export function usePageVisible(): boolean {
  return useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState === "visible",
    () => true,
  );
}

type NavigatorWithConnection = Navigator & { connection?: EventTarget };

function subscribeLite(notify: () => void) {
  const lists = LITE_QUERIES.map((query) => window.matchMedia(query));
  const connection = (navigator as NavigatorWithConnection).connection;
  lists.forEach((list) => list.addEventListener("change", notify));
  connection?.addEventListener("change", notify);
  return () => {
    lists.forEach((list) => list.removeEventListener("change", notify));
    connection?.removeEventListener("change", notify);
  };
}

const liteSnapshot = () => isEmbedded() || isLiteDevice();

/**
 * Lite tier, live (the same rules as the pre-paint script, plus iframes).
 * Server snapshot: true, the safe answer: nothing heavy before hydration.
 */
export function useLite(): boolean {
  return useSyncExternalStore(subscribeLite, liteSnapshot, () => true);
}
