// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

/**
 * Device tiers, in one place for both sides of the page (ported from HVNF
 * main's src/lib/device.ts).
 *
 * No "use client" on purpose: layout.tsx is a server component and needs
 * liteScript() as a string to inline in <head>, and use-client-flags.ts needs the
 * same rules for its live hook. Both read them from here, so the guess made
 * before first paint and the answer React settles on can never drift apart.
 *
 * "Lite" means no 3D chunk: the x-ray shows stills instead. Phones, small touch
 * screens, reduced motion, low core counts, low memory, data saver and slow
 * connections all land there. "Embed" means the page is inside an iframe (HVNF
 * main's Work carousel), which is always lite and never fires confetti.
 */

export const LITE_QUERIES = [
  "(prefers-reduced-motion: reduce)",
  "(max-width: 767px)",
  "(pointer: coarse) and (max-width: 1024px)",
] as const;

/** Four cores or fewer, or 4 GB or less, is a phone-class budget whatever the screen says. */
export const LITE_MAX_CORES = 4;
export const LITE_MAX_MEMORY_GB = 4;
export const LITE_SLOW_NETWORK = /^(slow-2g|2g|3g)$/;

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * The pre-paint guess, about 450 bytes. It runs while the HTML is still parsing,
 * so CSS can branch on html[data-lite] and html[data-embed] from the very first
 * frame. It also marks html.js, so styles can tell a scripted page from a no-JS
 * one (entrances only ever run under html.js). Wrapped in try/catch: a browser
 * that cannot answer is treated as full.
 */
export function liteScript(): string {
  return (
    `(function(){var d=document.documentElement,n=navigator,c=n.connection||{},L="data-lite";d.classList.add("js");` +
    `try{if(window.self!==window.top){d.setAttribute("data-embed","");d.setAttribute(L,"")}}` +
    `catch(e){d.setAttribute("data-embed","");d.setAttribute(L,"")}` +
    `try{if(${JSON.stringify(LITE_QUERIES)}.some(function(q){return matchMedia(q).matches})` +
    `||(n.hardwareConcurrency>0&&n.hardwareConcurrency<=${LITE_MAX_CORES})` +
    `||n.deviceMemory<=${LITE_MAX_MEMORY_GB}` +
    `||c.saveData===true` +
    `||${LITE_SLOW_NETWORK}.test(c.effectiveType||""))d.setAttribute(L,"")}catch(e){}})()`
  );
}

type NavigatorWithHints = Navigator & {
  deviceMemory?: number;
  connection?: EventTarget & { saveData?: boolean; effectiveType?: string };
};

/** True inside an iframe. Browser only. */
export function isEmbedded(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/** The same rules as liteScript(), answered live. Browser only. */
export function isLiteDevice(): boolean {
  const nav = navigator as NavigatorWithHints;
  return (
    LITE_QUERIES.some((query) => window.matchMedia(query).matches) ||
    (nav.hardwareConcurrency > 0 && nav.hardwareConcurrency <= LITE_MAX_CORES) ||
    (nav.deviceMemory !== undefined && nav.deviceMemory <= LITE_MAX_MEMORY_GB) ||
    nav.connection?.saveData === true ||
    LITE_SLOW_NETWORK.test(nav.connection?.effectiveType ?? "")
  );
}

/** Read in effects and handlers only, never in render: markup must not branch on motion. */
export const prefersReducedMotion = () => window.matchMedia(REDUCED_MOTION_QUERY).matches;
