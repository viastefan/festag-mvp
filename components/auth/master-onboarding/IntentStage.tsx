'use client'

/**
 * Master Intent stage — stepped field grow + TagroFieldAssist
 * (auto-formulate loader → close to edit orb → draggable popup).
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import ContinueHint from '@/components/auth/master-onboarding/ContinueHint'
import TagroFieldAssist from '@/components/auth/TagroFieldAssist'
import { GOAL_EXAMPLES, INTENT_MIN_CHARS, INTENT_SETTLE_MS } from '@/lib/platform/master-onboarding'

type Props = {
  value: string
  onChange: (v: string) => void
  onReadyChange: (ready: boolean) => void
  onAdvance: () => void
}

/* Notebook field — +2px over login inputs, no chrome stroke. */
const FIELD_FONT = 17
const FIELD_PAD_X = 4
const FIELD_LINE_H = Math.round(FIELD_FONT * 1.45) // 25
const FIELD_GROW_STEP = FIELD_LINE_H * 2
const FIELD_PAD_Y = 6
/* Idle = 2 lines; stepped grow adds +2 lines. */
const INTENT_FIELD_MIN_H = FIELD_LINE_H * 2
const INTENT_FIELD_STEP_H = FIELD_GROW_STEP
const CARET_H = 20
const CARET_TOP = FIELD_PAD_Y + Math.round((FIELD_LINE_H - CARET_H) / 2)

export default function IntentStage({ value, onChange, onReadyChange, onAdvance }: Props) {
  const [focused, setFocused] = useState(false)
  const [assistOpen, setAssistOpen] = useState(false)
  const [exampleIdx, setExampleIdx] = useState(0)
  const [exampleIn, setExampleIn] = useState(true)

  const areaRef = useRef<HTMLTextAreaElement | null>(null)
  const shellRef = useRef<HTMLDivElement | null>(null)
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fieldHRef = useRef(INTENT_FIELD_MIN_H)
  const [fieldH, setFieldH] = useState(INTENT_FIELD_MIN_H)

  const hasText = value.trim().length > 0
  const enough = value.trim().length >= INTENT_MIN_CHARS
  const showExample = !hasText
  const example = GOAL_EXAMPLES[exampleIdx % GOAL_EXAMPLES.length]

  useEffect(() => {
    return () => {
      if (settleTimer.current) clearTimeout(settleTimer.current)
    }
  }, [])

  /* Grow only when content overflows — apply in layout effect so React style
     never paints a collapsed height between keystrokes. */
  useLayoutEffect(() => {
    const el = areaRef.current
    if (!el) return

    if (!value.trim()) {
      fieldHRef.current = INTENT_FIELD_MIN_H
    } else {
      el.style.height = `${fieldHRef.current}px`
      let guard = 0
      while (el.scrollHeight > el.clientHeight + 2 && guard < 8) {
        fieldHRef.current = Math.max(
          fieldHRef.current + INTENT_FIELD_STEP_H,
          el.scrollHeight + 4,
        )
        el.style.height = `${fieldHRef.current}px`
        guard += 1
      }
    }

    el.style.height = `${fieldHRef.current}px`
    el.style.overflow = 'hidden'
    setFieldH((prev) => (prev === fieldHRef.current ? prev : fieldHRef.current))
  }, [value])

  useEffect(() => {
    if (settleTimer.current) clearTimeout(settleTimer.current)
    if (!enough) {
      onReadyChange(false)
      return
    }
    onReadyChange(false)
    settleTimer.current = setTimeout(() => {
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

  function openAssist() {
    setFocused(true)
    setAssistOpen(true)
  }

  return (
    <>
      <h1 className="mob-h1">
        <span className="mob-h1-ink">Worum geht es?</span>
        <span className="mob-h1-muted">Tagro richtet Workspace und Struktur danach aus.</span>
      </h1>

      <div className={`mob-intent-wrap${assistOpen ? ' has-tagro-panel' : ''}`}>
        <div
          ref={shellRef}
          className={[
            'mob-intent-shell',
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
            rows={2}
            placeholder=""
            aria-label={`Ziel, z. B. ${example}`}
            onChange={(e) => onChange(e.target.value.replace(/\r?\n/g, ' '))}
            onFocus={openAssist}
            onClick={openAssist}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.preventDefault()
              if (enough) onAdvance()
            }}
            style={{
              minHeight: INTENT_FIELD_MIN_H,
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
              style={{ top: FIELD_PAD_Y, left: FIELD_PAD_X, right: FIELD_PAD_X }}
            >
              {example}
            </span>
          ) : null}
          {!hasText ? (
            <span
              aria-hidden
              className="mob-intent-caret"
              style={{ top: CARET_TOP, left: FIELD_PAD_X }}
            />
          ) : null}
        </div>

        <div className="mob-ready-hint-slot" aria-live="polite">
          <ContinueHint show={hasText && enough} onContinue={onAdvance} />
        </div>

        <TagroFieldAssist
          open={assistOpen}
          onClose={() => setAssistOpen(false)}
          anchorRef={shellRef}
          fieldValue={value}
          onFieldChange={onChange}
          contextLabel="Ziel schärfen"
          surface="project"
          theme="light"
          preferBelow
          autoFormulate
        />
      </div>
    </>
  )
}
