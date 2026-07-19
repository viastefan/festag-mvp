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
  /** Pinned @-context chip inside the bar (e.g. `@Nutzungsbedingungen`). */
  contextChip?: string
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
  contextChip,
}: TagroPromptComposerProps) {
  const [internalValue, setInternalValue] = useState(initialValue)
  const value = controlledValue ?? internalValue
  const setValue = onChange ?? setInternalValue
  const [selectedMode, setSelectedMode] = useState(mode)
  const [focused, setFocused] = useState(false)
  const internalRef = useRef<HTMLTextAreaElement | null>(null)
  const textareaRef = externalInputRef ?? internalRef
  const canSend = value.trim().length > 0 && !disabled && !loading
  const isLegal = className.includes('tagro-composer--legal')
  const sendReady = canSend || focused
  const chip = contextChip?.trim() || ''

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
        .tagro-composer-chip {
          display:inline-flex;
          align-items:center;
          flex-shrink:0;
          max-width:42%;
          height:28px;
          padding:0 10px;
          border-radius:999px;
          background:#f5f5f7;
          color:#1e1e20;
          font-family:var(--font-aeonik, 'Aeonik'), Inter, -apple-system, BlinkMacSystemFont, sans-serif;
          font-size:12px;
          font-weight:500;
          letter-spacing:0.01em;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
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

        /* Legal / mobile dock — same ChatGPT-mobile language as portal briefing composer */
        .tagro-composer--legal {
          --bg: #ffffff;
          --text: #1e1e20;
          --text-secondary: #86868b;
          --text-muted: #aeaeb2;
          --border: rgba(0, 0, 0, 0.1);
          --surface: #ffffff;
          --surface-2: #f5f5f7;
        }
        .tagro-composer--legal .tagro-composer-bar {
          min-height:52px;
          gap:8px;
          padding:8px 10px 8px 6px;
          border-radius:999px;
          border:1px solid rgba(241, 242, 246, 0.55);
          background:#ffffff;
          box-shadow:
            0 2px 4px rgba(15, 15, 16, 0.05),
            0 1.5px 1px rgba(46, 47, 51, 0.1);
          backdrop-filter:none;
          -webkit-backdrop-filter:none;
          transition:border-color .15s ease, box-shadow .15s ease, background .15s ease;
        }
        .tagro-composer--legal .tagro-composer-bar.is-focused,
        .tagro-composer--legal .tagro-composer-bar:focus-within {
          border-color:rgba(0, 0, 0, 0.1);
          background:#ffffff;
          box-shadow:
            0 2px 6px rgba(15, 15, 16, 0.08),
            0 1.5px 1px rgba(46, 47, 51, 0.12),
            0 0 0 3px rgba(15, 23, 42, 0.04);
        }
        .tagro-composer--legal .tagro-composer-plus {
          width:32px;
          height:32px;
          margin:0;
          border:none;
          background:transparent;
          color:#86868b;
        }
        .tagro-composer--legal .tagro-composer-plus:hover {
          background:rgba(0, 0, 0, 0.05);
          color:#1e1e20;
        }
        .tagro-composer--legal .tagro-composer-chip {
          margin-left:2px;
          background:#f5f5f7;
          color:#1e1e20;
        }
        .tagro-composer--legal .tagro-composer-input {
          align-self:center;
          height:auto;
          min-height:24px;
          max-height:96px;
          padding:0;
          font-size:14px;
          font-weight:500;
          letter-spacing:0.01em;
          line-height:1.35;
          color:#1e1e20;
        }
        .tagro-composer--legal .tagro-composer-input::placeholder {
          color:#aeaeb2;
          opacity:1;
          font-weight:500;
          letter-spacing:0.01em;
        }
        .tagro-composer--legal .tagro-composer-send {
          width:36px;
          height:36px;
          border:none;
          background:transparent;
          color:#c7c7cc;
          transition:background .15s ease, color .15s ease, opacity .15s ease;
        }
        .tagro-composer--legal .tagro-composer-send.is-visible {
          background:color-mix(in srgb, #5b647d 42%, #f5f5f7);
          color:#ffffff;
        }
        .tagro-composer--legal .tagro-composer-send.is-visible:not(:disabled) {
          background:#5b647d;
          color:#fff;
        }
        .tagro-composer--legal .tagro-composer-send:disabled {
          opacity:1;
          background:transparent;
          color:#c7c7cc;
        }

        [data-theme="dark"] .tagro-composer--legal,
        [data-theme="classic-dark"] .tagro-composer--legal,
        html[data-theme="dark"] .tagro-composer--legal,
        html[data-theme="classic-dark"] .tagro-composer--legal {
          --bg: var(--festag-black-popup, #121214);
          --text: #f4f4f5;
          --text-secondary: rgba(245, 245, 247, 0.62);
          --text-muted: rgba(245, 245, 247, 0.48);
          --border: rgba(255, 255, 255, 0.1);
          --surface: var(--festag-black-popup, #121214);
          --surface-2: rgba(255, 255, 255, 0.06);
        }
        [data-theme="dark"] .tagro-composer--legal .tagro-composer-bar,
        [data-theme="classic-dark"] .tagro-composer--legal .tagro-composer-bar,
        html[data-theme="dark"] .tagro-composer--legal .tagro-composer-bar,
        html[data-theme="classic-dark"] .tagro-composer--legal .tagro-composer-bar {
          background:var(--festag-black-popup, #121214);
          border-color:rgba(255, 255, 255, 0.1);
          box-shadow:
            0 2px 4px rgba(0, 0, 0, 0.28),
            0 1.5px 1px rgba(0, 0, 0, 0.22);
        }
        [data-theme="dark"] .tagro-composer--legal .tagro-composer-bar.is-focused,
        [data-theme="dark"] .tagro-composer--legal .tagro-composer-bar:focus-within,
        [data-theme="classic-dark"] .tagro-composer--legal .tagro-composer-bar.is-focused,
        [data-theme="classic-dark"] .tagro-composer--legal .tagro-composer-bar:focus-within,
        html[data-theme="dark"] .tagro-composer--legal .tagro-composer-bar.is-focused,
        html[data-theme="dark"] .tagro-composer--legal .tagro-composer-bar:focus-within,
        html[data-theme="classic-dark"] .tagro-composer--legal .tagro-composer-bar.is-focused,
        html[data-theme="classic-dark"] .tagro-composer--legal .tagro-composer-bar:focus-within {
          border-color:rgba(255, 255, 255, 0.14);
          background:var(--festag-black-popup, #121214);
          box-shadow:
            0 2px 6px rgba(0, 0, 0, 0.34),
            0 0 0 3px rgba(255, 255, 255, 0.06);
        }
        [data-theme="dark"] .tagro-composer--legal .tagro-composer-chip,
        [data-theme="classic-dark"] .tagro-composer--legal .tagro-composer-chip,
        html[data-theme="dark"] .tagro-composer--legal .tagro-composer-chip,
        html[data-theme="classic-dark"] .tagro-composer--legal .tagro-composer-chip {
          background:rgba(255, 255, 255, 0.08);
          color:rgba(245, 245, 247, 0.92);
        }
        [data-theme="dark"] .tagro-composer--legal .tagro-composer-input,
        [data-theme="classic-dark"] .tagro-composer--legal .tagro-composer-input,
        html[data-theme="dark"] .tagro-composer--legal .tagro-composer-input,
        html[data-theme="classic-dark"] .tagro-composer--legal .tagro-composer-input {
          color:#f4f4f5;
        }
        [data-theme="dark"] .tagro-composer--legal .tagro-composer-input::placeholder,
        [data-theme="classic-dark"] .tagro-composer--legal .tagro-composer-input::placeholder,
        html[data-theme="dark"] .tagro-composer--legal .tagro-composer-input::placeholder,
        html[data-theme="classic-dark"] .tagro-composer--legal .tagro-composer-input::placeholder {
          color:rgba(245, 245, 247, 0.42);
        }
        [data-theme="dark"] .tagro-composer--legal .tagro-composer-send.is-visible:not(:disabled),
        [data-theme="classic-dark"] .tagro-composer--legal .tagro-composer-send.is-visible:not(:disabled),
        html[data-theme="dark"] .tagro-composer--legal .tagro-composer-send.is-visible:not(:disabled),
        html[data-theme="classic-dark"] .tagro-composer--legal .tagro-composer-send.is-visible:not(:disabled) {
          background:#fff;
          color:#000;
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
      <div className={[
        'tagro-composer-bar',
        focused ? 'is-focused' : '',
        canSend ? 'is-ready' : '',
      ].filter(Boolean).join(' ')}>
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
        {chip ? (
          <span className="tagro-composer-chip" title={chip}>
            {chip}
          </span>
        ) : null}
        <textarea
          ref={textareaRef}
          className="tagro-composer-input"
          value={value}
          rows={1}
          disabled={disabled || loading}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
        />
        {showModeSelect && (
          <select className="tagro-composer-mode" value={selectedMode} onChange={(event) => setSelectedMode(event.target.value)} aria-label="Tagro Modus">
            {modes.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        )}
        <button
          className={[
            'tagro-composer-send',
            className.includes('tagro-composer--legal') && sendReady ? 'is-visible' : '',
          ].filter(Boolean).join(' ')}
          type="submit"
          disabled={!canSend}
          aria-label="An Tagro senden"
        >
          {loading ? '…' : <ArrowUp size={17} weight="bold" />}
        </button>
      </div>
      {statusMessage ? <p className="tagro-composer-status">{statusMessage}</p> : null}
    </form>
  )
}
