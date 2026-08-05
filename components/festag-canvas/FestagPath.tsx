'use client'

type Props = {
  /** SVG path d — viewBox 0 0 100 100 */
  d: string
  visible: boolean
  retracting?: boolean
  className?: string
}

/**
 * One organic ink path. Grows slowly — never arrows, never flowcharts.
 */
export default function FestagPath({ d, visible, retracting, className }: Props) {
  return (
    <svg
      className={[
        'fos-path',
        visible ? 'is-on' : '',
        retracting ? 'is-out' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path className="fos-path-track" d={d} vectorEffect="non-scaling-stroke" />
      <path className="fos-path-flow" d={d} vectorEffect="non-scaling-stroke" />
      <circle className="fos-path-start" cx="50" cy="24" r="1.8" />
      <circle className="fos-path-end" cx="50" cy="62" r="2.4" />
    </svg>
  )
}

/** Vertical ink stroke from anchor to decision panel — mock mobile path */
export const MOBILE_INK_PATH =
  'M 50 24 C 50 32, 49 38, 50 44 S 51 54, 50 62'
