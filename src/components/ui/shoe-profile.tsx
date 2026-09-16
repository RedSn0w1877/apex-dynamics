// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

/**
 * Technical side-profile of the shoe, drawn as a spec diagram rather than a
 * product photo — blunt heel, rockered toe, dual-density midsole, and the
 * forked carbon plate running through it.
 *
 * Deliberately static: a drawing that only appears once JS animates it in is a
 * drawing that vanishes on a throttled tab, a failed hydration, or a slow
 * device. The hero already carries the motion.
 */
export function ShoeProfile({ className }: { className?: string }) {
  return (
    <div className={className}>
      <svg
        viewBox="0 0 560 300"
        role="img"
        aria-label="Technical side profile of the Prototype 04: blunt heel, rockered forefoot, dual-density midsole, and a forked carbon plate."
        className="w-full"
      >
        {/* Ground reference */}
        <line x1="24" y1="244" x2="536" y2="244" stroke="#1f1f23" strokeWidth="1" strokeDasharray="6 6" />

        {/*
          Upper: starts on the midsole at the heel, rises to the collar, dips
          through the instep, then runs down the toe box to meet the toe.
        */}
        <path
          d="M 92 170 C 84 124, 100 96, 136 90 C 176 84, 204 108, 244 124 C 312 150, 392 160, 470 172"
          fill="none"
          stroke="#f5f5f5"
          strokeWidth="1.5"
          strokeOpacity="0.4"
          strokeDasharray="5 5"
        />

        {/* Midsole body — tall blunt heel on the left, rockered toe lifting on the right */}
        <path
          d="M 92 170
             C 78 192, 80 216, 104 228
             L 300 234
             C 392 234, 452 226, 502 202
             L 508 190
             C 456 180, 380 172, 300 168
             L 156 166
             C 116 164, 98 162, 92 170 Z"
          fill="#111114"
          stroke="#f5f5f5"
          strokeWidth="2"
          strokeOpacity="0.9"
        />

        {/* Outsole lug band, following the rocker up toward the toe */}
        <path
          d="M 100 224 C 118 234, 170 238, 300 238 C 396 238, 456 230, 504 206"
          fill="none"
          stroke="#f5f5f5"
          strokeWidth="4"
          strokeOpacity="0.38"
        />

        {/* Forked carbon plate — one arm splits toward the toe */}
        <path
          d="M 116 208 C 180 206, 260 202, 340 202 C 400 202, 452 196, 486 186"
          fill="none"
          stroke="#ccff00"
          strokeWidth="2.5"
        />
        <path
          d="M 340 202 C 400 210, 452 210, 488 198"
          fill="none"
          stroke="#ccff00"
          strokeWidth="2.5"
          strokeOpacity="0.6"
        />

        {/* Stack-height callouts: heel 38 mm, forefoot 30 mm */}
        <g stroke="#3a3a42" strokeWidth="1">
          <line x1="64" y1="168" x2="64" y2="228" />
          <line x1="58" y1="168" x2="70" y2="168" />
          <line x1="58" y1="228" x2="70" y2="228" />
          <line x1="524" y1="188" x2="524" y2="212" />
          <line x1="518" y1="188" x2="530" y2="188" />
          <line x1="518" y1="212" x2="530" y2="212" />
          <line x1="340" y1="206" x2="340" y2="270" stroke="#3a3a42" />
        </g>
        <g fontFamily="ui-monospace, monospace" fontSize="11" letterSpacing="1.4">
          <text x="44" y="198" fill="#71717a" transform="rotate(-90 44 198)" textAnchor="middle">
            38 MM
          </text>
          <text x="536" y="204" fill="#71717a">
            30
          </text>
          <text x="340" y="286" fill="#ccff00" textAnchor="middle">
            DUAL CARBON FORK
          </text>
        </g>
      </svg>
    </div>
  );
}
