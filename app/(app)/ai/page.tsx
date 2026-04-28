'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

type Msg = { role: 'user' | 'ai'; text: string; time: string }

const SYSTEM = `Du bist Tagro, das AI-Produktionssystem von Festag.
Verhalte dich wie ein erfahrener CTO und Projektmanager in einem.
Beantworte Fragen klar und direkt. Maximal 5 Sätze pro Antwort.
Wenn du Projektdaten hast, nutze sie konkret.
Sprache: Deutsch. Kein Smalltalk. Keine Emojis.`

const QUICK = [
  'Was ist der aktuelle Projektstatus?',
  'Welche Tasks sind kritisch?',
  'Was sind die nächsten Schritte?',
  'Erstelle einen Fortschrittsbericht',
  'Wo gibt es Risiken?',
]

export default function AIPage() {
  const [msgs,     setMsgs]     = useState<Msg[]>([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [projects, setProjects] = useState<any[]>([])
  const [initDone, setInitDone] = useState(false)
  const feedRef  = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const sb = createClient()

  useEffect(() => {
    sb.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      const { data: p } = await sb.from('projects').select('id,title,status,description').limit(5)
      setProjects(p ?? [])

      const welcome: Msg = {
        role: 'ai',
        text: p?.length
          ? `Ich bin Tagro — dein AI-Projektmanager. Du hast ${p.length} aktives Projekt${p.length !== 1 ? 'e' : ''}. Wie kann ich dir helfen?`
          : 'Ich bin Tagro — dein AI-Projektmanager. Du hast noch keine Projekte. Starte ein Projekt um loszulegen.',
        time: fmt(),
      }
      setMsgs([welcome])
      setInitDone(true)
    })
  }, [])

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight
  }, [msgs, loading])

  function fmt() {
    return new Date().toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' })
  }

  function buildContext() {
    if (!projects.length) return ''
    const PHASE: Record<string, string> = { intake: 'Intake', planning: 'Planning', active: 'In Arbeit', testing: 'Testing', done: 'Abgeschlossen' }
    return '\n\nAktuelle Projekte:\n' + projects.map(p => `- ${p.title} (${PHASE[p.status] ?? p.status})${p.description ? ': ' + p.description : ''}`).join('\n')
  }

  async function send(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')
    if (inputRef.current) { inputRef.current.style.height = 'auto' }

    const userMsg: Msg = { role: 'user', text: msg, time: fmt() }
    setMsgs(m => [...m, userMsg])
    setLoading(true)

    try {
      const history = [...msgs.slice(-8), userMsg]
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: SYSTEM + buildContext(),
          max_tokens: 500,
          messages: history.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text })),
        }),
      })
      const d = await res.json()
      const reply = d.content?.[0]?.text ?? 'Verbindungsfehler. Bitte erneut versuchen.'
      setMsgs(m => [...m, { role: 'ai', text: reply, time: fmt() }])
    } catch {
      setMsgs(m => [...m, { role: 'ai', text: 'Verbindungsfehler. Bitte erneut versuchen.', time: fmt() }])
    }
    setLoading(false)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 56px)', overflow: 'hidden' }}>
      <style>{`
        .ai-msg-in  { animation: fadeUp .25s cubic-bezier(.16,1,.3,1) both }
        @media(max-width:768px) {
          .ai-quick { gap: 6px !important }
          .ai-quick button { font-size: 11px !important; padding: 5px 10px !important }
        }
      `}</style>

      {/* Header */}
      <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 14, color: 'var(--accent-text)', fontWeight: 700 }}>✦</span>
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0, lineHeight: 1 }}>Tagro AI</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0', lineHeight: 1 }}>Production Engine</p>
            </div>
          </div>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: 'var(--green-dark)', background: 'var(--green-bg)', padding: '4px 10px', borderRadius: 8, border: '1px solid var(--green-border)' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />
          AKTIV
        </span>
      </div>

      {/* Project context chips */}
      {projects.length > 0 && (
        <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.08em', alignSelf: 'center', flexShrink: 0 }}>KONTEXT</span>
          {projects.map(p => (
            <span key={p.id} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '3px 9px', borderRadius: 6, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {p.title}
            </span>
          ))}
        </div>
      )}

      {/* Feed */}
      <div ref={feedRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {msgs.map((m, i) => (
          <div key={i} className={i === msgs.length - 1 ? 'ai-msg-in' : ''} style={{ display: 'flex', gap: 12, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '100%' }}>
            {m.role === 'ai' && (
              <div style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <span style={{ fontSize: 12, color: 'var(--accent-text)', fontWeight: 700 }}>✦</span>
              </div>
            )}

            <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', gap: 4, alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                padding: '12px 16px',
                borderRadius: m.role === 'ai' ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
                background: m.role === 'ai' ? 'var(--card)' : 'var(--btn-prim)',
                border: m.role === 'ai' ? '1px solid var(--border)' : 'none',
                color: m.role === 'ai' ? 'var(--text)' : 'var(--btn-prim-text)',
              }}>
                <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.text}</p>
              </div>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '.02em' }}>
                {m.role === 'ai' ? 'Tagro' : 'Du'} · {m.time}
              </span>
            </div>

            {m.role === 'user' && (
              <div style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6"/></svg>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="ai-msg-in" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: 'var(--accent-text)', fontWeight: 700 }}>✦</span>
            </div>
            <div style={{ padding: '14px 16px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '4px 16px 16px 16px', display: 'flex', gap: 5, alignItems: 'center' }}>
              {[0, 1, 2].map(j => (
                <span key={j} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)', animation: `pulse 1.2s ${j * 0.2}s ease-in-out infinite` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="ai-quick" style={{ padding: '0 24px 10px', display: 'flex', gap: 8, overflowX: 'auto', flexShrink: 0 }}>
        {QUICK.map(q => (
          <button key={q} onClick={() => send(q)} disabled={loading} className="tap-scale"
            style={{ padding: '6px 13px', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--card)', fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'inherit', fontWeight: 500, transition: 'border-color .1s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding: '0 24px 24px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '10px 12px 10px 16px', transition: 'border-color .15s' }}
          onFocusCapture={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)'}
          onBlurCapture={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'
            }}
            onKeyDown={handleKey}
            placeholder="Frage Tagro…"
            rows={1}
            style={{ flex: 1, resize: 'none', border: 'none', outline: 'none', background: 'transparent', fontSize: 15, lineHeight: 1.55, color: 'var(--text)', fontFamily: 'inherit', fontWeight: 500, padding: 0, overflowY: 'hidden', minHeight: 24, caretColor: 'var(--green)' }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="tap-scale"
            style={{ width: 36, height: 36, borderRadius: 10, border: 'none', flexShrink: 0, background: input.trim() && !loading ? 'var(--btn-prim)' : 'var(--surface-2)', color: input.trim() && !loading ? 'var(--btn-prim-text)' : 'var(--text-muted)', cursor: input.trim() && !loading ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s' }}>
            {loading
              ? <span style={{ width: 14, height: 14, border: '2px solid rgba(128,128,128,.3)', borderTopColor: 'currentColor', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M7 17L17 7M9 7h8v8"/></svg>
            }
          </button>
        </div>
        <p style={{ fontSize: 10.5, color: 'var(--text-muted)', textAlign: 'center', margin: '8px 0 0', opacity: .6 }}>Enter zum Senden · Shift+Enter für neue Zeile</p>
      </div>
    </div>
  )
}
