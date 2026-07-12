'use client'

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { DOCUMENT_TAGRO_PROMPTS } from '@/components/documents/document-tagro-prompts'
import { DOCUMENT_TAGRO_COMPOSE_CSS } from '@/components/documents/document-tagro-compose-styles'
import type { DocKind } from '@/lib/documents/templates'

const ROTATE_MS = 3200
const FADE_MS = 280

type Props = {
  kind: DocKind
  disabled?: boolean
  onApply: (data: Record<string, unknown>, filledKeys: string[]) => void | Promise<void>
}

export default function DocumentTagroComposeBar({ kind, disabled, onApply }: Props) {
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)
  const [busy, setBusy] = useState(false)
  const [promptIdx, setPromptIdx] = useState(0)
  const [promptVisible, setPromptVisible] = useState(true)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const prompts = DOCUMENT_TAGRO_PROMPTS[kind]

  useEffect(() => {
    if (value.trim() || busy) return
    const rotate = window.setInterval(() => {
      setPromptVisible(false)
      window.setTimeout(() => {
        setPromptIdx((i) => (i + 1) % prompts.length)
        setPromptVisible(true)
      }, FADE_MS)
    }, ROTATE_MS)
    return () => window.clearInterval(rotate)
  }, [value, busy, prompts.length])

  const submit = useCallback(async () => {
    const brief = value.trim()
    if (!brief || busy || disabled) return
    setBusy(true)
    try {
      const res = await fetch('/api/documents/draft', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, brief }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) return
      const filled = (json?.data ?? {}) as Record<string, unknown>
      const keys = Object.keys(filled).filter((k) => {
        const v = filled[k]
        if (k === 'positions' && Array.isArray(v)) return v.length > 0
        return v != null && String(v).trim() !== ''
      })
      await onApply(filled, keys)
      setValue('')
    } finally {
      setBusy(false)
    }
  }, [value, busy, disabled, kind, onApply])

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void submit()
    }
  }

  const showGhost = !value.trim() && !busy

  return (
    <>
      <style>{DOCUMENT_TAGRO_COMPOSE_CSS}</style>
      <div
        className={`dtcb-root${focused ? ' is-focused' : ''}${busy ? ' is-busy' : ''}${showGhost ? ' is-ghosting' : ''}`}
        role="region"
        aria-label="Tagro, Dokument ausfüllen"
      >
        <div className="dtcb-shell">
          <div className="dtcb-input-wrap" onClick={() => inputRef.current?.focus()}>
            {showGhost && (
              <div className={`dtcb-ghost${promptVisible ? ' is-visible' : ''}`} aria-hidden>
                <span className="dtcb-ghost-text" key={promptIdx}>
                  {prompts[promptIdx]}
                </span>
                <span className="dtcb-cursor" />
              </div>
            )}
            <textarea
              ref={inputRef}
              className="dtcb-input"
              rows={1}
              value={value}
              disabled={busy || disabled}
              placeholder=""
              onChange={(e) => setValue(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={onKeyDown}
              aria-label="Tagro-Briefing für dieses Dokument"
            />
          </div>
          <button
            type="button"
            className="dtcb-send"
            disabled={!value.trim() || busy || disabled}
            onClick={() => void submit()}
          >
            {busy ? '…' : 'Ausfüllen'}
          </button>
        </div>
      </div>
    </>
  )
}
