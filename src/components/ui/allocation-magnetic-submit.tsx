"use client";

// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import { useRef, type ReactNode, type MouseEvent as ReactMouseEvent } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";

/**
 * The same magnetic pull as `MagneticButton`, applied to a real
 * `<button type="submit">`.
 *
 * `MagneticButton` renders an `<a>`, which can't submit a form and isn't
 * keyboard-focusable without an href — so the physics is mirrored here rather
 * than trading away the form's submit semantics. Disabled entirely under
 * prefers-reduced-motion, same as the original.
 */
export function AllocationMagneticSubmit({
  children,
  className,
  disabled = false,
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 200, damping: 16, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 200, damping: 16, mass: 0.4 });

  const onMouseMove = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (reduce || disabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((event.clientX - (rect.left + rect.width / 2)) * 0.3);
    y.set((event.clientY - (rect.top + rect.height / 2)) * 0.3);
  };

  const onMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={ref}
      type="submit"
      disabled={disabled}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={reduce ? undefined : { x: springX, y: springY }}
      whileTap={reduce || disabled ? undefined : { scale: 0.96 }}
      transition={{ type: "spring", stiffness: 520, damping: 24 }}
      className={className}
    >
      {children}
    </motion.button>
  );
}
