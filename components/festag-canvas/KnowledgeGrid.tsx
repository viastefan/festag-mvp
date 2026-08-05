'use client'

import { useMemo } from 'react'
import {
  generateKnowledgeGrid,
  KNOWLEDGE_ANCHOR,
  type KnowledgeDot,
} from '@/lib/design/knowledge-grid'

type Props = {
  /** Index of dot that pulses (anchor slot when active) */
  pulseAt?: 'anchor' | null
  className?: string
}

export default function KnowledgeGrid({ pulseAt, className }: Props) {
  const dots = useMemo(() => generateKnowledgeGrid(), [])

  return (
    <div className={['fos-grid', className].filter(Boolean).join(' ')} aria-hidden>
      {dots.map((d, i) => (
        <GridDot key={i} dot={d} />
      ))}
      <GridDot
        dot={KNOWLEDGE_ANCHOR}
        className={pulseAt === 'anchor' ? 'is-pulse is-anchor' : 'is-anchor'}
      />
    </div>
  )
}

function GridDot({ dot, className }: { dot: KnowledgeDot; className?: string }) {
  const size = 3.5 * dot.scale
  return (
    <span
      className={['fos-grid-dot', className].filter(Boolean).join(' ')}
      style={{
        left: `${dot.x}%`,
        top: `${dot.y}%`,
        width: `${size}px`,
        height: `${size}px`,
      }}
    />
  )
}
