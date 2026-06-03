'use client'

/**
 * TagroPixelWave — Festag's branded "2030 pixel" mark for Tagro.
 *
 * A symmetric pixel soundwave: columns of rounded pixels forming a calm lens
 * silhouette, brightest at the core (near-white) and fading to Festag slate
 * (#5B647D) at the edges. The columns undulate like a living voice waveform.
 * Four states drive the energy:
 *   idle      — slow, shallow breathing
 *   listening — tighter shimmer
 *   thinking  — quicker travelling ripple
 *   speaking  — strong equalizer pulse
 *
 * Deterministic (SSR-safe), GPU-cheap (pure CSS keyframes), reduced-motion aware.
 */

import { useMemo } from 'react'

export type TagroPixelState = 'idle' | 'listening' | 'thinking' | 'speaking'

const COLS = 23
const MAXROWS = 13
const SLATE = [91, 100, 125]   // #5B647D — Festag primary
const LIGHT = [236, 242, 250]  // near-white core

// Column height (in pixel rows) by distance from the centre — a clean,
// slightly stepped lens that reads as a soundwave.
const HALF = [13, 13, 11, 11, 9, 9, 7, 5, 5, 3, 3, 1]

function lerp(a: number[], b: number[], t: number) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}
function hex(c: number[]) {
  return '#' + c.map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')
}

type Cell = { col: number; rows: number; rowIdx: number; color: string; o0: number; o1: number; delay: number }

export default function TagroPixelWave({ state = 'idle', size = 188 }: { state?: TagroPixelState; size?: number }) {
  const cell = size / (COLS + 0.22 * (COLS - 1))
  const gap = cell * 0.22
  const center = (COLS - 1) / 2

  const columns = useMemo(() => {
    const cols: { rows: number; cells: Cell[] }[] = []
    for (let i = 0; i < COLS; i++) {
      const d = Math.abs(i - center)
      const dH = d / center // 0 centre → 1 edge
      const rows = HALF[Math.min(HALF.length - 1, Math.round(d))]
      const cells: Cell[] = []
      const half = (rows - 1) / 2
      for (let r = 0; r < rows; r++) {
        const vc = r - half
        const dV = half === 0 ? 0 : Math.abs(vc) / ((MAXROWS - 1) / 2)
        // Energy: brightest at the very core, fading horizontally + vertically.
        const energy = Math.max(0, Math.min(1, 1 - dH * 0.62 - dV * 0.5))
        const color = hex(lerp(SLATE, LIGHT, Math.pow(energy, 1.25)))
        const base = 0.32 + 0.66 * energy
        cells.push({
          col: i,
          rows,
          rowIdx: r,
          color,
          o0: +(base * 0.5).toFixed(3),
          o1: +base.toFixed(3),
          // Travelling wave: phase by column, with a slight vertical offset.
          delay: Math.round(dH * 520 + Math.abs(vc) * 40),
        })
      }
      cols.push({ rows, cells })
    }
    return cols
  }, [center])

  return (
    <span className={`tpw tpw-${state}`} style={{ width: size, height: size }} aria-hidden>
      <span className="tpw-glow" />
      <span className="tpw-row" style={{ gap: `${gap}px` }}>
        {columns.map((c, i) => (
          <span
            key={i}
            className="tpw-col"
            style={{ gap: `${gap}px`, ['--col' as string]: i, animationDelay: `${(Math.abs(i - center) / center) * 240}ms` }}
          >
            {c.cells.map((p) => (
              <span
                key={p.rowIdx}
                className="tpw-px"
                style={{
                  width: cell,
                  height: cell,
                  background: p.color,
                  ['--o0' as string]: p.o0,
                  ['--o1' as string]: p.o1,
                  ['--d' as string]: `${p.delay}ms`,
                }}
              />
            ))}
          </span>
        ))}
      </span>

      <style jsx>{`
        .tpw { position: relative; display: inline-flex; align-items: center; justify-content: center; }
        .tpw-glow {
          position: absolute; inset: 12%;
          background: radial-gradient(closest-side, color-mix(in srgb, #6a738c 26%, transparent), transparent 72%);
          filter: blur(8px);
          opacity: .55;
          animation: tpwGlow 4.2s ease-in-out infinite;
        }
        .tpw-row { position: relative; display: flex; align-items: center; justify-content: center; }
        .tpw-col {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          animation: tpwWave 3.6s ease-in-out infinite;
        }
        .tpw-px {
          border-radius: 1.5px;
          opacity: var(--o0);
          will-change: opacity, transform;
          animation: tpwPulse 3.2s ease-in-out infinite var(--d);
        }
        .tpw-listening .tpw-px { animation-duration: 2.3s; }
        .tpw-listening .tpw-col { animation-duration: 2.8s; }
        .tpw-thinking  .tpw-px { animation-duration: 1.5s; }
        .tpw-thinking  .tpw-col { animation-duration: 2.1s; }
        .tpw-speaking  .tpw-px { animation-name: tpwSpeak; animation-duration: 1.05s; }
        .tpw-speaking  .tpw-col { animation-duration: 1.4s; }

        @keyframes tpwPulse {
          0%, 100% { opacity: var(--o0); transform: scale(.9); }
          50%      { opacity: var(--o1); transform: scale(1); }
        }
        @keyframes tpwSpeak {
          0%, 100% { opacity: var(--o0); transform: scale(.82); }
          45%      { opacity: var(--o1); transform: scale(1.06); }
          72%      { opacity: calc(var(--o0) + .12); transform: scale(.92); }
        }
        @keyframes tpwWave {
          0%, 100% { transform: translateY(calc(var(--col) * 0px)); }
          50%      { transform: translateY(-6%); }
        }
        @keyframes tpwGlow {
          0%, 100% { opacity: .4; transform: scale(.96); }
          50%      { opacity: .7; transform: scale(1.04); }
        }
        @media (prefers-reduced-motion: reduce) {
          .tpw-px, .tpw-col, .tpw-glow { animation: none !important; }
          .tpw-px { opacity: var(--o1); }
        }
      `}</style>
    </span>
  )
}
