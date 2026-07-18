'use client'

import { FormEvent, KeyboardEvent, useRef, useState, type RefObject } from 'react'
import { ArrowUp, Plus } from '@phosphor-icons/react'

type TagroPromptComposerProps = {
  placeholder?: string
  mode?: string
  onSubmit: (value: string, mode?: string) => void | Promise<void>
  showPlus?: boolean
  showModeSelect?: boolean
  statusMessage?: string
  disabled?: boolean
  loading?: boolean
  initialValue?: string
  value?: string
  onChange?: (value: string) => void
  onPlusClick?: () => void
  className?: string
  inputRef?: RefObject<HTMLTextAreaElement | null>
  clearOnSubmit?: boolean
  modes?: string[]
}

export default function TagroPromptComposer({
  placeholder = 'Beschreibe deine Idee oder frage Tagro...',
  mode = 'Standard',
  onSubmit,
  showPlus = true,
  showModeSelect = true,
  statusMessage,
  disabled = false,
  loading = false,
  initialValue = '',
  value: controlledValue,
  onChange,
  onPlusClick,
  className = '',
  inputRef: externalInputRef,
  modes = ['Standard', 'Projekt', 'Task', 'Briefing'],
  clearOnSubmit = true,
}: TagroPromptComposerProps) {
  const [internalValue, setInternalValue] = useState(initialValue)
  const value = controlledValue ?? internalValue
  const setValue = onChange ?? setInternalValue
  const [selectedMode, setSelectedMode] = useState(mode)
  const internalRef = useRef<HTMLTextAreaElement | null>(null)
  const textareaRef = externalInputRef ?? internalRef
  const canSend = value.trim().length > 0 && !disabled && !loading

  async function submit(event?: FormEvent) {
    event?.preventDefault()
    const text = value.trim()
    if (!text || disabled || loading) return
    await onSubmit(text, selectedMode)
    if (clearOnSubmit) setValue('')
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <form className={`tagro-composer${className ? ` ${className}` : ''}`} onSubmit={submit}>
      <style>{`
        .tagro-composer { width:100%; }
        .tagro-composer-bar {
          min-height:56px;
          display:flex;
          align-items:center;
          gap:10px;
          padding:8px 8px 8px 16px;
          border:1px solid color-mix(in srgb, var(--border, rgba(29,29,31,.1)) 88%, transparent);
          border-radius:999px;
          background:var(--festag-glass-bg-strong, color-mix(in srgb, var(--surface, #fff) 94%, transparent));
          box-shadow:var(--festag-glass-shadow-soft, 0 10px 32px rgba(29,29,31,.06), 0 1px 4px rgba(29,29,31,.04));
          backdrop-filter:var(--festag-glass-blur, blur(18px) saturate(155%));
          -webkit-backdrop-filter:var(--festag-glass-blur, blur(18px) saturate(155%));
          transition:border-color .16s ease, box-shadow .16s ease;
        }
        .tagro-composer-bar:focus-within {
          border-color:color-mix(in srgb, var(--text, #1d1d1f) 14%, var(--border, rgba(29,29,31,.1)));
          box-shadow:0 14px 40px rgba(29,29,31,.08), 0 2px 8px rgba(29,29,31,.04);
        }
        .tagro-composer-plus,
        .tagro-composer-send {
          width:36px;
          height:36px;
          border-radius:999px;
          display:flex;
          align-items:center;
          justify-content:center;
          flex-shrink:0;
          border:1px solid color-mix(in srgb, var(--border, rgba(29,29,31,.1)) 76%, transparent);
          background:color-mix(in srgb, var(--surface, #fff) 88%, transparent);
          color:var(--text-secondary, #86868b);
          cursor:pointer;
        }
        .tagro-composer-plus:hover,
        .tagro-composer-send:hover:not(:disabled) {
          background:var(--surface-2, #f5f5f7);
          color:var(--text, #1d1d1f);
        }
        .tagro-composer-send {
          background:var(--text, #1d1d1f);
          color:var(--bg, #ffffff);
          border-color:transparent;
        }
        .tagro-composer-send:disabled {
          opacity:.28;
          cursor:default;
          background:var(--surface-2, #f5f5f7);
          color:var(--text-muted, #86868b);
        }
        .tagro-composer-input {
          flex:1;
          min-width:0;
          border:0;
          outline:0;
          resize:none;
          background:transparent;
          color:var(--text, #1d1d1f);
          height:28px;
          max-height:96px;
          padding:3px 0 0;
          line-height:1.4;
          font-family:var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, sans-serif;
          font-size:15px;
          font-weight:400;
          letter-spacing:0.018em;
        }
        .tagro-composer-input::placeholder {
          color:var(--text-muted, #86868b);
          opacity:.72;
          letter-spacing:0.022em;
          font-weight:400;
        }
        .tagro-composer-mode {
          border:0;
          background:transparent;
          color:var(--text-secondary, #86868b);
          font:inherit;
          font-size:12.5px;
          font-weight:500;
          letter-spacing:0.01em;
          padding:0 2px;
          flex-shrink:0;
        }
        .tagro-composer-status {
          margin:10px 16px 0;
          color:var(--text-muted, #86868b);
          font-size:12px;
          font-weight:400;
          letter-spacing:0.01em;
          line-height:1.4;
        }

        /* Legal dock — simpler ChatGPT-like composer on white legal canvas */
        .tagro-composer--legal {
          --bg: #ffffff;
          --text: #1d1d1f;
          --text-secondary: #6e6e73;
          --text-muted: #86868b;
          --border: rgba(29, 29, 31, 0.08);
          --surface: #ffffff;
          --surface-2: #f5f5f7;
        }
        .tagro-composer--legal .tagro-composer-bar {
          min-height:52px;
          padding:6px 7px 6px 18px;
          border:1px solid var(--festag-glass-edge, rgba(15, 23, 42, 0.06));
          background:var(--festag-glass-bg-strong, rgba(255, 255, 255, 0.92));
          box-shadow:
            0 8px 28px rgba(29, 29, 31, 0.07),
            0 1px 3px rgba(29, 29, 31, 0.03);
          backdrop-filter:var(--festag-glass-blur, blur(18px) saturate(155%));
          -webkit-backdrop-filter:var(--festag-glass-blur, blur(18px) saturate(155%));
        }
        .tagro-composer--legal .tagro-composer-bar:focus-within {
          border-color:rgba(29, 29, 31, 0.12);
          box-shadow:
            0 12px 36px rgba(29, 29, 31, 0.09),
            0 2px 6px rgba(29, 29, 31, 0.04);
        }
        .tagro-composer--legal .tagro-composer-input {
          font-size:15.5px;
          letter-spacing:0.024em;
          height:30px;
          padding-top:4px;
        }
        .tagro-composer--legal .tagro-composer-input::placeholder {
          letter-spacing:0.028em;
          opacity:.68;
        }
        .tagro-composer--legal .tagro-composer-send {
          width:38px;
          height:38px;
        }

        @media (max-width:720px) {
          .tagro-composer-bar { border-radius:24px; align-items:flex-end; }
          .tagro-composer-mode { display:none; }
          .tagro-composer--legal .tagro-composer-bar {
            border-radius:999px;
            align-items:center;
          }
        }
      `}</style>
      <div className="tagro-composer-bar">
        {showPlus && (
          <button
            className="tagro-composer-plus"
            type="button"
            aria-label="Kontext hinzufügen"
            onClick={onPlusClick}
          >
            <Plus size={18} />
          </button>
        )}
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
          <select className="tagro-composer-mode" value={selectedMode} onChange={(event) => setSelectedMode(event.target.value)} aria-label="Tagro Modus">
            {modes.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        )}
        <button className="tagro-composer-send" type="submit" disabled={!canSend} aria-label="An Tagro senden">
          {loading ? '…' : <ArrowUp size={17} weight="bold" />}
        </button>
      </div>
      {statusMessage ? <p className="tagro-composer-status">{statusMessage}</p> : null}
    </form>
  )
}
