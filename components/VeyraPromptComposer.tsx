'use client'

import { FormEvent, KeyboardEvent, useRef, useState } from 'react'
import { ArrowUp, Plus } from '@phosphor-icons/react'

type VeyraPromptComposerProps = {
  placeholder?: string
  mode?: string
  onSubmit: (value: string, mode?: string) => void | Promise<void>
  showPlus?: boolean
  showModeSelect?: boolean
  statusMessage?: string
  disabled?: boolean
  loading?: boolean
  initialValue?: string
  modes?: string[]
}

export default function VeyraPromptComposer({
  placeholder = 'Beschreibe deine Idee oder frage Veyra...',
  mode = 'Standard',
  onSubmit,
  showPlus = true,
  showModeSelect = true,
  statusMessage,
  disabled = false,
  loading = false,
  initialValue = '',
  modes = ['Standard', 'Projekt', 'Task', 'Briefing'],
}: VeyraPromptComposerProps) {
  const [value, setValue] = useState(initialValue)
  const [selectedMode, setSelectedMode] = useState(mode)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const canSend = value.trim().length > 0 && !disabled && !loading

  async function submit(event?: FormEvent) {
    event?.preventDefault()
    const text = value.trim()
    if (!text || disabled || loading) return
    await onSubmit(text, selectedMode)
    setValue('')
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <form className="tagro-composer" onSubmit={submit}>
      <style>{`
        .tagro-composer { width:100%; }
        .tagro-composer-bar {
          min-height:64px;
          display:flex;
          align-items:center;
          gap:12px;
          padding:9px 10px 9px 12px;
          border:1px solid color-mix(in srgb, var(--border) 82%, transparent);
          border-radius:999px;
          background:color-mix(in srgb, var(--surface) 94%, transparent);
          box-shadow:0 18px 60px rgba(0,0,0,.09), 0 2px 10px rgba(0,0,0,.04), inset 0 1px 0 rgba(255,255,255,.18);
          backdrop-filter:blur(22px) saturate(145%);
          -webkit-backdrop-filter:blur(22px) saturate(145%);
          transition:border-color .16s ease, box-shadow .16s ease, transform .16s ease;
        }
        .tagro-composer-bar:focus-within {
          border-color:color-mix(in srgb, var(--text) 18%, var(--border));
          box-shadow:0 24px 76px rgba(0,0,0,.12), 0 4px 14px rgba(0,0,0,.06), inset 0 1px 0 rgba(255,255,255,.22);
        }
        .tagro-composer-plus,
        .tagro-composer-send {
          width:40px;
          height:40px;
          border-radius:999px;
          display:flex;
          align-items:center;
          justify-content:center;
          flex-shrink:0;
          border:1px solid color-mix(in srgb, var(--border) 76%, transparent);
          background:color-mix(in srgb, var(--surface) 88%, transparent);
          color:var(--text-secondary);
        }
        .tagro-composer-plus:hover,
        .tagro-composer-send:hover { background:var(--surface-2); color:var(--text); }
        .tagro-composer-send {
          background:var(--text);
          color:var(--bg);
          border-color:transparent;
        }
        .tagro-composer-send:disabled {
          opacity:.32;
          cursor:default;
          background:var(--surface-2);
          color:var(--text-muted);
        }
        .tagro-composer-input {
          flex:1;
          min-width:0;
          border:0;
          outline:0;
          resize:none;
          background:transparent;
          color:var(--text);
          height:30px;
          max-height:96px;
          padding:4px 0 0;
          line-height:1.35;
          font-size:15px;
          font-weight:600;
        }
        .tagro-composer-input::placeholder { color:var(--text-muted); opacity:.58; }
        .tagro-composer-mode {
          border:0;
          background:transparent;
          color:var(--text-secondary);
          font:inherit;
          font-size:12.5px;
          font-weight:680;
          padding:0 2px;
          flex-shrink:0;
        }
        .tagro-composer-status {
          margin:10px 16px 0;
          color:var(--text-muted);
          font-size:12px;
          font-weight:620;
          line-height:1.4;
        }
        @media (max-width:720px) {
          .tagro-composer-bar { border-radius:24px; align-items:flex-end; }
          .tagro-composer-mode { display:none; }
        }
      `}</style>
      <div className="tagro-composer-bar">
        {showPlus && <button className="tagro-composer-plus" type="button" aria-label="Kontext hinzufügen"><Plus size={18} /></button>}
        <textarea
          ref={textareaRef}
          className="tagro-composer-input"
          value={value}
          rows={1}
          disabled={disabled || loading}
          placeholder={placeholder}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
        />
        {showModeSelect && (
          <select className="tagro-composer-mode" value={selectedMode} onChange={(event) => setSelectedMode(event.target.value)} aria-label="Veyra Modus">
            {modes.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        )}
        <button className="tagro-composer-send" type="submit" disabled={!canSend} aria-label="An Veyra senden">
          {loading ? '…' : <ArrowUp size={18} weight="bold" />}
        </button>
      </div>
      {statusMessage ? <p className="tagro-composer-status">{statusMessage}</p> : null}
    </form>
  )
}
