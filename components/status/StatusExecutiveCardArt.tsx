'use client'

import type { ReactNode } from 'react'

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

const STROKE = {
  stroke: 'currentColor',
  strokeWidth: 1.15,
  fill: 'none',
  strokeLinejoin: 'round' as const,
  strokeLinecap: 'round' as const,
  vectorEffect: 'non-scaling-stroke' as const,
}

function Slab({
  cx,
  cy,
  w,
  d,
  ext,
  className,
  ghost,
}: {
  cx: number
  cy: number
  w: number
  d: number
  ext: number
  className?: string
  ghost?: boolean
}) {
  const hw = w / 2
  const hd = d / 2
  const top = `M ${cx - hw} ${cy} L ${cx} ${cy - hd} L ${cx + hw} ${cy} L ${cx} ${cy + hd} Z`
  const right = `M ${cx + hw} ${cy} L ${cx + hw} ${cy - ext} L ${cx} ${cy - hd - ext} L ${cx} ${cy - hd}`
  const left = `M ${cx - hw} ${cy} L ${cx - hw} ${cy - ext} L ${cx} ${cy - hd - ext} L ${cx} ${cy - hd}`
  const cls = ghost ? 'st-ex-art-ghost' : className
  return (
    <g className={cls}>
      <path className="st-ex-art-fill" d={top} />
      <path {...STROKE} d={top} />
      <path {...STROKE} d={right} />
      <path {...STROKE} d={left} />
    </g>
  )
}

function CardLayer({
  points,
  className,
  ghost,
}: {
  points: string
  className?: string
  ghost?: boolean
}) {
  const cls = ghost ? 'st-ex-art-ghost' : className
  return (
    <g className={cls}>
      <path className="st-ex-art-fill" d={points} />
      <path {...STROKE} d={points} />
    </g>
  )
}

function OverallArt() {
  return (
    <svg viewBox="0 0 120 88" fill="none" aria-hidden>
      <g className="st-ex-art-reflect">
        <CardLayer
          ghost
          points="M34 72 L60 60 L86 72 L60 84 Z"
        />
        <CardLayer
          ghost
          points="M42 78 L60 68 L78 78 L60 88 Z"
        />
      </g>
      <g className="st-ex-art-float st-ex-art-float--slow">
        <CardLayer points="M34 58 L60 46 L86 58 L60 70 Z" />
      </g>
      <g className="st-ex-art-float st-ex-art-float--lift">
        <CardLayer points="M38 30 L60 18 L82 30 L60 42 Z" />
        <path
          {...STROKE}
          d="M46 28 Q60 22 74 28"
          opacity={0.35}
        />
      </g>
    </svg>
  )
}

function ClockArt() {
  return (
    <svg viewBox="0 0 120 88" fill="none" aria-hidden>
      <g className="st-ex-art-pulse">
        <circle cx={60} cy={44} r={26} {...STROKE} />
        <circle cx={60} cy={44} r={3} fill="currentColor" stroke="none" opacity={0.9} />
        <g className="st-ex-art-hand">
          <path {...STROKE} d="M60 44 L60 26" />
          <path {...STROKE} d="M60 44 L74 48" />
        </g>
        <path {...STROKE} d="M60 20 V24 M60 64 V68 M36 44 H40 M80 44 H84" opacity={0.45} />
      </g>
      <path
        className="st-ex-art-ghost"
        {...STROKE}
        d="M38 70 Q60 76 82 70"
      />
    </svg>
  )
}

function FilterArt() {
  return (
    <svg viewBox="0 0 120 88" fill="none" aria-hidden>
      <g className="st-ex-art-float st-ex-art-float--slow">
        <path className="st-ex-art-fill" d="M28 24 L92 24 L72 50 L48 50 Z" />
        <path {...STROKE} d="M28 24 L92 24 L72 50 L48 50 Z" />
        <path {...STROKE} d="M48 50 L48 68 L72 68 L72 50" />
        <path {...STROKE} d="M54 56 H66 M56 62 H64" opacity={0.5} />
      </g>
      <g className="st-ex-art-drift">
        <circle cx={42} cy={32} r={4} {...STROKE} />
        <circle cx={60} cy={28} r={3} {...STROKE} opacity={0.7} />
        <circle cx={78} cy={34} r={3.5} {...STROKE} opacity={0.55} />
      </g>
    </svg>
  )
}

function GoalsArt() {
  return (
    <svg viewBox="0 0 120 88" fill="none" aria-hidden>
      <g className="st-ex-art-float st-ex-art-float--slow">
        <Slab cx={34} cy={62} w={22} d={8} ext={8} />
        <Slab cx={60} cy={52} w={22} d={8} ext={8} className="st-ex-art-rise st-ex-art-rise--1" />
        <Slab cx={86} cy={40} w={22} d={8} ext={8} className="st-ex-art-rise st-ex-art-rise--2" />
        <path {...STROKE} d="M30 68 Q60 52 90 36" opacity={0.35} />
      </g>
    </svg>
  )
}

function DecisionsArt() {
  return (
    <svg viewBox="0 0 120 88" fill="none" aria-hidden>
      <g className="st-ex-art-float st-ex-art-float--slow">
        <path {...STROKE} d="M60 18 L60 42" />
        <path {...STROKE} d="M60 42 L34 68" />
        <path {...STROKE} d="M60 42 L86 68" />
        <circle cx={60} cy={42} r={4} fill="currentColor" stroke="none" opacity={0.85} />
        <circle cx={34} cy={68} r={5} {...STROKE} />
        <circle cx={86} cy={68} r={5} {...STROKE} />
        <path {...STROKE} d="M31 66 L37 70 M83 66 L89 70" opacity={0.45} />
      </g>
    </svg>
  )
}

function TasksArt() {
  const cubes = [
    { cx: 60, cy: 48, w: 18, d: 8, ext: 8, delay: 0 },
    { cx: 42, cy: 56, w: 16, d: 7, ext: 7, delay: 1 },
    { cx: 78, cy: 56, w: 16, d: 7, ext: 7, delay: 2 },
    { cx: 51, cy: 38, w: 14, d: 6, ext: 6, delay: 3 },
    { cx: 69, cy: 38, w: 14, d: 6, ext: 6, delay: 4 },
    { cx: 42, cy: 42, w: 12, d: 5, ext: 5, delay: 5 },
    { cx: 78, cy: 42, w: 12, d: 5, ext: 5, delay: 6 },
  ] as const
  return (
    <svg viewBox="0 0 120 88" fill="none" aria-hidden>
      {cubes.map((c, i) => (
        <g key={i} className={`st-ex-art-cube st-ex-art-cube--${c.delay}`}>
          <Slab cx={c.cx} cy={c.cy} w={c.w} d={c.d} ext={c.ext} />
        </g>
      ))}
    </svg>
  )
}

function DeliveriesArt() {
  return (
    <svg viewBox="0 0 120 88" fill="none" aria-hidden>
      <g className="st-ex-art-float st-ex-art-float--slow">
        <path className="st-ex-art-fill" d="M30 52 L60 38 L90 52 L60 66 Z" />
        <path {...STROKE} d="M30 52 L60 38 L90 52 L60 66 Z" />
        <path {...STROKE} d="M60 38 L60 22 L90 36 L90 52" />
        <path {...STROKE} d="M60 38 L60 22 L30 36 L30 52" />
        <path {...STROKE} d="M30 52 L30 64 L60 78 L60 66" />
        <path {...STROKE} d="M90 52 L90 64 L60 78" />
        <path {...STROKE} d="M42 44 L78 44" opacity={0.5} />
      </g>
      <g className="st-ex-art-float st-ex-art-float--lift">
        <path
          className="st-ex-art-fill"
          d="M38 30 L60 18 L82 30 L60 42 Z"
          opacity={0.6}
        />
        <path {...STROKE} d="M38 30 L60 18 L82 30 L60 42 Z" />
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
  const Illustration = ART[graphic]
  return (
    <div className="st-ex-card-art">
      <Illustration />
    </div>
  )
}
