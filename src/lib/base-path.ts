// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

/**
 * The site's path prefix: "/apex-dynamics" in the production export (GitHub
 * Pages serves it at github.io/apex-dynamics/) and "" under `next dev`.
 * next.config.ts sets it; Next inlines it at build time.
 *
 * Static imports (src/assets) get the prefix on their own. Use this for files
 * in public/ that code fetches at runtime, e.g.
 * `fetch(BASE_PATH + "/proto04/proto04.bin")`, and (through sitePath) for the
 * links between the site's pages.
 */
export const BASE_PATH: string = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * A plain href to one of the site's own pages, with the prefix and the export's
 * trailing slash: sitePath("/legal/terms") is "/apex-dynamics/legal/terms/".
 *
 * The site links its pages with plain <a> tags, not next/link: there are only
 * three pages, a full page load of a static file is instant, the legal links
 * never prefetched anyway (Next 16.3's export writes segment files where its
 * router doesn't look for them), and next/link cost about 7 KB gz of client
 * JavaScript per chunk that imported it.
 */
export const sitePath = (path: string) => `${BASE_PATH}${path === "/" ? "/" : `${path}/`}`;
