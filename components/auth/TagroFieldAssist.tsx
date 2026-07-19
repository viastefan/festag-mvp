'use client'

/**
 * Tagro compose assist for onboarding — floating bar with theme,
 * tagro 2.1 / 2.2 picker, mic + send, smart placement, and drag.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUp, CaretDown, DotsSixVertical, Microphone, MicrophoneSlash } from '@phosphor-icons/react'
import TagroLogo from '@/components/TagroLogo'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'

export type TagroAssistModel = '2.1' | '2.2'

const MODEL_KEY = 'festag_tagro_assist_model'
const MODEL_OPTIONS: Array<{ id: TagroAssistModel; label: string }> = [
  { id: '2.1', label: 'tagro 2.1' },
  { id: '2.2', label: 'tagro 2.2' },
]

const BUBBLE_H = 168
const GAP = 12
const EDGE = 12

type Props = {
  open: boolean
  onClose: () => void
  anchorRef: React.RefObject<HTMLElement | null>
  initialText?: string
  contextLabel?: string
  placeholder?: string
  /** Auth theme from parent — keeps popup in sync with light / dark / read. */
  theme?: 'light' | 'dark' | 'read'
  onApply: (description: string) => void
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
  const preferAbove = spaceAbove >= height + GAP || spaceAbove >= spaceBelow

  let top: number
  if (preferAbove && spaceAbove >= height + GAP) {
    top = anchor.top - height - GAP
  } else if (spaceBelow >= height + GAP) {
    top = anchor.bottom + GAP
  } else if (spaceAbove >= spaceBelow) {
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
  initialText = '',
  contextLabel = 'Onboarding',
  placeholder = 'Beschreibe kurz, woran du arbeitest…',
  theme: themeProp,
  onApply,
}: Props) {
  const [text, setText] = useState(initialText)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [pos, setPos] = useState<Pos | null>(null)
  const [model, setModel] = useState<TagroAssistModel>('2.1')
  const [modelOpen, setModelOpen] = useState(false)
  const [surface, setSurface] = useState<'light' | 'dark' | 'read'>('light')
  const [userMoved, setUserMoved] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const bubbleRef = useRef<HTMLDivElement>(null)
  const baseRef = useRef('')
  const dragRef = useRef<{ ox: number; oy: number; sx: number; sy: number } | null>(null)

  const { supported: micOk, listening, start, stop } = useSpeechRecognition({
    lang: 'de-DE',
    onResult: (chunk, isFinal) => {
      if (isFinal) {
        const next = `${baseRef.current} ${chunk}`.replace(/\s+/g, ' ').trim()
        baseRef.current = next
        setText(next)
      } else {
        setText(`${baseRef.current} ${chunk}`.replace(/\s+/g, ' ').trim())
      }
    },
  })

  const reposition = useCallback(() => {
    if (userMoved) return
    const el = anchorRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const width = Math.min(440, Math.max(300, r.width))
    const measured = bubbleRef.current?.getBoundingClientRect().height || BUBBLE_H
    setPos(placeNearAnchor(r, width, measured))
  }, [anchorRef, userMoved])

  useEffect(() => {
    if (!open) return
    setText(initialText)
    baseRef.current = initialText
    setError('')
    setModel(readStoredModel())
    setModelOpen(false)
    setUserMoved(false)
    setSurface(resolveTheme(themeProp))
    reposition()
    const t = window.setTimeout(() => {
      reposition()
      textareaRef.current?.focus()
    }, 40)
    return () => window.clearTimeout(t)
  }, [open, initialText, themeProp, reposition])

  useEffect(() => {
    if (!open) return
    setSurface(resolveTheme(themeProp))
  }, [open, themeProp])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (modelOpen) setModelOpen(false)
        else onClose()
      }
    }
    function onResize() {
      if (!userMoved) reposition()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onResize, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize, true)
    }
  }, [open, onClose, modelOpen, userMoved, reposition])

  useEffect(() => {
    if (!open || userMoved) return
    const id = window.requestAnimationFrame(() => reposition())
    return () => window.cancelAnimationFrame(id)
  }, [open, text, modelOpen, error, userMoved, reposition])

  function pickModel(next: TagroAssistModel) {
    setModel(next)
    setModelOpen(false)
    try { localStorage.setItem(MODEL_KEY, next) } catch { /* noop */ }
  }

  function toggleMic() {
    if (listening) {
      stop()
      return
    }
    baseRef.current = text.trim()
    start()
  }

  function onDragStart(e: React.PointerEvent) {
    if (e.button !== 0 || !pos) return
    e.preventDefault()
    e.stopPropagation()
    setModelOpen(false)
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

  async function apply() {
    const raw = text.trim()
    if (!raw || busy) return
    if (listening) stop()
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/onboarding/tagro-project', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: raw, model }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) {
        onApply(raw.slice(0, 500))
        onClose()
        return
      }
      onApply(String(data.description || raw).slice(0, 500))
      onClose()
    } catch {
      onApply(raw.slice(0, 500))
      onClose()
    } finally {
      setBusy(false)
    }
  }

  if (!open || !pos || typeof document === 'undefined') return null

  const modelLabel = MODEL_OPTIONS.find(o => o.id === model)?.label || 'tagro 2.1'

  return createPortal(
    <>
      <button type="button" className="tfa-backdrop" aria-label="Schließen" onClick={onClose} />
      <div
        ref={bubbleRef}
        className={`tfa-bubble tfa-bubble--${surface === 'dark' ? 'dark' : 'light'}`}
        role="dialog"
        aria-label="Mit Tagro eingeben"
        data-theme={surface === 'dark' ? 'dark' : surface}
        style={{ top: pos.top, left: pos.left, width: pos.width }}
      >
        <style>{TFA_CSS}</style>
        <div className="tfa-head">
          <button
            type="button"
            className="tfa-drag"
            aria-label="Popup verschieben"
            onPointerDown={onDragStart}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragEnd}
          >
            <DotsSixVertical size={14} weight="bold" />
          </button>
          <span className="tfa-chip">
            <TagroLogo size={14} />
            <span>{contextLabel}</span>
          </span>
        </div>
        <div className="tfa-body">
          <p className="tfa-intro">
            Beschreibe kurz dein Projekt — Tagro formuliert daraus eine klare Absicht fürs Onboarding.
          </p>
          <textarea
            ref={textareaRef}
            className="tfa-input"
            value={text}
            onChange={e => {
              setText(e.target.value)
              baseRef.current = e.target.value
            }}
            placeholder={placeholder}
            rows={2}
            disabled={busy}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void apply()
              }
            }}
          />
        </div>
        {error ? <p className="tfa-error">{error}</p> : null}
        <div className="tfa-toolbar">
          <div className="tfa-model-wrap">
            <button
              type="button"
              className={`tfa-model${modelOpen ? ' is-open' : ''}`}
              aria-label="Tagro-Version wählen"
              aria-expanded={modelOpen}
              aria-haspopup="listbox"
              onClick={() => setModelOpen(v => !v)}
              disabled={busy}
            >
              {modelLabel}
              <CaretDown size={12} weight="bold" />
            </button>
            {modelOpen ? (
              <ul className="tfa-model-menu" role="listbox" aria-label="Tagro-Version">
                {MODEL_OPTIONS.map(opt => (
                  <li key={opt.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={model === opt.id}
                      className={`tfa-model-option${model === opt.id ? ' is-active' : ''}`}
                      onClick={() => pickModel(opt.id)}
                    >
                      {opt.label}
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
              aria-label={listening ? 'Aufnahme stoppen' : 'Spracheingabe'}
              disabled={busy}
            >
              {listening ? <MicrophoneSlash size={16} weight="fill" /> : <Microphone size={16} weight="regular" />}
            </button>
          ) : null}
          <button
            type="button"
            className="tfa-send"
            onClick={() => void apply()}
            disabled={busy || !text.trim()}
            aria-label="Übernehmen"
          >
            <ArrowUp size={15} weight="bold" />
          </button>
        </div>
      </div>
    </>,
    document.body,
  )
}

const TFA_CSS = `
  .tfa-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1200;
    border: 0;
    padding: 0;
    margin: 0;
    background: transparent;
    cursor: default;
  }
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
  }
  .tfa-drag {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    border: 0;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: grab;
    background: transparent;
    color: inherit;
    opacity: 0.42;
    padding: 0;
    touch-action: none;
    -webkit-tap-highlight-color: transparent;
  }
  .tfa-drag:hover { opacity: 0.75; }
  .tfa-drag:active { cursor: grabbing; opacity: 0.9; }
  .tfa-chip {
    align-self: flex-start;
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
  .tfa-body {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }
  .tfa-intro {
    margin: 0;
    font-size: 12.5px;
    line-height: 1.45;
    font-weight: 400;
    letter-spacing: 0.01em;
  }
  .tfa-bubble--dark .tfa-intro { color: rgba(245, 245, 247, 0.68); }
  .tfa-bubble--light .tfa-intro { color: #5c5c62; }
  .tfa-input {
    width: 100%;
    min-height: 52px;
    max-height: 120px;
    resize: none;
    border: 0;
    border-radius: 0;
    background: transparent;
    font: inherit;
    font-size: 14.5px;
    line-height: 1.45;
    letter-spacing: 0.005em;
    padding: 0;
    outline: none;
  }
  .tfa-bubble--dark .tfa-input { color: #f5f5f7; }
  .tfa-bubble--light .tfa-input { color: #1e1e20; }
  .tfa-bubble--dark .tfa-input::placeholder { color: rgba(245, 245, 247, 0.38); }
  .tfa-bubble--light .tfa-input::placeholder { color: rgba(30, 30, 32, 0.38); }
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
  .tfa-model-wrap {
    position: relative;
  }
  .tfa-model {
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
  .tfa-bubble--dark .tfa-model { color: rgba(245, 245, 247, 0.55); }
  .tfa-bubble--light .tfa-model { color: rgba(30, 30, 32, 0.55); }
  .tfa-model:hover,
  .tfa-model.is-open {
    background: rgba(127, 127, 127, 0.12);
  }
  .tfa-bubble--dark .tfa-model:hover,
  .tfa-bubble--dark .tfa-model.is-open { color: #f5f5f7; }
  .tfa-bubble--light .tfa-model:hover,
  .tfa-bubble--light .tfa-model.is-open { color: #1e1e20; }
  .tfa-model-menu {
    position: absolute;
    left: 0;
    bottom: calc(100% + 6px);
    z-index: 2;
    margin: 0;
    padding: 4px;
    list-style: none;
    min-width: 128px;
    border-radius: 10px;
  }
  .tfa-bubble--dark .tfa-model-menu {
    background: #121214;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }
  .tfa-bubble--light .tfa-model-menu {
    background: #ffffff;
    border: 1px solid #e5e5e6;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.1);
  }
  .tfa-model-option {
    width: 100%;
    display: block;
    text-align: left;
    border: 0;
    border-radius: 7px;
    padding: 7px 10px;
    background: transparent;
    font: inherit;
    font-size: 12.5px;
    cursor: pointer;
  }
  .tfa-bubble--dark .tfa-model-option { color: rgba(245, 245, 247, 0.78); }
  .tfa-bubble--light .tfa-model-option { color: #1e1e20; }
  .tfa-model-option:hover,
  .tfa-model-option.is-active {
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
  .tfa-mic {
    background: transparent;
  }
  .tfa-bubble--dark .tfa-mic { color: rgba(245, 245, 247, 0.62); }
  .tfa-bubble--light .tfa-mic { color: rgba(30, 30, 32, 0.55); }
  .tfa-mic:hover { opacity: 1; }
  .tfa-bubble--dark .tfa-mic:hover { color: #f5f5f7; }
  .tfa-bubble--light .tfa-mic:hover { color: #1e1e20; }
  .tfa-mic.is-on {
    background: rgba(127, 127, 127, 0.16);
  }
  .tfa-bubble--dark .tfa-mic.is-on { color: #f5f5f7; }
  .tfa-bubble--light .tfa-mic.is-on { color: #1e1e20; }
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
