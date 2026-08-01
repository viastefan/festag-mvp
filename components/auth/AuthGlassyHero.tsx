'use client'

/**
 * Auth glassy word reveal — same motion language as Dev Onboarding.
 * Lead words (bright) + optional muted rest. Username/workspace stays below
 * the title in the parent — this component is only the H1 reveal.
 */

type Props = {
  lead?: string
  rest?: string
  /** Remount key so the rise re-plays on mode / title change. */
  animKey?: string
  className?: string
  /** Two-line titles (e.g. Melde dich an / bei Festag.) as separate lead lines. */
  lines?: string[]
}

function Words({
  text,
  tone,
  startIndex,
}: {
  text: string
  tone: 'lead' | 'muted'
  startIndex: number
}) {
  const words = text.trim().split(/\s+/).filter(Boolean)
  return (
    <>
      {words.map((word, idx) => {
        const n = startIndex + idx
        const last = idx === words.length - 1
        return (
          <span key={`${tone}-${idx}-${word}`} className="al-gword" style={{ ['--i' as string]: n }}>
            <span className={`al-gword-inner${tone === 'muted' ? ' al-hero-gray' : ' al-gword-lead'}`}>
              {word}
              {last ? '' : '\u00A0'}
            </span>
          </span>
        )
      })}
    </>
  )
}

export default function AuthGlassyHero({
  lead = '',
  rest = '',
  animKey,
  className = '',
  lines,
}: Props) {
  if (lines && lines.length > 0) {
    let i = 0
    return (
      <h1 key={animKey} className={`al-title al-title-display al-glassy-hero ${className}`.trim()}>
        {lines.map((line, li) => {
          const start = i
          const count = line.trim().split(/\s+/).filter(Boolean).length
          i += count
          return (
            <span key={`line-${li}`} className="al-glassy-hero-line">
              <Words text={line} tone="lead" startIndex={start} />
              {li < lines.length - 1 ? <br /> : null}
            </span>
          )
        })}
      </h1>
    )
  }

  const leadCount = lead.trim().split(/\s+/).filter(Boolean).length
  return (
    <h1 key={animKey} className={`al-title al-title-display al-glassy-hero ${className}`.trim()}>
      <Words text={lead} tone="lead" startIndex={0} />
      {rest.trim() ? <Words text={rest} tone="muted" startIndex={leadCount} /> : null}
    </h1>
  )
}

/** Inject once next to AUTH_LANDING_STYLES. */
export const AUTH_GLASSY_HERO_CSS = `
  .al-glassy-hero {
    margin: 0;
    max-width: 100%;
    font-weight: 400;
    letter-spacing: -0.012em;
    text-align: left;
  }
  .al-glassy-hero-line {
    display: block;
  }
  .al-gword {
    display: inline-block;
    overflow: hidden;
    vertical-align: baseline;
    padding-bottom: 0.04em;
    margin-bottom: -0.04em;
  }
  .al-gword-inner {
    display: inline-block;
    will-change: transform, filter, opacity;
    animation: alGwordIn .58s cubic-bezier(.16, 1, .3, 1) both;
    animation-delay: calc(var(--i, 0) * 32ms);
  }
  .al-gword-lead {
    color: inherit;
    opacity: 1;
  }
  .al-gword-inner.al-hero-gray {
    color: inherit;
    opacity: 0.58;
  }
  @keyframes alGwordIn {
    from {
      opacity: 0;
      transform: translate3d(0, 118%, 0);
      filter: blur(10px);
    }
    to {
      opacity: 1;
      transform: translate3d(0, 0, 0);
      filter: blur(0);
    }
  }

  /* Username / workspace path — assembles after the title */
  .al-hero-secondary {
    display: block;
    width: 100%;
    animation: alHeroSecondaryIn .52s cubic-bezier(.22, 1, .36, 1) both;
    animation-delay: .14s;
  }
  @keyframes alHeroSecondaryIn {
    from {
      opacity: 0;
      transform: translate3d(0, 10px, 0);
      filter: blur(6px);
    }
    to {
      opacity: 1;
      transform: translate3d(0, 0, 0);
      filter: blur(0);
    }
  }

  /* Form stack — soft assemble, same language as onboarding content */
  .al-signin:not(.al-signin--out) > .al-content:not(.animating) {
    animation: alContentAssemble .52s cubic-bezier(.22, 1, .36, 1) both;
    animation-delay: .12s;
  }
  @keyframes alContentAssemble {
    from {
      opacity: 0;
      transform: translate3d(0, 14px, 0);
      filter: blur(8px);
    }
    to {
      opacity: 1;
      transform: translate3d(0, 0, 0);
      filter: blur(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .al-gword-inner,
    .al-hero-secondary,
    .al-signin:not(.al-signin--out) > .al-content:not(.animating) {
      animation: none !important;
      opacity: 1 !important;
      transform: none !important;
      filter: none !important;
    }
  }
`
