// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { SmoothScrollProvider } from "@/components/providers/smooth-scroll";
import { CopyrightGuard } from "@/components/brand/copyright-guard";
import { WatermarkRail } from "@/components/brand/watermark-rail";
import { COPYRIGHT_NOTICE, STUDIO } from "@/lib/copyright";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const bigShoulders = Big_Shoulders({
  variable: "--font-big-shoulders",
  subsets: ["latin"],
  weight: ["700", "900"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "APEX DYNAMICS — Prototype 04 Carbon Trail Racer",
    template: "%s — APEX DYNAMICS",
  },
  description:
    "Prototype 04: a carbon-plated trail racer with a forked wing plate and 84% energy return. A portfolio concept by HVNF Studios.",
  applicationName: "APEX DYNAMICS",
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
  themeColor: "#050505",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${bigShoulders.variable} ${jetbrainsMono.variable} antialiased`}>
      <body className="bg-void font-sans text-chalk">
        {/*
          React 19 hoists this into <head>; it's the machine-readable pointer to the license terms
          above. A raw <link> isn't rewritten by Next's basePath the way next/link is, so the path
          is hardcoded to match this site's GitHub Pages project path (/apex-dynamics).
        */}
        <link rel="license" href="/apex-dynamics/legal/terms" />
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
        <WatermarkRail />
        <CopyrightGuard />
        <Toaster theme="dark" position="bottom-right" toastOptions={{ style: { background: "#0c0c0e", border: "1px solid #1f1f23", color: "#f5f5f5" } }} />
      </body>
    </html>
  );
}
