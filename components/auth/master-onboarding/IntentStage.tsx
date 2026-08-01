'use client'

/**
 * Master Intent stage — 1:1 with festag-master-auth-onboarding canvas.
 * Stepped field grow, in-field Tagro chip, anchored assist panel (no portal jitter).
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import ContinueHint from '@/components/auth/master-onboarding/ContinueHint'
import TagroComposeIcon from '@/components/icons/TagroComposeIcon'
import { GOAL_EXAMPLES, INTENT_MIN_CHARS, INTENT_SETTLE_MS } from '@/lib/platform/master-onboarding'

type Props = {
  value: string
  onChange: (v: string) => void
  onReadyChange: (ready: boolean) => void
  onAdvance: () => void
}

const FIELD_H = 64
const FIELD_FONT = 15
const FIELD_PAD_X = 14
const FIELD_LINE_H = Math.round(FIELD_FONT * 1.45) // 22
const FIELD_GROW_STEP = FIELD_LINE_H * 2
const FIELD_PAD_Y = 14
/* Idle = 2 lines (taller than login email); stepped grow adds +2 lines. */
const INTENT_FIELD_MIN_H = FIELD_LINE_H * 2
const INTENT_FIELD_STEP_H = FIELD_GROW_STEP
const CARET_H = 18
const CARET_TOP = FIELD_PAD_Y + Math.round((FIELD_LINE_H - CARET_H) / 2)

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
  const [fieldH, setFieldH] = useState(INTENT_FIELD_MIN_H)

  const hasText = value.trim().length > 0
  const enough = value.trim().length >= INTENT_MIN_CHARS
  const showExample = !hasText
  const example = GOAL_EXAMPLES[exampleIdx % GOAL_EXAMPLES.length]
  /* Chip always available once the field is in play — toggles the assist panel. */
  const showTagroChip = focused || hasText || assistOpen
  const showTagroPanel = assistOpen && assistExpanded

  useEffect(() => {
    return () => {
      if (blurTimer.current) clearTimeout(blurTimer.current)
      if (settleTimer.current) clearTimeout(settleTimer.current)
      for (const id of tagroTimers.current) clearTimeout(id)
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

  function openAssist() {
    if (blurTimer.current) clearTimeout(blurTimer.current)
    setFocused(true)
    setAssistOpen(true)
    setAssistExpanded(true)
  }

  function toggleAssistPanel() {
    if (blurTimer.current) clearTimeout(blurTimer.current)
    setFocused(true)
    setAssistOpen(true)
    setAssistExpanded((v) => !v)
    setAssistMenu('none')
    requestAnimationFrame(() => areaRef.current?.focus())
  }

  function scheduleCloseAssist() {
    setFocused(false)
    setAssistMenu('none')
    if (blurTimer.current) clearTimeout(blurTimer.current)
    blurTimer.current = setTimeout(() => {
      setAssistOpen(false)
      setAssistExpanded(false)
    }, 180)
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
        <span className="mob-h1-ink">Worum geht es?</span>
        <span className="mob-h1-muted">Tagro richtet Workspace und Struktur danach aus.</span>
      </h1>

      <div className={`mob-intent-wrap${showTagroPanel ? ' has-tagro-panel' : ''}`}>
        <div
          className={[
            'mob-intent-shell',
            hasText ? 'has-value' : '',
            focused ? 'is-focused' : '',
            showTagroChip ? 'has-chip' : '',
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
            onBlur={scheduleCloseAssist}
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

          {showTagroChip ? (
            <button
              type="button"
              className={`mob-tagro-chip${showTagroPanel ? ' is-open' : ''}${tagroBusy ? ' is-busy' : ''}`}
              aria-label={showTagroPanel ? 'Tagro Assist schließen' : 'Tagro Assist öffnen'}
              aria-expanded={showTagroPanel}
              onMouseDown={(e) => e.preventDefault()}
              onClick={toggleAssistPanel}
            >
              <span className="mob-tagro-chip-ico" aria-hidden>
                <TagroComposeIcon size={15} />
              </span>
              <span className="mob-tagro-chip-label">Tagro</span>
            </button>
          ) : null}
        </div>

        <div className="mob-ready-hint-slot" aria-live="polite">
          <ContinueHint show={hasText && enough} />
        </div>

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
                  <TagroComposeIcon size={14} />
                </span>
                Tagro
              </span>
              <span className="mob-tagro-panel-title">Ziel schärfen</span>
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
