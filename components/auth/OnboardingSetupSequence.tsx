'use client'

import { useEffect, useState } from 'react'

export type SetupSequenceVariant = 'dev' | 'client'

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
 * Calm narrative sentences — one hero-sized text element, word-by-word.
 * Order mirrors onboarding: profile → panel → lens → Tagro → ready.
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

const CLIENT_LINES = (position?: string) => [
  'Dein Profil wird gerade gespeichert.',
  'Wir richten deinen Workspace ein.',
  position?.trim()
    ? `Alles wird auf ${position.trim()} ausgerichtet.`
    : 'Dein Panel wird auf dich zugeschnitten.',
  'Tagro lernt deinen Kontext kennen.',
  'Dein Panel ist bereit.',
]

/** Dwell per sentence (type-in + brief hold). */
export const SETUP_STEP_MS = 1750
/** Pause after last sentence before departing. */
export const SETUP_HOLD_MS = 1200

export function setupSequenceDuration(stepCount = 5) {
  return stepCount * SETUP_STEP_MS + SETUP_HOLD_MS
}

export function setupStepsFor(
  variant: SetupSequenceVariant,
  positionHint?: string,
): string[] {
  return variant === 'dev' ? DEV_LINES(positionHint) : CLIENT_LINES(positionHint)
}

/**
 * Opaque sandy cover + one large typing hero sentence.
 * Never translucent — underlying chrome must not bleed through.
 */
export default function OnboardingSetupSequence({
  variant,
  active,
  departing = false,
  positionHint,
  className = '',
}: Props) {
  const lines = setupStepsFor(variant, positionHint)
  const [index, setIndex] = useState(-1)
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    if (!active) {
      setIndex(-1)
      setEntered(false)
      return
    }
    setIndex(-1)
    setEntered(false)
    const timers: number[] = []
    timers.push(window.setTimeout(() => setEntered(true), 80))
    timers.push(window.setTimeout(() => setIndex(0), 320))
    for (let i = 1; i < lines.length; i++) {
      timers.push(window.setTimeout(() => setIndex(i), 320 + i * SETUP_STEP_MS))
    }
    return () => {
      for (const id of timers) window.clearTimeout(id)
    }
  }, [active, lines.length, variant, positionHint])

  if (!active) return null

  const line = index >= 0 ? lines[Math.min(index, lines.length - 1)] : ''

  return (
    <>
      <style>{SETUP_CSS}</style>
      <div
        className={[
          'onb-setup',
          variant === 'dev' ? 'onb-setup--sand' : '',
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
        <div className="onb-setup-stage">
          {line ? (
            <p key={`${index}-${line}`} className="onb-setup-line">
              {line
                .trim()
                .split(/\s+/)
                .filter(Boolean)
                .map((word, i, arr) => (
                  <span key={`${i}-${word}`} className="onb-setup-word-clip">
                    <span
                      className="onb-setup-word"
                      style={{ animationDelay: `${i * 36}ms` }}
                    >
                      {word}
                      {i < arr.length - 1 ? '\u00A0' : ''}
                    </span>
                  </span>
                ))}
            </p>
          ) : null}
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

  .onb-setup-stage {
    width: min(340px, 100%);
    text-align: left;
  }

  .onb-setup-line {
    margin: 0;
    font-family: var(--font-aeonik), Aeonik, system-ui, sans-serif;
    font-size: 28px;
    font-weight: 400;
    line-height: 34px;
    letter-spacing: -0.012em;
    color: #E6E8EE;
  }
  .al-root:not([data-theme="dark"]):not(.onb-sand-dark) .onb-setup-line {
    color: #1e1e20;
  }

  .onb-setup-word-clip {
    display: inline-block;
    overflow: hidden;
    vertical-align: top;
    padding-bottom: 0.12em;
    margin-bottom: -0.12em;
  }
  .onb-setup-word {
    display: inline-block;
    animation: onbSetupWordIn .58s cubic-bezier(.16, 1, .3, 1) both;
    will-change: transform, filter, opacity;
  }

  @keyframes onbSetupWordIn {
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

  @media (max-width: 768px) {
    .onb-setup-line {
      font-size: 28px;
      line-height: 34px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .onb-setup,
    .onb-setup-word {
      transition: none !important;
      animation: none !important;
      filter: none !important;
    }
  }
`
