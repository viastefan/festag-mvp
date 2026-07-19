'use client'

/**
 * Tagro field assist — Cursor-like inline edit bubble (text + voice).
 * Not wired into onboarding profile yet; reserved for later steps and
 * app-wide input fields. Pair with POST /api/onboarding/tagro-profile
 * (or a generalized Tagro extract endpoint).
 */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUp, Microphone, MicrophoneSlash, X } from '@phosphor-icons/react'
import TagroLogo from '@/components/TagroLogo'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'

export type TagroProfileAssistResult = {
  fullName: string
  position: string | null
}

type Props = {
  open: boolean
  onClose: () => void
  anchorRef: React.RefObject<HTMLElement | null>
  initialText?: string
  onApply: (result: TagroProfileAssistResult) => void
}

export default function TagroFieldAssist({
  open,
  onClose,
  anchorRef,
  initialText = '',
  onApply,
}: Props) {
  const [text, setText] = useState(initialText)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const baseRef = useRef('')

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

  useEffect(() => {
    if (!open) return
    setText(initialText)
    baseRef.current = initialText
    setError('')
    const el = anchorRef.current
    if (el) {
      const r = el.getBoundingClientRect()
      const width = Math.min(420, Math.max(320, r.width))
      let left = r.left + r.width / 2 - width / 2
      left = Math.max(12, Math.min(left, window.innerWidth - width - 12))
      const top = Math.min(r.bottom + 10, window.innerHeight - 280)
      setPos({ top, left, width })
    }
    const t = window.setTimeout(() => textareaRef.current?.focus(), 40)
    return () => window.clearTimeout(t)
  }, [open, initialText, anchorRef])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  function toggleMic() {
    if (listening) {
      stop()
      return
    }
    baseRef.current = text.trim()
    start()
  }

  async function apply() {
    const raw = text.trim()
    if (!raw || busy) return
    if (listening) stop()
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/onboarding/tagro-profile', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: raw }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) {
        onApply({ fullName: raw.slice(0, 64), position: null })
        onClose()
        return
      }
      onApply({
        fullName: String(data.fullName || raw).slice(0, 64),
        position: data.position ? String(data.position).slice(0, 64) : null,
      })
      onClose()
    } catch {
      onApply({ fullName: raw.slice(0, 64), position: null })
      onClose()
    } finally {
      setBusy(false)
    }
  }

  if (!open || !pos || typeof document === 'undefined') return null

  return createPortal(
    <>
      <button type="button" className="tfa-backdrop" aria-label="Schließen" onClick={onClose} />
      <div
        className="tfa-bubble"
        role="dialog"
        aria-label="Mit Tagro eingeben"
        style={{ top: pos.top, left: pos.left, width: pos.width }}
      >
        <style>{TFA_CSS}</style>
        <header className="tfa-head">
          <span className="tfa-brand">
            <TagroLogo size={16} />
            <span>Tagro</span>
          </span>
          <button type="button" className="tfa-x" onClick={onClose} aria-label="Schließen">
            <X size={14} weight="bold" />
          </button>
        </header>
        <p className="tfa-lede">
          Sag oder tippe, wie du heißt — Tagro setzt Name und optionalen Titel für dein Profil.
        </p>
        <textarea
          ref={textareaRef}
          className="tfa-input"
          value={text}
          onChange={e => {
            setText(e.target.value)
            baseRef.current = e.target.value
          }}
          placeholder="z. B. Ich bin Anna Müller, Product Lead…"
          rows={3}
          disabled={busy}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void apply()
            }
          }}
        />
        {error ? <p className="tfa-error">{error}</p> : null}
        <div className="tfa-actions">
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
          ) : (
            <span />
          )}
          <button
            type="button"
            className="tfa-send"
            onClick={() => void apply()}
            disabled={busy || !text.trim()}
            aria-label="Übernehmen"
          >
            <ArrowUp size={16} weight="bold" />
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
    background: rgba(15, 23, 42, 0.18);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    cursor: default;
  }
  .tfa-bubble {
    position: fixed;
    z-index: 1201;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px 12px 10px;
    border-radius: 14px;
    background: var(--festag-glass-bg-strong, rgba(255,255,255,0.92));
    border: 1px solid var(--festag-glass-border, rgba(255,255,255,0.62));
    box-shadow:
      0 0 0 1px rgba(15, 23, 42, 0.04),
      0 18px 48px rgba(15, 23, 42, 0.16),
      0 2px 8px rgba(15, 23, 42, 0.06);
    backdrop-filter: var(--festag-glass-blur, blur(18px) saturate(155%));
    -webkit-backdrop-filter: var(--festag-glass-blur, blur(18px) saturate(155%));
    color: #1e1e20;
    font-family: var(--font-aeonik, 'Aeonik'), Inter, sans-serif;
  }
  .tfa-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .tfa-brand {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12.5px;
    font-weight: 500;
    letter-spacing: 0.01em;
    color: #1e1e20;
  }
  .tfa-x {
    width: 26px;
    height: 26px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: #5c5c62;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  .tfa-x:hover { background: rgba(0,0,0,0.05); color: #1e1e20; }
  .tfa-lede {
    margin: 0;
    font-size: 12.5px;
    line-height: 1.45;
    color: #5c5c62;
  }
  .tfa-input {
    width: 100%;
    min-height: 84px;
    resize: vertical;
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 12px;
    background: #fff;
    color: #1e1e20;
    font: inherit;
    font-size: 14px;
    line-height: 1.45;
    padding: 12px 14px;
    outline: none;
  }
  .tfa-input:focus {
    border-color: rgba(15, 23, 42, 0.22);
  }
  .tfa-input::placeholder { color: #aeaebe; }
  .tfa-error {
    margin: 0;
    font-size: 12px;
    color: #c9342a;
  }
  .tfa-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .tfa-mic,
  .tfa-send {
    width: 34px;
    height: 34px;
    border-radius: 999px;
    border: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  .tfa-mic {
    background: rgba(0,0,0,0.05);
    color: #1e1e20;
  }
  .tfa-mic.is-on {
    background: #1e1e20;
    color: #fff;
  }
  .tfa-send {
    background: #1e1e20;
    color: #fff;
    margin-left: auto;
  }
  .tfa-send:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  html[data-theme="dark"] .tfa-bubble {
    background: #121214;
    border-color: rgba(255,255,255,0.1);
    color: #f5f5f7;
    box-shadow: 0 18px 48px rgba(0,0,0,0.55);
  }
  html[data-theme="dark"] .tfa-brand,
  html[data-theme="dark"] .tfa-send,
  html[data-theme="dark"] .tfa-mic.is-on { color: #f5f5f7; }
  html[data-theme="dark"] .tfa-lede,
  html[data-theme="dark"] .tfa-x { color: rgba(245,245,247,0.68); }
  html[data-theme="dark"] .tfa-input {
    background: #0c0c0e;
    border-color: rgba(255,255,255,0.1);
    color: #f5f5f7;
  }
  html[data-theme="dark"] .tfa-mic {
    background: rgba(255,255,255,0.08);
    color: #f5f5f7;
  }
  html[data-theme="dark"] .tfa-send { background: #f5f5f7; color: #0c0c0e; }
`
