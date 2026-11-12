// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/*
 * These packages stay in package.json (removing them needs a lockfile
 * regeneration, and CI runs `npm ci`) but must never be imported again.
 * Use CSS, WAAPI or inline SVG instead. `three` is allowed only in the #inside
 * x-ray, src/components/inside/**, which the page loads by dynamic import.
 */
const REMOVED = ["gsap", "@gsap/react", "lenis", "motion", "sonner", "border-beam", "liquid-gooey", "lucide-react", "@react-three/[^/]+"];

const banned = (names) => ({
  regex: `^(${names.join("|")})(/.*)?$`,
  message: "Removed from this build: gsap, lenis, motion, R3F/drei, border-beam, liquid-gooey, sonner and lucide-react. Use CSS, WAAPI or inline SVG.",
});
const THREE = {
  regex: "^three(/.*)?$",
  message: "three is allowed only in src/components/inside/** (the #inside x-ray, loaded by dynamic import).",
};
const restrict = (...patterns) => ["error", { patterns }];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Offline asset tools (Node and Blender scripts), not part of the app.
    "tools/**",
    // three's vendored Draco decoder, copied verbatim (minified upstream code).
    "public/draco/**",
    // three's DRACOLoader, vendored with three small changes (see its header); upstream style.
    "src/components/inside/vendor/**/*.js",
  ]),
  {
    rules: {
      "no-restricted-imports": restrict(banned(REMOVED), THREE),
      // Stills are art-directed <picture> elements with pre-encoded AVIF and WebP sources;
      // next/image (unoptimized on this static export) can't express that.
      "@next/next/no-img-element": "off",
    },
  },
  {
    files: ["src/components/inside/**"],
    rules: { "no-restricted-imports": restrict(banned(REMOVED)) },
  },
]);

export default eslintConfig;
