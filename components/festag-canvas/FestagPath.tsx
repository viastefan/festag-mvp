'use client'

import type { CSSProperties } from 'react'

type Point = { x: number; y: number }

type Props = {
  /** SVG path d — viewBox 0 0 100 100 unless viewBox set */
  d: string
  visible?: boolean
  alwaysOn?: boolean
  retracting?: boolean
  showEndpoints?: boolean
  start?: Point
  end?: Point
  viewBox?: string
  preserveAspectRatio?: string
  className?: string
  /** Delay before ink line draws (ms) */
  drawDelayMs?: number
  /** Duration of ink draw (ms) */
  drawDurationMs?: number
}

/**
 * One organic ink path. Grows slowly — never arrows, never flowcharts.
 */
export default function FestagPath({
  d,
  visible = false,
  alwaysOn = false,
  retracting = false,
  showEndpoints = true,
  start = { x: 50, y: 24 },
  end = { x: 50, y: 62 },
  viewBox = '0 0 100 100',
  preserveAspectRatio = 'none',
  className,
  drawDelayMs = 0,
  drawDurationMs = 1100,
}: Props) {
  const on = alwaysOn || visible
  const flowStyle = {
    ['--festag-path-draw-delay' as string]: `${drawDelayMs}ms`,
    ['--festag-path-draw-duration' as string]: `${drawDurationMs}ms`,
  } as CSSProperties

  return (
    <svg
      className={[
        'festag-path',
        className,
        on ? (alwaysOn ? 'is-always' : 'is-on') : '',
        retracting ? 'is-out' : '',
        drawDelayMs > 0 ? 'has-draw-delay' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={flowStyle}
      viewBox={viewBox}
      preserveAspectRatio={preserveAspectRatio}
      aria-hidden
    >
      <path className="festag-path-track" d={d} vectorEffect="non-scaling-stroke" />
      <path className="festag-path-flow" d={d} vectorEffect="non-scaling-stroke" />
      {/* Endpoints are zero-length round-capped strokes, not <circle>s: this SVG
          stretches (preserveAspectRatio="none"), which turns a real circle into
          an oval. A non-scaling-stroke round cap is stroked in device space, so
          the dot stays perfectly round at any aspect — the same reason the paths
          above use vectorEffect for their width. */}
      {showEndpoints ? (
        <>
          <path
            className="festag-path-start"
            d={`M ${start.x} ${start.y} l 0 0`}
            vectorEffect="non-scaling-stroke"
          />
          <path
            className="festag-path-end"
            d={`M ${end.x} ${end.y} l 0 0`}
            vectorEffect="non-scaling-stroke"
          />
        </>
      ) : null}
    </svg>
  )
}

/** Vertical ink stroke — mobile anchor → decision panel */
export const MOBILE_INK_PATH =
  'M 50 24 C 50 32, 49 38, 50 44 S 51 54, 50 62'

/** Desktop project milestone rail */
export const DESKTOP_RAIL_PATH =
  'M 50 3 C 50 18, 50 38, 50 58 S 50 82, 50 97'
