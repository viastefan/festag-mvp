'use client'
import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import VeyraLogo from '@/components/VeyraLogo'

type Msg = { role: 'user' | 'ai'; text: string }

const QUICK = ['Projektstatus prüfen', 'Risiken erkennen', 'Entscheidung vorbereiten', 'Update formulieren']

const SYSTEM = `Du bist Veyra Copilot von Festag — das AI-native Softwareproduktionssystem.
Antworte immer auf Deutsch. Maximal 3 prägnante Sätze. Kein Smalltalk, keine Emojis.
Du kannst Projektstatus, Tasks, Fortschritt und nächste Schritte erklären.
Wenn du Projektdaten hast, nutze sie konkret.`

export default function CopilotPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [context, setContext] = useState('')
  const [expanded, setExpanded] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    function onCompose(event: Event) {
      const detail = (event as CustomEvent<{ prompt?: string }>).detail
      if (!detail?.prompt) return
      setInput(detail.prompt)
      setTimeout(() => inputRef.current?.focus(), 80)
    }

    window.addEventListener('tagro-compose', onCompose)
    return () => window.removeEventListener('tagro-compose', onCompose)
  }, [])

  useEffect(() => {
    if (!open) return
    setTimeout(() => inputRef.current?.focus(), 80)

    const sb = createClient()
    sb.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      const [{ data: projs }, { data: tasks }] = await Promise.all([
        sb.from('projects').select('id,title,status,description').order('created_at', { ascending: false }).limit(5),
        sb.from('tasks').select('id,title,status,project_id').order('created_at', { ascending: false }).limit(30),
      ])
      if (!projs?.length) return
      const PHASE: Record<string, string> = { intake: 'Intake', planning: 'Planung', active: 'In Arbeit', testing: 'Testing', done: 'Abgeschlossen' }
      const ctx = projs.map(p => {
        const pt = tasks?.filter(t => t.project_id === p.id) ?? []
        const done = pt.filter(t => t.status === 'done').length
        const doing = pt.filter(t => t.status === 'doing').length
        const todo = pt.filter(t => t.status === 'todo').length
        return `- ${p.title} (${PHASE[p.status] ?? p.status}): ${done} erledigt, ${doing} in Arbeit, ${todo} offen`
      }).join('\n')
      setContext(`\n\nAktuelle Projekte:\n${ctx}`)
    })
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, loading])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  async function send(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')
    const newMsgs: Msg[] = [...msgs, { role: 'user', text: msg }]
    setMsgs(newMsgs)
    setLoading(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: SYSTEM + context,
          max_tokens: 320,
          messages: newMsgs.slice(-8).map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text })),
        }),
      })
      if (!res.ok) throw new Error('Veyra request failed')
      const d = await res.json()
      setMsgs(m => [...m, { role: 'ai', text: d.content?.[0]?.text ?? 'Ich konnte gerade keine belastbare Antwort erzeugen. Bitte stelle die Frage noch einmal etwas konkreter.' }])
    } catch {
      setMsgs(m => [...m, { role: 'ai', text: 'Verbindungsfehler. Bitte erneut versuchen.' }])
    }
    setLoading(false)
  }

  if (!mounted || !open) return null
  const contextReady = context.trim().length > 0
  const empty = msgs.length === 0 && !loading

  const panel = (
    <div className="cp-wrap" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <style>{`
        .cp-wrap {
          position: fixed;
          inset: 0;
          z-index: 7100;
          display: flex;
          justify-content: flex-end;
          align-items: flex-end;
          pointer-events: all;
          background: rgba(10,13,20,0.07);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          animation: cpShade .18s ease-out both;
        }
        @keyframes cpShade { from { opacity: 0; } to { opacity: 1; } }
        .copilot-full-panel {
          position: fixed;
          right: 20px;
          bottom: 22px;
          width: 560px;
          max-width: min(560px, calc(100vw - 36px));
          height: min(760px, calc(100dvh - 54px));
          z-index: 7101;
          display: flex;
          flex-direction: column;
          background: var(--surface);
          border: 1px solid color-mix(in srgb, var(--border) 54%, transparent);
          border-radius: 18px;
          box-shadow:
            0 34px 92px rgba(10, 13, 20, .18),
            0 12px 32px rgba(10, 13, 20, .10),
            0 1px 0 rgba(255, 255, 255, .72) inset;
          animation: cpSlide .24s cubic-bezier(.16,1,.3,1);
          overflow: hidden;
        }
        .copilot-full-panel.expanded {
          width: min(760px, calc(100vw - 56px));
          height: min(820px, calc(100dvh - 54px));
        }
        @keyframes cpSlide {
          from { transform: translateY(14px) scale(.985); opacity: 0; }
          to { transform: none; opacity: 1; }
        }
        [data-theme="dark"] .cp-wrap { background: rgba(0,0,0,0.26); }
        [data-theme="dark"] .copilot-full-panel {
          background: color-mix(in srgb, var(--surface) 96%, #111722 4%);
          box-shadow:
            0 34px 92px rgba(0, 0, 0, .36),
            0 12px 32px rgba(0, 0, 0, .24),
            0 1px 0 rgba(255, 255, 255, .05) inset;
        }
        [data-theme="read"] .cp-wrap { background: rgba(38,33,24,0.10); }
        @media(max-width: 768px) {
          .copilot-full-panel,
          .copilot-full-panel.expanded {
            left: 10px !important;
            right: 10px !important;
            bottom: calc(84px + var(--safe-bottom)) !important;
            width: auto !important;
            max-width: none !important;
            height: min(590px, calc(100dvh - 126px)) !important;
            border-radius: 18px !important;
            animation: cpSlideUp .22s cubic-bezier(.16,1,.3,1) !important;
          }
          @keyframes cpSlideUp {
            from { transform: translateY(24px); opacity: 0; }
            to { transform: none; opacity: 1; }
          }
        }
        .cp-msg-in { animation: cpFadeUp .18s cubic-bezier(.16,1,.3,1) both; }
        @keyframes cpFadeUp { from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;} }
        .cp-header {
          min-height: 62px;
          padding: 0 20px 0 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
          background: color-mix(in srgb, var(--surface) 98%, transparent);
        }
        .cp-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .cp-beta {
          height: 28px;
          padding: 0 12px;
          border-radius: 999px;
          border: 1px solid color-mix(in srgb, var(--border-strong) 70%, transparent);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 500;
          letter-spacing: .06em;
        }
        .cp-title {
          margin: 0;
          font-size: 15px;
          line-height: 1;
          font-weight: 500;
          letter-spacing: .01em;
          color: var(--text);
        }
        .cp-window-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .cp-action {
          width: 30px;
          height: 30px;
          border-radius: 10px;
          border: 0;
          background: transparent;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background .14s ease, color .14s ease, transform .14s ease;
        }
        .cp-action:hover {
          background: color-mix(in srgb, var(--surface-2) 72%, transparent);
          color: var(--text);
        }
        .cp-action:active { transform: scale(.96); }
        .cp-thread {
          flex: 1;
          overflow-y: auto;
          padding: 18px 18px 14px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          background: var(--surface);
        }
        .cp-thread.empty {
          justify-content: center;
          align-items: center;
          padding: 44px 30px 28px;
        }
        .cp-empty-state {
          width: min(100%, 460px);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          color: var(--text);
        }
        .cp-empty-logo {
          margin-bottom: 20px;
          color: var(--text-secondary);
          opacity: .92;
        }
        .cp-empty-title {
          margin: 0;
          font-size: 19px;
          line-height: 1.24;
          font-weight: 500;
          letter-spacing: .01em;
          color: var(--text);
        }
        .cp-empty-copy {
          margin: 9px 0 22px;
          max-width: 380px;
          font-size: 14px;
          line-height: 1.5;
          font-weight: 400;
          letter-spacing: .01em;
          color: var(--text-secondary);
        }
        .cp-empty-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 9px;
          margin-bottom: 22px;
        }
        .cp-empty-action,
        .cp-quick-btn {
          min-height: 34px;
          padding: 0 14px;
          border-radius: 10px;
          border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
          background: color-mix(in srgb, var(--surface) 96%, transparent);
          box-shadow:
            0 8px 20px rgba(10, 13, 20, .06),
            0 1px 0 rgba(255,255,255,.76) inset;
          color: var(--text-secondary);
          white-space: nowrap;
          cursor: pointer;
          font-family: inherit;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: .01em;
          transition: transform .14s ease, color .14s ease, background .14s ease, box-shadow .14s ease;
        }
        .cp-empty-action:hover,
        .cp-quick-btn:hover {
          transform: translateY(-1px);
          color: var(--text);
          background: var(--surface);
          box-shadow:
            0 12px 26px rgba(10, 13, 20, .10),
            0 1px 0 rgba(255,255,255,.86) inset;
        }
        [data-theme="dark"] .cp-empty-action,
        [data-theme="dark"] .cp-quick-btn {
          background: color-mix(in srgb, var(--surface-2) 68%, transparent);
          box-shadow:
            0 10px 24px rgba(0, 0, 0, .24),
            0 1px 0 rgba(255,255,255,.04) inset;
        }
        .cp-hints {
          display: grid;
          gap: 9px;
          color: var(--text-muted);
          font-size: 12px;
          line-height: 1.35;
          letter-spacing: .01em;
        }
        .cp-key {
          min-width: 30px;
          height: 26px;
          padding: 0 8px;
          margin-right: 6px;
          border-radius: 7px;
          border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: color-mix(in srgb, var(--surface-2) 62%, transparent);
          color: var(--text-secondary);
          font-size: 11px;
          font-weight: 500;
        }
        .cp-message-row {
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }
        .cp-message-row.user { justify-content: flex-end; }
        .cp-bubble {
          max-width: calc(100% - 34px);
          padding: 13px 15px;
          border-radius: 14px;
          border: 1px solid color-mix(in srgb, var(--border) 54%, transparent);
          color: var(--text);
          box-shadow: 0 1px 0 rgba(255,255,255,.04) inset;
        }
        .cp-bubble.ai {
          background: color-mix(in srgb, var(--surface-2) 44%, transparent);
          border-top-left-radius: 9px;
        }
        .cp-bubble.user {
          background: color-mix(in srgb, var(--surface-2) 72%, transparent);
          border-top-right-radius: 9px;
        }
        .cp-bubble p {
          font-size: 13px;
          line-height: 1.62;
          margin: 0;
          color: var(--text);
          white-space: pre-wrap;
          word-break: break-word;
          font-weight: 400;
          letter-spacing: .02em;
        }
        .cp-typing {
          padding: 13px 15px;
          background: color-mix(in srgb, var(--card) 96%, transparent);
          border: 1px solid var(--border);
          border-radius: 18px;
          border-top-left-radius: 12px;
          display: flex;
          gap: 4px;
        }
        .cp-quickbar {
          padding: 10px 18px 0;
          display: flex;
          gap: 8px;
          overflow-x: auto;
          flex-shrink: 0;
          background: var(--surface);
        }
        .cp-quick-btn {
          min-height: 32px;
          flex-shrink: 0;
          padding: 0 12px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 500;
        }
        .cp-composer {
          padding: 12px 16px 16px;
          flex-shrink: 0;
          background: var(--surface);
        }
        .cp-input-shell {
          min-height: 104px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          justify-content: space-between;
          background: var(--surface);
          border: 1px solid color-mix(in srgb, var(--border) 68%, transparent);
          border-radius: 14px;
          padding: 15px 16px 12px;
          box-shadow:
            0 12px 30px rgba(10, 13, 20, .06),
            0 1px 0 rgba(255,255,255,.74) inset;
          transition: border-color .15s ease, box-shadow .15s ease;
        }
        .cp-input-shell:focus-within {
          border-color: color-mix(in srgb, var(--border-strong) 58%, transparent);
          box-shadow:
            0 16px 34px rgba(10, 13, 20, .09),
            0 1px 0 rgba(255,255,255,.84) inset;
        }
        [data-theme="dark"] .cp-input-shell {
          background: color-mix(in srgb, var(--surface-2) 40%, transparent);
          box-shadow:
            0 16px 34px rgba(0, 0, 0, .22),
            0 1px 0 rgba(255,255,255,.04) inset;
        }
        .cp-input {
          width: 100%;
          border: none;
          outline: none;
          background: transparent;
          font-size: 14px;
          color: var(--text);
          font-family: inherit;
          font-weight: 400;
          min-width: 0;
          -webkit-text-fill-color: var(--text);
          letter-spacing: .01em;
        }
        .cp-input::placeholder { color: var(--text-muted); -webkit-text-fill-color: var(--text-muted); }
        .cp-composer-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .cp-context-btn {
          height: 30px;
          padding: 0 10px;
          border: 0;
          border-radius: 9px;
          background: transparent;
          color: var(--text-secondary);
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 12px;
          font-weight: 500;
          font-family: inherit;
        }
        .cp-composer-actions {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .cp-attach,
        .cp-send {
          width: 34px;
          height: 34px;
          border: 0;
          border-radius: 999px;
          flex-shrink: 0;
          background: color-mix(in srgb, var(--surface-2) 64%, transparent);
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background .15s ease, color .15s ease, transform .15s ease;
        }
        .cp-attach:hover,
        .cp-send:hover {
          background: color-mix(in srgb, var(--surface-2) 86%, transparent);
          color: var(--text);
        }
        .cp-send.ready {
          background: var(--text);
          color: var(--surface);
        }
        .cp-send.ready:active { transform: scale(.97); }
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.3;}}
        @keyframes spin{to{transform:rotate(360deg);}}
      `}</style>

      <div className={`copilot-full-panel${expanded ? ' expanded' : ''}`}>
        <div className="cp-header">
          <div className="cp-header-left">
            <span className="cp-beta">BETA</span>
            <p className="cp-title">Veyra Copilot</p>
          </div>
          <div className="cp-window-actions" aria-label="Copilot Fensteraktionen">
            <button className="cp-action" onClick={onClose} aria-label="Copilot minimieren" type="button">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14"/></svg>
            </button>
            <button className="cp-action" onClick={() => setExpanded(v => !v)} aria-label={expanded ? 'Copilot verkleinern' : 'Copilot vergrößern'} type="button">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5"/><path d="M3 3l6 6M21 3l-6 6M21 21l-6-6M3 21l6-6"/></svg>
            </button>
            <button className="cp-action" onClick={onClose} aria-label="Copilot schließen" type="button">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        <div className={`cp-thread${empty ? ' empty' : ''}`}>
          {empty ? (
            <div className="cp-empty-state">
              <VeyraLogo size={38} className="cp-empty-logo" />
              <h2 className="cp-empty-title">Willkommen bei Veyra</h2>
              <p className="cp-empty-copy">Frag nach Projektstatus, Risiken, Entscheidungen oder dem nächsten sinnvollen Schritt.</p>
              <div className="cp-empty-actions" aria-label="Veyra Schnellstart">
                {QUICK.slice(0, 3).map(q => (
                  <button key={q} className="cp-empty-action" onClick={() => send(q)} disabled={loading} type="button">{q}</button>
                ))}
              </div>
              <div className="cp-hints" aria-label="Copilot Hinweise">
                <div><span className="cp-key">@</span>Projekt, Aufgabe oder Dokument erwähnen</div>
                <div><span className="cp-key">Tab</span>aktuelle Ansicht als Kontext hinzufügen</div>
                <div><span className="cp-key">Status</span>{contextReady ? 'Workspace-Kontext ist aktiv' : 'Workspace-Kontext wird geladen'}</div>
              </div>
            </div>
          ) : (
            <>
              {msgs.map((m, i) => (
                <div key={i} className={`${i === msgs.length - 1 ? 'cp-msg-in ' : ''}cp-message-row ${m.role === 'user' ? 'user' : 'ai'}`}>
                  {m.role === 'ai' && (
                    <VeyraLogo size={24} className="cp-msg-avatar" />
                  )}
                  <div className={`cp-bubble ${m.role === 'ai' ? 'ai' : 'user'}`}>
                    <p>{m.text}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="cp-msg-in cp-message-row ai">
                  <VeyraLogo size={24} thinking />
                  <div className="cp-typing" aria-label="Copilot antwortet">
                    {[0,1,2].map(j => <span key={j} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-muted)', animation: `pulse 1.1s ${j*.18}s ease-in-out infinite` }} />)}
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>

        {!empty && (
          <div className="cp-quickbar" aria-label="Copilot Schnellaktionen">
            {QUICK.map(q => (
              <button key={q} className="cp-quick-btn" onClick={() => send(q)} disabled={loading} type="button">{q}</button>
            ))}
          </div>
        )}

        <div className="cp-composer">
          <div className="cp-input-shell">
            <input
              ref={inputRef}
              className="cp-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); send() }}}
              placeholder="Frag Veyra..."
            />
            <div className="cp-composer-footer">
              <button className="cp-context-btn" type="button" aria-label="Copilot Kontext">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/></svg>
                {contextReady ? 'Kontext aktiv' : 'Workspace'}
              </button>
              <div className="cp-composer-actions">
                <button className="cp-attach" type="button" aria-label="Datei anhängen">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 1 1-2.83-2.83l8.49-8.48"/></svg>
                </button>
                <button onClick={() => send()} disabled={!input.trim() || loading} className={`cp-send${input.trim() && !loading ? ' ready' : ''}`} type="button" aria-label="Nachricht senden">
                  {loading
                    ? <span style={{ width: 12, height: 12, border: '2px solid rgba(128,128,128,.3)', borderTopColor: 'currentColor', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                    : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(panel, document.body)
}
