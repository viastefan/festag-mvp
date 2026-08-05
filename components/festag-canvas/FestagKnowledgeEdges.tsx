'use client'

type Edge = {
  id: string
  d: string
  cross?: boolean
}

type Props = {
  edges: Edge[]
  viewBox?: string
  className?: string
  /** Ambient dust dots in viewBox coords */
  dust?: Array<[number, number]>
}

/** Static knowledge spokes — faint, never the active flow path. */
export default function FestagKnowledgeEdges({
  edges,
  viewBox = '0 0 100 100',
  className = 'fas-wb-knowledge-edges',
  dust = [
    [12, 10], [88, 12], [18, 88], [90, 86],
    [8, 48], [94, 52], [48, 6], [52, 94],
    [30, 22], [74, 24], [28, 72], [76, 70],
  ],
}: Props) {
  return (
    <svg
      className={['festag-knowledge-edges', className].filter(Boolean).join(' ')}
      viewBox={viewBox}
      preserveAspectRatio="none"
      aria-hidden
    >
      {edges.map((e) => (
        <path
          key={e.id}
          className={`festag-knowledge-edge${e.cross ? ' is-cross' : ' is-spoke'}`}
          d={e.d}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {dust.map(([x, y], i) => (
        <circle
          key={`d${i}`}
          cx={x}
          cy={y}
          r={i % 3 === 0 ? 0.28 : 0.18}
          fill="rgba(26,25,23,0.14)"
        />
      ))}
    </svg>
  )
}
