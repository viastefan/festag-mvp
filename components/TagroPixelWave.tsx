'use client'

/**
 * TagroPixelWave — Festag's branded "2030 pixel" mark for Tagro.
 *
 * A rectangular pixel field with bright lines of varying length radiating from
 * the core in every direction — a living, omnidirectional equalizer rather than
 * a single waveform. A faint static grid gives it the branded rectangle; the
 * rays pulse (each its own length + phase) in Festag slate (#5B647D) fading to a
 * near-white core. State drives the energy:
 *   idle / listening / thinking / speaking → slower … faster, stronger pulse.
 *
 * Deterministic (SSR-safe), GPU-cheap (pure CSS keyframes), reduced-motion aware.
 */

import { useMemo } from 'react'

export type TagroPixelState = 'idle' | 'listening' | 'thinking' | 'speaking'

const SLATE = [91, 100, 125]   // #5B647D — Festag primary
const LIGHT = [236, 242, 250]  // near-white core
const GRID_X = 17               // rectangle: wider than tall
const GRID_Y = 11
// 12 rays (every 30°), each a deliberately different length → "lines of
// different length in all directions".
const RAY_LEN = [4, 6, 3, 5, 6, 4, 5, 3, 6, 4, 6, 5]

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

type Px = { x: number; y: number; size: number; color: string; o0: number; o1: number; delay: number; bg?: boolean }

export default function TagroPixelWave({ state = 'idle', size = 188 }: { state?: TagroPixelState; size?: number }) {
  const W = size
  const H = Math.round(size * 0.66)

  const pixels = useMemo<Px[]>(() => {
    const cellX = W / (GRID_X + 0.3 * (GRID_X - 1))
    const cellY = H / (GRID_Y + 0.3 * (GRID_Y - 1))
    const cell = Math.min(cellX, cellY)
    const step = cell * 1.3
    const cx = W / 2
    const cy = H / 2
    const out: Px[] = []
    const taken = new Set<string>()

    // Faint branded grid (static rectangle of dim slate pixels).
    const gx = (W - (GRID_X - 1) * step) / 2
    const gy = (H - (GRID_Y - 1) * step) / 2
    const slate = hex(SLATE)
    for (let yy = 0; yy < GRID_Y; yy++) {
      for (let xx = 0; xx < GRID_X; xx++) {
        out.push({
          x: gx + xx * step, y: gy + yy * step, size: cell,
          color: slate, o0: 0.06, o1: 0.06, delay: 0, bg: true,
        })
      }
    }

    // Bright core (near-white 2×2 cluster).
    for (const [ox, oy] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) {
      out.push({
        x: cx + ox * step, y: cy + oy * step, size: cell,
        color: hex(LIGHT), o0: 0.85, o1: 1, delay: 0,
      })
    }

    // Rays in every direction, each its own length + phase.
    const maxLen = Math.max(...RAY_LEN)
    for (let k = 0; k < 12; k++) {
      const ang = (k * 30) * (Math.PI / 180)
      const len = RAY_LEN[k]
      for (let i = 1; i <= len; i++) {
        const x = cx + Math.cos(ang) * i * step
        const y = cy + Math.sin(ang) * i * step
        if (x < -cell || x > W + cell || y < -cell || y > H + cell) continue
        const key = `${Math.round(x)}_${Math.round(y)}`
        if (taken.has(key)) continue
        taken.add(key)
        const energy = 1 - (i - 1) / maxLen
        out.push({
          x, y, size: cell,
          color: hex(lerp(SLATE, LIGHT, Math.pow(energy, 1.2))),
          o0: +(0.18 + 0.35 * energy).toFixed(3),
          o1: +(0.5 + 0.5 * energy).toFixed(3),
          // Tip pixels fire later → the line "grows" outward.
          delay: Math.round((i / maxLen) * 360 + k * 26),
        })
      }
    }
    return out
  }, [W, H])

  return (
    <span className={`tpw tpw-${state}`} style={{ width: W, height: H }} aria-hidden>
      <span className="tpw-glow" />
      {pixels.map((p, idx) => (
        <span
          key={idx}
          className={p.bg ? 'tpw-bg' : 'tpw-px'}
          style={{
            left: p.x - p.size / 2,
            top: p.y - p.size / 2,
            width: p.size,
            height: p.size,
            background: p.color,
            ...(p.bg
              ? { opacity: p.o0 }
              : { ['--o0' as string]: p.o0, ['--o1' as string]: p.o1, ['--d' as string]: `${p.delay}ms` }),
          }}
        />
      ))}

      <style jsx>{`
        .tpw { position: relative; display: inline-block; }
        .tpw-glow {
          position: absolute; left: 50%; top: 50%; width: 60%; height: 80%;
          transform: translate(-50%, -50%);
          background: radial-gradient(closest-side, color-mix(in srgb, #6a738c 30%, transparent), transparent 70%);
          filter: blur(9px); opacity: .5;
          animation: tpwGlow 4.2s ease-in-out infinite;
        }
        .tpw-bg { position: absolute; border-radius: 1.5px; }
        .tpw-px {
          position: absolute; border-radius: 1.5px;
          opacity: var(--o0);
          will-change: opacity, transform;
          animation: tpwPulse 3s ease-in-out infinite var(--d);
        }
        .tpw-listening .tpw-px { animation-duration: 2.2s; }
        .tpw-thinking  .tpw-px { animation-duration: 1.5s; }
        .tpw-speaking  .tpw-px { animation-name: tpwSpeak; animation-duration: 1s; }

        @keyframes tpwPulse {
          0%, 100% { opacity: var(--o0); transform: scale(.82); }
          50%      { opacity: var(--o1); transform: scale(1); }
        }
        @keyframes tpwSpeak {
          0%, 100% { opacity: var(--o0); transform: scale(.7); }
          45%      { opacity: var(--o1); transform: scale(1.12); }
          72%      { opacity: calc(var(--o0) + .14); transform: scale(.9); }
        }
        @keyframes tpwGlow {
          0%, 100% { opacity: .38; transform: translate(-50%, -50%) scale(.96); }
          50%      { opacity: .62; transform: translate(-50%, -50%) scale(1.05); }
        }
        @media (prefers-reduced-motion: reduce) {
          .tpw-px, .tpw-glow { animation: none !important; }
          .tpw-px { opacity: var(--o1); }
        }
      `}</style>
    </span>
  )
}
