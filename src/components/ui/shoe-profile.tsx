// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

/**
 * Side-view stack-height cross-section of the Prototype 04, drawn as a
 * ruled-geometry spec diagram rather than a freehand shoe outline.
 *
 * The shape is built from rectangles + dimension lines, not a traced profile,
 * so the numbers drive the drawing rather than the drawing driving the numbers.
 *
 * Deliberately static: a drawing that only appears once JS animates it in is a
 * drawing that vanishes on a throttled tab, a failed hydration, or a slow
 * device. The hero already carries the motion.
 */

// Geometry (mm), laid out left → right on a 640×220 viewBox with a 1px = 8mm grid.
const HE = 96; // heel stack height  (38 mm × 8 / 3.125 → rounded)
const FF = 80; // forefoot stack     (30 mm × 8 / 3.125 → rounded)
const HEEL_X = 112;
const TOE_X = 544;
const GROUND_Y = 176;

export function ShoeProfile({ className }: { className?: string }) {
  return (
    <div className={className}>
      <svg
        viewBox="0 0 640 220"
        role="img"
        aria-label="Side section of the Prototype 04 midsole: 38 mm heel stack, 30 mm forefoot stack, 8 mm drop, forked carbon plate at 12 mm above the outsole."
        className="w-full"
      >
        <defs>
          {/* Chalk-on-void text */}
          <style>{`.spec-label{fill:#71717a;font-family:ui-monospace,monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase}
.spec-dim{stroke:#3a3a42;stroke-width:1;stroke-dasharray:3 3}
.spec-dim-bold{stroke:#71717a;stroke-width:1.5}
.spec-grid{stroke:#1f1f23;stroke-width:1;stroke-dasharray:4 4}`}</style>
        </defs>

        {/* Ground reference */}
        <line x1="80" y1={GROUND_Y} x2="560" y2={GROUND_Y} className="spec-grid" />

        {/* Midsole block — blunt heel on the left, rockered ramp to the toe */}
        <polygon
          points={`${HEEL_X},${GROUND_Y - HE} ${HEEL_X},${GROUND_Y} ${TOE_X},${GROUND_Y} ${TOE_X},${GROUND_Y - FF}`}
          fill="#111114"
          stroke="#f5f5f5"
          strokeWidth="2"
          strokeOpacity="0.9"
        />

        {/* Heel stack-height dimension: 38 MM */}
        <g>
          <line className="spec-dim-bold" x1={HEEL_X - 18} y1={GROUND_Y - HE} x2={HEEL_X - 18} y2={GROUND_Y} />
          <line className="spec-dim-bold" x1={HEEL_X - 24} y1={GROUND_Y - HE} x2={HEEL_X - 12} y2={GROUND_Y - HE} />
          <line className="spec-dim-bold" x1={HEEL_X - 24} y1={GROUND_Y} x2={HEEL_X - 12} y2={GROUND_Y} />
        </g>

        {/* Forefoot stack-height dimension: 30 MM */}
        <g>
          <line className="spec-dim-bold" x1={TOE_X + 18} y1={GROUND_Y - FF} x2={TOE_X + 18} y2={GROUND_Y} />
          <line className="spec-dim-bold" x1={TOE_X + 24} y1={GROUND_Y - FF} x2={TOE_X + 12} y2={GROUND_Y - FF} />
          <line className="spec-dim-bold" x1={TOE_X + 24} y1={GROUND_Y} x2={TOE_X + 12} y2={GROUND_Y} />
        </g>

        {/* Drop arrow: 8 MM between the two stack lines */}
        <g stroke="#ccff00" strokeWidth="1.5">
          <line x1={HEEL_X + 6} y1={GROUND_Y - HE} x2={TOE_X - 6} y2={GROUND_Y - FF} />
          <path d="M 340 168 L 330 178 L 350 178 Z" fill="#ccff00" />
        </g>

        {/* Forked carbon plate — runs at a constant 12 mm above the outsole */}
        <line x1={HEEL_X} y1={GROUND_Y - HE + 9} x2={TOE_X} y2={GROUND_Y - FF + 9} stroke="#ccff00" strokeWidth="2.5" />

        {/* Plate split point callout */}
        <circle cx="340" cy={GROUND_Y - HE + 9} r="3" fill="#ccff00" />
        <line
          x1="340"
          y1={GROUND_Y - HE + 9}
          x2="340"
          y2={GROUND_Y + 24}
          className="spec-dim"
          stroke="#ccff00"
          strokeOpacity="0.6"
        />

        {/* Labels — emitted as real text nodes so copy/readout stays clean */}
        <text x={HEEL_X - 18} y="154" className="spec-label" textAnchor="middle" fill="#ccff00">
          38 mm
        </text>
        <text x={TOE_X + 18} y={GROUND_Y - FF - 6} className="spec-label" textAnchor="middle" fill="#f5f5f5">
          30 mm
        </text>
        <text x="340" y={GROUND_Y + 34} className="spec-label" textAnchor="middle" fill="#ccff00">
          FORKED CARBON PLATE
        </text>
        <text x="340" y={GROUND_Y + 48} className="spec-label" textAnchor="middle" fill="#71717a">
          8 mm drop
        </text>

        {/* Bottom rule — section title */}
        <line x1="120" y1="208" x2="520" y2="208" stroke="#1f1f23" strokeWidth="1" />
        <line x1="120" y1="212" x2="520" y2="212" stroke="#1f1f23" strokeWidth="1" />
      </svg>
    </div>
  );
}
