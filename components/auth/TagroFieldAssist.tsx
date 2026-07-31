'use client'

/**
 * Tagro field assist — companion bubble for a real input/textarea.
 *
 * Contract (keep forever):
 * - User types in the anchored field, never in this popup.
 * - Popup opens only when the field is focused/clicked.
 * - Popup is freely draggable; does not steal focus or block the field.
 * - Modes rewrite the field text (formell / sprachlich) and insert via Tagro.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUp, CaretDown, Microphone, MicrophoneSlash, PencilSimple } from '@phosphor-icons/react'
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

const BUBBLE_H = 72
const GAP = 10
const EDGE = 12
/** Collapsed reopen chip — pinned inside the field, bottom-right. */
const CHIP_W = 90
const CHIP_H = 32
const CHIP_INSET = 8

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

function placeNearAnchor(anchor: DOMRect, width: number, height: number): Pos {
  const vw = window.innerWidth
  const vh = window.innerHeight
  let left = Math.max(EDGE, Math.min(anchor.left, vw - width - EDGE))

  const spaceAbove = anchor.top - EDGE
  const spaceBelow = vh - anchor.bottom - EDGE

  let top: number
  if (spaceAbove >= height + GAP || spaceAbove >= spaceBelow) {
    top = Math.max(EDGE, anchor.top - height - GAP)
  } else {
    top = Math.min(anchor.bottom + GAP, vh - height - EDGE)
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
}: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [pos, setPos] = useState<Pos | null>(null)
  const [model, setModel] = useState<TagroAssistModel>('auto')
  const [tone, setTone] = useState<TagroAssistTone>('formal')
  const [menu, setMenu] = useState<'none' | 'tone' | 'model'>('none')
  const [chrome, setChrome] = useState<'light' | 'dark' | 'read'>('light')
  const [userMoved, setUserMoved] = useState(false)
  /** Full panel vs compact reopen chip — collapses when typing (mobile keyboard). */
  const [expanded, setExpanded] = useState(true)
  const bubbleRef = useRef<HTMLDivElement>(null)
  const baseRef = useRef('')
  const dragRef = useRef<{ ox: number; oy: number; sx: number; sy: number } | null>(null)
  const hasText = fieldValue.trim().length > 0
  const compact = open && hasText && !expanded

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
      /* Always pin inside the field corner — drag offset does not apply. */
      setPos({
        top: Math.max(EDGE, r.bottom - CHIP_H - CHIP_INSET),
        left: Math.max(EDGE, r.right - CHIP_W - CHIP_INSET),
        width: CHIP_W,
      })
      return
    }
    if (userMoved) return
    const width = Math.min(400, Math.max(280, r.width * 0.92))
    const measured = bubbleRef.current?.getBoundingClientRect().height || BUBBLE_H
    setPos(placeNearAnchor(r, width, measured))
  }, [anchorRef, userMoved, compact])

  useEffect(() => {
    if (!open) {
      setExpanded(true)
      return
    }
    if (hasText) {
      setExpanded(false)
      setMenu('none')
      setUserMoved(false)
    } else {
      setExpanded(true)
    }
  }, [open, hasText])

  /* Keep typing clear of the in-field chip (chip lives in the bottom padding zone). */
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
    // Keep focus in the real field — never steal it into the popup.
    return () => window.clearTimeout(t)
  }, [open, themeProp, reposition]) // eslint-disable-line react-hooks/exhaustive-deps -- fieldValue sync via baseRef on mic

  useEffect(() => {
    if (!open) return
    setChrome(resolveTheme(themeProp))
  }, [open, themeProp])

  useEffect(() => {
    if (!open) return
    if (userMoved && !compact) return
    const id = window.requestAnimationFrame(() => reposition())
    return () => window.cancelAnimationFrame(id)
  }, [open, menu, error, userMoved, compact, expanded, reposition])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (menu !== 'none') setMenu('none')
        else if (expanded && hasText) setExpanded(false)
        else onClose()
      }
    }
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node
      if (bubbleRef.current?.contains(target)) return
      if (anchorRef.current?.contains(target)) return
      onClose()
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
  }, [open, onClose, menu, userMoved, reposition, anchorRef, expanded, hasText, compact])

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
    if (e.button !== 0 || !pos || compact) return
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

  async function applyTone() {
    const raw = fieldValue.trim()
    if (!raw || busy) return
    if (listening) stop()
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/onboarding/tagro-project', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: raw, model, tone, surface }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) {
        onFieldChange(raw.slice(0, 500))
        return
      }
      const next = String(data.description || raw).slice(0, 500)
      onFieldChange(next)
      baseRef.current = next
      // Keep popup open so the user can tweak further; focus stays in the field.
      anchorRef.current?.focus?.()
    } catch {
      setError('Gerade nicht möglich — Text bleibt unverändert.')
    } finally {
      setBusy(false)
    }
  }

  if (!open || !pos || typeof document === 'undefined') return null

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
        !compact && hasText ? 'is-ready' : '',
        !compact && menu !== 'none' ? 'is-menu-open' : '',
        busy ? 'is-busy' : '',
      ].filter(Boolean).join(' ')}
      role="dialog"
      aria-label={compact ? 'Tagro Assist öffnen' : 'Tagro Assist'}
      data-theme={chrome === 'dark' ? 'dark' : chrome}
      style={{
        top: pos.top,
        left: pos.left,
        width: compact ? 'auto' : pos.width,
        minWidth: compact ? CHIP_W : undefined,
      }}
    >
      <style>{TFA_CSS}</style>
      {compact ? (
        <button
          type="button"
          className="tfa-chip-open"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setUserMoved(false)
            setExpanded(true)
          }}
          aria-label="Tagro Assist öffnen"
        >
          <span className="tfa-chip-icon" aria-hidden>
            <PencilSimple size={14} weight="regular" />
          </span>
          Tagro
        </button>
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
            {busy ? <span className="tfa-busy" aria-live="polite">Verdichtet…</span> : null}
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
              onClick={() => void applyTone()}
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
    border-radius: 999px;
    overflow: hidden;
    height: ${CHIP_H}px;
    box-sizing: border-box;
    animation: tfaChipIn .32s cubic-bezier(.22,1,.36,1) both;
  }
  @keyframes tfaChipIn {
    from { opacity: 0; transform: translate3d(0, 4px, 0) scale(0.9); }
    to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
  }
  .tfa-chip-open {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: ${CHIP_H}px;
    width: 100%;
    padding: 0 12px 0 10px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 12.5px;
    letter-spacing: 0.01em;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    white-space: nowrap;
  }
  .tfa-chip-open:hover { opacity: 0.92; }
  .tfa-chip-open:active { transform: scale(0.97); }
  .tfa-bubble--dark .tfa-chip-open { color: rgba(230, 230, 234, 0.72); }
  .tfa-bubble--light .tfa-chip-open { color: #5B647D; }
  /* Festag Night — match --festag-black-popup / other menus */
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
    background: rgba(252, 252, 252, 0.96);
    border: 1px solid rgba(30, 30, 32, 0.08);
    box-shadow:
      0 1px 2px rgba(30, 30, 32, 0.04),
      0 10px 28px rgba(30, 30, 32, 0.08);
    color: #1e1e20;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }
  .tfa-bubble--light.is-menu-open {
    background: #ffffff;
    border-color: rgba(30, 30, 32, 0.10);
    box-shadow:
      0 1px 2px rgba(30, 30, 32, 0.04),
      0 14px 36px rgba(30, 30, 32, 0.12);
  }
  .tfa-bubble--chip.tfa-bubble--light {
    background: rgba(255, 255, 255, 0.98);
    border: 1px solid rgba(30, 30, 32, 0.10);
    box-shadow:
      0 1px 2px rgba(30, 30, 32, 0.04),
      0 4px 12px rgba(30, 30, 32, 0.08);
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
  .tfa-busy {
    margin-left: auto;
    font-size: 11.5px;
    letter-spacing: 0.01em;
    color: rgba(230, 230, 234, 0.42);
    white-space: nowrap;
  }
  .tfa-bubble--light .tfa-busy { color: rgba(30, 30, 32, 0.42); }
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
`
