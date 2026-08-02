'use client'

/**
 * Single-line onboarding field — Name / Position.
 * Rotating gray examples + caret when empty. Skip when optional.
 */

import { useEffect, useRef, useState } from 'react'
import AuthGlassyHero from '@/components/auth/AuthGlassyHero'
import ContinueHint from '@/components/auth/master-onboarding/ContinueHint'
import { FIELD_SETTLE_MS } from '@/lib/platform/master-onboarding'

type Props = {
  animKey: string
  lead: string
  rest: string
  value: string
  onChange: (v: string) => void
  examples: readonly string[]
  ariaLabel: string
  minChars?: number
  /** When true, Skip is always available; Weiter only after settle with enough text. */
  optional?: boolean
  onAdvance: () => void
  onSkip?: () => void
  autoComplete?: string
  maxLength?: number
}

export default function TextFieldStage({
  animKey,
  lead,
  rest,
  value,
  onChange,
  examples,
  ariaLabel,
  minChars = 2,
  optional = false,
  onAdvance,
  onSkip,
  autoComplete = 'off',
  maxLength = 80,
}: Props) {
  const [focused, setFocused] = useState(false)
  const [settled, setSettled] = useState(false)
  const [exampleIdx, setExampleIdx] = useState(0)
  const [exampleIn, setExampleIn] = useState(true)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hasText = value.trim().length > 0
  const enough = value.trim().length >= minChars
  const showExample = !hasText
  const example = examples[exampleIdx % examples.length]
  const showContinue = settled && enough

  useEffect(() => {
    return () => {
      if (settleTimer.current) clearTimeout(settleTimer.current)
    }
  }, [])

  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    const focus = () => {
      try {
        el.focus({ preventScroll: true })
      } catch {
        el.focus()
      }
    }
    focus()
    const timers = [40, 120, 280].map((ms) => window.setTimeout(focus, ms))
    return () => timers.forEach((id) => window.clearTimeout(id))
  }, [])

  useEffect(() => {
    if (settleTimer.current) clearTimeout(settleTimer.current)
    setSettled(false)
    if (!enough) return
    settleTimer.current = setTimeout(() => setSettled(true), FIELD_SETTLE_MS)
    return () => {
      if (settleTimer.current) clearTimeout(settleTimer.current)
    }
  }, [value, enough])

  useEffect(() => {
    if (!showExample) return
    let fade: ReturnType<typeof setTimeout> | null = null
    const tick = window.setInterval(() => {
      setExampleIn(false)
      fade = setTimeout(() => {
        setExampleIdx((i) => (i + 1) % examples.length)
        setExampleIn(true)
      }, 420)
    }, 3800)
    return () => {
      window.clearInterval(tick)
      if (fade) clearTimeout(fade)
    }
  }, [showExample, examples.length])

  return (
    <>
      <AuthGlassyHero
        animKey={animKey}
        lead={lead}
        rest={rest}
        stacked
        className="mob-glassy-h1"
      />

      <div className="mob-intent-wrap">
        <div
          className={[
            'mob-intent-shell',
            'mob-intent-shell--field',
            'mob-intent-shell--single',
            hasText ? 'has-value' : '',
            focused ? 'is-focused' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <input
            ref={inputRef}
            className={`mob-intent-input${hasText ? '' : ' is-empty'}`}
            value={value}
            type="text"
            autoComplete={autoComplete}
            maxLength={maxLength}
            placeholder=""
            aria-label={`${ariaLabel}, z. B. ${example}`}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.preventDefault()
              if (showContinue) onAdvance()
              else if (optional && onSkip) onSkip()
            }}
          />
          {showExample ? (
            <span
              aria-hidden
              key={example}
              className={[
                'mob-intent-example',
                'mob-intent-example--single',
                exampleIn ? '' : 'is-out',
                focused ? 'is-focused' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {example}
            </span>
          ) : null}
          {!hasText ? <span aria-hidden className="mob-intent-caret mob-intent-caret--single" /> : null}
        </div>

        <div className="mob-ready-hint-slot mob-ready-hint-slot--intent" aria-live="polite">
          <ContinueHint show={showContinue} onContinue={onAdvance} />
          {optional && onSkip && !showContinue ? (
            <button type="button" className="mob-skip-link" onClick={onSkip}>
              Überspringen
            </button>
          ) : null}
        </div>
      </div>
    </>
  )
}
