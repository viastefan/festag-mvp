'use client'

import { useEffect, useRef, useState } from 'react'
import TagroFieldAssist from '@/components/auth/TagroFieldAssist'
import { GOAL_EXAMPLES, INTENT_MIN_CHARS, INTENT_SETTLE_MS } from '@/lib/platform/master-onboarding'

type Props = {
  value: string
  onChange: (v: string) => void
  onReadyChange: (ready: boolean) => void
  onAdvance: () => void
}

/**
 * Master Intent stage — canvas 1:1:
 * settle → ready hint, Tagro chip stays in-field when panel closes.
 */
export default function IntentStage({ value, onChange, onReadyChange, onAdvance }: Props) {
  const [focused, setFocused] = useState(false)
  const [assistOpen, setAssistOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const [exampleIdx, setExampleIdx] = useState(0)
  const [exampleIn, setExampleIn] = useState(true)
  const areaRef = useRef<HTMLTextAreaElement | null>(null)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hasText = value.trim().length > 0
  const enough = value.trim().length >= INTENT_MIN_CHARS
  const showExample = !hasText
  const example = GOAL_EXAMPLES[exampleIdx % GOAL_EXAMPLES.length]
  /* Canvas: pad for chip whenever text exists (chip survives panel close). */
  const showChipPad = hasText

  useEffect(() => {
    return () => {
      if (blurTimer.current) clearTimeout(blurTimer.current)
      if (settleTimer.current) clearTimeout(settleTimer.current)
    }
  }, [])

  useEffect(() => {
    if (settleTimer.current) clearTimeout(settleTimer.current)
    if (!enough) {
      setReady(false)
      onReadyChange(false)
      return
    }
    setReady(false)
    onReadyChange(false)
    settleTimer.current = setTimeout(() => {
      setReady(true)
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

  /* Canvas: keep Tagro assist mounted while typing so the reopen chip can show. */
  useEffect(() => {
    if (hasText && !assistOpen) setAssistOpen(true)
  }, [hasText]) // eslint-disable-line react-hooks/exhaustive-deps

  function openAssist() {
    if (blurTimer.current) clearTimeout(blurTimer.current)
    setFocused(true)
    setAssistOpen(true)
  }

  function scheduleCloseAssist() {
    setFocused(false)
    /* Do not unmount Tagro — TagroFieldAssist collapses to the in-field chip. */
  }

  return (
    <>
      <h1 className="mob-h1">
        <span className="mob-h1-ink">Woran arbeitest du gerade?</span>
        <span className="mob-h1-muted">Tagro richtet deinen Workspace danach ein.</span>
      </h1>

      <div className="mob-intent-wrap">
        <div
          className={[
            'mob-intent-shell',
            hasText ? 'has-value' : '',
            focused ? 'is-focused' : '',
            showChipPad ? 'has-chip' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <textarea
            ref={areaRef}
            className={`mob-intent-area${hasText ? '' : ' is-empty'}`}
            value={value}
            rows={1}
            placeholder=""
            aria-label={`Ziel, z. B. ${example}`}
            onChange={(e) => onChange(e.target.value)}
            onFocus={openAssist}
            onClick={openAssist}
            onBlur={scheduleCloseAssist}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && enough) {
                e.preventDefault()
                onAdvance()
              }
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

        {ready ? (
          <p className="mob-ready-hint">Tagro hat genug — Enter oder wische weiter.</p>
        ) : null}

        <TagroFieldAssist
          open={assistOpen && hasText}
          onClose={() => {
            /* Keep mounted while text exists — chip is the collapsed state. */
            if (!hasText) setAssistOpen(false)
          }}
          anchorRef={areaRef}
          fieldValue={value}
          onFieldChange={onChange}
          contextLabel="Workspace-Ziel"
          surface="profile_facts"
          theme="light"
        />
      </div>
    </>
  )
}
