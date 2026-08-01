'use client'

/**
 * Master Intent stage — stroked input field, rotating examples + caret.
 * Tagro auto-formulates on a sentence (orb to the right). Weiter after 3s, lower.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import AuthGlassyHero from '@/components/auth/AuthGlassyHero'
import ContinueHint from '@/components/auth/master-onboarding/ContinueHint'
import TagroFieldAssist from '@/components/auth/TagroFieldAssist'
import { GOAL_EXAMPLES, INTENT_MIN_CHARS, INTENT_SETTLE_MS } from '@/lib/platform/master-onboarding'

type Props = {
  value: string
  onChange: (v: string) => void
  onReadyChange: (ready: boolean) => void
  onAdvance: () => void
}

const FIELD_FONT = 17
const FIELD_LINE_H = Math.round(FIELD_FONT * 1.45) // 25
const FIELD_GROW_STEP = FIELD_LINE_H
const FIELD_MIN_LINES = 3
const INTENT_FIELD_STEP_H = FIELD_GROW_STEP

export default function IntentStage({ value, onChange, onReadyChange, onAdvance }: Props) {
  const [focused, setFocused] = useState(false)
  const [assistOpen, setAssistOpen] = useState(false)
  const [settled, setSettled] = useState(false)
  const [exampleIdx, setExampleIdx] = useState(0)
  const [exampleIn, setExampleIn] = useState(true)

  const areaRef = useRef<HTMLTextAreaElement | null>(null)
  const shellRef = useRef<HTMLDivElement | null>(null)
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fieldHRef = useRef(FIELD_LINE_H * FIELD_MIN_LINES)
  const [fieldH, setFieldH] = useState(FIELD_LINE_H * FIELD_MIN_LINES)

  const hasText = value.trim().length > 0
  const enough = value.trim().length >= INTENT_MIN_CHARS
  const showExample = !hasText
  const example = GOAL_EXAMPLES[exampleIdx % GOAL_EXAMPLES.length]
  const showContinue = settled && enough

  useEffect(() => {
    return () => {
      if (settleTimer.current) clearTimeout(settleTimer.current)
    }
  }, [])

  /* Focus on mount so typing starts without a first tap (iOS needs short retries). */
  useEffect(() => {
    const el = areaRef.current
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

  useLayoutEffect(() => {
    const el = areaRef.current
    if (!el) return

    const textMin = FIELD_LINE_H * FIELD_MIN_LINES
    if (!value.trim()) {
      fieldHRef.current = textMin
    } else {
      el.style.height = `${textMin}px`
      fieldHRef.current = Math.max(textMin, el.scrollHeight + 2)
      let guard = 0
      while (el.scrollHeight > el.clientHeight + 2 && guard < 8) {
        fieldHRef.current = Math.max(
          fieldHRef.current + INTENT_FIELD_STEP_H,
          el.scrollHeight + 2,
        )
        el.style.height = `${fieldHRef.current}px`
        guard += 1
      }
    }

    el.style.height = `${fieldHRef.current}px`
    el.style.overflow = 'hidden'
    setFieldH((prev) => (prev === fieldHRef.current ? prev : fieldHRef.current))
  }, [value])

  /* Hide Weiter while typing; reveal only after 3s idle with enough text. */
  useEffect(() => {
    if (settleTimer.current) clearTimeout(settleTimer.current)
    setSettled(false)
    onReadyChange(false)
    if (!enough) return
    settleTimer.current = setTimeout(() => {
      setSettled(true)
      onReadyChange(true)
    }, INTENT_SETTLE_MS)
    return () => {
      if (settleTimer.current) clearTimeout(settleTimer.current)
    }
  }, [value, enough, onReadyChange])

  useEffect(() => {
    if (!showExample) return
    let fade: ReturnType<typeof setTimeout> | null = null
    const tick = window.setInterval(() => {
      setExampleIn(false)
      fade = setTimeout(() => {
        setExampleIdx((i) => (i + 1) % GOAL_EXAMPLES.length)
        setExampleIn(true)
      }, 420)
    }, 3800)
    return () => {
      window.clearInterval(tick)
      if (fade) clearTimeout(fade)
    }
  }, [showExample])

  useEffect(() => {
    if (!hasText && assistOpen) setAssistOpen(false)
  }, [hasText, assistOpen])

  return (
    <>
      <AuthGlassyHero
        animKey="intent"
        lead="Worum geht es?"
        rest="Tagro richtet Workspace und Struktur danach aus."
        stacked
        className="mob-glassy-h1"
      />

      <div
        className={[
          'mob-intent-wrap',
          hasText ? 'has-tagro-chip' : '',
          assistOpen ? 'has-tagro-panel' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div
          ref={shellRef}
          className={[
            'mob-intent-shell',
            'mob-intent-shell--field',
            hasText ? 'has-value' : '',
            focused ? 'is-focused' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <textarea
            ref={areaRef}
            className={`mob-intent-area${hasText ? '' : ' is-empty'}`}
            value={value}
            rows={FIELD_MIN_LINES}
            placeholder=""
            autoFocus
            aria-label={`Ziel, z. B. ${example}`}
            onChange={(e) => onChange(e.target.value.replace(/\r?\n/g, ' '))}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.preventDefault()
              if (showContinue) onAdvance()
            }}
            style={{
              minHeight: FIELD_LINE_H * FIELD_MIN_LINES,
              height: fieldH,
              lineHeight: `${FIELD_LINE_H}px`,
            }}
          />
          {showExample ? (
            <span
              aria-hidden
              key={example}
              className={[
                'mob-intent-example',
                exampleIn ? '' : 'is-out',
                focused ? 'is-focused' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {example}
            </span>
          ) : null}
          {!hasText ? <span aria-hidden className="mob-intent-caret" /> : null}
        </div>

        {hasText ? (
          <TagroFieldAssist
            open={assistOpen}
            onOpen={() => setAssistOpen(true)}
            onClose={() => setAssistOpen(false)}
            anchorRef={shellRef}
            fieldValue={value}
            onFieldChange={onChange}
            contextLabel="Ziel schärfen"
            surface="project"
            theme="light"
            preferBelow
            autoFormulate
            trigger="chip"
            bareChip
            chipAlign="beside"
          />
        ) : null}

        <div className="mob-ready-hint-slot mob-ready-hint-slot--intent" aria-live="polite">
          <ContinueHint show={showContinue} onContinue={onAdvance} />
        </div>
      </div>
    </>
  )
}
