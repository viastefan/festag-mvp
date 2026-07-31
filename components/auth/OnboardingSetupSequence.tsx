'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

export type SetupSequenceVariant = 'dev' | 'client' | 'build'

type Props = {
  variant: SetupSequenceVariant
  /** When true, sequence plays. */
  active: boolean
  /** Soft exit before navigation. */
  departing?: boolean
  /** Optional role/position for the tailored line. */
  positionHint?: string
  className?: string
}

/**
 * Spotify-lyrics style setup: ~3 visible lines, active line loads
 * letter-by-letter (gray → white), past exits up/fade, next rises from below.
 */
const DEV_LINES = (position?: string) => [
  'Dein Profil wird gerade gespeichert.',
  'Wir richten dein Execution Panel ein.',
  position?.trim()
    ? `Alles wird auf ${position.trim()} ausgerichtet.`
    : 'Dein Schwerpunkt wird übernommen.',
  'Tagro lernt deinen Kontext kennen.',
  'Dein Dev ist bereit.',
]

/** Build Projects — dusk sand chrome, calm workspace copy. */
const BUILD_LINES = (position?: string) => [
  'Dein Profil wird gerade gespeichert.',
  'Wir richten deinen Workspace ein.',
  position?.trim()
    ? `Alles wird auf ${position.trim()} ausgerichtet.`
    : 'Dein Workspace wird auf dich zugeschnitten.',
  'Tagro lernt deinen Kontext kennen.',
  'Dein Workspace ist bereit.',
]

/** Per-line dwell: letter fill + short hold. */
export const SETUP_STEP_MS = 2400
/** Pause after last sentence before departing. */
export const SETUP_HOLD_MS = 900
/** Line slot height (px) — keep in sync with CSS. */
const LINE_SLOT = 42

export function setupSequenceDuration(stepCount = 5) {
  return stepCount * SETUP_STEP_MS + SETUP_HOLD_MS
}

export function setupStepsFor(
  variant: SetupSequenceVariant,
  positionHint?: string,
): string[] {
  return variant === 'dev' ? DEV_LINES(positionHint) : BUILD_LINES(positionHint)
}

function charsOf(line: string) {
  return Array.from(line)
}

export default function OnboardingSetupSequence({
  variant,
  active,
  departing = false,
  positionHint,
  className = '',
}: Props) {
  const lines = useMemo(
    () => setupStepsFor(variant, positionHint),
    [variant, positionHint],
  )
  const [index, setIndex] = useState(0)
  const [entered, setEntered] = useState(false)
  const [litCount, setLitCount] = useState(0)
  const fillRaf = useRef(0)
  const lineStart = useRef(0)

  useEffect(() => {
    if (!active) {
      setIndex(0)
      setEntered(false)
      setLitCount(0)
      return
    }
    setIndex(0)
    setLitCount(0)
    setEntered(false)
    const timers: number[] = []
    timers.push(window.setTimeout(() => setEntered(true), 80))
    for (let i = 1; i < lines.length; i++) {
      timers.push(window.setTimeout(() => setIndex(i), i * SETUP_STEP_MS))
    }
    return () => {
      for (const id of timers) window.clearTimeout(id)
    }
  }, [active, lines])

  /* Letter-by-letter “load” fill on the active line. */
  useEffect(() => {
    if (!active || !entered) return
    const text = lines[Math.min(index, lines.length - 1)] || ''
    const total = charsOf(text).length
    if (total === 0) {
      setLitCount(0)
      return
    }
    const fillMs = Math.min(SETUP_STEP_MS * 0.78, Math.max(900, total * 42))
    lineStart.current = performance.now()
    setLitCount(0)
    cancelAnimationFrame(fillRaf.current)

    const tick = (now: number) => {
      const t = Math.min(1, (now - lineStart.current) / fillMs)
      const eased = 1 - (1 - t) * (1 - t)
      setLitCount(Math.floor(eased * total))
      if (t < 1) fillRaf.current = requestAnimationFrame(tick)
      else setLitCount(total)
    }
    fillRaf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(fillRaf.current)
  }, [active, entered, index, lines])

  if (!active) return null

  return (
    <>
      <style>{SETUP_CSS}</style>
      <div
        className={[
          'onb-setup',
          variant === 'dev' || variant === 'build' ? 'onb-setup--sand' : '',
          entered ? 'is-entered' : '',
          departing ? 'is-departing' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        aria-live="polite"
        aria-busy={!departing}
        role="status"
      >
        <div className="onb-setup-lyrics" aria-hidden={false}>
          {lines.map((text, i) => {
            const offset = i - index
            /* Keep a small window mounted so enter/exit can animate. */
            if (offset < -2 || offset > 2) return null
            const isCurrent = offset === 0
            const chars = charsOf(text)
            const role =
              offset <= -1 ? 'past' : offset === 0 ? 'current' : 'next'
            return (
              <p
                key={`line-${i}`}
                className={`onb-setup-lyric onb-setup-lyric--${role}`}
                style={{
                  transform: `translate3d(0, ${offset * LINE_SLOT}px, 0)`,
                  opacity:
                    offset <= -2
                      ? 0
                      : offset === -1
                        ? 0.42
                        : offset === 0
                          ? 1
                          : offset === 1
                            ? 0.42
                            : 0,
                }}
              >
                {chars.map((ch, ci) => (
                  <span
                    key={ci}
                    className={`onb-setup-char${
                      isCurrent && ci < litCount ? ' is-lit' : ''
                    }`}
                  >
                    {ch === ' ' ? '\u00A0' : ch}
                  </span>
                ))}
              </p>
            )
          })}
        </div>
      </div>
    </>
  )
}

const SETUP_CSS = `
  .onb-setup {
    position: fixed;
    inset: 0;
    z-index: 40;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 36px 32px;
    pointer-events: none;
    background: #070708;
    opacity: 0;
    transform: scale(1.01);
    transition:
      opacity .42s cubic-bezier(.22,1,.36,1),
      transform .55s cubic-bezier(.22,1,.36,1);
  }
  .onb-setup.is-entered {
    opacity: 1;
    transform: scale(1);
  }
  .onb-setup.is-departing {
    opacity: 0;
    transform: scale(0.994) translateY(-6px);
    transition:
      opacity .5s cubic-bezier(.4,0,.2,1),
      transform .5s cubic-bezier(.4,0,.2,1);
  }

  .onb-setup--sand {
    background:
      radial-gradient(ellipse 100% 52% at 50% -6%, rgba(91, 100, 125, 0.14), transparent 58%),
      radial-gradient(ellipse 95% 50% at 50% 108%, rgba(91, 100, 125, 0.12), rgba(70, 78, 102, 0.045) 48%, transparent 74%),
      linear-gradient(180deg, #10121A 0%, #0C0D12 46%, #0E1018 100%);
  }

  .onb-setup-lyrics {
    position: relative;
    width: min(340px, 100%);
    height: ${LINE_SLOT * 3}px;
    overflow: hidden;
    text-align: left;
    mask-image: linear-gradient(
      to bottom,
      transparent 0%,
      #000 14%,
      #000 86%,
      transparent 100%
    );
    -webkit-mask-image: linear-gradient(
      to bottom,
      transparent 0%,
      #000 14%,
      #000 86%,
      transparent 100%
    );
  }

  .onb-setup-lyric {
    position: absolute;
    left: 0;
    right: 0;
    top: ${LINE_SLOT}px; /* middle slot = current */
    margin: 0;
    font-family: var(--font-aeonik), Aeonik, system-ui, sans-serif;
    font-size: 26px;
    font-weight: 400;
    line-height: 32px;
    letter-spacing: -0.012em;
    color: rgba(230, 232, 238, 0.28);
    transition:
      opacity .58s cubic-bezier(.22,1,.36,1),
      transform .58s cubic-bezier(.22,1,.36,1);
    will-change: transform, opacity;
  }

  .onb-setup-lyric--past {
    filter: none;
  }

  .onb-setup-lyric--current {
    color: rgba(230, 232, 238, 0.28);
  }

  .onb-setup-lyric--next {
    color: rgba(230, 232, 238, 0.28);
  }

  .onb-setup-char {
    color: rgba(230, 232, 238, 0.28);
    transition: color .07s linear;
  }
  .onb-setup-char.is-lit {
    color: #E6E8EE;
  }

  .al-root:not([data-theme="dark"]):not(.onb-sand-dark) .onb-setup-lyric,
  .al-root:not([data-theme="dark"]):not(.onb-sand-dark) .onb-setup-char {
    color: rgba(30, 30, 32, 0.28);
  }
  .al-root:not([data-theme="dark"]):not(.onb-sand-dark) .onb-setup-char.is-lit {
    color: #1e1e20;
  }

  @media (max-width: 768px) {
    .onb-setup-lyric {
      font-size: 26px;
      line-height: 32px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .onb-setup,
    .onb-setup-lyric,
    .onb-setup-char {
      transition: none !important;
      animation: none !important;
    }
    .onb-setup-char { color: #E6E8EE !important; }
  }
`
