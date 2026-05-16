'use client'
import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import TagroLogo from '@/components/TagroLogo'

type Msg = { role: 'user' | 'ai'; text: string }

const QUICK = ['Status zusammenfassen', 'Nächste Schritte', 'Risiken prüfen', 'Offene Entscheidungen']

const SYSTEM = `Du bist Tagro Copilot von Festag — das AI-native Softwareproduktionssystem.
Antworte immer auf Deutsch. Maximal 3 prägnante Sätze. Kein Smalltalk, keine Emojis.
Du kannst Projektstatus, Tasks, Fortschritt und nächste Schritte erklären.
Wenn du Projektdaten hast, nutze sie konkret.`

export default function CopilotPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [msgs, setMsgs]     = useState<Msg[]>([])
  const [input, setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [context, setContext] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

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
    if (msgs.length === 0) {
      setMsgs([{ role: 'ai', text: 'Tagro bündelt hier Projektstatus, offene Schritte und Entscheidungen. Frag nach dem aktuellen Stand, Risiken oder den nächsten sinnvollen Aktionen.' }])
    }
    setTimeout(() => inputRef.current?.focus(), 80)

    // Load project context
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
        const done  = pt.filter(t => t.status === 'done').length
        const doing = pt.filter(t => t.status === 'doing').length
        const todo  = pt.filter(t => t.status === 'todo').length
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
      if (!res.ok) throw new Error('Tagro request failed')
      const d = await res.json()
      setMsgs(m => [...m, { role: 'ai', text: d.content?.[0]?.text ?? 'Ich konnte gerade keine belastbare Antwort erzeugen. Bitte stelle die Frage noch einmal etwas konkreter.' }])
    } catch {
      setMsgs(m => [...m, { role: 'ai', text: 'Verbindungsfehler. Bitte erneut versuchen.' }])
    }
    setLoading(false)
  }

  if (!mounted || !open) return null
  const contextReady = context.trim().length > 0

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
          background: rgba(10,13,20,0.16);
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
          animation: cpShade .18s ease-out both;
        }
        @keyframes cpShade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .copilot-full-panel {
          position: fixed;
          right: 20px;
          bottom: 22px;
          width: 440px;
          max-width: min(440px, calc(100vw - 30px));
          height: min(724px, calc(100dvh - 48px));
          z-index: 7101;
          display: flex;
          flex-direction: column;
          background:var(--surface);
          border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
          border-radius: 18px;
          backdrop-filter: blur(34px) saturate(180%);
          -webkit-backdrop-filter: blur(34px) saturate(180%);
          box-shadow:
            0 28px 80px rgba(10,13,20,.20),
            0 1px 0 rgba(255,255,255,.08) inset,
            0 0 0 1px rgba(255,255,255,.04);
          animation: cpSlide .24s cubic-bezier(.16,1,.3,1);
          overflow: hidden;
        }
        @keyframes cpSlide {
          from { transform: translateY(14px) scale(.985); opacity: 0; }
          to   { transform: none; opacity: 1; }
        }
        [data-theme="dark"] .cp-wrap {
          background: rgba(0,0,0,0.28);
        }
        [data-theme="read"] .cp-wrap {
          background: rgba(38,33,24,0.11);
        }
        @media(max-width: 768px) {
          .copilot-full-panel {
            left: 10px !important;
            right: 10px !important;
            bottom: calc(84px + var(--safe-bottom)) !important;
            width: auto !important;
            max-width: none !important;
            height: min(560px, calc(100dvh - 126px)) !important;
            border-radius: 20px !important;
            box-shadow: 0 0 0 1px rgba(255,255,255,.04) !important;
            animation: cpSlideUp .22s cubic-bezier(.16,1,.3,1) !important;
          }
          @keyframes cpSlideUp {
            from { transform: translateY(24px); opacity: 0; }
            to   { transform: none; opacity: 1; }
          }
        }
        .cp-msg-in { animation: cpFadeUp .18s cubic-bezier(.16,1,.3,1) both; }
        @keyframes cpFadeUp { from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;} }
        .cp-header {
          min-height:74px;
          padding:0 18px;
          border-bottom:1px solid color-mix(in srgb, var(--border) 64%, transparent);
          display:flex;
          align-items:center;
          justify-content:space-between;
          flex-shrink:0;
          background:color-mix(in srgb, var(--surface) 96%, transparent);
        }
        .cp-brand {
          display:flex;
          align-items:center;
          gap:12px;
          min-width:0;
        }
        .cp-title {
          margin:0;
          font-size:14px;
          line-height:1.05;
          font-weight:500;
          letter-spacing:.02em;
          color:var(--text);
        }
        .cp-subtitle {
          margin:5px 0 0;
          display:flex;
          align-items:center;
          gap:7px;
          font-size:11px;
          line-height:1;
          font-weight:400;
          letter-spacing:.02em;
          color:var(--text-secondary);
        }
        .cp-status-dot {
          width:6px;
          height:6px;
          border-radius:999px;
          background:var(--green);
          box-shadow:0 0 0 3px var(--green-bg);
        }
        .cp-close {
          width:30px;
          height:30px;
          border-radius:10px;
          border:1px solid transparent;
          background:transparent;
          color:var(--text-muted);
          display:flex;
          align-items:center;
          justify-content:center;
          transition:background .14s ease, color .14s ease, border-color .14s ease;
        }
        .cp-close:hover {
          background:color-mix(in srgb, var(--surface-2) 72%, transparent);
          color:var(--text);
          border-color:var(--border-strong);
        }
        .cp-thread {
          flex:1;
          overflow-y:auto;
          padding:18px 18px 14px;
          display:flex;
          flex-direction:column;
          gap:14px;
          background:var(--surface);
        }
        .cp-message-row {
          display:flex;
          gap:10px;
          align-items:flex-start;
        }
        .cp-message-row.user {
          justify-content:flex-end;
        }
        .cp-bubble {
          max-width:calc(100% - 34px);
          padding:13px 15px;
          border-radius:14px;
          border:1px solid color-mix(in srgb, var(--border) 54%, transparent);
          color:var(--text);
          box-shadow:0 1px 0 rgba(255,255,255,.04) inset;
        }
        .cp-bubble.ai {
          background:color-mix(in srgb, var(--surface-2) 44%, transparent);
          border-top-left-radius:9px;
        }
        .cp-bubble.user {
          background:color-mix(in srgb, var(--surface-2) 72%, transparent);
          border-top-right-radius:9px;
        }
        .cp-bubble p {
          font-size:13px;
          line-height:1.62;
          margin:0;
          color:var(--text);
          white-space:pre-wrap;
          word-break:break-word;
          font-weight:400;
          letter-spacing:.02em;
        }
        .cp-typing {
          padding:13px 15px;
          background:color-mix(in srgb, var(--card) 96%, transparent);
          border:1px solid var(--border);
          border-radius:18px;
          border-top-left-radius:12px;
          display:flex;
          gap:4px;
        }
        .cp-input {
          flex: 1; border: none; outline: none; background: transparent;
          font-size: 13px; color: var(--text); font-family: inherit;
          font-weight: 400; min-width: 0; -webkit-text-fill-color: var(--text);
          letter-spacing:.02em;
        }
        .cp-input::placeholder { color: var(--text-muted); -webkit-text-fill-color: var(--text-muted); }
        .cp-quickbar {
          padding:10px 18px 8px;
          display:flex;
          gap:8px;
          overflow-x:auto;
          flex-shrink:0;
          border-top:1px solid color-mix(in srgb, var(--border) 52%, transparent);
          background:var(--surface);
        }
        .cp-quick-btn {
          padding: 7px 12px; border-radius: 999px; border: 1px solid var(--border);
          background: color-mix(in srgb, var(--surface-2) 88%, transparent); font-size: 11px; color: var(--text-secondary);
          white-space: nowrap; flex-shrink: 0; cursor: pointer;
          font-family: inherit; font-weight: 400; letter-spacing:.02em;
          transition: background .14s ease, color .14s ease, border-color .14s ease;
        }
        .cp-quick-btn:hover { background: var(--hover); color:var(--text); border-color:var(--border-strong); }
        .cp-composer {
          padding:0;
          flex-shrink:0;
          background:var(--surface);
        }
        .cp-input-shell {
          display:flex;
          gap:12px;
          align-items:center;
          min-height:70px;
          background:color-mix(in srgb, var(--surface-2) 38%, transparent);
          border:0;
          border-top:1px solid color-mix(in srgb, var(--border) 56%, transparent);
          border-radius:12px 12px 0 0;
          padding:13px 16px 14px 22px;
          transition:background .15s ease, border-color .15s ease;
        }
        .cp-input-shell:focus-within {
          border-color:color-mix(in srgb, var(--inp-focus-border) 54%, transparent);
          background:color-mix(in srgb, var(--surface-2) 48%, transparent);
        }
        .cp-send {
          width:38px;
          height:38px;
          border-radius:999px;
          flex-shrink:0;
          background:color-mix(in srgb, var(--surface-2) 70%, transparent);
          color:var(--text-muted);
          display:flex;
          align-items:center;
          justify-content:center;
          transition:background .15s ease, color .15s ease, transform .15s ease;
        }
        .cp-send.ready {
          background:var(--btn-prim);
          color:var(--btn-prim-text);
        }
        .cp-send.ready:active { transform:scale(.97); }
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.3;}}
        @keyframes spin{to{transform:rotate(360deg);}}
      `}</style>

      <div className="copilot-full-panel">
        <div className="cp-header">
          <div className="cp-brand">
            <TagroLogo size={28} thinking={loading} />
            <div>
              <p className="cp-title">Copilot</p>
              <p className="cp-subtitle"><span className="cp-status-dot" />{contextReady ? 'Projektkontext aktiv' : 'Workspace bereit'}</p>
            </div>
          </div>
          <button className="cp-close" onClick={onClose} aria-label="Copilot schließen" type="button">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="cp-thread">
        {msgs.map((m, i) => (
          <div key={i} className={`${i === msgs.length - 1 ? 'cp-msg-in ' : ''}cp-message-row ${m.role === 'user' ? 'user' : 'ai'}`}>
            {m.role === 'ai' && (
              <TagroLogo size={24} className="cp-msg-avatar" />
            )}
            <div className={`cp-bubble ${m.role === 'ai' ? 'ai' : 'user'}`}>
              <p>{m.text}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="cp-msg-in cp-message-row ai">
            <TagroLogo size={24} thinking />
            <div className="cp-typing" aria-label="Copilot antwortet">
              {[0,1,2].map(j => <span key={j} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-muted)', animation: `pulse 1.1s ${j*.18}s ease-in-out infinite` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
        </div>

        <div className="cp-quickbar" aria-label="Copilot Schnellaktionen">
          {QUICK.map(q => (
            <button key={q} className="cp-quick-btn" onClick={() => send(q)} disabled={loading} type="button">{q}</button>
          ))}
        </div>

        <div className="cp-composer">
          <div className="cp-input-shell">
            <input
              ref={inputRef}
              className="cp-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); send() }}}
              placeholder="Frag nach Status, Risiko oder nächstem Schritt..."
            />
            <button onClick={() => send()} disabled={!input.trim() || loading} className={`cp-send${input.trim() && !loading ? ' ready' : ''}`} type="button" aria-label="Nachricht senden">
              {loading
                ? <span style={{ width: 12, height: 12, border: '2px solid rgba(128,128,128,.3)', borderTopColor: 'currentColor', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M7 17L17 7M9 7h8v8"/></svg>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(panel, document.body)
}
