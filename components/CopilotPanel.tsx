'use client'
import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import TagroLogo from '@/components/TagroLogo'

type Msg = { role: 'user' | 'ai'; text: string }

const QUICK = ['Projektstatus', 'Nächste Steps', 'Offene Tasks', 'Projekt starten']

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
      const d = await res.json()
      setMsgs(m => [...m, { role: 'ai', text: d.content?.[0]?.text ?? 'Verbindungsfehler.' }])
    } catch {
      setMsgs(m => [...m, { role: 'ai', text: 'Verbindungsfehler. Bitte erneut versuchen.' }])
    }
    setLoading(false)
  }

  if (!mounted || !open) return null

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
          background: rgba(10,10,10,0.14);
          backdrop-filter: blur(2px);
          -webkit-backdrop-filter: blur(2px);
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
          width: 416px;
          max-width: min(416px, calc(100vw - 30px));
          height: min(700px, calc(100dvh - 48px));
          z-index: 7101;
          display: flex;
          flex-direction: column;
          background: color-mix(in srgb, var(--card) 96%, transparent);
          border: 1px solid var(--border);
          border-radius: 28px;
          backdrop-filter: blur(28px) saturate(170%);
          -webkit-backdrop-filter: blur(28px) saturate(170%);
          box-shadow: 0 0 0 1px rgba(255,255,255,.03);
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
        .cp-input {
          flex: 1; border: none; outline: none; background: transparent;
          font-size: 13px; color: var(--text); font-family: inherit;
          font-weight: 500; min-width: 0; -webkit-text-fill-color: var(--text);
        }
        .cp-input::placeholder { color: var(--text-muted); -webkit-text-fill-color: var(--text-muted); }
        .cp-quick-btn {
          padding: 7px 12px; border-radius: 999px; border: 1px solid var(--border);
          background: var(--surface-2); font-size: 11px; color: var(--text-secondary);
          white-space: nowrap; flex-shrink: 0; cursor: pointer;
          font-family: inherit; font-weight: 500; transition: background .1s;
        }
        .cp-quick-btn:hover { background: var(--hover); }
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.3;}}
        @keyframes spin{to{transform:rotate(360deg);}}
      `}</style>

      <div className="copilot-full-panel">
        {/* Header */}
        <div style={{ padding: '0 18px', minHeight: 64, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: 'color-mix(in srgb, var(--card) 94%, transparent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <TagroLogo size={28} thinking={loading} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0, lineHeight: 1 }}>Tagro Workspace</p>
              <p style={{ fontSize: 10.5, color: 'var(--text-muted)', margin: '3px 0 0', lineHeight: 1 }}>Operations Layer</p>
            </div>
          </div>
          <button onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', transition: 'background .1s, color .1s' }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'var(--hover)'; el.style.color = 'var(--text)' }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'var(--surface-2)'; el.style.color = 'var(--text-muted)' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 12px', display: 'flex', flexDirection: 'column', gap: 14, background: 'var(--surface)' }}>
        {msgs.map((m, i) => (
          <div key={i} className={i === msgs.length - 1 ? 'cp-msg-in' : ''} style={{ display: 'flex', gap: 10, justifyContent: 'stretch' }}>
            {m.role === 'ai' && (
              <TagroLogo size={24} className="cp-msg-avatar" />
            )}
            <div style={{ width: '100%', maxWidth: '100%', padding: m.role === 'ai' ? '14px 16px' : '12px 14px', borderRadius: 18, background: m.role === 'ai' ? 'var(--card)' : 'color-mix(in srgb, var(--surface-2) 84%, transparent)', border: '1px solid var(--border)', color: 'var(--text)' }}>
              <p style={{ fontSize: 13, lineHeight: 1.62, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.text}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="cp-msg-in" style={{ display: 'flex', gap: 9 }}>
            <TagroLogo size={24} thinking />

            <div style={{ padding: '13px 15px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, display: 'flex', gap: 4 }}>
              {[0,1,2].map(j => <span key={j} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-muted)', animation: `pulse 1.1s ${j*.18}s ease-in-out infinite` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
        </div>

        {/* Quick actions */}
        <div style={{ padding: '10px 18px 0', display: 'flex', gap: 8, overflowX: 'auto', flexShrink: 0, borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
          {QUICK.map(q => (
            <button key={q} className="cp-quick-btn" onClick={() => send(q)} disabled={loading}>{q}</button>
          ))}
        </div>

        {/* Input */}
        <div style={{ padding: '12px 18px 18px', flexShrink: 0, background: 'var(--surface)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 18, padding: '10px 10px 10px 14px', transition: 'border-color .15s' }}
          >
            <input
              ref={inputRef}
              className="cp-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); send() }}}
              placeholder="Notiz, Rückfrage oder Entscheidung eingeben…"
            />
            <button onClick={() => send()} disabled={!input.trim() || loading}
              style={{ width: 36, height: 36, borderRadius: 14, border: 'none', flexShrink: 0, background: input.trim() && !loading ? 'var(--btn-prim)' : 'var(--hover)', color: input.trim() && !loading ? 'var(--btn-prim-text)' : 'var(--text-muted)', cursor: input.trim() && !loading ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s' }}>
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
