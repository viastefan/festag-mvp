'use client'

/**
 * Master Intent stage — 1:1 with festag-master-auth-onboarding canvas.
 * Stepped field grow, in-field Tagro chip, anchored assist panel (no portal jitter).
 */

import { useEffect, useRef, useState } from 'react'
import { GOAL_EXAMPLES, INTENT_MIN_CHARS, INTENT_SETTLE_MS } from '@/lib/platform/master-onboarding'

type Props = {
  value: string
  onChange: (v: string) => void
  onReadyChange: (ready: boolean) => void
  onAdvance: () => void
}

const FIELD_H = 46
const FIELD_FONT = 15
const FIELD_PAD_X = 14
const FIELD_LINE_H = Math.round(FIELD_FONT * 1.45) // 22
const FIELD_GROW_STEP = FIELD_LINE_H * 2
const FIELD_PAD_Y = Math.max(0, Math.round((FIELD_H - 2 - FIELD_LINE_H) / 2))
const INTENT_FIELD_MIN_H = FIELD_LINE_H
const INTENT_FIELD_STEP_H = FIELD_GROW_STEP

type TagroMode = 'polish' | 'summary' | 'detail'
type AssistAuto = 'Auto' | 'Formell' | 'Sprachlich'

const MODES: Array<{ id: TagroMode; label: string }> = [
  { id: 'polish', label: 'Besser schreiben' },
  { id: 'summary', label: 'Zusammenfassen' },
  { id: 'detail', label: 'Detaillierter' },
]

export default function IntentStage({ value, onChange, onReadyChange, onAdvance }: Props) {
  const [focused, setFocused] = useState(false)
  const [assistOpen, setAssistOpen] = useState(false)
  const [assistExpanded, setAssistExpanded] = useState(true)
  const [assistMenu, setAssistMenu] = useState<'none' | 'auto'>('none')
  const [assistAuto, setAssistAuto] = useState<AssistAuto>('Auto')
  const [tagroBusy, setTagroBusy] = useState(false)
  const [tagroMode, setTagroMode] = useState<TagroMode | null>(null)
  const [ready, setReady] = useState(false)
  const [exampleIdx, setExampleIdx] = useState(0)
  const [exampleIn, setExampleIn] = useState(true)

  const areaRef = useRef<HTMLTextAreaElement | null>(null)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tagroTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const fieldHRef = useRef(INTENT_FIELD_MIN_H)
  const prevHasText = useRef(false)

  const hasText = value.trim().length > 0
  const enough = value.trim().length >= INTENT_MIN_CHARS
  const showExample = !hasText
  const example = GOAL_EXAMPLES[exampleIdx % GOAL_EXAMPLES.length]
  const showTagroChip = hasText && !assistExpanded
  const showTagroPanel = assistOpen && assistExpanded
  const fieldNeedsChipPad = showTagroChip

  useEffect(() => {
    return () => {
      if (blurTimer.current) clearTimeout(blurTimer.current)
      if (settleTimer.current) clearTimeout(settleTimer.current)
      for (const id of tagroTimers.current) clearTimeout(id)
    }
  }, [])

  /* Canvas stepped grow — jump +2 lines of headroom when content hits the floor. */
  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    el.style.height = 'auto'
    const needed = el.scrollHeight
    let next = fieldHRef.current

    if (needed > fieldHRef.current - 4) {
      next = Math.max(needed + INTENT_FIELD_STEP_H, fieldHRef.current + INTENT_FIELD_STEP_H)
    } else if (needed <= INTENT_FIELD_MIN_H) {
      next = INTENT_FIELD_MIN_H
    } else if (needed < fieldHRef.current - INTENT_FIELD_STEP_H - 8) {
      const steps = Math.max(0, Math.ceil((needed - INTENT_FIELD_MIN_H) / INTENT_FIELD_STEP_H))
      next = INTENT_FIELD_MIN_H + steps * INTENT_FIELD_STEP_H
    }

    fieldHRef.current = next
    el.style.height = `${next}px`
    el.style.overflow = 'hidden'
    requestAnimationFrame(() => {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    })
  }, [value])

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

  /* Collapse panel when typing starts — chip remains for reopen. */
  useEffect(() => {
    const startedTyping = hasText && !prevHasText.current
    prevHasText.current = hasText
    if (!hasText) {
      setAssistExpanded(true)
      return
    }
    if (assistOpen && startedTyping) {
      setAssistExpanded(false)
      setAssistMenu('none')
    }
  }, [hasText, assistOpen])

  function openAssist() {
    if (blurTimer.current) clearTimeout(blurTimer.current)
    setFocused(true)
    setAssistOpen(true)
    if (!hasText) setAssistExpanded(true)
  }

  function reopenAssistPanel() {
    if (blurTimer.current) clearTimeout(blurTimer.current)
    setAssistOpen(true)
    setAssistExpanded(true)
    setAssistMenu('none')
    setFocused(true)
    requestAnimationFrame(() => areaRef.current?.focus())
  }

  function scheduleCloseAssist() {
    setFocused(false)
    setAssistMenu('none')
    if (blurTimer.current) clearTimeout(blurTimer.current)
    blurTimer.current = setTimeout(() => {
      setAssistOpen(false)
      if (hasText) setAssistExpanded(false)
      else setAssistExpanded(true)
    }, 160)
  }

  function runTagroMode(mode: TagroMode) {
    const raw = value.trim()
    if (!raw || tagroBusy) return
    for (const id of tagroTimers.current) clearTimeout(id)
    tagroTimers.current = []
    setTagroMode(mode)
    setTagroBusy(true)
    tagroTimers.current.push(
      setTimeout(() => {
        let next = raw
        if (mode === 'summary') {
          next = raw.length > 160 ? `${raw.slice(0, 156).trim()}…` : raw
        } else if (mode === 'detail') {
          next = /workspace|festag|tagro/i.test(raw)
            ? raw
            : `${raw} Tagro richtet Workspace, Module und Anbindungen danach ein.`
        } else if (assistAuto === 'Sprachlich') {
          next = raw.replace(/\s+/g, ' ').trim()
          if (!/[.!?]$/.test(next)) next = `${next}.`
          next = next.charAt(0).toUpperCase() + next.slice(1)
        } else {
          next = raw.replace(/\s+/g, ' ').replace(/\s*,\s*/g, ', ').trim()
          next = next.charAt(0).toUpperCase() + next.slice(1)
          if (!/[.!?]$/.test(next)) next = `${next}.`
        }
        onChange(next)
        setTagroBusy(false)
        setTagroMode(null)
      }, 900),
    )
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
            fieldNeedsChipPad ? 'has-chip' : '',
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
            style={{
              minHeight: FIELD_LINE_H,
              height: FIELD_LINE_H,
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
              style={{ top: FIELD_PAD_Y + Math.round((FIELD_LINE_H - 18) / 2), left: FIELD_PAD_X }}
            />
          ) : null}

          {showTagroChip ? (
            <button
              type="button"
              className="mob-tagro-chip"
              aria-label="Tagro Assist öffnen"
              onMouseDown={(e) => e.preventDefault()}
              onClick={reopenAssistPanel}
            >
              <span className="mob-tagro-chip-ico" aria-hidden>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M11.4 2.6a1.45 1.45 0 0 1 2 2L5.7 12.3 2.5 13.5l1.2-3.2L11.4 2.6Z"
                    stroke="currentColor"
                    strokeWidth="1.35"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              Tagro
            </button>
          ) : null}
        </div>

        {ready && !showTagroPanel ? (
          <p className="mob-ready-hint">Tagro hat genug — Enter oder wische weiter.</p>
        ) : null}

        {showTagroPanel ? (
          <div
            className="mob-tagro-panel"
            role="dialog"
            aria-label="Tagro Assist"
            onMouseDown={(e) => e.preventDefault()}
          >
            <div className="mob-tagro-panel-head">
              <span className="mob-tagro-badge">
                <span className="mob-tagro-chip-ico" aria-hidden>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M11.4 2.6a1.45 1.45 0 0 1 2 2L5.7 12.3 2.5 13.5l1.2-3.2L11.4 2.6Z"
                      stroke="currentColor"
                      strokeWidth="1.35"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                Workspace-Ziel
              </span>
              {tagroBusy ? <span className="mob-tagro-busy">Verdichtet…</span> : null}
            </div>

            <div className="mob-tagro-modes">
              <div className="mob-tagro-auto-wrap">
                <button
                  type="button"
                  className={`mob-tagro-auto${assistMenu === 'auto' ? ' is-open' : ''}`}
                  disabled={tagroBusy}
                  onClick={() => setAssistMenu((m) => (m === 'auto' ? 'none' : 'auto'))}
                >
                  {assistAuto}
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden>
                    <path
                      d="M3 4.5 6 7.5 9 4.5"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                {assistMenu === 'auto' ? (
                  <ul className="mob-tagro-auto-menu">
                    {(
                      [
                        { id: 'Auto' as const, hint: 'Tagro wählt passend' },
                        { id: 'Formell' as const, hint: 'Klar, geschäftlich' },
                        { id: 'Sprachlich' as const, hint: 'Natürlich, gesprochen' },
                      ] as const
                    ).map((opt) => (
                      <li key={opt.id}>
                        <button
                          type="button"
                          className={assistAuto === opt.id ? 'is-on' : ''}
                          onClick={() => {
                            setAssistAuto(opt.id)
                            setAssistMenu('none')
                          }}
                        >
                          <span className="mob-tagro-auto-label">{opt.id}</span>
                          <span className="mob-tagro-auto-hint">{opt.hint}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`mob-tagro-mode${tagroMode === m.id ? ' is-on' : ''}`}
                  disabled={tagroBusy || !hasText}
                  onClick={() => runTagroMode(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </>
  )
}
