'use client'

/**
 * Tagro compose assist for onboarding — Cursor-like floating bar
 * (context chip + text + Auto + mic + white send).
 */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUp, CaretDown, Microphone, MicrophoneSlash } from '@phosphor-icons/react'
import TagroLogo from '@/components/TagroLogo'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'

type Props = {
  open: boolean
  onClose: () => void
  anchorRef: React.RefObject<HTMLElement | null>
  initialText?: string
  contextLabel?: string
  placeholder?: string
  onApply: (description: string) => void
}

export default function TagroFieldAssist({
  open,
  onClose,
  anchorRef,
  initialText = '',
  contextLabel = 'Onboarding',
  placeholder = 'Beschreibe kurz, woran du arbeitest…',
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
      const width = Math.min(440, Math.max(300, r.width))
      let left = r.left
      left = Math.max(12, Math.min(left, window.innerWidth - width - 12))
      // Prefer above the field when there is room; else below.
      const preferredTop = r.top - 168
      const top = preferredTop > 12
        ? preferredTop
        : Math.min(r.bottom + 10, window.innerHeight - 200)
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
      const res = await fetch('/api/onboarding/tagro-project', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: raw }),
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
        <div className="tfa-body">
          <span className="tfa-chip">
            <TagroLogo size={14} />
            <span>{contextLabel}</span>
          </span>
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
          <button type="button" className="tfa-auto" aria-label="Modus Auto">
            Auto
            <CaretDown size={12} weight="bold" />
          </button>
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
    padding: 12px 12px 10px;
    border-radius: 16px;
    background: #1c1c1f;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.2),
      0 18px 48px rgba(0, 0, 0, 0.45);
    color: #f5f5f7;
    font-family: var(--font-aeonik, 'Aeonik'), Inter, sans-serif;
  }
  .tfa-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }
  .tfa-chip {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    padding: 3px 8px 3px 6px;
    border-radius: 8px;
    background: rgba(91, 140, 255, 0.14);
    color: #8cb4ff;
    font-size: 12px;
    font-weight: 400;
    letter-spacing: 0.01em;
    line-height: 1.3;
  }
  .tfa-chip span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tfa-input {
    width: 100%;
    min-height: 52px;
    max-height: 120px;
    resize: none;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: #f5f5f7;
    font: inherit;
    font-size: 14.5px;
    line-height: 1.45;
    letter-spacing: 0.005em;
    padding: 0;
    outline: none;
  }
  .tfa-input::placeholder { color: rgba(245, 245, 247, 0.38); }
  .tfa-error {
    margin: 0;
    font-size: 12px;
    color: #ff8a80;
  }
  .tfa-toolbar {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .tfa-auto {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 28px;
    padding: 0 8px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: rgba(245, 245, 247, 0.55);
    font: inherit;
    font-size: 12.5px;
    cursor: default;
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
    color: rgba(245, 245, 247, 0.62);
  }
  .tfa-mic:hover { color: #f5f5f7; }
  .tfa-mic.is-on {
    background: rgba(255, 255, 255, 0.1);
    color: #f5f5f7;
  }
  .tfa-send {
    background: #ffffff;
    color: #1e1e20;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
  }
  .tfa-send:hover:not(:disabled) {
    background: #f4f4f5;
  }
  .tfa-send:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
`
