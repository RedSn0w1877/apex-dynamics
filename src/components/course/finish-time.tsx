"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { useEffect, useRef, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");

/** mm:ss on the course clock, or h:mm:ss once a visit passes 99 minutes. */
export function formatCourseTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes <= 99) return `${pad(minutes)}:${pad(seconds)}`;
  return `${Math.floor(minutes / 60)}:${pad(minutes % 60)}:${pad(seconds)}`;
}

/**
 * "Your time on course": how long this visit took to reach the finish, taken
 * ONCE when the line scrolls into view. One observer, then nothing: no interval,
 * no ticking clock. Hidden without JS (the finish-line CSS hides it).
 */
export function FinishTime({ className }: { className?: string }) {
  const line = useRef<HTMLParagraphElement>(null);
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const el = line.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      setTime(formatCourseTime(performance.now()));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <p ref={line} className={className}>
      Your time on course: <span className="tnum">{time ?? "00:00"}</span>
    </p>
  );
}
