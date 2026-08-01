'use client'

/**
 * Festag working indicator — logo-style paired dots.
 * Two related points (one larger, one smaller), softly swapping weight —
 * same language as the fluid festag mark, never a floating constellation.
 */

type Size = 'sm' | 'md' | 'lg'

type Props = {
  size?: Size
  /** Accessible label — visually hidden. */
  label?: string
  className?: string
  /**
   * `muted` — --text-muted (page / chat loaders)
   * `inherit` — currentColor (buttons on light/dark fills)
   */
  tone?: 'muted' | 'inherit'
  /** How many logo pairs (default 2 — matches the mark’s two rows). */
  pairs?: 1 | 2 | 3
}

const BOX: Record<Size, { w: number; big: number; small: number; gap: number; rowGap: number }> = {
  sm: { w: 16, big: 4.5, small: 2.75, gap: 2.5, rowGap: 2.5 },
  md: { w: 20, big: 5.5, small: 3.25, gap: 3, rowGap: 3 },
  lg: { w: 28, big: 7.5, small: 4.5, gap: 4, rowGap: 4 },
}

export default function FestagWorkingDots({
  size = 'md',
  label = 'Lädt',
  className = '',
  tone = 'muted',
  pairs = 2,
}: Props) {
  const box = BOX[size]
  const pairCount = pairs
  const height = pairCount * box.big + (pairCount - 1) * box.rowGap

  return (
    <span
      className={`fwd${className ? ` ${className}` : ''}`}
      role="status"
      aria-label={label}
      style={{
        width: box.w,
        height,
        ['--fwd-big' as string]: `${box.big}px`,
        ['--fwd-small' as string]: `${box.small}px`,
        ['--fwd-gap' as string]: `${box.gap}px`,
        ['--fwd-row-gap' as string]: `${box.rowGap}px`,
        ['--fwd-color' as string]:
          tone === 'inherit' ? 'currentColor' : 'var(--text-muted, #86868b)',
      }}
    >
      <style>{`
        .fwd {
          position: relative;
          display: inline-flex;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start;
          gap: var(--fwd-row-gap);
          flex-shrink: 0;
          vertical-align: middle;
          overflow: visible;
        }
        .fwd-pair {
          display: flex;
          align-items: center;
          gap: var(--fwd-gap);
          height: var(--fwd-big);
        }
        .fwd-pair--short {
          transform-origin: left center;
          transform: scaleX(0.78);
        }
        .fwd-n {
          display: block;
          border-radius: 50%;
          background: var(--fwd-color);
          flex-shrink: 0;
          will-change: width, height, opacity;
        }
        .fwd-n--a {
          width: var(--fwd-big);
          height: var(--fwd-big);
          animation: fwdSwapA 1.45s cubic-bezier(.45,.05,.55,.95) infinite;
        }
        .fwd-n--b {
          width: var(--fwd-small);
          height: var(--fwd-small);
          animation: fwdSwapB 1.45s cubic-bezier(.45,.05,.55,.95) infinite;
        }
        .fwd-pair:nth-child(2) .fwd-n--a,
        .fwd-pair:nth-child(2) .fwd-n--b {
          animation-delay: 0.22s;
        }
        .fwd-pair:nth-child(3) .fwd-n--a,
        .fwd-pair:nth-child(3) .fwd-n--b {
          animation-delay: 0.44s;
        }
        @keyframes fwdSwapA {
          0%, 100% {
            width: var(--fwd-big);
            height: var(--fwd-big);
            opacity: 0.92;
          }
          50% {
            width: var(--fwd-small);
            height: var(--fwd-small);
            opacity: 0.55;
          }
        }
        @keyframes fwdSwapB {
          0%, 100% {
            width: var(--fwd-small);
            height: var(--fwd-small);
            opacity: 0.55;
          }
          50% {
            width: var(--fwd-big);
            height: var(--fwd-big);
            opacity: 0.92;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .fwd-n--a, .fwd-n--b {
            animation: none !important;
          }
          .fwd-n--a {
            width: var(--fwd-big) !important;
            height: var(--fwd-big) !important;
            opacity: 0.85 !important;
          }
          .fwd-n--b {
            width: var(--fwd-small) !important;
            height: var(--fwd-small) !important;
            opacity: 0.6 !important;
          }
        }
      `}</style>
      {Array.from({ length: pairCount }, (_, i) => (
        <span
          key={i}
          className={`fwd-pair${i === 1 ? ' fwd-pair--short' : ''}`}
          aria-hidden
        >
          <span className="fwd-n fwd-n--a" />
          <span className="fwd-n fwd-n--b" />
        </span>
      ))}
    </span>
  )
}
