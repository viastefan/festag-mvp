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
import { ArrowUp, CaretDown, DotsSixVertical, Microphone, MicrophoneSlash } from '@phosphor-icons/react'
import TagroLogo from '@/components/TagroLogo'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'

export type TagroAssistModel = '2.1' | '2.2'
export type TagroAssistTone = 'formal' | 'conversational'

const MODEL_KEY = 'festag_tagro_assist_model'
const TONE_KEY = 'festag_tagro_assist_tone'

const MODEL_OPTIONS: Array<{ id: TagroAssistModel; label: string }> = [
  { id: '2.1', label: 'tagro 2.1' },
  { id: '2.2', label: 'tagro 2.2' },
]

const TONE_OPTIONS: Array<{ id: TagroAssistTone; label: string; hint: string }> = [
  { id: 'formal', label: 'Formell', hint: 'Klar, geschäftlich' },
  { id: 'conversational', label: 'Sprachlich', hint: 'Natürlich, gesprochen' },
]

const BUBBLE_H = 132
const GAP = 12
const EDGE = 12

type Props = {
  open: boolean
  onClose: () => void
  anchorRef: React.RefObject<HTMLElement | null>
  /** Live value from the real field — popup never owns a separate draft. */
  fieldValue: string
  /** Write speech / polished text back into the field. */
  onFieldChange: (value: string) => void
  contextLabel?: string
  theme?: 'light' | 'dark' | 'read'
}

type Pos = { top: number; left: number; width: number }

function readStoredModel(): TagroAssistModel {
  if (typeof window === 'undefined') return '2.1'
  try {
    const v = localStorage.getItem(MODEL_KEY)
    if (v === '2.1' || v === '2.2') return v
  } catch { /* noop */ }
  return '2.1'
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
  theme: themeProp,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [pos, setPos] = useState<Pos | null>(null)
  const [model, setModel] = useState<TagroAssistModel>('2.1')
  const [tone, setTone] = useState<TagroAssistTone>('formal')
  const [menu, setMenu] = useState<'none' | 'tone' | 'model'>('none')
  const [surface, setSurface] = useState<'light' | 'dark' | 'read'>('light')
  const [userMoved, setUserMoved] = useState(false)
  const bubbleRef = useRef<HTMLDivElement>(null)
  const baseRef = useRef('')
  const dragRef = useRef<{ ox: number; oy: number; sx: number; sy: number } | null>(null)

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
    if (userMoved) return
    const el = anchorRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const width = Math.min(400, Math.max(280, r.width * 0.92))
    const measured = bubbleRef.current?.getBoundingClientRect().height || BUBBLE_H
    setPos(placeNearAnchor(r, width, measured))
  }, [anchorRef, userMoved])

  useEffect(() => {
    if (!open) return
    setError('')
    setModel(readStoredModel())
    setTone(readStoredTone())
    setMenu('none')
    setUserMoved(false)
    setSurface(resolveTheme(themeProp))
    baseRef.current = fieldValue
    reposition()
    const t = window.setTimeout(() => reposition(), 40)
    // Keep focus in the real field — never steal it into the popup.
    return () => window.clearTimeout(t)
  }, [open, themeProp, reposition]) // eslint-disable-line react-hooks/exhaustive-deps -- fieldValue sync via baseRef on mic

  useEffect(() => {
    if (!open) return
    setSurface(resolveTheme(themeProp))
  }, [open, themeProp])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (menu !== 'none') setMenu('none')
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
      if (!userMoved) reposition()
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
  }, [open, onClose, menu, userMoved, reposition, anchorRef])

  useEffect(() => {
    if (!open || userMoved) return
    const id = window.requestAnimationFrame(() => reposition())
    return () => window.cancelAnimationFrame(id)
  }, [open, menu, error, userMoved, reposition])

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
    if (e.button !== 0 || !pos) return
    e.preventDefault()
    e.stopPropagation()
    setMenu('none')
    dragRef.current = { ox: e.clientX, oy: e.clientY, sx: pos.left, sy: pos.top }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onDragMove(e: React.PointerEvent) {
    const d = dragRef.current
    if (!d || !pos) return
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
        body: JSON.stringify({ text: raw, model, tone }),
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

  const modelLabel = MODEL_OPTIONS.find(o => o.id === model)?.label || 'tagro 2.1'
  const toneLabel = TONE_OPTIONS.find(o => o.id === tone)?.label || 'Formell'
  const canApply = Boolean(fieldValue.trim()) && !busy

  return createPortal(
    <div
      ref={bubbleRef}
      className={`tfa-bubble tfa-bubble--${surface === 'dark' ? 'dark' : 'light'}`}
      role="dialog"
      aria-label="Tagro Assist"
      data-theme={surface === 'dark' ? 'dark' : surface}
      style={{ top: pos.top, left: pos.left, width: pos.width }}
    >
      <style>{TFA_CSS}</style>
      <div
        className="tfa-head"
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
      >
        <span className="tfa-drag" aria-hidden>
          <DotsSixVertical size={14} weight="bold" />
        </span>
        <span className="tfa-chip">
          <TagroLogo size={14} />
          <span>{contextLabel}</span>
        </span>
        <span className="tfa-drag-hint">Ziehen zum Verschieben</span>
      </div>
      <div className="tfa-body">
        <p className="tfa-intro">
          Schreib im Feld darunter. Mit Formell oder Sprachlich lässt Tagro deinen Text
          einsetzen — das Popup bleibt frei bewegbar.
        </p>
      </div>
      {error ? <p className="tfa-error">{error}</p> : null}
      <div className="tfa-toolbar">
        <div className="tfa-menu-wrap">
          <button
            type="button"
            className={`tfa-menu-btn${menu === 'tone' ? ' is-open' : ''}`}
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
        <div className="tfa-menu-wrap">
          <button
            type="button"
            className={`tfa-menu-btn tfa-menu-btn--quiet${menu === 'model' ? ' is-open' : ''}`}
            aria-label="Tagro-Version wählen"
            aria-expanded={menu === 'model'}
            aria-haspopup="listbox"
            onClick={() => setMenu(m => (m === 'model' ? 'none' : 'model'))}
            disabled={busy}
          >
            {modelLabel}
            <CaretDown size={12} weight="bold" />
          </button>
          {menu === 'model' ? (
            <ul className="tfa-menu" role="listbox" aria-label="Tagro-Version">
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
    gap: 8px;
    padding: 10px 12px 10px;
    border-radius: 16px;
    font-family: var(--font-aeonik, 'Aeonik'), Inter, sans-serif;
    -webkit-font-smoothing: antialiased;
    pointer-events: auto;
  }
  .tfa-bubble--dark {
    background: var(--festag-black-popup, #1c1c1e);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.2),
      0 18px 48px rgba(0, 0, 0, 0.45);
    color: #f5f5f7;
  }
  .tfa-bubble--light {
    background: #ffffff;
    border: 1px solid #e5e5e6;
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.05),
      0 12px 32px rgba(15, 23, 42, 0.1);
    color: #1e1e20;
  }
  .tfa-head {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    cursor: grab;
    touch-action: none;
    user-select: none;
  }
  .tfa-head:active { cursor: grabbing; }
  .tfa-drag {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    opacity: 0.42;
  }
  .tfa-drag-hint {
    margin-left: auto;
    font-size: 11px;
    letter-spacing: 0.01em;
    opacity: 0.38;
    white-space: nowrap;
  }
  @media (max-width: 420px) {
    .tfa-drag-hint { display: none; }
  }
  .tfa-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    min-width: 0;
    padding: 3px 8px 3px 6px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 400;
    letter-spacing: 0.01em;
    line-height: 1.3;
  }
  .tfa-bubble--dark .tfa-chip {
    background: rgba(91, 140, 255, 0.14);
    color: #8cb4ff;
  }
  .tfa-bubble--light .tfa-chip {
    background: rgba(91, 100, 125, 0.1);
    color: #5B647D;
  }
  .tfa-chip span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tfa-body { min-width: 0; }
  .tfa-intro {
    margin: 0;
    font-size: 12.5px;
    line-height: 1.45;
    font-weight: 400;
    letter-spacing: 0.01em;
  }
  .tfa-bubble--dark .tfa-intro { color: rgba(245, 245, 247, 0.55); }
  .tfa-bubble--light .tfa-intro { color: var(--al-text-muted, #8891a0); }
  .tfa-error {
    margin: 0;
    font-size: 12px;
    color: #e57373;
  }
  .tfa-toolbar {
    display: flex;
    align-items: center;
    gap: 6px;
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
  .tfa-menu-btn--quiet { opacity: 0.72; }
  .tfa-bubble--dark .tfa-menu-btn { color: rgba(245, 245, 247, 0.78); }
  .tfa-bubble--light .tfa-menu-btn { color: rgba(30, 30, 32, 0.72); }
  .tfa-menu-btn:hover,
  .tfa-menu-btn.is-open {
    background: rgba(127, 127, 127, 0.12);
  }
  .tfa-bubble--dark .tfa-menu-btn:hover,
  .tfa-bubble--dark .tfa-menu-btn.is-open { color: #f5f5f7; }
  .tfa-bubble--light .tfa-menu-btn:hover,
  .tfa-bubble--light .tfa-menu-btn.is-open { color: #1e1e20; }
  .tfa-menu {
    position: absolute;
    left: 0;
    bottom: calc(100% + 6px);
    z-index: 2;
    margin: 0;
    padding: 4px;
    list-style: none;
    min-width: 168px;
    border-radius: 10px;
  }
  .tfa-bubble--dark .tfa-menu {
    background: #121214;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }
  .tfa-bubble--light .tfa-menu {
    background: #ffffff;
    border: 1px solid #e5e5e6;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.1);
  }
  .tfa-menu-option {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
    text-align: left;
    border: 0;
    border-radius: 7px;
    padding: 7px 10px;
    background: transparent;
    font: inherit;
    cursor: pointer;
  }
  .tfa-menu-option-title {
    font-size: 12.5px;
  }
  .tfa-menu-option-hint {
    font-size: 11px;
    opacity: 0.55;
  }
  .tfa-bubble--dark .tfa-menu-option { color: rgba(245, 245, 247, 0.88); }
  .tfa-bubble--light .tfa-menu-option { color: #1e1e20; }
  .tfa-menu-option:hover,
  .tfa-menu-option.is-active {
    background: rgba(127, 127, 127, 0.14);
  }
  .tfa-spacer { flex: 1; }
  .tfa-mic,
  .tfa-send {
    width: 30px;
    height: 30px;
    border-radius: 999px;
    border: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .tfa-mic { background: transparent; }
  .tfa-bubble--dark .tfa-mic { color: rgba(245, 245, 247, 0.62); }
  .tfa-bubble--light .tfa-mic { color: rgba(30, 30, 32, 0.55); }
  .tfa-bubble--dark .tfa-mic:hover { color: #f5f5f7; }
  .tfa-bubble--light .tfa-mic:hover { color: #1e1e20; }
  .tfa-mic.is-on { background: rgba(127, 127, 127, 0.16); }
  .tfa-bubble--dark .tfa-send {
    background: #ffffff;
    color: #1e1e20;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
  }
  .tfa-bubble--light .tfa-send {
    background: #1e1e20;
    color: #ffffff;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  }
  .tfa-bubble--dark .tfa-send:hover:not(:disabled) { background: #f4f4f5; }
  .tfa-bubble--light .tfa-send:hover:not(:disabled) { background: #2a2a2c; }
  .tfa-send:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
`
