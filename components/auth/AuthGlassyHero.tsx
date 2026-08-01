'use client'

import { useEffect, useState } from 'react'

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
  /** Skip word-rise — used for soft login ↔ register swaps. */
  instant?: boolean
  /** Put muted `rest` on its own line under `lead` (onboarding Intent / Connect). */
  stacked?: boolean
}

function Words({
  text,
  tone,
  startIndex,
  instant,
}: {
  text: string
  tone: 'lead' | 'muted'
  startIndex: number
  instant?: boolean
}) {
  const words = text.trim().split(/\s+/).filter(Boolean)
  return (
    <>
      {words.map((word, idx) => {
        const n = startIndex + idx
        const last = idx === words.length - 1
        return (
          <GWord
            key={`${tone}-${idx}-${word}`}
            index={n}
            instant={instant}
            tone={tone}
            word={word}
            trailingSpace={!last}
          />
        )
      })}
    </>
  )
}

function GWord({
  word,
  tone,
  index,
  instant,
  trailingSpace,
}: {
  word: string
  tone: 'lead' | 'muted'
  index: number
  instant?: boolean
  trailingSpace: boolean
}) {
  const [settled, setSettled] = useState(() => {
    if (instant) return true
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return true
    }
    return false
  })
  useEffect(() => {
    if (instant || settled) return
    // Failsafe: animationend can miss (reduced-motion / interrupted). Never keep the clip.
    const t = window.setTimeout(() => setSettled(true), 900 + index * 32)
    return () => window.clearTimeout(t)
  }, [instant, settled, index])
  return (
    <span
      className={`al-gword${settled || instant ? ' al-gword--settled' : ''}`}
      style={{ ['--i' as string]: index }}
    >
      <span
        className={`al-gword-inner${tone === 'muted' ? ' al-hero-gray' : ' al-gword-lead'}`}
        onAnimationEnd={() => setSettled(true)}
      >
        {word}
        {trailingSpace ? '\u00A0' : ''}
      </span>
    </span>
  )
}

export default function AuthGlassyHero({
  lead = '',
  rest = '',
  animKey,
  className = '',
  lines,
  /** Skip word-rise — used for soft login ↔ register swaps. */
  instant = false,
  stacked = false,
}: Props) {
  const heroClass = `al-title al-title-display al-glassy-hero${instant ? ' al-glassy-hero--instant' : ''}${stacked ? ' al-glassy-hero--stacked' : ''}${className ? ` ${className}` : ''}`

  if (lines && lines.length > 0) {
    let i = 0
    return (
      <h1 key={animKey} className={heroClass}>
        {lines.map((line, li) => {
          const start = i
          const count = line.trim().split(/\s+/).filter(Boolean).length
          i += count
          return (
            <span key={`line-${li}`} className="al-glassy-hero-line">
              <Words text={line} tone="lead" startIndex={start} instant={instant} />
              {li < lines.length - 1 ? <br /> : null}
            </span>
          )
        })}
      </h1>
    )
  }

  const leadCount = lead.trim().split(/\s+/).filter(Boolean).length
  if (stacked) {
    return (
      <h1 key={animKey} className={heroClass}>
        <span className="al-glassy-hero-line">
          <Words text={lead} tone="lead" startIndex={0} instant={instant} />
        </span>
        {rest.trim() ? (
          <span className="al-glassy-hero-line">
            <Words text={rest} tone="muted" startIndex={leadCount} instant={instant} />
          </span>
        ) : null}
      </h1>
    )
  }

  return (
    <h1 key={animKey} className={heroClass}>
      <Words text={lead} tone="lead" startIndex={0} instant={instant} />
      {rest.trim() ? <Words text={rest} tone="muted" startIndex={leadCount} instant={instant} /> : null}
    </h1>
  )
}

/** Inject once next to AUTH_LANDING_STYLES. */
export const AUTH_GLASSY_HERO_CSS = `
  .al-glassy-hero {
    margin: 0;
    max-width: 100%;
    font-weight: 400;
    letter-spacing: var(--auth-tracking-display, 0.006em);
    text-align: left;
  }
  .al-glassy-hero-line {
    display: block;
  }
  .al-gword {
    display: inline-block;
    /* Clip mask for word-rise — room for Aeonik descenders (g/y/p/q). */
    overflow: hidden;
    vertical-align: baseline;
    padding-top: 0.08em;
    padding-bottom: 0.52em;
    margin-top: -0.08em;
    margin-bottom: -0.44em;
  }
  /* After the rise settles, never keep a clip mask on descenders. */
  .al-gword.al-gword--settled {
    overflow: visible;
    padding-top: 0;
    padding-bottom: 0;
    margin-top: 0;
    margin-bottom: 0;
  }
  .al-gword-inner {
    display: inline-block;
    will-change: transform, filter, opacity;
    animation: alGwordIn .58s cubic-bezier(.16, 1, .3, 1) both;
    animation-delay: calc(var(--i, 0) * 32ms);
  }
  /* Instant / soft handoff — no rise mask, so never clip descenders. */
  .al-glassy-hero--instant .al-gword,
  .al-root.al-soft-mode .al-gword,
  .al-root.al-soft-enter .al-gword {
    overflow: visible;
    padding-bottom: 0;
    margin-bottom: 0;
  }
  .al-glassy-hero--instant .al-gword-inner {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
    filter: none !important;
  }
  /* Soft login ↔ register: panel stays; never re-run glassy / assemble / fade.
     al-soft-mode persists for the shell lifetime so animations don't restart. */
  .al-root.al-soft-mode .al-gword-inner,
  .al-root.al-soft-mode .al-hero-secondary,
  .al-root.al-soft-mode .al-signin:not(.al-signin--out) > .al-content:not(.animating),
  .al-root.al-soft-enter .al-gword-inner,
  .al-root.al-soft-enter .al-hero-secondary,
  .al-root.al-soft-enter .al-signin:not(.al-signin--out) > .al-content:not(.animating),
  .al-root.al-soft-mode .al-signin-head,
  .al-root.al-soft-mode .al-signin > .al-content,
  .al-root.al-soft-mode .al-auth-switch,
  .al-root.al-soft-enter .al-signin-head,
  .al-root.al-soft-enter .al-signin > .al-content,
  .al-root.al-soft-enter .al-auth-switch {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
    filter: none !important;
  }
  /* Light-first auth — dark ink on white. Dark chrome overrides below. */
  .al-gword-lead {
    color: #1e1e20;
    opacity: 1;
  }
  .al-root[data-theme="dark"] .al-gword-lead,
  .al-root.onb-sand-dark .al-gword-lead {
    color: #F5F5F7;
  }
  /* One H1 size — muted rest is gray ink, not a second title scale. */
  .al-gword-inner.al-hero-gray {
    color: #8891a0;
    opacity: 1;
  }
  .al-root[data-theme="dark"] .al-gword-inner.al-hero-gray,
  .al-root.onb-sand-dark .al-gword-inner.al-hero-gray {
    color: #8B909A;
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

  /* Username / workspace path — tight under H1 */
  .al-hero-secondary {
    display: block;
    width: 100%;
    margin-top: 4px;
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
