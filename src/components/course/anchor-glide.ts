// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { prefersReducedMotion } from "@/lib/device";

/*
 * Same-page anchor clicks glide; keyboard focus never does.
 *
 * The root has no `scroll-behavior: smooth`, because that would also animate the
 * scroll a Tab press triggers (the focused control would sit off-screen for a
 * second). Instead one delegated click listener catches pointer clicks on
 * `a[href^="#"]`: it glides the target into view (instant under reduced motion),
 * records the hash, and moves the sequential-focus start point to the target
 * with focus({ preventScroll }), like a native hash jump would. A keyboard Enter
 * on a link is a click too, and that is fine: it is a jump the visitor asked for.
 * Modified clicks (new tab, etc.) are left to the browser.
 */
export function startAnchorGlide(): () => void {
  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element | null)?.closest?.('a[href^="#"]');
    if (!(link instanceof HTMLAnchorElement)) return;
    const id = decodeURIComponent(link.hash.slice(1));
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    if (location.hash !== link.hash) history.pushState(null, "", link.hash);
    if (!target.matches("a[href], button, input, select, textarea, [tabindex]")) {
      target.setAttribute("tabindex", "-1");
      target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
    }
    target.focus({ preventScroll: true });
  };
  document.addEventListener("click", onClick);
  return () => document.removeEventListener("click", onClick);
}
