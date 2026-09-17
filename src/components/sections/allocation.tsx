"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check } from "lucide-react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { BorderBeam } from "border-beam";
import { LogMark } from "@/components/brand/log-mark";
import { EASE_OUT, Reveal } from "@/components/ui/reveal";
import { AllocationField, AllocationFieldError } from "@/components/ui/allocation-field";
import { AllocationBuildSheet, type BuildSheetRow } from "@/components/ui/allocation-build-sheet";
import { AllocationConfirmation } from "@/components/ui/allocation-confirmation";
import { AllocationMagneticSubmit } from "@/components/ui/allocation-magnetic-submit";

type Distance = "marathon" | "50k" | "100m";

type DistanceConfig = {
  id: Distance;
  label: string;
  detail: string;
  /** Outsole lug depth in mm — drives the grip bar on the build sheet. */
  lugMm: number;
  stack: string;
  ground: string;
};

const DISTANCES: DistanceConfig[] = [
  {
    id: "marathon",
    label: "Marathon",
    detail: "42.2 km, road or mixed terrain",
    lugMm: 3.5,
    stack: "38 / 30 mm",
    ground: "Road to hardpack",
  },
  {
    id: "50k",
    label: "50K",
    detail: "Ultra distance, singletrack",
    lugMm: 4.5,
    stack: "38 / 30 mm",
    ground: "Singletrack, loose rock",
  },
  {
    id: "100m",
    label: "100 Miles",
    detail: "Multi-day support, deep lugs",
    lugMm: 6,
    stack: "40 / 32 mm",
    ground: "Mud, scree, night trail",
  },
];

const LUG_MAX_MM = 6;
const SIZES = ["40", "41", "42", "43", "44", "45", "46", "47"] as const;

/** Reference weight is quoted at EU 43; every size step up adds about 4 g. */
const BASE_WEIGHT_G = 218;
const BASE_SIZE = 43;

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
  const reduce = useReducedMotion();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"editing" | "holding" | "confirmed">("editing");
  const [reference, setReference] = useState("");
  const [holdNumber, setHoldNumber] = useState(0);
  /** Bumped on every failed submit so invalid fields shake again, not just once. */
  const [shakeToken, setShakeToken] = useState(0);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const update = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => (key in current ? { ...current, [key]: undefined } : current));
  }, []);

  const onSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    const firstInvalid = (Object.keys(found) as ErrorKey[])[0];
    if (firstInvalid) {
      setShakeToken((n) => n + 1);
      document.getElementById(`field-${firstInvalid}`)?.focus();
      return;
    }
    setStatus("holding");
    timer.current = window.setTimeout(() => {
      // Randomness in a timeout callback, never during render.
      setReference(`AX-P04-${Math.random().toString(36).slice(2, 6).toUpperCase()}`);
      setHoldNumber(Math.floor(Math.random() * 180) + 21);
      setStatus("confirmed");
      fireAllocationConfetti();
      toast.success("Field allocation held", {
        description: "Portfolio demo — nothing was sent or stored.",
      });
    }, 900);
  }, [form]);

  const distance = useMemo(() => DISTANCES.find((d) => d.id === form.distance) ?? DISTANCES[0], [form.distance]);
  const weightG = useMemo(() => BASE_WEIGHT_G + (Number(form.size) - BASE_SIZE) * 4, [form.size]);

  const buildRows: BuildSheetRow[] = useMemo(() => [
    { id: "distance", label: "Race distance", value: distance.label },
    { id: "ground", label: "Ground", value: distance.ground },
    { id: "size", label: "Size", value: `EU ${form.size}` },
    { id: "stack", label: "Stack height", value: distance.stack },
    { id: "weight", label: "Weight per shoe", value: `${weightG} g` },
  ], [form.size, distance, weightG]);

  return (
    <section id="allocation" className="border-b border-gridline bg-carbon">
      <div className="mx-auto max-w-[1440px] px-5 py-20 md:px-10 md:py-28">
        <LogMark log="05" title="Field allocation" />

        <div className="mt-10 grid gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-volt">
              Two fields · about thirty seconds
            </p>
            <h2 className="mt-4 font-display text-4xl italic font-black uppercase leading-[0.9] tracking-tighter text-chalk md:text-5xl">
              Get on the <span className="text-volt">start line.</span>
            </h2>
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-chalk/65">
              Prototype 04 field allocation is limited to athletes racing this season. Tell us your distance and
              size and we hold a pair for testing.
            </p>

            <AllocationBuildSheet rows={buildRows} lugMm={distance.lugMm} lugMaxMm={LUG_MAX_MM} />
          </Reveal>

          <Reveal delay={0.1} className="lg:col-span-8">
            {/*
              The beam marks this panel as the page's one conversion point. Mono,
              square-cornered and dialled down, so it reads as a lit edge rather
              than a rainbow border.
            */}
            <BorderBeam
              size="md"
              colorVariant="mono"
              theme="dark"
              strength={status === "holding" ? 1 : 0.7}
              borderRadius={0}
              className="block"
            >
              <div className="relative overflow-hidden border border-gridline bg-void">
                <AnimatePresence mode="wait" initial={false}>
                  {status === "confirmed" ? (
                    <motion.div
                      key="confirmed"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -16 }}
                      transition={{ duration: 0.5, ease: EASE_OUT }}
                    >
                      <AllocationConfirmation
                        firstName={form.name.trim().split(" ")[0]}
                        email={form.email.trim()}
                        reference={reference}
                        distanceLabel={distance.label}
                        sizeEu={form.size}
                        weightG={weightG}
                        holdNumber={holdNumber}
                        onEdit={() => {
                          setStatus("editing");
                          setReference("");
                        }}
                      />
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
                        <AllocationField
                          id="field-name"
                          errorId="error-name"
                          label="Full name"
                          autoComplete="name"
                          value={form.name}
                          onChange={(value) => update("name", value)}
                          error={errors.name}
                          shakeToken={shakeToken}
                        />
                        <AllocationField
                          id="field-email"
                          errorId="error-email"
                          label="Email"
                          type="email"
                          autoComplete="email"
                          inputMode="email"
                          value={form.email}
                          onChange={(value) => update("email", value)}
                          error={errors.email}
                          shakeToken={shakeToken}
                        />
                      </div>

                      <fieldset>
                        <legend className="font-mono text-[10px] uppercase tracking-[0.18em] text-chalk/50">
                          Preferred race distance
                        </legend>
                        <div className="mt-2 grid gap-2 sm:grid-cols-3">
                          {DISTANCES.map((d) => {
                            const checked = d.id === form.distance;
                            return (
                              <motion.label
                                key={d.id}
                                whileHover={reduce ? undefined : { y: -3 }}
                                whileTap={reduce ? undefined : { scale: 0.985 }}
                                transition={{ type: "spring", stiffness: 420, damping: 26 }}
                                className={`relative flex cursor-pointer items-start gap-3 border px-4 py-3 transition-colors has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-volt ${
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
                                <span
                                  aria-hidden
                                  className={`mt-1 h-2 w-2 shrink-0 transition-colors ${checked ? "bg-volt" : "bg-gridline"}`}
                                />
                                <span>
                                  <span className="block text-sm font-medium text-chalk">{d.label}</span>
                                  <span className="mt-0.5 block text-xs text-chalk/50">{d.detail}</span>
                                </span>
                                {/* One volt rule that slides between the three cards. */}
                                {checked ? (
                                  <motion.span
                                    aria-hidden
                                    layoutId="allocation-distance-marker"
                                    className="absolute inset-x-0 bottom-0 h-[2px] bg-volt"
                                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                                  />
                                ) : null}
                              </motion.label>
                            );
                          })}
                        </div>
                      </fieldset>

                      <fieldset>
                        <legend className="font-mono text-[10px] uppercase tracking-[0.18em] text-chalk/50">
                          Shoe size (EU)
                        </legend>
                        <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-8">
                          {SIZES.map((size) => {
                            const checked = size === form.size;
                            return (
                              <motion.label
                                key={size}
                                whileHover={reduce ? undefined : { y: -3 }}
                                whileTap={reduce ? undefined : { scale: 0.94 }}
                                transition={{ type: "spring", stiffness: 480, damping: 24 }}
                                className={`relative flex h-12 cursor-pointer items-center justify-center border text-sm tabular-nums transition-colors has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-volt ${
                                  checked ? "border-volt text-void" : "border-gridline text-chalk/70 hover:border-chalk/40"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="size"
                                  value={size}
                                  checked={checked}
                                  onChange={() => update("size", size)}
                                  className="sr-only"
                                />
                                {checked ? (
                                  <motion.span
                                    aria-hidden
                                    layoutId="allocation-size-marker"
                                    className="absolute inset-0 bg-volt"
                                    transition={{ type: "spring", stiffness: 480, damping: 34 }}
                                  />
                                ) : null}
                                <span className="relative">{size}</span>
                              </motion.label>
                            );
                          })}
                        </div>
                        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-chalk/40">
                          Runs true to size — most testers stay in their road size.
                        </p>
                      </fieldset>

                      <div>
                        <label className="flex cursor-pointer items-start gap-3 text-sm text-chalk/65 has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-4 has-[input:focus-visible]:outline-volt">
                          <input
                            id="field-acknowledged"
                            type="checkbox"
                            checked={form.acknowledged}
                            onChange={(e) => update("acknowledged", e.target.checked)}
                            aria-invalid={Boolean(errors.acknowledged)}
                            aria-describedby={errors.acknowledged ? "error-acknowledged" : undefined}
                            className="sr-only"
                          />
                          <span
                            aria-hidden
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border transition-colors ${
                              form.acknowledged
                                ? "border-volt bg-volt"
                                : errors.acknowledged
                                  ? "border-volt/70"
                                  : "border-gridline"
                            }`}
                          >
                            <AnimatePresence initial={false}>
                              {form.acknowledged ? (
                                <motion.span
                                  key="tick"
                                  initial={{ scale: 0.3, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0.3, opacity: 0 }}
                                  transition={{ type: "spring", stiffness: 520, damping: 20 }}
                                  className="flex"
                                >
                                  <Check className="h-3.5 w-3.5 text-void" strokeWidth={3} />
                                </motion.span>
                              ) : null}
                            </AnimatePresence>
                          </span>
                          <span>
                            I understand this is a demo request, not a real order, and have read the{" "}
                            <Link
                              href="/legal/terms"
                              className="text-chalk underline decoration-gridline underline-offset-4 hover:decoration-chalk"
                            >
                              terms
                            </Link>{" "}
                            and{" "}
                            <Link
                              href="/legal/privacy"
                              className="text-chalk underline decoration-gridline underline-offset-4 hover:decoration-chalk"
                            >
                              privacy notice
                            </Link>
                            .
                          </span>
                        </label>
                        <AllocationFieldError id="error-acknowledged" message={errors.acknowledged} />
                      </div>

                      <div className="flex flex-col gap-4 border-t border-gridline pt-6 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-chalk/45">
                          Portfolio demo — nothing you type here leaves your browser.
                        </p>
                        <AllocationMagneticSubmit
                          disabled={status === "holding"}
                          className="inline-flex h-12 items-center justify-center gap-2 bg-volt px-7 font-mono text-xs font-bold uppercase tracking-[0.16em] text-void transition-colors hover:bg-chalk disabled:cursor-wait disabled:opacity-70"
                        >
                          {status === "holding" ? "Holding pair…" : "Request allocation"}
                          {status !== "holding" && <ArrowRight aria-hidden className="h-4 w-4" />}
                        </AllocationMagneticSubmit>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>

                {/* Decorative: a volt bar fills the panel edge while the hold is placed. */}
                <AnimatePresence>
                  {status === "holding" ? (
                    <motion.span
                      key="holding-bar"
                      aria-hidden
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.9, ease: "linear" }}
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] origin-left bg-volt"
                    />
                  ) : null}
                </AnimatePresence>
              </div>
            </BorderBeam>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
