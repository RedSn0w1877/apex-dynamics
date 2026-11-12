// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { SPONSOR_LINE } from "@/lib/copyright";
import { kmToX, elevToY } from "@/lib/course";
import { TELEMETRY } from "@/lib/telemetry-data";
import {
  PIN_ANGLES,
  PIN_BOX,
  PIN_CLASP,
  PIN_COIL,
  PIN_WIRE,
  bibCode,
  bibFileName,
  bibLineText,
  bibName,
  weightLine,
  type Distance,
  type Size,
} from "./bib-data";

/*
 * "Save your bib (PNG)": the same bib, drawn unrotated on a 1200 × 1500 canvas in
 * the visitor's browser and handed back as a download. Nothing is uploaded and
 * nothing leaves the device: canvas, blob, object URL, <a download>, revoked.
 *
 * The fonts are the page's own: the real family names are read from the
 * next/font CSS variables (they're hashed per build) and loaded before drawing,
 * so the canvas never falls back to a system face. The pin holes and tear
 * notches are punched out (transparent), the course profile is the page's own
 * 30 km line, and the safety pins are drawn as paths
 * from the same data as the card's SVG.
 */

const W = 1200;
const H = 1500;
const U = W / 100; // 1cqi on the card = 12 px here

const INK = "#111311";
const DIM = "#5E635A";
const BIB = "#F6F6F0";
const VOLT = "#CCFF00";
const WIRE = "#6F746B";

const FALLBACK = {
  xc: '"Arial Narrow", Arial, sans-serif',
  c: '"Arial Narrow", Arial, sans-serif',
  s: "Arial, sans-serif",
};

function families() {
  const css = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => {
    const value = css.getPropertyValue(name).trim();
    return value ? `${value}, ${fallback}` : fallback;
  };
  return {
    xc: read("--font-sofia-xc", FALLBACK.xc),
    c: read("--font-sofia-c", FALLBACK.c),
    s: read("--font-sofia", FALLBACK.s),
  };
}

/** The largest size (down from `start`) at which `text` fits in `maxWidth`. */
function fitFont(ctx: CanvasRenderingContext2D, text: string, font: (px: number) => string, start: number, maxWidth: number) {
  let px = start;
  ctx.font = font(px);
  const width = ctx.measureText(text).width;
  if (width > maxWidth) {
    px = Math.max(24, Math.floor((start * maxWidth) / width));
    ctx.font = font(px);
  }
  return px;
}

function drawPin(ctx: CanvasRenderingContext2D, x: number, y: number, degrees: number) {
  const scale = (8.6 * U) / PIN_BOX.w;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.scale(scale, scale);
  ctx.translate(-PIN_BOX.w * 0.12, -PIN_BOX.h / 2);
  ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
  ctx.shadowOffsetY = 3;
  ctx.shadowBlur = 4;
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = WIRE;
  ctx.stroke(new Path2D(PIN_WIRE));
  ctx.stroke(new Path2D(PIN_COIL));
  ctx.fillStyle = INK;
  ctx.fill(new Path2D(PIN_CLASP));
  ctx.restore();
}

export type BibImage = { name: string; distance: Distance; size: Size; pinned: boolean };

export async function drawBib({ name, distance, size, pinned }: BibImage): Promise<HTMLCanvasElement> {
  const f = families();
  const display = (px: number) => `italic 900 ${px}px ${f.xc}`;
  const label = (px: number) => `italic 700 ${px}px ${f.c}`;
  const text = (px: number) => `600 ${px}px ${f.s}`;
  await Promise.all([document.fonts.load(display(100)), document.fonts.load(label(50)), document.fonts.load(text(30))]).catch(
    () => undefined,
  );

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is not available.");

  // The Tyvek.
  ctx.fillStyle = BIB;
  ctx.beginPath();
  ctx.roundRect(0, 0, W, H, 12);
  ctx.fill();

  // The volt band.
  const band = 12 * U;
  ctx.fillStyle = VOLT;
  ctx.fillRect(0, 0, W, band);
  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = label(4.2 * U);
  ctx.fillText("FIELD TEST 2026 · PROTOTYPE 04", W / 2, band / 2 + 2);

  ctx.textBaseline = "alphabetic";

  // The name, fitted to 1040 px.
  const shown = bibName(name);
  const namePx = fitFont(ctx, shown, display, 10 * U, 1040);
  const nameTop = band + 7 * U;
  ctx.fillStyle = name.trim() ? INK : DIM;
  ctx.fillText(shown, W / 2, nameTop + namePx * 0.74);

  // The wave line.
  const lineTop = nameTop + namePx * 0.9 + 2.4 * U;
  ctx.fillStyle = INK;
  ctx.font = label(4.2 * U);
  ctx.fillText(bibLineText(distance, size), W / 2, lineTop + 4.2 * U * 0.85);

  // The tab, from the bottom up.
  const sponsorY = H - 4.5 * U - 8;
  const weightY = sponsorY - 2.9 * U * 1.3 - 1.4 * U;
  const perfY = weightY - 4 * U - 3.2 * U;

  // The course profile above the tab, then the code centred between the wave line and the profile.
  const courseH = 8 * U;
  const courseBottom = perfY - 3.6 * U;
  const courseTop = courseBottom - courseH;
  const left = 7 * U;
  const span = W - 14 * U;
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.beginPath();
  TELEMETRY.forEach((s, i) => {
    const x = left + kmToX(s.km, span);
    const y = courseTop + elevToY(s.elevationM, courseH);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.restore();

  const codePx = 420;
  const lineBottom = lineTop + 4.2 * U * 1.15;
  ctx.font = display(codePx);
  ctx.fillText(bibCode(distance.wave, size), W / 2, (lineBottom + courseTop) / 2 + codePx * 0.33);

  // The perforation and the tab's two lines.
  ctx.save();
  ctx.strokeStyle = DIM;
  ctx.lineWidth = 4;
  ctx.setLineDash([5, 15]);
  ctx.beginPath();
  ctx.moveTo(2 * U, perfY);
  ctx.lineTo(W - 2 * U, perfY);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = INK;
  ctx.font = label(4 * U);
  ctx.fillText(weightLine(size), W / 2, weightY);
  ctx.fillStyle = DIM;
  ctx.font = text(30);
  ctx.fillText(SPONSOR_LINE, W / 2, sponsorY);

  // The stamp.
  if (pinned) {
    ctx.save();
    const stampPx = 8.4 * U;
    ctx.font = display(stampPx);
    const stampW = ctx.measureText("REGISTERED").width + 4.8 * U;
    const stampH = stampPx * 0.9 + 2.8 * U;
    ctx.translate(W - 5.5 * U - stampW / 2, H * 0.61 + stampH / 2);
    ctx.rotate((-8 * Math.PI) / 180);
    ctx.globalCompositeOperation = "multiply";
    ctx.strokeStyle = INK;
    ctx.lineWidth = 10;
    ctx.strokeRect(-stampW / 2, -stampH / 2, stampW, stampH);
    ctx.fillStyle = INK;
    ctx.textBaseline = "middle";
    ctx.fillText("REGISTERED", 0, 4);
    ctx.restore();
  }

  // Punch the pin holes and the tear notches out of the Tyvek.
  const r = 1.6 * U;
  const inset = 4.6 * U + r;
  const holes: [number, number][] = [
    [inset, inset],
    [W - inset, inset],
    [inset, H - inset],
    [W - inset, H - inset],
  ];
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  for (const [x, y] of holes) {
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }
  ctx.moveTo(1.6 * U, perfY);
  ctx.arc(0, perfY, 1.6 * U, 0, Math.PI * 2);
  ctx.moveTo(W + 1.6 * U, perfY);
  ctx.arc(W, perfY, 1.6 * U, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (pinned) holes.forEach(([x, y], i) => drawPin(ctx, x, y, PIN_ANGLES[i]));

  return canvas;
}

/** Draws the bib and saves it as apex-bib-<wave><size>.png. Resolves once the download has been handed over. */
export async function saveBibPng(bib: BibImage): Promise<void> {
  const canvas = await drawBib(bib);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("The bib image could not be encoded.");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = bibFileName(bib.distance.wave, bib.size);
  a.rel = "noopener";
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
