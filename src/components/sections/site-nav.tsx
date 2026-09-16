"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { EASE_OUT } from "@/components/ui/reveal";
import { COPYRIGHT_SHORT } from "@/lib/copyright";

const LINKS = [
  { href: "#telemetry", label: "Telemetry" },
  { href: "#anatomy", label: "Anatomy" },
  { href: "#wind-tunnel", label: "Wind tunnel" },
] as const;

export function SiteNav() {
  const [open, setOpen] = useState(false);

  return (
    <motion.header
      initial={{ y: -64 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: EASE_OUT }}
      className="fixed inset-x-0 top-0 z-50 border-b border-gridline bg-void/95 backdrop-blur-sm"
    >
      <nav aria-label="Primary" className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-6 px-5 md:px-10">
        <a href="#top" className="flex items-center gap-2.5 font-display text-lg italic tracking-tight text-chalk">
          <span aria-hidden className="block h-2.5 w-2.5 bg-volt" />
          APEX DYNAMICS
        </a>

        <div className="flex items-center gap-4 md:gap-8">
          <ul className="hidden items-center gap-7 md:flex">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="font-mono text-[11px] uppercase tracking-[0.18em] text-chalk/60 transition-colors hover:text-chalk"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <a
            href="#allocation"
            onClick={() => setOpen(false)}
            className="hidden h-9 items-center gap-1.5 bg-volt px-4 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-void transition-colors hover:bg-chalk sm:inline-flex"
          >
            Early access
            <ArrowUpRight aria-hidden className="h-3.5 w-3.5" strokeWidth={2.25} />
          </a>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="flex h-9 w-9 items-center justify-center border border-gridline text-chalk md:hidden"
          >
            {open ? <X aria-hidden className="h-4 w-4" /> : <Menu aria-hidden className="h-4 w-4" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-nav"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className="overflow-hidden border-t border-gridline bg-void md:hidden"
          >
            <ul className="flex flex-col divide-y divide-gridline px-5">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block py-4 font-mono text-xs uppercase tracking-[0.18em] text-chalk/60 transition-colors hover:text-chalk"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href="#allocation"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between py-4 font-mono text-xs uppercase tracking-[0.18em] text-volt"
                >
                  Early access
                  <ArrowUpRight aria-hidden className="h-3.5 w-3.5" strokeWidth={2.25} />
                </a>
              </li>
            </ul>
            <p className="border-t border-gridline px-5 py-3 font-mono text-[9px] uppercase tracking-[0.16em] text-chalk/45">
              {COPYRIGHT_SHORT} · Do not redistribute
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
