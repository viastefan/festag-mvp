'use client'

import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
import TagroComposeIcon from '@/components/icons/TagroComposeIcon'
import { openTagro } from '@/components/TagroOverlay'
import type { WritingAction } from '@/lib/extension/writing-assistant'

const QUICK_ACTIONS: { id: WritingAction; label: string }[] = [
  { id: 'clearer', label: 'Klarer formulieren' },
  { id: 'professional', label: 'Professioneller' },
  { id: 'shorter', label: 'Kürzer' },
]

type Props = {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  multiline?: boolean
  placeholder?: string
  inputType?: 'text' | 'date'
  documentKind?: string
  fieldLabel?: string
  projectId?: string
  className?: string
  inputClassName?: string
  rows?: number
  /** Hide visible label — compose button keeps aria-label. */
  hideLabel?: boolean
}

export default function TagroFieldAssist({
  label,
  value,
  onChange,
  required = false,
  multiline = false,
  placeholder,
  inputType = 'text',
  documentKind,
  fieldLabel,
  projectId,
  className = '',
  inputClassName = 'db-input',
  rows = 2,
  hideLabel = false,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputId = useId()
  const displayLabel = fieldLabel || label

  useEffect(() => {
    if (!menuOpen) return
    function onDown(event: MouseEvent) {
      if (wrapRef.current?.contains(event.target as Node)) return
      setMenuOpen(false)
    }
    function onEsc(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown, true)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDown, true)
      document.removeEventListener('keydown', onEsc)
    }
  }, [menuOpen])

  function openTagroDiscuss() {
    setMenuOpen(false)
    const ctx = value.trim()
    openTagro({
      contextType: 'document',
      id: 'builder',
      title: documentKind ? `${documentKind}, ${displayLabel}` : displayLabel,
      projectId: projectId || undefined,
      prefill: ctx
        ? `Formuliere für das Feld „${displayLabel}" in meinem Dokument einen besseren, professionellen Text. Gib nur den fertigen Feldtext zurück, ohne Erklärung:\n\n${ctx}`
        : `Hilf mir, das Feld „${displayLabel}" für mein Dokument sachlich und professionell auszufüllen.`,
    })
  }

  async function improve(action: WritingAction) {
    const text = value.trim()
    if (!text) {
      openTagroDiscuss()
      return
    }
    setMenuOpen(false)
    setBusy(true)
    try {
      const res = await fetch('/api/tagro/improve-text', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          action,
          pageTitle: documentKind ? `${documentKind}: ${displayLabel}` : displayLabel,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && typeof data.improved === 'string' && data.improved.trim()) {
        onChange(data.improved.trim())
        return
      }
      openTagroDiscuss()
    } finally {
      setBusy(false)
    }
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    onChange(event.target.value)
  }

  return (
    <div ref={wrapRef} className={`tfa db-field${className ? ` ${className}` : ''}`}>
      <style>{CSS}</style>
      <div className="tfa-label-row">
        {!hideLabel ? (
          <label htmlFor={inputId} className="tfa-label">
            {label}
            {required ? <i className="db-req"> *</i> : null}
          </label>
        ) : (
          <span className="tfa-label tfa-label--sr" id={inputId}>
            {displayLabel}
          </span>
        )}
        <div className="tfa-tagro-wrap">
          <button
            type="button"
            className={`tfa-tagro festag-tagro-compose-btn${busy ? ' is-busy' : ''}`}
            aria-label={value.trim() ? `Tagro, ${displayLabel} verbessern` : `Tagro, ${displayLabel} ausfüllen`}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            disabled={busy}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <TagroComposeIcon size={14} />
          </button>
          {menuOpen && (
            <div className="tfa-menu festag-popup-surface" role="menu">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  role="menuitem"
                  className="tfa-menu-item"
                  onClick={() => void improve(action.id)}
                >
                  {action.label}
                </button>
              ))}
              <button
                type="button"
                role="menuitem"
                className="tfa-menu-item tfa-menu-item--primary"
                onClick={openTagroDiscuss}
              >
                Mit Tagro besprechen
              </button>
            </div>
          )}
        </div>
      </div>
      {multiline ? (
        <textarea
          id={hideLabel ? undefined : inputId}
          aria-labelledby={hideLabel ? inputId : undefined}
          className={`${inputClassName}${multiline ? ' db-area' : ''}`}
          value={value}
          placeholder={placeholder}
          rows={rows}
          disabled={busy}
          onChange={onInputChange}
        />
      ) : (
        <input
          id={hideLabel ? undefined : inputId}
          aria-labelledby={hideLabel ? inputId : undefined}
          className={inputClassName}
          type={inputType}
          value={value}
          placeholder={placeholder}
          disabled={busy}
          onChange={onInputChange}
        />
      )}
    </div>
  )
}

const CSS = `
  .tfa { position: relative; }
  .tfa-label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 2px;
  }
  .tfa-label {
    font-size: 11px;
    font-weight: 500;
    letter-spacing: .02em;
    color: var(--fp-muted, var(--text-muted));
  }
  .tfa-label--sr {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  .tfa-tagro-wrap { position: relative; flex-shrink: 0; }
  .tfa-tagro {
    width: 28px !important;
    height: 28px !important;
    min-width: 28px !important;
    min-height: 28px !important;
    padding: 0 !important;
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
  }
  .tfa-tagro.is-busy { opacity: .45; pointer-events: none; }
  .tfa-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 40;
    min-width: 196px;
    padding: 6px;
    border-radius: 14px;
    box-shadow: var(--festag-elev-shadow-hover, 0 8px 28px rgba(15, 23, 42, 0.14));
    animation: tfaIn .14s ease both;
  }
  @keyframes tfaIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: none; }
  }
  .tfa-menu-item {
    width: 100%;
    display: block;
    text-align: left;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--fp-text, var(--text));
    font: inherit;
    font-size: 13px;
    font-weight: 500;
    padding: 8px 10px;
    cursor: pointer;
  }
  .tfa-menu-item:hover {
    background: var(--fp-pill, var(--surface-2));
  }
  .tfa-menu-item--primary {
    margin-top: 2px;
    border-top: 1px solid var(--fp-divider, var(--border));
    border-radius: 0 0 8px 8px;
    padding-top: 10px;
  }
  .tfa-pos { margin-bottom: 0; }
  .tfa-pos .tfa-label-row {
    position: absolute;
    top: 2px;
    right: 0;
    margin: 0;
    z-index: 2;
  }
  .tfa-pos .db-input { padding-right: 34px; }
`
