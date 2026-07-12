'use client'

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { DOCUMENT_TAGRO_COMPOSE_CSS } from '@/components/documents/document-tagro-compose-styles'
import type { DocKind } from '@/lib/documents/templates'

const PROMPTS: Record<DocKind, string[]> = {
  angebot: [
    'Angebot für Website-Relaunch, 3 Positionen, 12.000 €, gültig 30 Tage',
    'Angebot Branding-Paket inkl. Logo und Styleguide, Festpreis 4.500 €',
    'Angebot für UX-Audit und Prototyp, 2 Wochen, 6.800 € netto',
  ],
  rechnung: [
    'Rechnung Projektmanagement März, 40 Stunden à 95 €, Zahlung 14 Tage',
    'Rechnung Hosting und Wartung Q2, 890 €, Leistungszeitraum April–Juni',
    'Rechnung an Müller GmbH, Entwicklung Sprint 4, 3.200 € netto',
  ],
  vertrag: [
    'Dienstleistungsvertrag UX-Design, 6 Monate, Festpreis 18.000 €',
    'Wartungsvertrag für Webshop, monatlich 450 €, 12 Monate Laufzeit',
    'Vertrag App-Entwicklung Phase 1, Meilensteine, 24.000 € gesamt',
  ],
}

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
  const prompts = PROMPTS[kind]

  useEffect(() => {
    if (focused || value.trim() || busy) return
    const rotate = window.setInterval(() => {
      setPromptVisible(false)
      window.setTimeout(() => {
        setPromptIdx((i) => (i + 1) % prompts.length)
        setPromptVisible(true)
      }, 220)
    }, 3800)
    return () => window.clearInterval(rotate)
  }, [focused, value, busy, prompts.length])

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

  const showGhost = !focused && !value.trim() && !busy

  return (
    <>
      <style>{DOCUMENT_TAGRO_COMPOSE_CSS}</style>
      <div className={`dtcb-root${focused ? ' is-focused' : ''}${busy ? ' is-busy' : ''}`} role="region" aria-label="Tagro, Dokument ausfüllen">
      <div className="dtcb-shell">
        <div className="dtcb-input-wrap">
          {showGhost && (
            <div className={`dtcb-ghost${promptVisible ? ' is-visible' : ''}`} aria-hidden>
              <span className="dtcb-ghost-text">{prompts[promptIdx]}</span>
              <span className="dtcb-cursor" />
            </div>
          )}
          <textarea
            ref={inputRef}
            className="dtcb-input"
            rows={1}
            value={value}
            disabled={busy || disabled}
            placeholder={focused ? 'Beschreibe Angebot, Rechnung oder Vertrag…' : ''}
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
