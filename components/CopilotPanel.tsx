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
      setMsgs([{ role: 'ai', text: 'Hallo! Ich bin Tagro — dein AI-Copilot. Frag mich nach Projektstatus, Tasks oder wie du loslegen kannst.' }])
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
          background: rgba(20,18,13,0.08);
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
          background: color-mix(in srgb, var(--surface) 92%, transparent);
          border: 1px solid var(--sidebar-border);
          border-radius: 22px;
          backdrop-filter: blur(28px) saturate(170%);
          -webkit-backdrop-filter: blur(28px) saturate(170%);
          box-shadow: 0 8px 26px rgba(0,0,0,.14), 0 20px 54px rgba(0,0,0,.14);
          animation: cpSlide .24s cubic-bezier(.16,1,.3,1);
          overflow: hidden;
        }
        @keyframes cpSlide {
          from { transform: translateY(14px) scale(.985); opacity: 0; }
          to   { transform: none; opacity: 1; }
        }
        [data-theme="dark"] .cp-wrap {
          background: rgba(0,0,0,0.22);
        }
        [data-theme="dark"] .copilot-full-panel {
          box-shadow: 0 10px 32px rgba(0,0,0,.52), 0 20px 64px rgba(0,0,0,.55);
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
            box-shadow: 0 8px 40px rgba(0,0,0,.28) !important;
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
          padding: 5px 11px; border-radius: 16px; border: 1px solid var(--border);
          background: var(--card); font-size: 11px; color: var(--text-secondary);
          white-space: nowrap; flex-shrink: 0; cursor: pointer;
          font-family: inherit; font-weight: 500; transition: background .1s;
        }
        .cp-quick-btn:hover { background: var(--surface-2); }
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.3;}}
        @keyframes spin{to{transform:rotate(360deg);}}
      `}</style>

      <div className="copilot-full-panel">
        {/* Header */}
        <div style={{ padding: '0 16px', height: 56, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: 'color-mix(in srgb, var(--card) 84%, transparent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <TagroLogo size={28} thinking={loading} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0, lineHeight: 1 }}>Tagro Copilot</p>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '2px 0 0', lineHeight: 1 }}>AI-Assistent</p>
            </div>
          </div>
          <button onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', transition: 'background .1s, color .1s' }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'var(--surface-2)'; el.style.color = 'var(--text)' }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'var(--surface)'; el.style.color = 'var(--text-muted)' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 10px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {msgs.map((m, i) => (
          <div key={i} className={i === msgs.length - 1 ? 'cp-msg-in' : ''} style={{ display: 'flex', gap: 9, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {m.role === 'ai' && (
              <TagroLogo size={24} className="cp-msg-avatar" />
            )}
            <div style={{ maxWidth: '84%', padding: '9px 12px', borderRadius: m.role === 'ai' ? '4px 12px 12px 12px' : '12px 4px 12px 12px', background: m.role === 'ai' ? 'var(--card)' : 'var(--btn-prim)', border: m.role === 'ai' ? '1px solid var(--border)' : 'none', color: m.role === 'ai' ? 'var(--text)' : 'var(--btn-prim-text)' }}>
              <p style={{ fontSize: 12.5, lineHeight: 1.55, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.text}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="cp-msg-in" style={{ display: 'flex', gap: 9 }}>
            <TagroLogo size={24} thinking />

            <div style={{ padding: '11px 13px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '3px 12px 12px 12px', display: 'flex', gap: 4 }}>
              {[0,1,2].map(j => <span key={j} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-muted)', animation: `pulse 1.1s ${j*.18}s ease-in-out infinite` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
        </div>

        {/* Quick actions */}
        <div style={{ padding: '0 14px 10px', display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0, borderTop: '1px solid var(--border)' }}>
          {QUICK.map(q => (
            <button key={q} className="cp-quick-btn" onClick={() => send(q)} disabled={loading}>{q}</button>
          ))}
        </div>

        {/* Input */}
        <div style={{ padding: '0 14px 14px', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--card)', border: '1.5px solid var(--border-strong)', borderRadius: 12, padding: '8px 8px 8px 14px', transition: 'border-color .15s' }}
            onFocusCapture={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--text-muted)'}
            onBlurCapture={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)'}
          >
            <input
              ref={inputRef}
              className="cp-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); send() }}}
              placeholder="Frage Tagro…"
            />
            <button onClick={() => send()} disabled={!input.trim() || loading}
              style={{ width: 32, height: 32, borderRadius: 9, border: 'none', flexShrink: 0, background: input.trim() && !loading ? 'var(--btn-prim)' : 'var(--surface-2)', color: input.trim() && !loading ? 'var(--btn-prim-text)' : 'var(--text-muted)', cursor: input.trim() && !loading ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s' }}>
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
