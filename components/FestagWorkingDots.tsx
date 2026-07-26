'use client'

/**
 * Festag working indicator — Cursor-style morphing constellation.
 * Calm 5-dot lattice that rearranges while something is in progress.
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
}

const BOX: Record<Size, number> = { sm: 14, md: 18, lg: 26 }
const DOT: Record<Size, number> = { sm: 2.5, md: 3.25, lg: 4.25 }

export default function FestagWorkingDots({
  size = 'md',
  label = 'Lädt',
  className = '',
  tone = 'muted',
}: Props) {
  const box = BOX[size]
  const dot = DOT[size]

  return (
    <span
      className={`fwd${className ? ` ${className}` : ''}`}
      role="status"
      aria-label={label}
      style={{
        width: box,
        height: box,
        ['--fwd-box' as string]: `${box}px`,
        ['--fwd-dot' as string]: `${dot}px`,
        ['--fwd-color' as string]:
          tone === 'inherit' ? 'currentColor' : 'var(--text-muted, #86868b)',
      }}
    >
      <style>{`
        .fwd {
          position: relative;
          display: inline-block;
          flex-shrink: 0;
          vertical-align: middle;
          overflow: visible;
        }
        .fwd-d {
          position: absolute;
          top: 0;
          left: 0;
          width: var(--fwd-dot);
          height: var(--fwd-dot);
          margin: calc(var(--fwd-dot) / -2) 0 0 calc(var(--fwd-dot) / -2);
          border-radius: 50%;
          background: var(--fwd-color);
          will-change: transform, opacity;
        }
        .fwd-d0 { animation: fwd0 1.55s cubic-bezier(.45,.05,.55,.95) infinite; }
        .fwd-d1 { animation: fwd1 1.55s cubic-bezier(.45,.05,.55,.95) infinite; }
        .fwd-d2 { animation: fwd2 1.55s cubic-bezier(.45,.05,.55,.95) infinite; }
        .fwd-d3 { animation: fwd3 1.55s cubic-bezier(.45,.05,.55,.95) infinite; }
        .fwd-d4 { animation: fwd4 1.55s cubic-bezier(.45,.05,.55,.95) infinite; }

        /* Positions are fractions of --fwd-box so the constellation fills the mark. */
        @keyframes fwd0 {
          0%, 100% { transform: translate(calc(var(--fwd-box) * .18), calc(var(--fwd-box) * .72)); opacity: .55; }
          25%      { transform: translate(calc(var(--fwd-box) * .50), calc(var(--fwd-box) * .18)); opacity: .95; }
          50%      { transform: translate(calc(var(--fwd-box) * .22), calc(var(--fwd-box) * .50)); opacity: .7; }
          75%      { transform: translate(calc(var(--fwd-box) * .50), calc(var(--fwd-box) * .50)); opacity: 1; }
        }
        @keyframes fwd1 {
          0%, 100% { transform: translate(calc(var(--fwd-box) * .48), calc(var(--fwd-box) * .28)); opacity: .95; }
          25%      { transform: translate(calc(var(--fwd-box) * .82), calc(var(--fwd-box) * .50)); opacity: .6; }
          50%      { transform: translate(calc(var(--fwd-box) * .50), calc(var(--fwd-box) * .22)); opacity: 1; }
          75%      { transform: translate(calc(var(--fwd-box) * .22), calc(var(--fwd-box) * .28)); opacity: .7; }
        }
        @keyframes fwd2 {
          0%, 100% { transform: translate(calc(var(--fwd-box) * .82), calc(var(--fwd-box) * .28)); opacity: .7; }
          25%      { transform: translate(calc(var(--fwd-box) * .50), calc(var(--fwd-box) * .82)); opacity: 1; }
          50%      { transform: translate(calc(var(--fwd-box) * .78), calc(var(--fwd-box) * .50)); opacity: .55; }
          75%      { transform: translate(calc(var(--fwd-box) * .78), calc(var(--fwd-box) * .72)); opacity: .9; }
        }
        @keyframes fwd3 {
          0%, 100% { transform: translate(calc(var(--fwd-box) * .48), calc(var(--fwd-box) * .72)); opacity: .85; }
          25%      { transform: translate(calc(var(--fwd-box) * .18), calc(var(--fwd-box) * .50)); opacity: .65; }
          50%      { transform: translate(calc(var(--fwd-box) * .50), calc(var(--fwd-box) * .78)); opacity: .95; }
          75%      { transform: translate(calc(var(--fwd-box) * .50), calc(var(--fwd-box) * .82)); opacity: .6; }
        }
        @keyframes fwd4 {
          0%, 100% { transform: translate(calc(var(--fwd-box) * .82), calc(var(--fwd-box) * .72)); opacity: .65; }
          25%      { transform: translate(calc(var(--fwd-box) * .78), calc(var(--fwd-box) * .22)); opacity: .9; }
          50%      { transform: translate(calc(var(--fwd-box) * .22), calc(var(--fwd-box) * .78)); opacity: .75; }
          75%      { transform: translate(calc(var(--fwd-box) * .78), calc(var(--fwd-box) * .28)); opacity: .55; }
        }

        @media (prefers-reduced-motion: reduce) {
          .fwd-d0, .fwd-d1, .fwd-d2, .fwd-d3, .fwd-d4 {
            animation: none !important;
            opacity: .75;
          }
          .fwd-d0 { transform: translate(calc(var(--fwd-box) * .18), calc(var(--fwd-box) * .72)); }
          .fwd-d1 { transform: translate(calc(var(--fwd-box) * .48), calc(var(--fwd-box) * .28)); }
          .fwd-d2 { transform: translate(calc(var(--fwd-box) * .82), calc(var(--fwd-box) * .28)); }
          .fwd-d3 { transform: translate(calc(var(--fwd-box) * .48), calc(var(--fwd-box) * .72)); }
          .fwd-d4 { transform: translate(calc(var(--fwd-box) * .82), calc(var(--fwd-box) * .72)); }
        }
      `}</style>
      <span className="fwd-d fwd-d0" aria-hidden />
      <span className="fwd-d fwd-d1" aria-hidden />
      <span className="fwd-d fwd-d2" aria-hidden />
      <span className="fwd-d fwd-d3" aria-hidden />
      <span className="fwd-d fwd-d4" aria-hidden />
    </span>
  )
}
