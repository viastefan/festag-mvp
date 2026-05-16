'use client'

import { useRef } from 'react'

/**
 * Modern Figma-style AI chat input.
 *
 *  ┌───────────────────────────────────────────────────────────────┐
 *  │ [+]  Beschreibe deine Idee…                  [Mode▾]    [↑]   │
 *  └───────────────────────────────────────────────────────────────┘
 *  Optional banner slot below for credits / hints / errors.
 */
type Mode = { id: string; label: string }

interface ChatInputProps {
  value: string
  onChange: (v: string) => void
  onSend: () => void
  loading?: boolean
  placeholder?: string
  mode?: string
  modes?: Mode[]
  onModeChange?: (id: string) => void
  onAttach?: () => void
  banner?: React.ReactNode
  autoFocus?: boolean
  maxRows?: number
}

export default function ChatInput({
  value, onChange, onSend, loading=false,
  placeholder='Beschreibe deine Idee…',
  mode='standard', modes, onModeChange, onAttach,
  banner, autoFocus=false, maxRows=8,
}: ChatInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const can = !loading && value.trim().length > 0
  const showMode = !!modes && modes.length > 0

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (can) onSend() }
  }
  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value)
    e.target.style.height = 'auto'
    const lh = 22, max = maxRows * lh + 24
    e.target.style.height = Math.min(e.target.scrollHeight, max) + 'px'
  }

  const activeMode = modes?.find(m => m.id === mode) ?? modes?.[0]

  return (
    <div style={{ width:'100%', position:'relative' }}>
      <style>{`
        @keyframes ci-spin{to{transform:rotate(360deg);}}
        .ci-wrap { position:relative; background:var(--surface); border:1px solid var(--border); border-radius:18px; box-shadow:0 8px 28px rgba(15,23,42,.06), 0 1px 0 rgba(15,23,42,.02); transition:border-color .15s, box-shadow .15s; padding:6px 6px 6px 8px; display:flex; align-items:flex-end; gap:6px; }
        .ci-wrap:focus-within { border-color:var(--border-strong); box-shadow:0 8px 28px var(--glow), 0 0 0 4px var(--glow); }
        .ci-iconbtn { width:34px; height:34px; border-radius:50%; border:1px solid var(--border); background:var(--card); color:var(--text-secondary); display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; transition:background .12s, color .12s, border-color .12s; }
        .ci-iconbtn:hover { background:var(--surface-2); color:var(--text); }
        .ci-text { flex:1; resize:none; border:none; outline:none; background:transparent; font-family:inherit; font-size:15px; line-height:1.55; color:var(--text); padding:9px 4px; min-height:38px; max-height:300px; overflow-y:auto; caret-color:var(--text); font-weight:500; }
        .ci-text::placeholder { color:var(--text-muted); opacity:.85; }
        .ci-mode { display:inline-flex; align-items:center; gap:4px; height:30px; padding:0 11px; margin-bottom:2px; background:transparent; border:none; cursor:pointer; color:var(--text-secondary); font-family:inherit; font-size:13px; font-weight:500; border-radius:9px; transition:background .12s; }
        .ci-mode:hover { background:var(--surface-2); color:var(--text); }
        .ci-send { width:36px; height:36px; border-radius:50%; border:none; flex-shrink:0; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:transform .12s, background .15s; margin-bottom:1px; }
        .ci-send:active:not(:disabled) { transform:scale(.92); }
        .ci-send.on { background:var(--btn-prim); color:var(--btn-prim-text); box-shadow:0 4px 14px rgba(91,100,125,.25); }
        .ci-send.off { background:var(--surface-2); color:var(--text-muted); cursor:default; }
      `}</style>

      <div className="ci-wrap">
        {/* + attach */}
        <button onClick={onAttach} className="ci-iconbtn" type="button" title="Anhängen" aria-label="Anhängen"
          style={{ marginBottom:1 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>

        <textarea
          ref={ref}
          value={value}
          autoFocus={autoFocus}
          onChange={handleInput}
          onKeyDown={handleKey}
          rows={1}
          placeholder={placeholder}
          className="ci-text"
        />

        {showMode && (
          <button className="ci-mode" type="button" onClick={() => {
            if (!modes || !onModeChange) return
            const idx = modes.findIndex(m => m.id === mode)
            const next = modes[(idx + 1) % modes.length]
            onModeChange(next.id)
          }}>
            {activeMode?.label}
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        )}

        <button onClick={() => can && onSend()} disabled={!can}
          className={`ci-send ${can?'on':'off'}`}
          aria-label="Senden">
          {loading ? (
            <span style={{ width:13, height:13, border:'2px solid currentColor', borderRightColor:'transparent', borderRadius:'50%', animation:'ci-spin .7s linear infinite', display:'inline-block', opacity:.7 }}/>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
          )}
        </button>
      </div>

      {banner}
    </div>
  )
}
