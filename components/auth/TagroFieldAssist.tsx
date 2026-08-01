'use client'

/**
 * Tagro field assist — companion bubble for a real input/textarea.
 *
 * Contract (keep forever):
 * - User types in the anchored field, never in this popup.
 * - Popup opens only when the field is focused/clicked.
 * - After typing settles (~1.5s), Tagro auto-formulates with a visible loader.
 * - Close (X) collapses to a small edit icon inside the field (bottom-right).
 * - Edit icon reopens the draggable popup. Outside-click collapses to the icon.
 * - Modes rewrite the field text (formell / sprachlich) and insert via Tagro.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowUp,
  CaretDown,
  Microphone,
  MicrophoneSlash,
  PencilSimple,
  X,
} from '@phosphor-icons/react'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'

export type TagroAssistModel = 'auto' | '2.1' | '2.2'
export type TagroAssistTone = 'formal' | 'conversational'

const MODEL_KEY = 'festag_tagro_assist_model'
const TONE_KEY = 'festag_tagro_assist_tone'

const MODEL_OPTIONS: Array<{ id: TagroAssistModel; label: string; hint: string }> = [
  { id: 'auto', label: 'Auto', hint: 'Tagro wählt passend' },
  { id: '2.1', label: 'tagro 2.1', hint: 'Knapp' },
  { id: '2.2', label: 'tagro 2.2', hint: 'Etwas ausführlicher' },
]

const TONE_OPTIONS: Array<{ id: TagroAssistTone; label: string; hint: string }> = [
  { id: 'formal', label: 'Formell', hint: 'Klar, geschäftlich' },
  { id: 'conversational', label: 'Sprachlich', hint: 'Natürlich, gesprochen' },
]

const BUBBLE_H = 64
const GAP = 6
const EDGE = 12
/** Collapsed reopen — small edit orb inside the field, bottom-right. */
const CHIP_SIZE = 28
const CHIP_INSET = 8
/** After typing stops, start formulate. */
const FORMULATE_SETTLE_MS = 700
/** Keep the loader visible so “Tagro formuliert” is readable. */
const FORMULATE_MIN_MS = 1500

type Props = {
  open: boolean
  onClose: () => void
  anchorRef: React.RefObject<HTMLElement | null>
  /** Live value from the real field — popup never owns a separate draft. */
  fieldValue: string
  /** Write speech / polished text back into the field. */
  onFieldChange: (value: string) => void
  contextLabel?: string
  /** project = Projektabsicht; profile_facts = Über dich. */
  surface?: 'project' | 'profile_facts'
  theme?: 'light' | 'dark' | 'read'
  /** Prefer sitting just under the field (onboarding intent). */
  preferBelow?: boolean
  /** Auto-formulate when typing settles (default true). */
  autoFormulate?: boolean
}

type Pos = { top: number; left: number; width: number }

function readStoredModel(): TagroAssistModel {
  if (typeof window === 'undefined') return 'auto'
  try {
    const v = localStorage.getItem(MODEL_KEY)
    if (v === 'auto' || v === '2.1' || v === '2.2') return v
  } catch { /* noop */ }
  return 'auto'
}

function readStoredTone(): TagroAssistTone {
  if (typeof window === 'undefined') return 'formal'
  try {
    const v = localStorage.getItem(TONE_KEY)
    if (v === 'formal' || v === 'conversational') return v
  } catch { /* noop */ }
  return 'formal'
}

function resolveTheme(theme?: 'light' | 'dark' | 'read'): 'light' | 'dark' | 'read' {
  if (theme === 'light' || theme === 'dark' || theme === 'read') return theme
  if (typeof document === 'undefined') return 'light'
  const attr = document.documentElement.getAttribute('data-theme')
  if (attr === 'dark' || attr === 'classic-dark') return 'dark'
  if (attr === 'read') return 'read'
  return 'light'
}

function placeNearAnchor(
  anchor: DOMRect,
  width: number,
  height: number,
  preferBelow = false,
): Pos {
  const vw = window.innerWidth
  const vh = window.innerHeight
  let left = Math.max(EDGE, Math.min(anchor.left + 4, vw - width - EDGE))

  const spaceAbove = anchor.top - EDGE
  const spaceBelow = vh - anchor.bottom - EDGE

  let top: number
  const belowOk = spaceBelow >= height + GAP
  const aboveOk = spaceAbove >= height + GAP
  if (preferBelow && belowOk) {
    top = anchor.bottom + GAP
  } else if (!preferBelow && aboveOk) {
    top = anchor.top - height - GAP
  } else if (belowOk) {
    top = anchor.bottom + GAP
  } else if (aboveOk) {
    top = anchor.top - height - GAP
  } else {
    top = spaceBelow >= spaceAbove
      ? Math.min(anchor.bottom + GAP, vh - height - EDGE)
      : Math.max(EDGE, anchor.top - height - GAP)
  }
  top = Math.max(EDGE, Math.min(top, vh - height - EDGE))
  return { top, left, width }
}

export default function TagroFieldAssist({
  open,
  onClose,
  anchorRef,
  fieldValue,
  onFieldChange,
  contextLabel = 'Onboarding',
  surface = 'project',
  theme: themeProp,
  preferBelow = false,
  autoFormulate = true,
}: Props) {
  const [busy, setBusy] = useState(false)
  /** True while the settle timer is counting down before auto-formulate. */
  const [awaiting, setAwaiting] = useState(false)
  const [error, setError] = useState('')
  const [pos, setPos] = useState<Pos | null>(null)
  const [model, setModel] = useState<TagroAssistModel>('auto')
  const [tone, setTone] = useState<TagroAssistTone>('formal')
  const [menu, setMenu] = useState<'none' | 'tone' | 'model'>('none')
  const [chrome, setChrome] = useState<'light' | 'dark' | 'read'>('light')
  const [userMoved, setUserMoved] = useState(false)
  /** Full panel vs compact edit orb inside the field. */
  const [expanded, setExpanded] = useState(true)
  const bubbleRef = useRef<HTMLDivElement>(null)
  const baseRef = useRef('')
  const dragRef = useRef<{ ox: number; oy: number; sx: number; sy: number } | null>(null)
  const formulatedForRef = useRef('')
  const formulateGenRef = useRef(0)
  const busyRef = useRef(false)
  const hasText = fieldValue.trim().length > 0
  const formulating = busy || awaiting
  /** Only appear once there is text (or while formulating) — never an empty “Tagro” button. */
  const showAssist = open && (hasText || formulating)
  const compact = showAssist && hasText && !expanded && !formulating

  const { supported: micOk, listening, start, stop } = useSpeechRecognition({
    lang: 'de-DE',
    onResult: (chunk, isFinal) => {
      if (isFinal) {
        const next = `${baseRef.current} ${chunk}`.replace(/\s+/g, ' ').trim()
        baseRef.current = next
        onFieldChange(next)
      } else {
        onFieldChange(`${baseRef.current} ${chunk}`.replace(/\s+/g, ' ').trim())
      }
    },
  })

  const reposition = useCallback(() => {
    const el = anchorRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    if (compact) {
      setPos({
        top: Math.max(EDGE, r.bottom - CHIP_SIZE - CHIP_INSET),
        left: Math.max(EDGE, r.right - CHIP_SIZE - CHIP_INSET),
        width: CHIP_SIZE,
      })
      return
    }
    if (userMoved) return
    const width = Math.min(320, Math.max(240, r.width * 0.88))
    const measured = bubbleRef.current?.getBoundingClientRect().height || BUBBLE_H
    setPos(placeNearAnchor(r, width, measured, preferBelow))
  }, [anchorRef, userMoved, compact, preferBelow])

  useEffect(() => {
    busyRef.current = busy
  }, [busy])

  useEffect(() => {
    if (!open) {
      setExpanded(true)
      formulatedForRef.current = ''
      return
    }
    if (!hasText) {
      setExpanded(true)
      formulatedForRef.current = ''
    }
  }, [open, hasText])

  /* Keep typing clear of the in-field edit orb. */
  useEffect(() => {
    const el = anchorRef.current
    if (!el) return
    if (compact) el.classList.add('is-tagro-chip')
    else el.classList.remove('is-tagro-chip')
    return () => {
      el.classList.remove('is-tagro-chip')
    }
  }, [compact, anchorRef])

  useEffect(() => {
    if (!open) return
    setError('')
    setModel(readStoredModel())
    setTone(readStoredTone())
    setMenu('none')
    setUserMoved(false)
    setChrome(resolveTheme(themeProp))
    baseRef.current = fieldValue
    reposition()
    const t = window.setTimeout(() => reposition(), 40)
    return () => window.clearTimeout(t)
  }, [open, themeProp, reposition]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    setChrome(resolveTheme(themeProp))
  }, [open, themeProp])

  useEffect(() => {
    if (!showAssist) return
    if (userMoved && !compact) return
    const id = window.requestAnimationFrame(() => reposition())
    return () => window.cancelAnimationFrame(id)
  }, [showAssist, menu, error, userMoved, compact, expanded, formulating, reposition])

  const collapseToChip = useCallback(() => {
    setMenu('none')
    setUserMoved(false)
    if (listening) stop()
    if (hasText) {
      setExpanded(false)
      return
    }
    onClose()
  }, [hasText, listening, onClose, stop])

  useEffect(() => {
    if (!showAssist) return
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (menu !== 'none') setMenu('none')
      else if (expanded) collapseToChip()
      else onClose()
    }
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node
      if (bubbleRef.current?.contains(target)) return
      if (anchorRef.current?.contains(target)) return
      /* Outside → shrink to edit orb (keep session), never hard-dismiss mid-type. */
      if (hasText && expanded) collapseToChip()
      else if (!hasText) onClose()
    }
    function onResize() {
      if (compact || !userMoved) reposition()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onResize, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize, true)
    }
  }, [
    showAssist,
    onClose,
    menu,
    userMoved,
    reposition,
    anchorRef,
    expanded,
    hasText,
    compact,
    collapseToChip,
  ])

  const runFormulate = useCallback(async (raw: string, opts?: { force?: boolean }) => {
    const text = raw.trim()
    if (!text || busyRef.current) return
    if (!opts?.force && text === formulatedForRef.current) return
    if (listening) stop()

    const gen = ++formulateGenRef.current
    const started = Date.now()
    setBusy(true)
    setError('')
    setExpanded(true)

    try {
      const res = await fetch('/api/onboarding/tagro-project', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, model, tone, surface }),
      })
      const data = await res.json().catch(() => null)
      const elapsed = Date.now() - started
      const wait = Math.max(0, FORMULATE_MIN_MS - elapsed)
      if (wait > 0) await new Promise((r) => window.setTimeout(r, wait))
      if (gen !== formulateGenRef.current) return

      if (!res.ok || !data?.ok) {
        setError('Gerade nicht möglich — Text bleibt unverändert.')
        return
      }
      const next = String(data.description || text).slice(0, 500)
      formulatedForRef.current = next
      onFieldChange(next)
      baseRef.current = next
      anchorRef.current?.focus?.()
    } catch {
      if (gen !== formulateGenRef.current) return
      setError('Gerade nicht möglich — Text bleibt unverändert.')
    } finally {
      if (gen === formulateGenRef.current) setBusy(false)
    }
  }, [anchorRef, listening, model, onFieldChange, stop, surface, tone])

  /* Auto-formulate after typing settles — spinner shows while waiting + during API. */
  useEffect(() => {
    if (!autoFormulate || !open || !expanded || !hasText || busy) {
      setAwaiting(false)
      return
    }
    const text = fieldValue.trim()
    if (!text || text === formulatedForRef.current) {
      setAwaiting(false)
      return
    }
    setAwaiting(true)
    const t = window.setTimeout(() => {
      setAwaiting(false)
      void runFormulate(text)
    }, FORMULATE_SETTLE_MS)
    return () => {
      window.clearTimeout(t)
      setAwaiting(false)
    }
  }, [autoFormulate, open, expanded, hasText, fieldValue, busy, runFormulate])

  function pickModel(next: TagroAssistModel) {
    setModel(next)
    setMenu('none')
    try { localStorage.setItem(MODEL_KEY, next) } catch { /* noop */ }
  }

  function pickTone(next: TagroAssistTone) {
    setTone(next)
    setMenu('none')
    try { localStorage.setItem(TONE_KEY, next) } catch { /* noop */ }
  }

  function toggleMic() {
    if (listening) {
      stop()
      return
    }
    baseRef.current = fieldValue.trim()
    start()
  }

  function onDragStart(e: React.PointerEvent) {
    if (e.button !== 0 || !pos || compact || busy) return
    e.preventDefault()
    e.stopPropagation()
    setMenu('none')
    dragRef.current = { ox: e.clientX, oy: e.clientY, sx: pos.left, sy: pos.top }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onDragMove(e: React.PointerEvent) {
    const d = dragRef.current
    if (!d || !pos || compact) return
    const width = pos.width
    const height = bubbleRef.current?.getBoundingClientRect().height || BUBBLE_H
    const left = Math.max(EDGE, Math.min(d.sx + (e.clientX - d.ox), window.innerWidth - width - EDGE))
    const top = Math.max(EDGE, Math.min(d.sy + (e.clientY - d.oy), window.innerHeight - height - EDGE))
    setUserMoved(true)
    setPos({ top, left, width })
  }

  function onDragEnd(e: React.PointerEvent) {
    dragRef.current = null
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch { /* noop */ }
  }

  function reopenFromChip() {
    setUserMoved(false)
    setExpanded(true)
    setError('')
    requestAnimationFrame(() => reposition())
  }

  if (!showAssist || !pos || typeof document === 'undefined') return null

  const modelLabel = MODEL_OPTIONS.find(o => o.id === model)?.label || 'Auto'
  const toneLabel = TONE_OPTIONS.find(o => o.id === tone)?.label || 'Formell'
  const canApply = Boolean(fieldValue.trim()) && !busy
  const chromeClass = chrome === 'dark' ? 'dark' : 'light'

  return createPortal(
    <div
      ref={bubbleRef}
      className={[
        'tfa-bubble',
        `tfa-bubble--${chromeClass}`,
        compact ? 'tfa-bubble--chip' : '',
        formulating && !compact ? 'tfa-bubble--formulating' : '',
        !compact && hasText && !formulating ? 'is-ready' : '',
        !compact && menu !== 'none' ? 'is-menu-open' : '',
        formulating ? 'is-busy' : '',
      ].filter(Boolean).join(' ')}
      role="dialog"
      aria-label={compact ? 'Tagro Assist öffnen' : formulating ? 'Tagro formuliert' : 'Tagro Assist'}
      aria-busy={formulating}
      data-theme={chrome === 'dark' ? 'dark' : chrome}
      style={{
        top: pos.top,
        left: pos.left,
        width: compact ? CHIP_SIZE : pos.width,
        minWidth: compact ? CHIP_SIZE : undefined,
        height: compact ? CHIP_SIZE : undefined,
      }}
    >
      <style>{TFA_CSS}</style>
      {compact ? (
        <button
          type="button"
          className="tfa-chip-orb"
          onMouseDown={(e) => e.preventDefault()}
          onClick={reopenFromChip}
          aria-label="Tagro Assist bearbeiten"
          title="Tagro"
        >
          <PencilSimple size={14} weight="regular" aria-hidden />
        </button>
      ) : formulating ? (
        <div className="tfa-formulate">
          <span className="tfa-formulate-spin" aria-hidden />
          <div className="tfa-formulate-copy">
            <span className="tfa-formulate-title">Tagro formuliert</span>
            <span className="tfa-formulate-sub">Einen Moment…</span>
          </div>
          <button
            type="button"
            className="tfa-close"
            aria-label="Schließen"
            title="Schließen"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              formulateGenRef.current += 1
              setBusy(false)
              setAwaiting(false)
              collapseToChip()
            }}
          >
            <X size={14} weight="bold" />
          </button>
        </div>
      ) : (
        <>
          <div
            className="tfa-head"
            onPointerDown={onDragStart}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragEnd}
          >
            <span className="tfa-chip">
              <span className="tfa-chip-icon" aria-hidden>
                <PencilSimple size={14} weight="regular" />
              </span>
              <span>{contextLabel}</span>
            </span>
            <button
              type="button"
              className="tfa-close"
              aria-label="Schließen"
              title="Schließen"
              onMouseDown={(e) => e.preventDefault()}
              onClick={collapseToChip}
            >
              <X size={14} weight="bold" />
            </button>
          </div>
          {error ? <p className="tfa-error">{error}</p> : null}
          <div className="tfa-toolbar">
            <div className="tfa-menu-wrap">
              <button
                type="button"
                className={`tfa-menu-btn${menu === 'model' ? ' is-open' : ''}`}
                aria-label="Modus wählen"
                aria-expanded={menu === 'model'}
                aria-haspopup="listbox"
                onClick={() => setMenu(m => (m === 'model' ? 'none' : 'model'))}
                disabled={busy}
              >
                {modelLabel}
                <CaretDown size={12} weight="bold" />
              </button>
              {menu === 'model' ? (
                <ul className="tfa-menu" role="listbox" aria-label="Modus">
                  {MODEL_OPTIONS.map(opt => (
                    <li key={opt.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={model === opt.id}
                        className={`tfa-menu-option${model === opt.id ? ' is-active' : ''}`}
                        onClick={() => pickModel(opt.id)}
                      >
                        <span className="tfa-menu-option-title">{opt.label}</span>
                        <span className="tfa-menu-option-hint">{opt.hint}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="tfa-menu-wrap">
              <button
                type="button"
                className={`tfa-menu-btn tfa-menu-btn--quiet${menu === 'tone' ? ' is-open' : ''}`}
                aria-label="Schreibmodus wählen"
                aria-expanded={menu === 'tone'}
                aria-haspopup="listbox"
                onClick={() => setMenu(m => (m === 'tone' ? 'none' : 'tone'))}
                disabled={busy}
              >
                {toneLabel}
                <CaretDown size={12} weight="bold" />
              </button>
              {menu === 'tone' ? (
                <ul className="tfa-menu" role="listbox" aria-label="Schreibmodus">
                  {TONE_OPTIONS.map(opt => (
                    <li key={opt.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={tone === opt.id}
                        className={`tfa-menu-option${tone === opt.id ? ' is-active' : ''}`}
                        onClick={() => pickTone(opt.id)}
                      >
                        <span className="tfa-menu-option-title">{opt.label}</span>
                        <span className="tfa-menu-option-hint">{opt.hint}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <span className="tfa-spacer" aria-hidden />
            {micOk ? (
              <button
                type="button"
                className={`tfa-mic${listening ? ' is-on' : ''}`}
                onClick={toggleMic}
                aria-label={listening ? 'Aufnahme stoppen' : 'Spracheingabe ins Feld'}
                disabled={busy}
              >
                {listening ? <MicrophoneSlash size={16} weight="fill" /> : <Microphone size={16} weight="regular" />}
              </button>
            ) : null}
            <button
              type="button"
              className="tfa-send"
              onClick={() => {
                formulatedForRef.current = ''
                void runFormulate(fieldValue, { force: true })
              }}
              disabled={!canApply}
              aria-label={`${toneLabel} einsetzen`}
              title={`${toneLabel} einsetzen`}
            >
              <ArrowUp size={15} weight="bold" />
            </button>
          </div>
        </>
      )}
    </div>,
    document.body,
  )
}

const TFA_CSS = `
  .tfa-bubble {
    position: fixed;
    z-index: 1201;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px 10px;
    border-radius: 10px;
    font-family: var(--font-aeonik, 'Aeonik'), Inter, sans-serif;
    -webkit-font-smoothing: antialiased;
    pointer-events: auto;
    transition:
      width .34s cubic-bezier(.22,1,.36,1),
      min-width .34s cubic-bezier(.22,1,.36,1),
      height .28s cubic-bezier(.22,1,.36,1),
      top .34s cubic-bezier(.22,1,.36,1),
      left .34s cubic-bezier(.22,1,.36,1),
      padding .28s cubic-bezier(.22,1,.36,1),
      border-radius .28s cubic-bezier(.22,1,.36,1),
      background .28s ease,
      border-color .28s ease,
      box-shadow .28s ease;
  }
  .tfa-bubble--chip {
    gap: 0;
    padding: 0;
    border-radius: 8px;
    overflow: hidden;
    width: ${CHIP_SIZE}px;
    height: ${CHIP_SIZE}px;
    box-sizing: border-box;
    animation: tfaChipIn .28s cubic-bezier(.22,1,.36,1) both;
  }
  @keyframes tfaChipIn {
    from { opacity: 0; transform: translate3d(0, 3px, 0) scale(0.88); }
    to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
  }
  .tfa-chip-orb {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: ${CHIP_SIZE}px;
    height: ${CHIP_SIZE}px;
    padding: 0;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: inherit;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .tfa-chip-orb:hover { opacity: 0.9; }
  .tfa-chip-orb:active { transform: scale(0.94); }
  .tfa-bubble--dark .tfa-chip-orb { color: rgba(230, 230, 234, 0.78); }
  .tfa-bubble--light .tfa-chip-orb { color: #5B647D; }

  .tfa-formulate {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 36px;
    padding: 2px 0;
  }
  .tfa-formulate-spin {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    border-radius: 999px;
    border: 1.5px solid rgba(91, 100, 125, 0.18);
    border-top-color: #5B647D;
    animation: tfaSpin .7s linear infinite;
  }
  .tfa-bubble--dark .tfa-formulate-spin {
    border-color: rgba(245, 245, 247, 0.14);
    border-top-color: rgba(245, 245, 247, 0.72);
  }
  @keyframes tfaSpin { to { transform: rotate(360deg); } }
  .tfa-formulate-copy {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
    flex: 1;
  }
  .tfa-formulate-title {
    font-size: 13px;
    letter-spacing: 0.01em;
    line-height: 1.25;
    color: inherit;
  }
  .tfa-formulate-sub {
    font-size: 11.5px;
    letter-spacing: 0.01em;
    line-height: 1.3;
    color: rgba(30, 30, 32, 0.45);
  }
  .tfa-bubble--dark .tfa-formulate-sub { color: rgba(230, 230, 234, 0.45); }

  .tfa-close {
    margin-left: auto;
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: rgba(30, 30, 32, 0.42);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .tfa-close:hover {
    background: rgba(30, 30, 32, 0.06);
    color: #1e1e20;
  }
  .tfa-bubble--dark .tfa-close { color: rgba(230, 230, 234, 0.42); }
  .tfa-bubble--dark .tfa-close:hover {
    background: rgba(255, 255, 255, 0.06);
    color: #E6E6EA;
  }

  .tfa-bubble--dark {
    background: rgba(14, 14, 16, 0.96);
    border: 1px solid rgba(255, 255, 255, 0.06);
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.03) inset,
      0 10px 32px rgba(0, 0, 0, 0.42);
    color: #E6E6EA;
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
  }
  .tfa-bubble--dark.is-ready {
    background: rgba(21, 21, 24, 0.97);
    border-color: rgba(255, 255, 255, 0.07);
  }
  .tfa-bubble--dark.is-menu-open {
    background: #0E0E10;
    border-color: rgba(255, 255, 255, 0.08);
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.03) inset,
      0 14px 40px rgba(0, 0, 0, 0.55);
  }
  .tfa-bubble--chip.tfa-bubble--dark {
    background: rgba(26, 26, 30, 0.96);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.04) inset,
      0 4px 14px rgba(0, 0, 0, 0.35);
  }
  .tfa-bubble--light {
    background: #ffffff;
    border: 1px solid rgba(30, 30, 32, 0.08);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    color: #1e1e20;
  }
  .tfa-bubble--light.is-menu-open {
    background: #ffffff;
    border-color: rgba(30, 30, 32, 0.10);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
  }
  .tfa-bubble--chip.tfa-bubble--light {
    background: #ffffff;
    border: 1px solid rgba(30, 30, 32, 0.08);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  }
  .tfa-bubble--formulating {
    min-height: 52px;
  }
  .tfa-head {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    cursor: grab;
    touch-action: none;
    user-select: none;
  }
  .tfa-head:active { cursor: grabbing; }
  .tfa-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    max-width: 100%;
    min-width: 0;
    padding: 3px 8px 3px 5px;
    border-radius: 7px;
    font-size: 12px;
    font-weight: 400;
    letter-spacing: 0.01em;
    line-height: 1.3;
  }
  .tfa-chip-icon {
    display: inline-flex;
    flex-shrink: 0;
    opacity: 0.72;
  }
  .tfa-bubble--dark .tfa-chip {
    background: rgba(255, 255, 255, 0.04);
    color: rgba(230, 230, 234, 0.82);
  }
  .tfa-bubble--dark .tfa-chip-icon { color: #8891a0; }
  .tfa-bubble--light .tfa-chip {
    background: rgba(91, 100, 125, 0.10);
    color: #5B647D;
  }
  .tfa-bubble--light .tfa-chip-icon { color: #5B647D; }
  .tfa-chip span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tfa-error {
    margin: 0;
    font-size: 12px;
    color: #e57373;
  }
  .tfa-toolbar {
    display: flex;
    align-items: center;
    gap: 4px;
    position: relative;
  }
  .tfa-menu-wrap { position: relative; }
  .tfa-menu-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 28px;
    padding: 0 8px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    font: inherit;
    font-size: 12.5px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .tfa-menu-btn--quiet { opacity: 0.68; }
  .tfa-bubble--dark .tfa-menu-btn { color: rgba(230, 230, 234, 0.72); }
  .tfa-bubble--light .tfa-menu-btn { color: rgba(30, 30, 32, 0.68); }
  .tfa-menu-btn:hover,
  .tfa-menu-btn.is-open {
    background: rgba(255, 255, 255, 0.05);
  }
  .tfa-bubble--light .tfa-menu-btn:hover,
  .tfa-bubble--light .tfa-menu-btn.is-open {
    background: rgba(30, 30, 32, 0.06);
  }
  .tfa-bubble--dark .tfa-menu-btn:hover,
  .tfa-bubble--dark .tfa-menu-btn.is-open { color: #E6E6EA; }
  .tfa-bubble--light .tfa-menu-btn:hover,
  .tfa-bubble--light .tfa-menu-btn.is-open { color: #1e1e20; }
  .tfa-menu {
    position: absolute;
    left: 0;
    bottom: calc(100% + 8px);
    z-index: 4;
    margin: 0;
    padding: 5px;
    list-style: none;
    min-width: 176px;
    border-radius: 12px;
    animation: tfaMenuIn .22s cubic-bezier(.22,1,.36,1) both;
  }
  @keyframes tfaMenuIn {
    from { opacity: 0; transform: translate3d(0, 4px, 0) scale(0.98); }
    to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
  }
  .tfa-bubble--dark .tfa-menu {
    background: #1A1A1E;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.04) inset,
      0 12px 36px rgba(0, 0, 0, 0.55);
  }
  .tfa-bubble--light .tfa-menu {
    background: #ffffff;
    border: 1px solid rgba(30, 30, 32, 0.08);
    box-shadow:
      0 1px 2px rgba(30, 30, 32, 0.04),
      0 12px 32px rgba(15, 23, 42, 0.12);
  }
  .tfa-menu-option {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    text-align: left;
    border: 0;
    border-radius: 8px;
    padding: 8px 10px;
    background: transparent;
    font: inherit;
    cursor: pointer;
    transition: background .14s ease;
  }
  .tfa-menu-option-title {
    font-size: 13px;
    letter-spacing: 0.01em;
    color: inherit;
  }
  .tfa-menu-option-hint {
    font-size: 11.5px;
    letter-spacing: 0.01em;
    line-height: 1.35;
  }
  .tfa-bubble--dark .tfa-menu-option { color: #E6E6EA; }
  .tfa-bubble--dark .tfa-menu-option-hint { color: rgba(230, 230, 234, 0.48); }
  .tfa-bubble--light .tfa-menu-option { color: #1e1e20; }
  .tfa-bubble--light .tfa-menu-option-hint { color: rgba(30, 30, 32, 0.48); }
  .tfa-bubble--dark .tfa-menu-option:hover {
    background: #27272C;
  }
  .tfa-bubble--dark .tfa-menu-option.is-active {
    background: rgba(255, 255, 255, 0.06);
  }
  .tfa-bubble--light .tfa-menu-option:hover,
  .tfa-bubble--light .tfa-menu-option.is-active {
    background: rgba(30, 30, 32, 0.06);
  }
  .tfa-spacer { flex: 1; }
  .tfa-mic,
  .tfa-send {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    border: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .tfa-mic { background: transparent; }
  .tfa-bubble--dark .tfa-mic { color: rgba(230, 230, 234, 0.55); }
  .tfa-bubble--light .tfa-mic { color: rgba(30, 30, 32, 0.5); }
  .tfa-bubble--dark .tfa-mic:hover { color: #E6E6EA; }
  .tfa-bubble--light .tfa-mic:hover { color: #1e1e20; }
  .tfa-mic.is-on { background: rgba(255, 255, 255, 0.06); }
  .tfa-bubble--light .tfa-mic.is-on { background: rgba(30, 30, 32, 0.06); }
  .tfa-bubble--dark .tfa-send {
    background: #5B647D;
    color: #F5F5F7;
    box-shadow: none;
  }
  .tfa-bubble--light .tfa-send {
    background: #5B647D;
    color: #F5F5F7;
    box-shadow: none;
  }
  .tfa-bubble--dark .tfa-send:hover:not(:disabled) { background: #66708A; }
  .tfa-bubble--light .tfa-send:hover:not(:disabled) { background: #66708A; }
  .tfa-send:disabled {
    opacity: 0.32;
    cursor: not-allowed;
  }
  .tfa-bubble.is-busy .tfa-send { opacity: 0.4; }
  @media (prefers-reduced-motion: reduce) {
    .tfa-formulate-spin { animation: none !important; border-top-color: #5B647D; opacity: 0.7; }
    .tfa-bubble--chip { animation: none !important; }
  }
`
