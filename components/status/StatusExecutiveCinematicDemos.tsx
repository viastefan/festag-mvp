'use client'

const REPORT_LINES = [
  'Alle Projekte im Blick',
  'Checkout-Blocker erkannt',
  'Release steht Freitag',
  '2 Freigaben offen',
  'Velocity stabil diese Woche',
  'Risiko niedrig bei API',
  'Kunde wartet auf Demo',
  'Sprint schließt sauber ab',
]

const NODES = [
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

export function StatusExecutiveReportLyricsDemo() {
  const loop = [...REPORT_LINES, ...REPORT_LINES]
  return (
    <div className="st-ex-cine st-ex-cine--lyrics" aria-hidden>
      <div className="st-ex-cine-rim" />
      <div className="st-ex-cine-lyrics-mask">
        <div className="st-ex-cine-lyrics-track">
          {loop.map((line, i) => (
            <p key={`${line}-${i}`} className="st-ex-cine-lyrics-line">
              {line}
            </p>
          ))}
        </div>
        <div className="st-ex-cine-lyrics-focus" />
      </div>
    </div>
  )
}

export function StatusExecutive24hWaveDemo() {
  return (
    <div className="st-ex-cine st-ex-cine--wave" aria-hidden>
      <div className="st-ex-cine-rim" />
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

export function StatusExecutiveProjectNodesDemo() {
  return (
    <div className="st-ex-cine st-ex-cine--nodes" aria-hidden>
      <div className="st-ex-cine-rim" />
      <svg className="st-ex-cine-nodes-svg" viewBox="0 0 100 80">
        {NODE_LINKS.map(([a, b], i) => {
          const na = NODES[a]
          const nb = NODES[b]
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
        {NODES.map((n, i) => (
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
          </g>
        ))}
      </svg>
    </div>
  )
}
