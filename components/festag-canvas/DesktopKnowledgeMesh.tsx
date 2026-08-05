'use client'

import { useMemo } from 'react'
import {
  generateDesktopKnowledgeMesh,
  type MeshDot,
} from '@/lib/design/desktop-knowledge-mesh'

type Props = {
  className?: string
}

/** Full-bleed dotted mesh with faint connections — reference Wissensraum. */
export default function DesktopKnowledgeMesh({ className }: Props) {
  const { dots, edges } = useMemo(() => generateDesktopKnowledgeMesh(), [])

  return (
    <div className={['fas-wb-os-mesh', className].filter(Boolean).join(' ')} aria-hidden>
      <svg className="fas-wb-os-mesh-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        {edges.map((e) => (
          <line
            key={e.id}
            className="fas-wb-os-mesh-line"
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {dots.map((d, i) => (
          <circle
            key={d.id}
            className="fas-wb-os-mesh-dot"
            cx={d.x}
            cy={d.y}
            r={0.22 * d.scale}
            vectorEffect="non-scaling-stroke"
            style={{ ['--mesh-i' as string]: i % 24 }}
          />
        ))}
      </svg>
    </div>
  )
}

export type { MeshDot }
