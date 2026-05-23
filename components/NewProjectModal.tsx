'use client'

/**
 * NewProjectModal — Tagro-led, fullscreen project intake.
 *
 * Behaviour:
 *   • Takes the whole screen (sidebar + workspace fully hidden).
 *   • Top: editable project name + 1-line summary. The user can type
 *     them directly, but they also stream in live as Tagro extracts
 *     them from the conversation.
 *   • Below: a calm chat with Tagro. One question per turn. After a
 *     handful of answers Tagro flips `complete=true` and the create
 *     button becomes the primary action.
 *   • On create: hands the full chatHistory to /api/ai/decompose which
 *     stores the project + epics + tasks, then classifies.
 *
 * Theme-aware via the global tokens (light / dark / read). No emojis —
 * Phosphor / inline-SVG only.
 */

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowUp, PencilSimple, X } from '@phosphor-icons/react'
import TagroLogo from '@/components/TagroLogo'

interface Props {
  onClose: () => void
  onCreated?: (projectId: string) => void
}

type ChatTurn = { role: 'tagro' | 'user'; text: string; pending?: boolean }

const OPENER = 'Erzähl mir kurz, was du bauen möchtest. Ich stelle dir ein paar Fragen und strukturiere das Projekt daraus.'

const PROJECT_COLORS = [
  '#5B647D', '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6',
]

export default function NewProjectModal({ onClose, onCreated }: Props) {
  const supabase = createClient()
  const [name, setName] = useState('')
  const [summary, setSummary] = useState('')
  const [color, setColor] = useState(PROJECT_COLORS[0])
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [nameLocked, setNameLocked] = useState(false)        // user edited → don't overwrite
  const [summaryLocked, setSummaryLocked] = useState(false)

  const [chat, setChat] = useState<ChatTurn[]>([
    { role: 'tagro', text: OPENER },
  ])
  const [input, setInput] = useState('')
  const [asking, setAsking] = useState(false)
  const [complete, setComplete] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Always scroll to bottom when chat changes.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [chat.length, asking])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    // Lock body scroll while open.
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  // Autosize the chat textarea up to a cap.
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = Math.min(180, el.scrollHeight) + 'px'
  }, [input])

  async function send() {
    const text = input.trim()
    if (!text || asking) return
    setError('')
    setInput('')
    const nextHistory: ChatTurn[] = [...chat, { role: 'user', text }]
    setChat([...nextHistory, { role: 'tagro', text: '', pending: true }])
    setAsking(true)

    try {
      const res = await fetch('/api/ai/intake-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatHistory: nextHistory.map(t => ({ role: t.role, text: t.text })),
        }),
      })
      const data = await res.json()

      // Live-fill title / summary unless the user already edited them.
      if (!nameLocked && data?.title)   setName(String(data.title))
      if (!summaryLocked && data?.summary) setSummary(String(data.summary))

      if (data?.complete) {
        setComplete(true)
        setChat([
          ...nextHistory,
          {
            role: 'tagro',
            text: 'Ich habe genug, um das Projekt anzulegen. Du kannst Titel und Zusammenfassung oben jederzeit anpassen.',
          },
        ])
      } else {
        setChat([
          ...nextHistory,
          { role: 'tagro', text: data?.question || 'Erzähl mir noch ein bisschen mehr dazu.' },
        ])
      }
    } catch {
      setChat([
        ...nextHistory,
        { role: 'tagro', text: 'Da hat es kurz gehakt — kannst du das nochmal sagen?' },
      ])
    } finally {
      setAsking(false)
    }
  }

  async function createProject() {
    if (creating) return
    setError('')
    setCreating(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user.id
      if (!userId) throw new Error('Bitte melde dich erneut an.')

      // Compose chat history for decompose. Append explicit override
      // turns so the structuring respects the user's manual edits.
      const overrides: ChatTurn[] = []
      if (name.trim()) overrides.push({ role: 'user', text: `Projekttitel: ${name.trim()}` })
      if (summary.trim()) overrides.push({ role: 'user', text: `Kurze Zusammenfassung: ${summary.trim()}` })

      const chatHistory = [
        { role: 'ai', text: OPENER },
        ...chat.filter(t => !t.pending).map(t => ({
          role: t.role === 'tagro' ? 'ai' : 'user',
          text: t.text,
        })),
        ...overrides.map(o => ({ role: 'user', text: o.text })),
      ]

      const res = await fetch('/api/ai/decompose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatHistory, userId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Tagro konnte das Projekt nicht strukturieren.')
      const projectId: string | undefined = data?.projectId
      if (!projectId) throw new Error('Projekt wurde analysiert, aber noch nicht gespeichert.')

      // Apply the manual overrides — decompose stores what the AI
      // extracted; the user's edits + chosen colour win.
      const patch: Record<string, unknown> = {}
      if (name.trim())    patch.title = name.trim()
      if (summary.trim()) patch.scope_summary = summary.trim()
      if (color)          patch.color = color
      if (Object.keys(patch).length) {
        await (supabase as any).from('projects').update(patch).eq('id', projectId)
      }

      // Classify (project_type / module preset) — fire-and-forget.
      fetch('/api/projects/classify', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: `${name.trim()}\n\n${summary.trim()}\n\n${chat.filter(t => t.role === 'user').map(t => t.text).join('\n')}`,
          projectId,
        }),
      }).catch(() => {})

      onCreated?.(projectId)
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Projekt konnte nicht angelegt werden.')
    } finally {
      setCreating(false)
    }
  }

  function onKeyDownInput(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (complete && name.trim()) createProject()
      else send()
    }
  }

  return (
    <div className="np-root" role="dialog" aria-modal="true">
      <style>{CSS}</style>

      {/* Compact header — Tagro mark, close */}
      <header className="np-head">
        <div className="np-head-left">
          <TagroLogo size={22} thinking={asking} />
          <span className="np-head-label">Neues Projekt</span>
        </div>
        <button className="np-icon-btn" onClick={onClose} aria-label="Schließen" type="button">
          <X size={17} />
        </button>
      </header>

      <main className="np-body">
        {/* TOP — editable title + summary, with color swatch */}
        <section className="np-meta">
          <div className="np-meta-row">
            <button
              className="np-color"
              type="button"
              onClick={() => setShowColorPicker(v => !v)}
              style={{ background: color }}
              aria-label="Projektfarbe ändern"
            />
            {showColorPicker && (
              <div className="np-color-pop">
                {PROJECT_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`np-color-dot${c === color ? ' on' : ''}`}
                    style={{ background: c }}
                    onClick={() => { setColor(c); setShowColorPicker(false) }}
                    aria-label={`Farbe ${c}`}
                  />
                ))}
              </div>
            )}
            <div className="np-meta-inputs">
              <div className="np-meta-name-row">
                <input
                  className="np-name"
                  placeholder="Projektname"
                  value={name}
                  onChange={e => { setName(e.target.value); if (!nameLocked) setNameLocked(true) }}
                  autoFocus
                />
                {!nameLocked && name && (
                  <span className="np-livehint" title="Tagro hat das aus dem Chat abgeleitet — überschreibe es jederzeit.">
                    <PencilSimple size={11} /> live
                  </span>
                )}
              </div>
              <input
                className="np-summary"
                placeholder="Kurze Zusammenfassung — wird live von Tagro ausgefüllt"
                value={summary}
                onChange={e => { setSummary(e.target.value); if (!summaryLocked) setSummaryLocked(true) }}
              />
            </div>
          </div>
        </section>

        {/* CHAT — scrollable conversation */}
        <section className="np-chat" ref={scrollRef}>
          <div className="np-chat-inner">
            {chat.map((turn, i) => (
              <div key={i} className={`np-msg ${turn.role}`}>
                {turn.role === 'tagro' && (
                  <div className="np-msg-avatar">
                    <TagroLogo size={16} thinking={turn.pending} />
                  </div>
                )}
                <div className="np-msg-bubble">
                  {turn.pending ? (
                    <span className="np-typing"><span /><span /><span /></span>
                  ) : (
                    turn.text
                  )}
                </div>
              </div>
            ))}
            {complete && (
              <p className="np-complete-note">
                Du kannst die Antworten oben noch anpassen oder direkt anlegen.
              </p>
            )}
          </div>
        </section>

        {/* INPUT bar — composer + primary action */}
        <section className="np-composer">
          {error && <p className="np-error">{error}</p>}
          <div className="np-composer-row">
            <textarea
              ref={inputRef}
              className="np-input"
              placeholder={complete ? 'Noch etwas hinzufügen? (optional)' : 'Antworte Tagro…'}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDownInput}
              rows={1}
              disabled={creating}
            />
            <div className="np-composer-actions">
              {complete ? (
                <button
                  className="np-primary"
                  type="button"
                  onClick={createProject}
                  disabled={!name.trim() || creating}
                >
                  {creating ? 'Lege an…' : 'Projekt anlegen'}
                </button>
              ) : (
                <button
                  className="np-send"
                  type="button"
                  onClick={send}
                  disabled={!input.trim() || asking}
                  aria-label="Senden"
                >
                  <ArrowUp size={15} weight="bold" />
                </button>
              )}
            </div>
          </div>
          <p className="np-hint">
            {complete
              ? <>Enter zum Anlegen · Esc zum Schließen</>
              : <>Enter sendet · Shift+Enter neue Zeile · Tagro nutzt das, um Scope &amp; Aufgaben abzuleiten</>
            }
          </p>
        </section>
      </main>
    </div>
  )
}

const CSS = `
  .np-root {
    position: fixed; inset: 0; z-index: 12500;
    background: var(--bg); color: var(--text);
    display: flex; flex-direction: column;
    font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
    animation: npFade .18s ease both;
  }
  @keyframes npFade { from { opacity:0 } to { opacity:1 } }

  .np-head {
    height: 54px; padding: 0 18px;
    display: flex; align-items: center; justify-content: space-between;
    border-bottom: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
    flex-shrink: 0;
  }
  .np-head-left { display: flex; align-items: center; gap: 10px; }
  .np-head-label {
    font-size: 12px; font-weight: 500;
    letter-spacing: .12em; text-transform: uppercase;
    color: var(--text-muted);
  }
  .np-icon-btn {
    width: 32px; height: 32px; border: 0; background: transparent;
    color: var(--text-muted); border-radius: 10px;
    display: inline-flex; align-items: center; justify-content: center;
    cursor: pointer; transition: background .12s, color .12s;
  }
  .np-icon-btn:hover { background: color-mix(in srgb, var(--surface-2) 70%, transparent); color: var(--text); }

  .np-body {
    flex: 1 1 auto; min-height: 0;
    display: grid; grid-template-rows: auto 1fr auto;
    width: 100%; max-width: 760px; margin: 0 auto;
    padding: 36px 32px 0;
  }

  /* META — title + summary + color swatch */
  .np-meta { padding-bottom: 22px; }
  .np-meta-row { display: flex; gap: 16px; align-items: flex-start; position: relative; }
  .np-color {
    width: 38px; height: 38px;
    border-radius: 11px;
    border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
    cursor: pointer; flex-shrink: 0;
    box-shadow: 0 1px 2px color-mix(in srgb, var(--text) 10%, transparent);
    transition: transform .12s;
    margin-top: 8px;
  }
  .np-color:hover { transform: scale(1.04); }
  .np-color-pop {
    position: absolute; top: 56px; left: 0; z-index: 10;
    display: grid; grid-template-columns: repeat(5, 28px); gap: 8px;
    padding: 12px; border-radius: 14px;
    background: var(--card); border: 1px solid var(--border);
    box-shadow: 0 12px 32px -8px color-mix(in srgb, var(--text) 30%, transparent);
  }
  .np-color-dot {
    width: 28px; height: 28px; border-radius: 8px; border: 0;
    cursor: pointer; padding: 0;
    box-shadow: 0 0 0 0 transparent; transition: box-shadow .12s;
  }
  .np-color-dot.on { box-shadow: 0 0 0 2px var(--text); }

  .np-meta-inputs { flex: 1; min-width: 0; }
  .np-meta-name-row { display: flex; align-items: center; gap: 10px; }
  .np-name {
    flex: 1; min-width: 0;
    background: transparent; border: 0; outline: 0;
    color: var(--text); font: inherit;
    font-size: 28px; font-weight: 500; letter-spacing: -.02em;
    padding: 4px 0 6px;
  }
  .np-name::placeholder { color: color-mix(in srgb, var(--text-muted) 80%, transparent); opacity: .55; }

  .np-livehint {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 8px; border-radius: 999px;
    background: color-mix(in srgb, var(--surface-2) 70%, transparent);
    border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
    font-size: 10.5px; font-weight: 500; letter-spacing: .04em;
    color: var(--text-muted);
    text-transform: lowercase;
  }

  .np-summary {
    width: 100%;
    background: transparent; border: 0; outline: 0;
    color: var(--text-secondary); font: inherit;
    font-size: 14px; font-weight: 500; letter-spacing: .015em;
    padding: 2px 0;
  }
  .np-summary::placeholder { color: color-mix(in srgb, var(--text-muted) 60%, transparent); opacity: .5; }

  /* CHAT */
  .np-chat {
    border-top: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
    overflow-y: auto; overflow-x: hidden;
    padding: 24px 0 8px;
    scrollbar-width: thin;
  }
  .np-chat-inner {
    display: flex; flex-direction: column; gap: 14px;
    padding-bottom: 14px;
  }
  .np-msg {
    display: flex; gap: 10px;
    animation: npMsgIn .25s cubic-bezier(.16,1,.3,1) both;
  }
  .np-msg.user { justify-content: flex-end; }
  .np-msg-avatar {
    width: 26px; height: 26px; flex-shrink: 0;
    display: inline-flex; align-items: center; justify-content: center;
    margin-top: 4px;
  }
  .np-msg-bubble {
    max-width: 78%;
    padding: 11px 14px;
    border-radius: 14px;
    font-size: 14px; line-height: 1.5; font-weight: 500; letter-spacing: .01em;
    word-wrap: break-word;
    white-space: pre-wrap;
  }
  .np-msg.tagro .np-msg-bubble {
    background: color-mix(in srgb, var(--surface-2) 75%, transparent);
    color: var(--text);
    border: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
    border-top-left-radius: 4px;
  }
  .np-msg.user .np-msg-bubble {
    background: var(--btn-prim);
    color: var(--btn-prim-text);
    border-top-right-radius: 4px;
  }
  @keyframes npMsgIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

  .np-typing { display: inline-flex; gap: 4px; padding: 4px 0; }
  .np-typing span {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--text-muted); opacity: .5;
    animation: npDot 1.2s ease-in-out infinite;
  }
  .np-typing span:nth-child(2) { animation-delay: .15s; }
  .np-typing span:nth-child(3) { animation-delay: .3s; }
  @keyframes npDot { 0%,80%,100% { transform: translateY(0); opacity: .35 } 40% { transform: translateY(-3px); opacity: .9 } }

  .np-complete-note {
    margin: 6px 0 0;
    padding: 10px 14px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--accent) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent) 22%, transparent);
    color: var(--text-secondary);
    font-size: 12.5px; font-weight: 500; line-height: 1.5;
  }

  /* COMPOSER */
  .np-composer {
    padding: 12px 0 22px;
    border-top: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
  }
  .np-composer-row {
    display: flex; gap: 10px; align-items: flex-end;
    padding: 10px 12px;
    border-radius: 16px;
    border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
    background: color-mix(in srgb, var(--surface) 70%, transparent);
    transition: border-color .12s, box-shadow .12s;
  }
  .np-composer-row:focus-within {
    border-color: color-mix(in srgb, var(--text) 30%, var(--border));
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--text) 6%, transparent);
  }
  .np-input {
    flex: 1; min-width: 0;
    background: transparent; border: 0; outline: 0; resize: none;
    color: var(--text); font: inherit;
    font-size: 14px; line-height: 1.5; font-weight: 500;
    padding: 6px 4px;
    max-height: 180px;
  }
  .np-input::placeholder { color: var(--text-muted); opacity: .55; }
  .np-composer-actions { display: flex; align-items: flex-end; gap: 6px; }
  .np-send {
    width: 34px; height: 34px; border: 0; border-radius: 10px;
    background: var(--btn-prim); color: var(--btn-prim-text);
    display: inline-flex; align-items: center; justify-content: center;
    cursor: pointer; transition: opacity .12s, transform .12s;
  }
  .np-send:hover:not(:disabled) { opacity: .92; }
  .np-send:active:not(:disabled) { transform: scale(.96); }
  .np-send:disabled { opacity: .4; cursor: not-allowed; }
  .np-primary {
    height: 34px; padding: 0 16px; border: 0;
    border-radius: 999px;
    background: var(--btn-prim); color: var(--btn-prim-text);
    font: inherit; font-size: 13px; font-weight: 500; letter-spacing: .015em;
    cursor: pointer; transition: opacity .12s, transform .12s;
  }
  .np-primary:hover:not(:disabled) { opacity: .92; }
  .np-primary:active:not(:disabled) { transform: scale(.97); }
  .np-primary:disabled { opacity: .4; cursor: not-allowed; }

  .np-hint {
    margin: 8px 4px 0;
    font-size: 11px; font-weight: 500; letter-spacing: .04em;
    color: var(--text-muted); opacity: .8;
    text-align: center;
  }
  .np-error {
    margin: 0 0 8px;
    padding: 8px 12px; border-radius: 10px;
    background: color-mix(in srgb, #ef4444 10%, transparent);
    color: #ef4444;
    font-size: 12.5px; font-weight: 500;
  }

  @media (max-width: 720px) {
    .np-body { padding: 24px 18px 0; }
    .np-name { font-size: 22px; }
    .np-msg-bubble { max-width: 86%; font-size: 13.5px; }
  }
`
