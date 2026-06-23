'use client'

import type { ReactNode } from 'react'
import StatusExecutiveDeliveriesDemo from '@/components/status/StatusExecutiveDeliveriesDemo'

export type StatusExecutiveCardGraphic =
  | 'overall'
  | '24h'
  | 'filter'
  | 'goals'
  | 'decisions'
  | 'tasks'
  | 'deliveries'

type Props = {
  graphic: StatusExecutiveCardGraphic
}

const VB = '0 0 140 100'

/** Shared isometric primitives — matches Documents/Captures empty-state quality. */

function isoTop(cx: number, cy: number, w: number, d: number) {
  const hw = w / 2
  const hd = d / 2
  return `M ${cx - hw} ${cy} L ${cx} ${cy - hd} L ${cx + hw} ${cy} L ${cx} ${cy + hd} Z`
}

function IsoBlock({
  cx,
  cy,
  w,
  d,
  h,
  className,
}: {
  cx: number
  cy: number
  w: number
  d: number
  h: number
  className?: string
}) {
  const hw = w / 2
  const hd = d / 2
  const top = isoTop(cx, cy, w, d)
  const right = `M ${cx + hw} ${cy} L ${cx + hw} ${cy - h} L ${cx} ${cy - hd - h} L ${cx} ${cy - hd}`
  const left = `M ${cx - hw} ${cy} L ${cx - hw} ${cy - h} L ${cx} ${cy - hd - h} L ${cx} ${cy - hd}`
  return (
    <g className={className}>
      <path className="st-ex-art-fill" d={top} />
      <path className="st-ex-art-stroke" d={top} />
      <path className="st-ex-art-stroke" d={right} />
      <path className="st-ex-art-stroke" d={left} />
    </g>
  )
}

function IsoCard({
  cx,
  cy,
  w,
  d,
  className,
  ghost,
}: {
  cx: number
  cy: number
  w: number
  d: number
  className?: string
  ghost?: boolean
}) {
  const hw = w / 2
  const hd = d / 2
  const top = isoTop(cx, cy, w, d)
  const lip = `M ${cx + hw} ${cy} L ${cx + hw} ${cy - 3} L ${cx} ${cy - hd - 3} L ${cx} ${cy - hd}`
  const cls = ghost ? 'st-ex-art-ghost' : className
  return (
    <g className={cls}>
      {!ghost ? <path className="st-ex-art-fill" d={top} /> : null}
      <path className="st-ex-art-stroke" d={top} />
      {!ghost ? <path className="st-ex-art-stroke st-ex-art-stroke--soft" d={lip} /> : null}
    </g>
  )
}

function IsoDoc({
  cx,
  cy,
  w,
  d,
  h,
  className,
  lines,
}: {
  cx: number
  cy: number
  w: number
  d: number
  h: number
  className?: string
  lines?: boolean
}) {
  const hw = w / 2
  const hd = d / 2
  const top = isoTop(cx, cy, w, d)
  const right = `M ${cx + hw} ${cy} L ${cx + hw} ${cy - h} L ${cx} ${cy - hd - h} L ${cx} ${cy - hd}`
  const left = `M ${cx - hw} ${cy} L ${cx - hw} ${cy - h} L ${cx} ${cy - hd - h} L ${cx} ${cy - hd}`
  const fold = `M ${cx} ${cy - hd} L ${cx + hw * 0.22} ${cy - hd - h * 0.12} L ${cx + hw * 0.22} ${cy - hd + hd * 0.18} L ${cx} ${cy - hd}`
  return (
    <g className={className}>
      <path className="st-ex-art-fill" d={top} />
      <path className="st-ex-art-stroke" d={top} />
      <path className="st-ex-art-stroke" d={right} />
      <path className="st-ex-art-stroke" d={left} />
      <path className="st-ex-art-stroke st-ex-art-stroke--soft" d={fold} />
      {lines ? (
        <>
          <path className="st-ex-art-stroke st-ex-art-stroke--soft" d={`M ${cx - hw * 0.55} ${cy - hd * 0.15} L ${cx + hw * 0.35} ${cy - hd * 0.55}`} />
          <path className="st-ex-art-stroke st-ex-art-stroke--soft" d={`M ${cx - hw * 0.55} ${cy + hd * 0.05} L ${cx + hw * 0.2} ${cy - hd * 0.25}`} />
        </>
      ) : null}
    </g>
  )
}

/** Gesamtbericht — floating report stack with soft reflection. */
function OverallArt() {
  return (
    <svg viewBox={VB} fill="none" aria-hidden>
      <g className="st-ex-art-ghost st-ex-art-ghost--reflect">
        <IsoCard cx={70} cy={82} w={54} d={16} ghost />
        <IsoCard cx={70} cy={90} w={42} d={12} ghost />
      </g>
      <IsoDoc cx={70} cy={66} w={58} d={18} h={14} className="st-ex-art-layer st-ex-art-layer--2" />
      <IsoDoc
        cx={70}
        cy={36}
        w={52}
        d={16}
        h={12}
        className="st-ex-art-layer st-ex-art-lift"
        lines
      />
    </svg>
  )
}

/** Letzte 24h — minimal dial, quiet hand motion. */
function ClockArt() {
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2
    const r0 = i % 3 === 0 ? 21 : 22.5
    const r1 = 24.5
    const x0 = 70 + Math.cos(a) * r0
    const y0 = 48 + Math.sin(a) * r0
    const x1 = 70 + Math.cos(a) * r1
    const y1 = 48 + Math.sin(a) * r1
    return (
      <path
        key={i}
        className={i % 3 === 0 ? 'st-ex-art-stroke' : 'st-ex-art-stroke st-ex-art-stroke--soft'}
        d={`M ${x0} ${y0} L ${x1} ${y1}`}
      />
    )
  })
  return (
    <svg viewBox={VB} fill="none" aria-hidden>
      <g className="st-ex-art-layer">
        <circle className="st-ex-art-stroke" cx={70} cy={48} r={24.5} />
        {ticks}
        <path className="st-ex-art-stroke" d="M70 48 L70 30" />
        <path className="st-ex-art-stroke st-ex-art-stroke--soft" d="M70 48 L82 52" />
        <g className="st-ex-art-second">
          <path className="st-ex-art-stroke st-ex-art-stroke--hair" d="M70 48 L70 27" />
        </g>
        <circle className="st-ex-art-stroke" cx={70} cy={48} r={1.5} />
      </g>
    </svg>
  )
}

/** Filter — three narrowing isometric layers. */
function FilterArt() {
  return (
    <svg viewBox={VB} fill="none" aria-hidden>
      <IsoCard cx={70} cy={72} w={64} d={18} className="st-ex-art-layer st-ex-art-layer--1" />
      <IsoCard cx={70} cy={54} w={48} d={14} className="st-ex-art-layer st-ex-art-layer--2" />
      <IsoCard cx={70} cy={36} w={32} d={10} className="st-ex-art-layer st-ex-art-lift" />
      <path
        className="st-ex-art-stroke st-ex-art-stroke--soft"
        d="M58 72 L70 64 L82 72"
      />
    </svg>
  )
}

/** Zieleindrücke — isometric target rings. */
function GoalsArt() {
  const rings = [
    { rx: 30, ry: 12, cy: 58 },
    { rx: 22, ry: 9, cy: 52 },
    { rx: 14, ry: 6, cy: 46 },
  ]
  return (
    <svg viewBox={VB} fill="none" aria-hidden>
      {rings.map((r, i) => (
        <ellipse
          key={i}
          className={`st-ex-art-stroke st-ex-art-layer st-ex-art-layer--${i + 1}`}
          cx={70}
          cy={r.cy}
          rx={r.rx}
          ry={r.ry}
        />
      ))}
      <path className="st-ex-art-stroke st-ex-art-stroke--soft" d="M70 46 L70 34" />
      <circle className="st-ex-art-stroke" cx={70} cy={32} r={2.5} />
    </svg>
  )
}

/** Entscheidungen — clean branch with hollow nodes. */
function DecisionsArt() {
  return (
    <svg viewBox={VB} fill="none" aria-hidden>
      <g className="st-ex-art-layer">
        <circle className="st-ex-art-stroke" cx={70} cy={24} r={5} />
        <path className="st-ex-art-stroke" d="M70 29 L70 44" />
        <path className="st-ex-art-stroke" d="M70 44 L38 72" />
        <path className="st-ex-art-stroke" d="M70 44 L102 72" />
        <circle className="st-ex-art-stroke" cx={38} cy={72} r={6} />
        <circle className="st-ex-art-stroke" cx={102} cy={72} r={6} />
        <path className="st-ex-art-stroke st-ex-art-stroke--soft" d="M35 70 L41 74" />
        <path className="st-ex-art-stroke st-ex-art-stroke--soft" d="M99 70 L105 74" />
      </g>
    </svg>
  )
}

/** Tasks — tight isometric cube cluster. */
function TasksArt() {
  const cubes: Array<{ cx: number; cy: number; w: number; d: number; h: number; layer: 1 | 2 | 3 }> = [
    { cx: 70, cy: 54, w: 20, d: 10, h: 14, layer: 2 },
    { cx: 50, cy: 62, w: 17, d: 8, h: 12, layer: 1 },
    { cx: 90, cy: 62, w: 17, d: 8, h: 12, layer: 3 },
    { cx: 58, cy: 44, w: 15, d: 7, h: 11, layer: 1 },
    { cx: 82, cy: 44, w: 15, d: 7, h: 11, layer: 3 },
    { cx: 64, cy: 50, w: 13, d: 6, h: 9, layer: 1 },
    { cx: 76, cy: 50, w: 13, d: 6, h: 9, layer: 3 },
  ]
  return (
    <svg viewBox={VB} fill="none" aria-hidden>
      {cubes.map((c, i) => (
        <IsoBlock
          key={i}
          cx={c.cx}
          cy={c.cy}
          w={c.w}
          d={c.d}
          h={c.h}
          className={`st-ex-art-cube st-ex-art-layer st-ex-art-layer--${c.layer}`}
        />
      ))}
    </svg>
  )
}

/** Lieferungen — sealed package with lid seam. */
function DeliveriesArt() {
  const cx = 70
  const cy = 58
  const w = 56
  const d = 18
  const h = 22
  const hw = w / 2
  const hd = d / 2
  const top = isoTop(cx, cy, w, d)
  const right = `M ${cx + hw} ${cy} L ${cx + hw} ${cy - h} L ${cx} ${cy - hd - h} L ${cx} ${cy - hd}`
  const left = `M ${cx - hw} ${cy} L ${cx - hw} ${cy - h} L ${cx} ${cy - hd - h} L ${cx} ${cy - hd}`
  const lid = isoTop(cx, cy - h - 2, w - 8, d - 4)
  const tape = `M ${cx - 4} ${cy - hd - h} L ${cx + 4} ${cy - hd - h - 8}`
  return (
    <svg viewBox={VB} fill="none" aria-hidden>
      <g className="st-ex-art-layer st-ex-art-layer--1">
        <path className="st-ex-art-fill" d={top} />
        <path className="st-ex-art-stroke" d={top} />
        <path className="st-ex-art-stroke" d={right} />
        <path className="st-ex-art-stroke" d={left} />
        <path className="st-ex-art-stroke st-ex-art-stroke--soft" d={tape} />
      </g>
      <g className="st-ex-art-lift">
        <path className="st-ex-art-fill" d={lid} />
        <path className="st-ex-art-stroke" d={lid} />
      </g>
    </svg>
  )
}

const ART: Record<StatusExecutiveCardGraphic, () => ReactNode> = {
  overall: OverallArt,
  '24h': ClockArt,
  filter: FilterArt,
  goals: GoalsArt,
  decisions: DecisionsArt,
  tasks: TasksArt,
  deliveries: DeliveriesArt,
}

export default function StatusExecutiveCardArt({ graphic }: Props) {
  if (graphic === 'deliveries') {
    return (
      <div className="st-ex-card-art st-ex-card-art--tagro-demo">
        <StatusExecutiveDeliveriesDemo />
      </div>
    )
  }

  const Illustration = ART[graphic]
  return (
    <div className="st-ex-card-art">
      <Illustration />
    </div>
  )
}
