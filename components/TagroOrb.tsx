'use client'

/**
 * TagroOrb — the calm node/pixel-network mark for the dashboard Statusabfrage.
 * A radial network of nodes (dots + squares) connected to a centre hub, in the
 * Festag accent #6a738c. Four quiet states (per festag_master_architecture):
 *   idle      — slow breathing
 *   listening — tighter breathing, nodes brighter
 *   thinking  — fine continuous rotation
 *   speaking  — soft outward pulses
 * No neon, no equalizer. Respects prefers-reduced-motion.
 */

import { useMemo } from 'react'

export type TagroOrbState = 'idle' | 'listening' | 'thinking' | 'speaking'

type Node = { x: number; y: number; s: number; square: boolean; i: number }

const RINGS = [
  { r: 30, count: 8, base: 0 },
  { r: 54, count: 12, base: 15 },
  { r: 78, count: 16, base: 7 },
]

function buildNodes(): Node[] {
  const out: Node[] = []
  let i = 0
  RINGS.forEach((ring, ri) => {
    for (let k = 0; k < ring.count; k++) {
      const ang = (ring.base + (360 / ring.count) * k) * (Math.PI / 180)
      const jitter = ri === 2 ? (k % 3 === 0 ? 6 : 0) : 0
      const r = ring.r + jitter
      const x = 100 + Math.cos(ang) * r
      const y = 100 + Math.sin(ang) * r
      const square = (k + ri) % 4 === 0
      const s = ri === 0 ? 5.5 : ri === 1 ? 4.5 : 3.4
      out.push({ x, y, s, square, i: i++ })
    }
  })
  return out
}

export default function TagroOrb({ state = 'idle', size = 184 }: { state?: TagroOrbState; size?: number }) {
  const nodes = useMemo(buildNodes, [])
  return (
    <span className={`tagro-orb st-${state}`} style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 200 200" width="100%" height="100%">
        <g className="vo-net">
          {nodes.map(n => (
            <line key={`l${n.i}`} className="vo-line" x1={100} y1={100} x2={n.x} y2={n.y} style={{ ['--i' as any]: n.i }} />
          ))}
          {nodes.map(n => (
            n.square ? (
              <rect key={`n${n.i}`} className="vo-node sq" x={n.x - n.s / 2} y={n.y - n.s / 2} width={n.s} height={n.s} rx={0.8} style={{ ['--i' as any]: n.i }} />
            ) : (
              <circle key={`n${n.i}`} className="vo-node" cx={n.x} cy={n.y} r={n.s / 2} style={{ ['--i' as any]: n.i }} />
            )
          ))}
          <rect className="vo-hub" x={91} y={91} width={18} height={18} rx={3.5} />
          <rect className="vo-hub-core" x={96} y={96} width={8} height={8} rx={2} />
        </g>
      </svg>
      <style jsx>{`
        .tagro-orb { position: relative; display: inline-flex; align-items: center; justify-content: center; }
        .tagro-orb::before {
          content: ''; position: absolute; inset: 8%;
          border-radius: 50%;
          background: radial-gradient(circle at 50% 50%, rgba(106,115,140,.22), rgba(106,115,140,0) 62%);
          filter: blur(6px);
        }
        svg { position: relative; overflow: visible; }
        .vo-net { transform-box: view-box; transform-origin: 100px 100px; animation: voBreathe 6.5s ease-in-out infinite; }
        .vo-line { stroke: rgba(106,115,140,.20); stroke-width: .55; }
        .vo-node { fill: #6a738c; transform-box: fill-box; transform-origin: center; animation: voTwinkle 3.4s ease-in-out infinite; animation-delay: calc(var(--i) * .06s); }
        .vo-node.sq { fill: #828ba6; }
        .vo-hub { fill: #9aa4be; }
        .vo-hub-core { fill: #cdd3e0; }

        /* idle — gentle breathing */
        @keyframes voBreathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.035); } }
        @keyframes voTwinkle { 0%,100% { opacity: .55; } 50% { opacity: 1; } }

        /* listening — tighter breath, brighter nodes */
        .st-listening .vo-net { animation-duration: 3.2s; }
        .st-listening .vo-node { animation-duration: 1.8s; }
        .st-listening .vo-line { stroke: rgba(106,115,140,.30); }

        /* thinking — fine continuous rotation */
        .st-thinking .vo-net { animation: voSpin 16s linear infinite; }
        .st-thinking .vo-line { stroke: rgba(106,115,140,.28); animation: voLineGlow 2.6s ease-in-out infinite; }

        /* speaking — soft outward pulses */
        .st-speaking .vo-net { animation: voPulse 1.9s ease-in-out infinite; }
        .st-speaking .vo-node { animation-duration: 1.3s; }
        .st-speaking .vo-line { stroke: rgba(106,115,140,.34); }

        @keyframes voSpin { to { transform: rotate(360deg); } }
        @keyframes voPulse { 0%,100% { transform: scale(1); } 45% { transform: scale(1.06); } }
        @keyframes voLineGlow { 0%,100% { opacity: .6; } 50% { opacity: 1; } }

        @media (prefers-reduced-motion: reduce) {
          .vo-net, .vo-node, .vo-line { animation: none !important; }
        }
      `}</style>
    </span>
  )
}
