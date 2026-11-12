// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import type { Metadata, Viewport } from "next";
import { Sofia_Sans, Sofia_Sans_Condensed, Sofia_Sans_Extra_Condensed } from "next/font/google";
import "./globals.css";
import { CopyrightGuard } from "@/components/brand/copyright-guard";
import { COPYRIGHT_NOTICE, STUDIO } from "@/lib/copyright";
import { liteScript } from "@/lib/device";

/*
 * One superfamily, three cuts, about 73 KB in total. Only the Extra Condensed
 * (the poster numerals and heads, 16 KB) is preloaded; the other two swap in.
 * adjustFontFallback stays on, so each family gets a size-adjusted Arial
 * fallback and a swap barely moves the text. No `fallback` list here on
 * purpose: under Turbopack, passing one drops that adjusted face (measured: the
 * h1 wrapped to 3 lines in plain Arial, then snapped to 2, CLS 0.055). The plain
 * fallbacks (Arial Narrow, Arial) sit after the variables in globals.css.
 */
const display = Sofia_Sans_Extra_Condensed({
  weight: "900",
  style: "italic",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sofia-xc",
});

const label = Sofia_Sans_Condensed({
  weight: "700",
  style: "italic",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-sofia-c",
});

const text = Sofia_Sans({
  weight: ["400", "600"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-sofia",
});

export const metadata: Metadata = {
  title: {
    default: "Apex Dynamics — Prototype 04 trail racing shoe",
    template: "%s — Apex Dynamics",
  },
  description:
    "Prototype 04 is a carbon-plated trail racing shoe for 50K to 100 miles. Run the course, slice the shoe open and pin on a field-test bib. A portfolio concept by HVNF Studios.",
  applicationName: "Apex Dynamics",
  authors: [{ name: STUDIO }],
  creator: STUDIO,
  publisher: STUDIO,
  other: {
    copyright: COPYRIGHT_NOTICE,
    "dcterms.rightsHolder": STUDIO,
    "dcterms.rights": COPYRIGHT_NOTICE,
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0C0A",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the head script adds `js`, `data-lite` and
    // `data-embed` to <html> before React hydrates; the DOM's answer is kept.
    <html lang="en" className={`${display.variable} ${label.variable} ${text.variable}`} suppressHydrationWarning>
      <head>
        {/* Runs while the HTML parses, before first paint (see lib/device.ts). */}
        <script dangerouslySetInnerHTML={{ __html: liteScript() }} />
      </head>
      <body>
        {/*
          React hoists this into <head>; it's the machine-readable pointer to the license terms.
          A raw <link> isn't rewritten by Next's basePath the way next/link is, so the path is
          hardcoded to match this site's GitHub Pages project path (/apex-dynamics).
        */}
        <link rel="license" href="/apex-dynamics/legal/terms" />
        {children}
        <CopyrightGuard />
      </body>
    </html>
  );
}
