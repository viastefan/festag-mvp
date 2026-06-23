'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

const FALLBACK_REPORT_LINES = [
  'Gesamtbericht wird geladen',
  'Projekte im Blick',
  'Signale werden verdichtet',
]

const FALLBACK_24H_LINES = ['Letzte 24 Stunden', 'Updates aus deinen Projekten']

const NODE_SLOTS = [
  { x: 28, y: 38, r: 5, delay: 0, dur: 7.2 },
  { x: 52, y: 22, r: 4, delay: 0.4, dur: 6.4 },
  { x: 74, y: 34, r: 4.5, delay: 0.8, dur: 7.8 },
  { x: 62, y: 58, r: 3.5, delay: 1.1, dur: 6.9 },
  { x: 38, y: 62, r: 4, delay: 0.6, dur: 7.5 },
  { x: 50, y: 44, r: 6, delay: 0.2, dur: 8.2 },
]

const NODE_LINKS: [number, number][] = [
  [0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [0, 4], [1, 2], [2, 3],
]

const LYRIC_STEP_MS = 2800

type LinesProps = { lines?: string[] }

function lyricTone(index: number, active: number): 'active' | 'near' | 'far' {
  const dist = Math.abs(index - active)
  if (dist === 0) return 'active'
  if (dist === 1) return 'near'
  return 'far'
}

export function StatusExecutiveReportLyricsDemo({ lines }: LinesProps) {
  const source = useMemo(() => {
    const base = (lines?.length ? lines : FALLBACK_REPORT_LINES).filter(Boolean)
    return base.length > 0 ? base : FALLBACK_REPORT_LINES
  }, [lines])

  const [active, setActive] = useState(0)
  const stageRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<Array<HTMLParagraphElement | null>>([])

  useEffect(() => {
    setActive(0)
    lineRefs.current = []
  }, [source])

  useEffect(() => {
    if (source.length <= 1) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % source.length)
    }, LYRIC_STEP_MS)

    return () => window.clearInterval(id)
  }, [source])

  useEffect(() => {
    const stage = stageRef.current
    const track = trackRef.current
    const line = lineRefs.current[active]
    if (!stage || !track || !line) return

    const center = () => {
      const target = line.offsetTop - (stage.clientHeight - line.offsetHeight) / 2
      track.style.transform = `translate3d(0, ${-target}px, 0)`
    }

    center()
    const ro = new ResizeObserver(center)
    ro.observe(stage)
    return () => ro.disconnect()
  }, [active, source])

  return (
    <div className="st-ex-cine st-ex-cine--lyrics" aria-hidden>
      <div ref={stageRef} className="st-ex-cine-lyrics-stage">
        <div ref={trackRef} className="st-ex-cine-lyrics-track">
          {source.map((line, i) => {
            const tone = lyricTone(i, active)
            return (
              <p
                key={`${line}-${i}`}
                ref={(el) => {
                  lineRefs.current[i] = el
                }}
                className={`st-ex-cine-lyrics-line is-${tone}`}
              >
                {line}
              </p>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function StatusExecutive24hWaveDemo({ lines }: LinesProps) {
  const labels = lines?.length ? lines.slice(0, 4) : FALLBACK_24H_LINES
  return (
    <div className="st-ex-cine st-ex-cine--wave" aria-hidden>
      <div className="st-ex-cine-24h-labels">
        {labels.map((line, i) => (
          <p key={`${line}-${i}`} className="st-ex-cine-24h-label">
            {line}
          </p>
        ))}
      </div>
      <svg className="st-ex-cine-wave-svg" viewBox="0 0 240 120" preserveAspectRatio="none">
        <path className="st-ex-cine-wave st-ex-cine-wave--back" d="M0 64 C40 44 80 84 120 64 S200 44 240 64 V120 H0 Z" />
        <path className="st-ex-cine-wave st-ex-cine-wave--mid" d="M0 72 C36 52 84 92 120 72 S204 52 240 72 V120 H0 Z" />
        <path className="st-ex-cine-wave st-ex-cine-wave--front" d="M0 78 C44 58 76 98 120 78 S196 58 240 78 V120 H0 Z" />
      </svg>
      {Array.from({ length: 10 }, (_, i) => (
        <span
          key={i}
          className="st-ex-cine-particle"
          style={{
            left: `${8 + (i * 9.2) % 84}%`,
            animationDelay: `${i * 0.35}s`,
            animationDuration: `${3.6 + (i % 3) * 0.8}s`,
          }}
        />
      ))}
    </div>
  )
}

type NodesProps = { nodeLabels?: string[]; lines?: string[] }

export function StatusExecutiveProjectNodesDemo({ nodeLabels, lines }: NodesProps) {
  const labels =
    nodeLabels?.length ? nodeLabels : lines?.length ? lines.slice(0, 6) : ['Projekt A', 'Projekt B', 'Projekt C']
  const nodes = NODE_SLOTS.slice(0, Math.max(3, Math.min(labels.length, NODE_SLOTS.length)))

  return (
    <div className="st-ex-cine st-ex-cine--nodes" aria-hidden>
      <svg className="st-ex-cine-nodes-svg" viewBox="0 0 100 80">
        {NODE_LINKS.map(([a, b], i) => {
          if (a >= nodes.length || b >= nodes.length) return null
          const na = nodes[a]
          const nb = nodes[b]
          return (
            <line
              key={i}
              className="st-ex-cine-node-link"
              x1={na.x}
              y1={na.y}
              x2={nb.x}
              y2={nb.y}
            />
          )
        })}
        {nodes.map((n, i) => (
          <g
            key={i}
            className="st-ex-cine-node"
            style={{
              animationDelay: `${n.delay}s`,
              animationDuration: `${n.dur}s`,
            }}
          >
            <circle className="st-ex-cine-node-glow" cx={n.x} cy={n.y} r={n.r + 3} />
            <circle className="st-ex-cine-node-core" cx={n.x} cy={n.y} r={n.r} />
            <text className="st-ex-cine-node-label" x={n.x} y={n.y + n.r + 8} textAnchor="middle">
              {labels[i]?.slice(0, 14) ?? ''}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
