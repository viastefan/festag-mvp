'use client'

/**
 * TagroPixelOrb — a calm pixel sphere for Tagro.
 *
 * A circular field of pixels that breathe in a ripple from the centre. The
 * motion reacts to Tagro's state: idle breathes slowly, listening shimmers,
 * thinking ripples faster, speaking pulses with a stronger wave (like a voice
 * waveform radiating out). Accent #6a738c, themed via app vars. GPU-cheap
 * (~80 pixels, pure CSS keyframes), respects reduced-motion.
 */

import { useMemo } from 'react'

export type TagroPixelState = 'idle' | 'listening' | 'thinking' | 'speaking'

const GRID = 11 // 11×11 field, circle-masked
const ACCENT = '#6a738c'

export default function TagroPixelOrb({ state = 'idle', size = 188 }: { state?: TagroPixelState; size?: number }) {
  // Fit the gapped grid exactly inside `size`: total = cell*(GRID + 0.18*(GRID-1)).
  const cell = size / (GRID + 0.18 * (GRID - 1))
  const gap = cell * 0.18
  const r = (GRID - 1) / 2

  const pixels = useMemo(() => {
    const out: { x: number; y: number; dist: number; accent: boolean }[] = []
    const maxR = r + 0.4
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const dx = x - r
        const dy = y - r
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > maxR) continue // circle mask
        out.push({ x, y, dist, accent: dist < 1.6 || Math.random() < 0.12 })
      }
    }
    return out
  }, [r])

  const maxDist = r + 0.4

  return (
    <span className={`tpo tpo-${state}`} style={{ width: size, height: size }} aria-hidden>
      <span
        className="tpo-grid"
        style={{
          gridTemplateColumns: `repeat(${GRID}, ${cell}px)`,
          gridTemplateRows: `repeat(${GRID}, ${cell}px)`,
          gap: `${gap}px`,
        }}
      >
        {pixels.map(p => (
          <span
            key={`${p.x}-${p.y}`}
            className={`tpo-px${p.accent ? ' accent' : ''}`}
            style={{
              gridColumn: p.x + 1,
              gridRow: p.y + 1,
              // Ripple delay: pixels further from centre fire later.
              ['--d' as any]: `${(p.dist / maxDist) * 620}ms`,
            }}
          />
        ))}
      </span>

      <style jsx>{`
        .tpo {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .tpo-grid {
          display: grid;
          place-content: center;
        }
        .tpo-px {
          width: 100%;
          height: 100%;
          border-radius: 2px;
          background: var(--text, #E8EDF4);
          opacity: 0.18;
          transform: scale(0.72);
          animation: tpoBreathe 3.2s ease-in-out infinite var(--d);
        }
        .tpo-px.accent { background: ${ACCENT}; }

        /* listening — a touch livelier */
        .tpo-listening .tpo-px { animation-duration: 2.2s; }
        /* thinking — faster ripple */
        .tpo-thinking .tpo-px { animation-duration: 1.5s; }
        /* speaking — strong waveform pulse */
        .tpo-speaking .tpo-px {
          animation-name: tpoSpeak;
          animation-duration: 1.05s;
        }

        @keyframes tpoBreathe {
          0%, 100% { opacity: 0.16; transform: scale(0.7); }
          50%      { opacity: 0.6;  transform: scale(0.94); }
        }
        @keyframes tpoSpeak {
          0%, 100% { opacity: 0.22; transform: scale(0.66); }
          45%      { opacity: 0.95; transform: scale(1.04); }
          70%      { opacity: 0.5;  transform: scale(0.86); }
        }

        @media (prefers-reduced-motion: reduce) {
          .tpo-px { animation: none !important; opacity: 0.5; transform: scale(0.9); }
        }
      `}</style>
    </span>
  )
}
