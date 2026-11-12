"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type PointerEvent,
} from "react";
import { STILLS, TEXTURES, type ImageFile } from "@/assets/apex";
import styles from "@/components/sections/inside.module.css";
import { RaceDigits, type RaceDigitsHandle } from "@/components/ui/race-digits";
import { BASE_PATH } from "@/lib/base-path";
import { prefersReducedMotion } from "@/lib/device";
import { LAYER_BY_ID, TALLY_ORDER } from "@/lib/shoe-layers";
import { CAMERA_LIVE, CUT_MAX_U, CUT_STATIONS, SHOE, stackAtMm } from "@/lib/shoe-spec";
import { calloutAnchor, cutForScroll, liveFrame, projectStill, stationAt, stationForScroll, valueText } from "./project";
import type { Xray } from "./xray-scene";
import { XrayStills } from "./xray-stills";

/*
 * The #inside stage. Server render and first client render are the same
 * static poster (no markup branches on motion or device); the mode is decided
 * after hydration, and only once the track is within a viewport (so the pins,
 * leader lines and ticks never add to the page's first relayout):
 *   stills        html[data-lite], html[data-embed] or reduced motion: the six
 *                 Cycles cuts, stepped by scroll (lite) or the slider only (reduce)
 *   live-pending  capable desktops: at the first pause (no scroll for
 *                 250 ms, then idle), fetch the 3D chunk, the pack and three
 *                 textures at once
 *   live          the WebGL cut, scrubbed by scroll, dragged across the shoe,
 *                 or set with the slider. The canvas takes over from the
 *                 Cycles poster only once the cut starts (or a drag does), so
 *                 the hand-off has a cause instead of reading as a glitch.
 * Per-frame work (the mm readout, pins, leader lines, the slider thumb) is
 * written straight to the DOM. React only hears about the station, at most six
 * times a sweep, and that drives the named callouts and the tally.
 */

type Mode = "poster" | "stills" | "live-pending" | "live";
type Point = readonly [number, number];

const LAYERS = TALLY_ORDER.map((id) => LAYER_BY_ID[id]);
const LAST = CUT_STATIONS.length - 1;
const srcSet = (files: readonly ImageFile[]) => files.map(({ file, width }) => `${file.src} ${width}w`).join(", ");
const POSTER_SIZES = "(max-width: 639px) 100vw, 100vw";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/*
 * The device decides the mode once, after hydration: the server snapshot is the
 * poster, so the server render and the hydrating render always match (no #418),
 * and the real answer lands on the next commit.
 */
const subscribeNothing = () => () => {};
const deviceMode = (): "stills" | "live" => {
  const html = document.documentElement;
  return html.hasAttribute("data-lite") || html.hasAttribute("data-embed") || prefersReducedMotion() ? "stills" : "live";
};
const posterMode = () => "poster" as const;
const canScrub = () => !prefersReducedMotion();
const serverScrub = () => true;

/** fetch, then blob, then ImageBitmap, untouched (no premultiply, no colour conversion); an <img> where that's missing. */
async function bitmap(src: string): Promise<TexImageSource> {
  if (typeof createImageBitmap === "function") {
    const blob = await (await fetch(src)).blob();
    return createImageBitmap(blob, { premultiplyAlpha: "none", colorSpaceConversion: "none" });
  }
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

export function XrayController() {
  const device = useSyncExternalStore(subscribeNothing, deviceMode, posterMode);
  /** Whether scrolling drives the cut (false under reduced motion: slider only, no sticky stage). */
  const scrub = useSyncExternalStore(subscribeNothing, canScrub, serverScrub);
  const [near, setNear] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [station, setStation] = useState(0);
  const mode: Mode =
    device === "poster" || !near
      ? "poster"
      : device === "stills" || failed
        ? "stills"
        : loaded
          ? "live"
          : "live-pending";
  /** Reduced motion: no scroll story, so every layer is named from the start (the slider picks the current one). */
  const allNamed = !scrub;

  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const posterRef = useRef<HTMLPictureElement>(null);
  const stillRef = useRef<HTMLImageElement | null>(null);
  const sliderRef = useRef<HTMLInputElement>(null);
  const readoutRef = useRef<RaceDigitsHandle | null>(null);
  const nameRefs = useRef<(HTMLElement | null)[]>([]);
  const pinRefs = useRef<(HTMLElement | null)[]>([]);
  const leadRefs = useRef<(HTMLElement | null)[]>([]);

  const drag = useRef<{ id: number; x: number } | null>(null);

  // Imperative state: none of it re-renders.
  const live = useRef<{
    xray: Xray | null;
    mode: Mode;
    u: number;
    goal: number;
    station: number;
    engaged: boolean;
    driver: "scroll" | "drag" | "slider";
    slots: (Point | null)[];
    box: { x: number; y: number; w: number; h: number };
    mm: number;
    text: string;
  }>({
    xray: null,
    mode: "poster",
    u: 0,
    goal: 0,
    station: 0,
    engaged: false,
    driver: "scroll",
    slots: [],
    box: { x: 0, y: 0, w: 1, h: 1 },
    mm: -1,
    text: "",
  });

  /* ------------------------------------------------------ per-frame writes --- */

  /** Pins on the cut face, leader lines from each named callout to its pin. */
  const place = useCallback((u: number) => {
    const s = live.current;
    const project: (p: readonly [number, number, number]) => Point =
      s.mode === "live" && s.xray
        ? s.xray.project
        : (p) => {
            const [nx, ny] = projectStill(p);
            return [s.box.x + nx * s.box.w, s.box.y + ny * s.box.h];
          };
    LAYERS.forEach((layer, i) => {
      const pin = pinRefs.current[i];
      const lead = leadRefs.current[i];
      if (!pin || !lead) return;
      const named = layer.station <= s.station && s.mode !== "poster" && s.mode !== "live-pending";
      pin.style.visibility = lead.style.visibility = named ? "visible" : "hidden";
      if (!named) return;
      const [ax, ay] = project(calloutAnchor(layer.id, u));
      pin.style.transform = `translate3d(${ax.toFixed(1)}px, ${ay.toFixed(1)}px, 0)`;
      const slot = s.slots[i];
      if (!slot) {
        lead.style.visibility = "hidden";
        return;
      }
      const dx = ax - slot[0];
      const dy = ay - slot[1];
      const len = Math.hypot(dx, dy);
      lead.style.transform = `translate3d(${slot[0].toFixed(1)}px, ${slot[1].toFixed(1)}px, 0) rotate(${Math.atan2(dy, dx).toFixed(4)}rad) scaleX(${len.toFixed(1)})`;
    });
  }, []);

  /** The mm readout and the slider's spoken value, written only when they change. */
  const readout = useCallback((u: number) => {
    const s = live.current;
    const mm = Math.round(stackAtMm(u) * 10) / 10;
    if (mm !== s.mm) {
      s.mm = mm;
      readoutRef.current?.update(mm);
    }
    const text = valueText(s.station, u);
    if (text !== s.text && sliderRef.current) {
      s.text = text;
      sliderRef.current.setAttribute("aria-valuetext", text);
    }
  }, []);

  /** Called by the scene after every rendered frame. */
  const onFrame = useCallback(
    (u: number) => {
      const s = live.current;
      s.u = u;
      const next = stationAt(u);
      if (next !== s.station) {
        s.station = next;
        setStation(next);
      }
      readout(u);
      if (s.driver !== "slider" && sliderRef.current) {
        const v = String(Math.round((u / CUT_MAX_U) * 100) * 10);
        if (sliderRef.current.value !== v) sliderRef.current.value = v;
      }
      place(u);
    },
    [place, readout],
  );

  /** Stills: jump to a station (scroll stepping or the slider). */
  const goStation = useCallback(
    (next: number) => {
      const s = live.current;
      const i = clamp(Math.round(next), 0, LAST);
      s.station = i;
      s.u = CUT_STATIONS[i].u;
      setStation(i);
      if (s.driver !== "slider" && sliderRef.current) sliderRef.current.value = String(i);
      readout(s.u);
      place(s.u);
    },
    [place, readout],
  );

  /* --------------------------------------------------------------- measure --- */

  /** Where each callout's leader starts (just past its name) and where the still sits, relative to the stage. */
  const measure = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const s = live.current;
    const sr = stage.getBoundingClientRect();
    s.slots = nameRefs.current.map((el) => {
      if (!el || !el.offsetParent) return null;
      const r = el.getBoundingClientRect();
      return [r.right - sr.left + 12, r.top - sr.top + r.height * 0.55] as const;
    });
    const still = stillRef.current;
    if (still) {
      // The 4:3 still is drawn with object-fit: contain against the right edge (object-position 100% 50%).
      const r = still.getBoundingClientRect();
      const ar = 4 / 3;
      const w = Math.min(r.width, r.height * ar) || 1;
      const h = w / ar;
      s.box = { x: r.right - sr.left - w, y: r.top - sr.top + (r.height - h) / 2, w, h };
    }
    // The poster matches the live camera's dolly on narrow stages, so the canvas fades in without a jump.
    const { dolly } = liveFrame(CAMERA_LIVE.fov, sr.width / Math.max(1, sr.height));
    stage.style.setProperty("--poster-scale", (1 / dolly).toFixed(3));
    place(s.u);
  }, [place]);

  // The tech line shows only on the current callout, so the slots move when the station does.
  useLayoutEffect(() => {
    measure();
  }, [station, mode, measure]);

  /* ------------------------------------------------------------- the mode --- */

  // Keep the imperative copy of the mode in step; the slider gets its spoken value once there is one.
  useLayoutEffect(() => {
    live.current.mode = mode;
    if (mode !== "poster") readout(live.current.u);
  }, [mode, readout]);

  /** The canvas replaces the poster only once the cut has started or a drag has begun. */
  const reveal = useCallback(() => {
    const s = live.current;
    const track = trackRef.current;
    if (s.mode === "live" && track && !track.hasAttribute("data-cut") && (s.goal > 0.02 || drag.current)) {
      track.setAttribute("data-cut", "");
    }
  }, []);

  // The track within a viewport: time to leave the poster and decide the mode.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || near) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        setNear(true);
      },
      { rootMargin: "100% 0px 100% 0px" },
    );
    io.observe(track);
    return () => io.disconnect();
  }, [near]);

  /* ------------------------------------------------------------ live load --- */

  useEffect(() => {
    if (mode !== "live-pending") return;
    const track = trackRef.current;
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!track || !canvas || !stage) return;
    let cancelled = false;
    let idle = 0;
    let timer = 0;

    async function load() {
      const t0 = performance.now();
      try {
        const [scene, pack, atlas, matcap, shadow] = await Promise.all([
          import("./xray-scene"),
          fetch(`${BASE_PATH}/proto04/proto04.bin`).then((r) => {
            if (!r.ok) throw new Error(`proto04.bin: HTTP ${r.status}`);
            return r.arrayBuffer();
          }),
          bitmap(TEXTURES.atlas.file.src),
          bitmap(TEXTURES.matcap.file.src),
          bitmap(TEXTURES.shadow.file.src),
        ]);
        if (cancelled || !canvas || !stage) return;
        const xray = await scene.createXray({
          canvas,
          stage,
          pack,
          atlas,
          matcap,
          shadow,
          t0,
          fetchMs: performance.now() - t0,
          onFrame,
          onLost: () => {
            live.current.xray?.dispose();
            live.current.xray = null;
            live.current.mode = "stills";
            setFailed(true);
          },
        });
        if (cancelled) {
          xray.dispose();
          return;
        }
        const s = live.current;
        s.xray = xray;
        s.mode = "live";
        setLoaded(true);
        xray.setTarget(s.goal);
        reveal();
      } catch (error) {
        if (cancelled) return;
        console.error("Inside: the 3D view could not start, showing stills.", error);
        live.current.mode = "stills";
        setFailed(true);
      }
    }

    /*
     * Wait for a pause: 250 ms with no scroll (longer than the gap between wheel ticks or
     * momentum frames, so only a reader who stopped qualifies), then an idle period (no timeout), and
     * re-check after it. A load that started mid-wheel used to land its long tasks on the
     * scroll; now the next pause pays for it, and start-up itself yields between steps.
     */
    const QUIET_MS = 250;
    let lastScroll = performance.now();
    const onScroll = () => {
      lastScroll = performance.now();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    const go = () => {
      window.removeEventListener("scroll", onScroll);
      void load();
    };
    const check = () => {
      timer = 0;
      idle = 0;
      if (cancelled) return;
      const since = performance.now() - lastScroll;
      if (since < QUIET_MS) {
        timer = window.setTimeout(check, QUIET_MS - since + 10);
        return;
      }
      if (typeof window.requestIdleCallback !== "function") return go();
      idle = window.requestIdleCallback(() => {
        idle = 0;
        if (performance.now() - lastScroll < QUIET_MS) check();
        else go();
      });
    };
    check();
    return () => {
      cancelled = true;
      window.removeEventListener("scroll", onScroll);
      if (idle) window.cancelIdleCallback(idle);
      window.clearTimeout(timer);
    };
  }, [mode, onFrame, reveal]);

  // Dispose only on unmount (client navigation to /legal).
  useEffect(
    () => () => {
      live.current.xray?.dispose();
      live.current.xray = null;
    },
    [],
  );

  /* --------------------------------------------------------------- scroll --- */

  useEffect(() => {
    if (mode === "poster" || !scrub) return;
    const track = trackRef.current;
    const stage = stageRef.current;
    if (!track || !stage) return;
    const s = live.current;
    let top = 0;
    let len = 1;

    const cache = () => {
      const strip = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--strip")) || 56;
      top = track.getBoundingClientRect().top + window.scrollY - strip;
      len = Math.max(1, track.offsetHeight - stage.offsetHeight);
    };

    const onScroll = () => {
      if (s.engaged) return;
      const p = clamp((window.scrollY - top) / len, 0, 1);
      if (s.mode === "stills") {
        const next = stationForScroll(p);
        if (next !== s.station) goStation(next);
      } else {
        s.goal = cutForScroll(p);
        s.xray?.setTarget(s.goal);
        reveal();
      }
    };

    // ONE passive listener, attached only while the track is on screen. Leaving it also ends any takeover.
    let listening = false;
    const io = new IntersectionObserver((entries) => {
      const on = entries.some((e) => e.isIntersecting);
      if (on && !listening) {
        cache();
        window.addEventListener("scroll", onScroll, { passive: true });
        listening = true;
        onScroll();
      } else if (!on && listening) {
        window.removeEventListener("scroll", onScroll);
        listening = false;
        s.engaged = false;
        s.driver = "scroll";
      }
    });
    io.observe(track);

    const ro = new ResizeObserver(() => {
      cache();
      measure();
    });
    ro.observe(document.body);
    ro.observe(stage);
    void document.fonts?.ready.then(() => {
      cache();
      measure();
    });

    return () => {
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [mode, scrub, goStation, measure, reveal]);

  // Without scrubbing (reduced motion) the stage still needs re-measuring on resize.
  useEffect(() => {
    if (mode === "poster" || scrub) return;
    const stage = stageRef.current;
    if (!stage) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [mode, scrub, measure]);

  /* ------------------------------------------------------- slider & drag --- */

  const onSlider = (event: ChangeEvent<HTMLInputElement>) => {
    const s = live.current;
    const v = Number(event.currentTarget.value);
    s.engaged = true;
    s.driver = "slider";
    if (s.mode === "stills") goStation(v);
    else {
      s.goal = (v / 1000) * CUT_MAX_U;
      s.xray?.setTarget(s.goal);
      reveal();
    }
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const s = live.current;
    if (s.mode !== "live" || !event.isPrimary || event.button !== 0) return;
    if ((event.target as HTMLElement).closest("label, a, button")) return;
    drag.current = { id: event.pointerId, x: event.clientX };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.dataset.dragging = "";
    reveal();
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const s = live.current;
    if (s.mode !== "live" || !s.xray) return;
    const stage = event.currentTarget;
    const d = drag.current;
    if (d && d.id === event.pointerId) {
      const dx = event.clientX - d.x;
      d.x = event.clientX;
      s.engaged = true;
      s.driver = "drag";
      s.goal = clamp(s.goal + dx / (0.55 * stage.clientWidth), 0, CUT_MAX_U);
      s.xray.setTarget(s.goal);
      return;
    }
    // Hover tilt: fine pointers only, and only while the pointer moves.
    if (event.pointerType !== "mouse") return;
    const r = stage.getBoundingClientRect();
    s.xray.setTilt(((event.clientX - r.left) / r.width) * 2 - 1, ((event.clientY - r.top) / r.height) * 2 - 1);
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    delete event.currentTarget.dataset.dragging;
  };

  const onPointerLeave = () => {
    live.current.xray?.setTilt(0, 0);
  };

  /* ---------------------------------------------------------------- render --- */

  const stills = mode === "stills";
  const poster = STILLS.insidePoster;
  const posterImg = poster.webp[poster.webp.length - 1];
  const ticks = CUT_STATIONS.map((st, i) => (stills ? i / LAST : st.u / CUT_MAX_U));
  const hint = !scrub
    ? "Use the slider under the shoe to cut it from heel to toe."
    : mode === "live"
      ? "Keep scrolling, or drag across the shoe. The cut starts at the heel."
      : "Keep scrolling. The cut starts at the heel.";

  return (
    <div
      ref={trackRef}
      className={styles.track}
      data-mode={mode}
      data-scrub={scrub ? "" : undefined}
      data-station={station}
    >
      <div
        ref={stageRef}
        className={styles.stage}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={onPointerLeave}
      >
        <picture ref={posterRef} className={styles.poster}>
          <source type="image/avif" srcSet={srcSet(poster.avif)} sizes={POSTER_SIZES} />
          <img
            src={posterImg.file.src}
            srcSet={srcSet(poster.webp)}
            sizes={POSTER_SIZES}
            width={posterImg.width}
            height={posterImg.height}
            loading="lazy"
            decoding="async"
            alt="Prototype 04 seen from behind the heel: dark knit upper, white foam midsole, the edge of the carbon plate and a lugged black outsole."
          />
        </picture>

        {stills && (
          <XrayStills station={station} className={styles.still} onImg={(img) => void (stillRef.current = img)} onLoad={measure} />
        )}

        <canvas ref={canvasRef} aria-hidden="true" className={styles.canvas} />

        {/* Decoration that only means anything once JS places it: not in the static HTML. */}
        {mode !== "poster" && (
          <div className={styles.marks} aria-hidden="true">
            {LAYERS.map((layer, i) => (
              <Fragment key={layer.id}>
                <span ref={(el) => void (leadRefs.current[i] = el)} className={styles.leader} />
                <span ref={(el) => void (pinRefs.current[i] = el)} className={styles.pin} />
              </Fragment>
            ))}
          </div>
        )}

        <p className={`t-label ${styles.hint}`} aria-hidden={station > 0 ? "true" : undefined}>
          {hint}
        </p>

        <ol className={styles.callouts} aria-label="The five layers, from the top down">
          {LAYERS.map((layer, i) => (
            <li
              key={layer.id}
              className={styles.callout}
              data-layer={layer.id}
              data-named={allNamed || layer.station <= station ? "true" : "false"}
              data-current={layer.station === station ? "" : undefined}
            >
              <p className={`t-display ${styles.name}`}>
                <span className={styles.chip} style={{ background: layer.capColor }} aria-hidden="true" />
                <span ref={(el) => void (nameRefs.current[i] = el)}>
                  {layer.shortName} · {layer.weightGrams} g
                </span>
              </p>
              <p className={styles.plain}>{layer.plainRole}</p>
              <p className={`t-label ${styles.tech}`}>{layer.techName}</p>
            </li>
          ))}
        </ol>

        <p className={`t-label ${styles.here}`}>
          <RaceDigits ref={readoutRef} value={SHOE.stackHeelMm} format="00.0" className={styles.hereDigits} />
          <span className={styles.hereText}>mm between your foot and the ground, here</span>
        </p>

        <div className={styles.foot}>
          <p className={`t-display ${styles.tally}`} data-complete={station === LAST ? "" : undefined}>
            <span aria-hidden="true">
              {LAYERS.map((layer, i) => (
                <Fragment key={layer.id}>
                  {i > 0 && <span className={styles.op}> + </span>}
                  <span className={styles.term} data-named={allNamed || layer.station <= station ? "true" : "false"}>
                    {layer.weightGrams}
                  </span>
                </Fragment>
              ))}
              <span className={styles.op}> = </span>
              <span className={styles.total}>{SHOE.weightG} g</span>
            </span>
            <span className="vh">The five layers add up: 42 plus 92 plus 22 plus 12 plus 50 equals 218 grams.</span>
          </p>

          <label className={styles.slider}>
            <span className="vh">Cut position, heel to toe</span>
            <span aria-hidden="true" className={`t-label ${styles.end}`}>
              heel
            </span>
            <span className={styles.rail}>
              {mode !== "poster" && (
                <span className={styles.ticks} aria-hidden="true">
                  {ticks.map((t, i) => (
                    <span key={i} className={styles.tick} style={{ left: `${(t * 100).toFixed(2)}%` }} />
                  ))}
                </span>
              )}
              <input
                ref={sliderRef}
                type="range"
                min={0}
                max={stills ? LAST : 1000}
                step={stills ? 1 : 10}
                defaultValue={0}
                onChange={onSlider}
              />
            </span>
            <span aria-hidden="true" className={`t-label ${styles.end}`}>
              toe
            </span>
          </label>
        </div>

        <p className={`t-label ${styles.fallback}`} hidden={!failed}>
          3D view unavailable on this device. Here are the slices as stills.
        </p>
      </div>
    </div>
  );
}
