// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import type { CSSProperties, Ref, RefObject } from "react";
import styles from "./race-digits.module.css";

/*
 * Race-clock digits: the only rolling number on the site.
 *
 * Each digit is a fixed .47em cell (the Extra Condensed's tabular advance is
 * .453em) whose ::before is a vertical strip of 0–9, drawn by CSS `content`, so
 * the ten digits are never in the DOM, the HTML or the RSC payload. `--d` slides
 * the strip so the right digit shows, and a changed digit rolls over 180 ms (no
 * transition under reduced motion). The server writes `--d`, so the right number
 * shows with no JS at all. No hooks, so it renders on the server or the client.
 * The cells use short global class names (rd-c, rd-s): there are dozens of them
 * per page and every byte of a class name is paid twice (HTML and RSC).
 *
 * `silent` drops the visually hidden reading, for a number inside an aria-hidden
 * row that already has its own spoken version.
 *
 * For per-frame values, take the ref: `update(value)` writes `--d` straight to
 * the DOM, so a scrub or a damped animation never re-renders React.
 *
 *   <RaceDigits value={142} format="000" />
 *   <RaceDigits value={3.5} format="00.0" ref={handleRef} />  ->  handleRef.current?.update(4.2)
 */

export type RaceFormat = "0" | "00" | "000" | "0.0" | "00.0";
export type RaceDigitsHandle = { update(value: number): void };

type RaceDigitsProps = {
  value: number;
  format: RaceFormat;
  className?: string;
  silent?: boolean;
  ref?: Ref<RaceDigitsHandle>;
};

/** The characters a value shows in a format, clamped to what the cells can hold: 3.5 in "00.0" is "03.5". */
export function raceText(value: number, format: RaceFormat): string {
  const decimals = format.includes(".") ? 1 : 0;
  const max = 10 ** format.split(".")[0].length - 10 ** -decimals;
  const clamped = Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), max);
  return clamped.toFixed(decimals).padStart(format.length, "0");
}

/** What a screen reader hears: the same reading without the clock's leading zeros. */
const spoken = (text: string) => text.replace(/^0+(?=\d)/, "");

const isDigit = (ch: string) => ch >= "0" && ch <= "9";

function bind(ref: Ref<RaceDigitsHandle>, root: HTMLSpanElement | null, format: RaceFormat, silent: boolean) {
  const first = silent ? 0 : 1;
  const handle: RaceDigitsHandle | null = root && {
    update(value: number) {
      const text = raceText(value, format);
      // Unless silent, children[0] is the visually hidden reading; the cells follow, one per character.
      const label = silent ? null : root.firstElementChild?.firstChild;
      if (label) label.nodeValue = spoken(text);
      for (let i = 0; i < text.length; i++) {
        const cell = root.children[i + first] as HTMLElement | undefined;
        if (cell && isDigit(text[i])) cell.style.setProperty("--d", text[i]);
      }
    },
  };
  if (typeof ref === "function") ref(handle);
  else if (ref) (ref as RefObject<RaceDigitsHandle | null>).current = handle;
}

export function RaceDigits({ value, format, className, silent = false, ref }: RaceDigitsProps) {
  const text = raceText(value, format);
  return (
    <span
      className={className ? `${styles.rd} ${className}` : styles.rd}
      ref={ref ? (root) => bind(ref, root, format, silent) : undefined}
    >
      {!silent && <span className="vh">{spoken(text)}</span>}
      {[...text].map((ch, i) =>
        isDigit(ch) ? (
          <span key={i} aria-hidden="true" className="rd-c" style={{ "--d": ch } as CSSProperties} />
        ) : (
          <span key={i} aria-hidden="true" className="rd-s">
            {ch}
          </span>
        ),
      )}
    </span>
  );
}
