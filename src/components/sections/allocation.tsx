"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check } from "lucide-react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { LogMark } from "@/components/brand/log-mark";
import { EASE_OUT, Reveal } from "@/components/ui/reveal";

type Distance = "marathon" | "50k" | "100m";
const DISTANCES: { id: Distance; label: string; detail: string }[] = [
  { id: "marathon", label: "Marathon", detail: "42.2 km, road or mixed terrain" },
  { id: "50k", label: "50K", detail: "Ultra distance, singletrack" },
  { id: "100m", label: "100 Miles", detail: "Multi-day support, deep lugs" },
];

const SIZES = ["40", "41", "42", "43", "44", "45", "46", "47"] as const;

type FormState = {
  name: string;
  email: string;
  distance: Distance;
  size: (typeof SIZES)[number];
  acknowledged: boolean;
};

type ErrorKey = "name" | "email" | "acknowledged";
type Errors = Partial<Record<ErrorKey, string>>;

const INITIAL: FormState = {
  name: "",
  email: "",
  distance: "50k",
  size: "43",
  acknowledged: false,
};

function validate(form: FormState): Errors {
  const errors: Errors = {};
  if (form.name.trim().length < 2) errors.name = "Enter your full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) errors.email = "Enter a valid email address.";
  if (!form.acknowledged) errors.acknowledged = "Confirm you've read the allocation terms.";
  return errors;
}

const inputClass =
  "mt-2 h-12 w-full border border-gridline bg-void px-4 text-sm text-chalk placeholder:text-chalk/35 transition-colors hover:border-chalk/40 focus:border-chalk focus:outline-none aria-[invalid=true]:border-volt";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-volt">
      {message}
    </p>
  );
}

/** A confetti burst tinted to the site's own three-color palette, not the library default rainbow. */
function fireAllocationConfetti() {
  confetti({
    particleCount: 90,
    spread: 70,
    origin: { y: 0.65 },
    colors: ["#ccff00", "#f5f5f5", "#3f3f46"],
    scalar: 0.9,
  });
}

export function Allocation() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"editing" | "holding" | "confirmed">("editing");
  const [reference, setReference] = useState("");
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (key in errors) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    const firstInvalid = (Object.keys(found) as ErrorKey[])[0];
    if (firstInvalid) {
      document.getElementById(`field-${firstInvalid}`)?.focus();
      return;
    }
    setStatus("holding");
    timer.current = window.setTimeout(() => {
      setReference(`AX-P04-${Math.random().toString(36).slice(2, 6).toUpperCase()}`);
      setStatus("confirmed");
      fireAllocationConfetti();
      toast.success("Field allocation held", {
        description: "Portfolio demo — nothing was sent or stored.",
      });
    }, 900);
  };

  const distance = DISTANCES.find((d) => d.id === form.distance) ?? DISTANCES[0];

  return (
    <section id="allocation" className="border-b border-gridline bg-carbon">
      <div className="mx-auto max-w-[1440px] px-5 py-20 md:px-10 md:py-28">
        <LogMark log="05" title="Field allocation" />

        <div className="mt-10 grid gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <h2 className="font-display text-4xl italic font-black uppercase leading-[0.9] tracking-tighter text-chalk md:text-5xl">
              Get on the <span className="text-volt">start line.</span>
            </h2>
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-chalk/65">
              Prototype 04 field allocation is limited to athletes racing this season. Tell us your distance and
              size and we hold a pair for testing.
            </p>
            <dl className="mt-8 max-w-sm border-t border-gridline">
              <div className="flex justify-between gap-4 border-b border-gridline py-3">
                <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-chalk/50">Distance</dt>
                <dd className="text-right text-sm text-chalk">{distance.label}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-gridline py-3">
                <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-chalk/50">Size</dt>
                <dd className="text-right text-sm text-chalk">EU {form.size}</dd>
              </div>
            </dl>
          </Reveal>

          <Reveal delay={0.1} className="lg:col-span-8">
            <div className="border border-gridline bg-void">
              <AnimatePresence mode="wait" initial={false}>
                {status === "confirmed" ? (
                  <motion.div
                    key="confirmed"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.5, ease: EASE_OUT }}
                    className="p-6 md:p-10"
                    role="status"
                  >
                    <span className="flex h-11 w-11 items-center justify-center bg-volt text-void">
                      <Check aria-hidden className="h-5 w-5" strokeWidth={2.5} />
                    </span>
                    <h3 className="mt-6 font-display text-3xl italic font-black uppercase tracking-tight text-chalk md:text-4xl">
                      Pair held, {form.name.trim().split(" ")[0]}.
                    </h3>
                    <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-chalk/65">
                      On a real allocation, sizing confirmation would land in{" "}
                      <span className="text-chalk">{form.email.trim()}</span>&apos;s inbox within one business day.
                    </p>
                    <dl className="mt-8 grid gap-px border border-gridline bg-gridline sm:grid-cols-3">
                      <div className="bg-carbon px-4 py-3">
                        <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-chalk/50">Reference</dt>
                        <dd className="mt-1 font-mono text-lg text-volt">{reference}</dd>
                      </div>
                      <div className="bg-carbon px-4 py-3">
                        <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-chalk/50">Distance</dt>
                        <dd className="mt-1 text-sm text-chalk">{distance.label}</dd>
                      </div>
                      <div className="bg-carbon px-4 py-3">
                        <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-chalk/50">Size</dt>
                        <dd className="mt-1 text-sm text-chalk">EU {form.size}</dd>
                      </div>
                    </dl>
                    <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.16em] text-chalk/45">
                      Portfolio demo — no confirmation was sent, no data was saved.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setStatus("editing");
                        setReference("");
                      }}
                      className="mt-6 inline-flex h-11 items-center border border-gridline px-5 font-mono text-[11px] uppercase tracking-[0.16em] text-chalk transition-colors hover:border-chalk"
                    >
                      Edit request
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    noValidate
                    onSubmit={onSubmit}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.5, ease: EASE_OUT }}
                    className="flex flex-col gap-8 p-6 md:p-10"
                  >
                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <label htmlFor="field-name" className="font-mono text-[10px] uppercase tracking-[0.18em] text-chalk/50">
                          Full name
                        </label>
                        <input
                          id="field-name"
                          type="text"
                          autoComplete="name"
                          value={form.name}
                          onChange={(e) => update("name", e.target.value)}
                          aria-invalid={Boolean(errors.name)}
                          aria-describedby={errors.name ? "error-name" : undefined}
                          className={inputClass}
                        />
                        <FieldError id="error-name" message={errors.name} />
                      </div>
                      <div>
                        <label htmlFor="field-email" className="font-mono text-[10px] uppercase tracking-[0.18em] text-chalk/50">
                          Email
                        </label>
                        <input
                          id="field-email"
                          type="email"
                          autoComplete="email"
                          inputMode="email"
                          value={form.email}
                          onChange={(e) => update("email", e.target.value)}
                          aria-invalid={Boolean(errors.email)}
                          aria-describedby={errors.email ? "error-email" : undefined}
                          className={inputClass}
                        />
                        <FieldError id="error-email" message={errors.email} />
                      </div>
                    </div>

                    <fieldset>
                      <legend className="font-mono text-[10px] uppercase tracking-[0.18em] text-chalk/50">
                        Preferred race distance
                      </legend>
                      <div className="mt-2 grid gap-2 sm:grid-cols-3">
                        {DISTANCES.map((d) => {
                          const checked = d.id === form.distance;
                          return (
                            <label
                              key={d.id}
                              className={`flex cursor-pointer items-start gap-3 border px-4 py-3 transition-colors has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-volt ${
                                checked ? "border-chalk bg-carbon" : "border-gridline hover:border-chalk/40"
                              }`}
                            >
                              <input
                                type="radio"
                                name="distance"
                                value={d.id}
                                checked={checked}
                                onChange={() => update("distance", d.id)}
                                className="sr-only"
                              />
                              <span aria-hidden className={`mt-1 h-2 w-2 shrink-0 ${checked ? "bg-volt" : "bg-gridline"}`} />
                              <span>
                                <span className="block text-sm font-medium text-chalk">{d.label}</span>
                                <span className="mt-0.5 block text-xs text-chalk/50">{d.detail}</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>

                    <div>
                      <label htmlFor="field-size" className="font-mono text-[10px] uppercase tracking-[0.18em] text-chalk/50">
                        Shoe size (EU)
                      </label>
                      <select
                        id="field-size"
                        value={form.size}
                        onChange={(e) => update("size", e.target.value as FormState["size"])}
                        className={`${inputClass} appearance-none`}
                      >
                        {SIZES.map((size) => (
                          <option key={size} value={size}>
                            EU {size}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="flex cursor-pointer items-start gap-3 text-sm text-chalk/65">
                        <input
                          id="field-acknowledged"
                          type="checkbox"
                          checked={form.acknowledged}
                          onChange={(e) => update("acknowledged", e.target.checked)}
                          aria-invalid={Boolean(errors.acknowledged)}
                          aria-describedby={errors.acknowledged ? "error-acknowledged" : undefined}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-[#ccff00]"
                        />
                        <span>
                          I understand this is a demo request, not a real order, and have read the{" "}
                          <Link href="/legal/terms" className="text-chalk underline decoration-gridline underline-offset-4 hover:decoration-chalk">
                            terms
                          </Link>{" "}
                          and{" "}
                          <Link href="/legal/privacy" className="text-chalk underline decoration-gridline underline-offset-4 hover:decoration-chalk">
                            privacy notice
                          </Link>
                          .
                        </span>
                      </label>
                      <FieldError id="error-acknowledged" message={errors.acknowledged} />
                    </div>

                    <div className="flex flex-col gap-4 border-t border-gridline pt-6 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-chalk/45">
                        Portfolio demo — nothing you type here leaves your browser.
                      </p>
                      <button
                        type="submit"
                        disabled={status === "holding"}
                        className="inline-flex h-12 items-center justify-center gap-2 bg-volt px-7 font-mono text-xs font-bold uppercase tracking-[0.16em] text-void transition-colors hover:bg-chalk disabled:cursor-wait disabled:opacity-70"
                      >
                        {status === "holding" ? "Holding pair…" : "Request allocation"}
                        {status !== "holding" && <ArrowRight aria-hidden className="h-4 w-4" />}
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
