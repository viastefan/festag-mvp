'use client'

/**
 * Tagro Living Core — abstract neural system for Overview.
 * Not a chatbot. Not a logo. Workspace state expressed as calm motion.
 */

import { useMemo } from 'react'

export type TagroLivingState =
  | 'calm'
  | 'attention'
  | 'blocked'
  | 'listening'
  | 'speaking'
  | 'audio'

type Props = {
  state?: TagroLivingState
  className?: string
}

type Node = { id: string; x: number; y: number; r: number; orbit: number }

const NODES: Node[] = [
  { id: 'c', x: 200, y: 140, r: 18, orbit: 0 },
  { id: 'n1', x: 118, y: 78, r: 7, orbit: 1 },
  { id: 'n2', x: 282, y: 72, r: 6.5, orbit: 2 },
  { id: 'n3', x: 310, y: 158, r: 8, orbit: 3 },
  { id: 'n4', x: 248, y: 230, r: 6, orbit: 4 },
  { id: 'n5', x: 132, y: 218, r: 7.5, orbit: 5 },
  { id: 'n6', x: 86, y: 148, r: 5.5, orbit: 6 },
  { id: 'n7', x: 200, y: 52, r: 5, orbit: 7 },
  { id: 'n8', x: 188, y: 198, r: 4.5, orbit: 8 },
]

const EDGES: Array<[string, string]> = [
  ['c', 'n1'],
  ['c', 'n2'],
  ['c', 'n3'],
  ['c', 'n4'],
  ['c', 'n5'],
  ['c', 'n6'],
  ['c', 'n7'],
  ['n1', 'n2'],
  ['n2', 'n3'],
  ['n3', 'n4'],
  ['n5', 'n6'],
  ['n6', 'n1'],
  ['n7', 'n1'],
  ['n4', 'n8'],
  ['n5', 'n8'],
  ['n8', 'c'],
]

export default function TagroLivingCore({ state = 'calm', className = '' }: Props) {
  const byId = useMemo(() => {
    const m = new Map<string, Node>()
    for (const n of NODES) m.set(n.id, n)
    return m
  }, [])

  const label =
    state === 'blocked'
      ? 'Tagro erkennt Blocker'
      : state === 'attention'
        ? 'Tagro wartet auf eine Entscheidung'
        : state === 'audio' || state === 'speaking'
          ? 'Tagro spricht'
          : state === 'listening'
            ? 'Tagro hört zu'
            : 'Tagro — Workspace ruhig'

  return (
    <div
      className={`tlc ${className}`.trim()}
      data-state={state}
      role="img"
      aria-label={label}
    >
      <div className="tlc-glow" aria-hidden />
      <svg className="tlc-svg" viewBox="0 0 400 280" preserveAspectRatio="xMidYMid meet" aria-hidden>
        <defs>
          <radialGradient id="tlc-core" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
            <stop offset="55%" stopColor="rgba(186,194,210,0.55)" />
            <stop offset="100%" stopColor="rgba(91,100,125,0.18)" />
          </radialGradient>
          <radialGradient id="tlc-node" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.92)" />
            <stop offset="100%" stopColor="rgba(140,148,168,0.45)" />
          </radialGradient>
          <filter id="tlc-soft" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g className="tlc-edges">
          {EDGES.map(([a, b]) => {
            const na = byId.get(a)
            const nb = byId.get(b)
            if (!na || !nb) return null
            return (
              <line
                key={`${a}-${b}`}
                className="tlc-edge"
                x1={na.x}
                y1={na.y}
                x2={nb.x}
                y2={nb.y}
              />
            )
          })}
        </g>

        <g className="tlc-nodes" filter="url(#tlc-soft)">
          {NODES.filter((n) => n.id !== 'c').map((n) => (
            <circle
              key={n.id}
              className={`tlc-node tlc-orbit-${n.orbit}`}
              cx={n.x}
              cy={n.y}
              r={n.r}
              fill="url(#tlc-node)"
            />
          ))}
          <circle className="tlc-core" cx={200} cy={140} r={18} fill="url(#tlc-core)" />
          <circle className="tlc-core-ring" cx={200} cy={140} r={28} />
        </g>
      </svg>
    </div>
  )
}

export function deriveTagroLivingState(input: {
  pendingDecisions: number
  projects: Array<{ health: 'healthy' | 'watch' | 'risk' | 'blocked' }>
}): TagroLivingState {
  if (input.projects.some((p) => p.health === 'blocked' || p.health === 'risk')) {
    return 'blocked'
  }
  if (input.pendingDecisions > 0 || input.projects.some((p) => p.health === 'watch')) {
    return 'attention'
  }
  return 'calm'
}
