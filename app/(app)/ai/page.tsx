'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

type Msg = { role: 'user'|'ai'; text: string; time: string; structured?: boolean }

const TAGRO_SYSTEM = `Du bist Tagro, das AI-Kernsystem von Festag.

VERHALTEN (strikt):
- Du bist kein Chatbot. Du bist ein Produktionssystem.
- Jede Antwort folgt IMMER der Struktur:

STATUS: [1 kurzer System-Satz]
ANALYSE: [Was du verstanden hast]
AKTION: [Was das System jetzt tut]
NÄCHSTE SCHRITTE: [Konkretes Ergebnis]

- Maximal 4 Zeilen. Klar und direkt.
- Keine Höflichkeitsfloskeln. Kein Small Talk.
- Sprache: Deutsch. Keine Emojis.`

const QUICK_PROMPTS = [
  'Was ist der Status meiner Projekte?',
  'Welche Tasks sind offen?',
  'Was sind die nächsten Schritte?',
  'Erstelle einen Tagesbericht',
]

export default function AIHubPage() {
  const [msgs, setMsgs] = useState<Msg[]>([{
    role: 'ai',
    text: 'STATUS: System bereit.\nANALYSE: Festag Production Engine aktiv.\nAKTION: Warte auf Eingabe.\nNÄCHSTE SCHRITTE: Beschreibe dein Anliegen.',
    time: new Date().toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' }),
    structured: true,
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<any[]>([])
  const feedRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      supabase.from('projects').select('id,title,status').then(({ data: p }) => setProjects(p ?? []))
    })
  }, [])

  useEffect(() => { feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' }) }, [msgs])

  async function send(text?: string) {
    const msg = text || input
    if (!msg.trim() || loading) return
    setInput('')
    const time = new Date().toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' })
    setMsgs(m => [...m, { role: 'user', text: msg, time }])
    setLoading(true)

    try {
      const ctx = projects.length > 0 ? `\n\nAktuelle Projekte: ${projects.map(p => `${p.title} (${p.status})`).join(', ')}` : ''
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 400,
          system: TAGRO_SYSTEM + ctx,
          messages: [
            ...msgs.slice(-6).map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text })),
            { role: 'user', content: msg }
          ]
        })
      })
      const data = await res.json()
      const reply = data.content?.[0]?.text ?? 'STATUS: Fehler.\nANALYSE: API unerreichbar.\nAKTION: Retry.\nNÄCHSTE SCHRITTE: Erneut versuchen.'
      setMsgs(m => [...m, { role: 'ai', text: reply, time: new Date().toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' }), structured: true }])
    } catch {
      setMsgs(m => [...m, { role: 'ai', text: 'STATUS: System-Fehler.\nANALYSE: Verbindung unterbrochen.\nAKTION: Fehler geloggt.\nNÄCHSTE SCHRITTE: Erneut versuchen.', time: new Date().toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' }), structured: true }])
    }
    setLoading(false)
  }

  function parseStructured(text: string) {
    return text.split('\n').filter(Boolean).map(line => {
      const i = line.indexOf(':')
      if (i > 0 && i < 22) return { key: line.slice(0, i).trim(), val: line.slice(i+1).trim() }
      return { key: '', val: line }
    })
  }

  const keyLabels: Record<string, string> = {
    'STATUS': 'STATUS', 'ANALYSE': 'ANALYSE', 'AKTION': 'AKTION', 'NÄCHSTE SCHRITTE': 'NÄCHSTE SCHRITTE',
  }

  return (
    <div className="animate-fade-up" style={{ maxWidth: 780, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ marginBottom: 4 }}>Tagro AI</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />
            <span style={{ color: 'var(--green-dark)', fontWeight: 600 }}>AKTIV</span>
          </span>
          <span style={{ color: 'var(--border-strong)' }}>·</span>
          <span>Production Engine · {projects.length} {projects.length === 1 ? 'Projekt' : 'Projekte'}</span>
        </p>
      </div>

      {/* Feed */}
      <div ref={feedRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 10 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, animation: i === msgs.length-1 ? 'slideUp 0.25s ease' : 'none' }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: m.role === 'ai' ? 'var(--text)' : 'var(--surface-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, color: m.role === 'ai' ? '#fff' : 'var(--text-secondary)', fontWeight: 600,
            }}>
              {m.role === 'ai' ? 'T' : 'S'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{m.role === 'ai' ? 'Tagro' : 'Du'}</span>
                {m.role === 'ai' && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>SYSTEM</span>}
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.time}</span>
              </div>
              {m.structured && m.role === 'ai' ? (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
                  {parseStructured(m.text).map((line, j) => (
                    <div key={j} style={{ display: 'flex', borderBottom: j < parseStructured(m.text).length-1 ? '1px solid var(--border)' : 'none' }}>
                      {line.key && keyLabels[line.key] && (
                        <div style={{ padding: '10px 14px', minWidth: 140, background: 'var(--bg)', borderRight: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>{line.key}</span>
                        </div>
                      )}
                      <div style={{ padding: '10px 14px', flex: 1 }}>
                        <p style={{ fontSize: 13.5, color: 'var(--text)', margin: 0, lineHeight: 1.55 }}>{line.val}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '10px 14px' }}>
                  <p style={{ fontSize: 14, color: 'var(--text)', margin: 0, lineHeight: 1.55 }}>{m.text}</p>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', fontWeight: 600, flexShrink: 0 }}>T</div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '14px 16px', display: 'flex', gap: 5 }}>
              {[0,1,2].map(j => <span key={j} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-muted)', animation: `pulse 1s ${j*0.2}s infinite` }} />)}
            </div>
          </div>
        )}
      </div>

      <div style={{ paddingTop: 10, paddingBottom: 6, display: 'flex', gap: 6, overflowX: 'auto' }}>
        {QUICK_PROMPTS.map(q => (
          <button key={q} onClick={() => send(q)} className="tap-scale" style={{
            padding: '6px 12px', borderRadius: 20, border: '1px solid var(--border)',
            background: 'var(--surface)', fontSize: 12, color: 'var(--text-secondary)',
            cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'inherit',
          }}>{q}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, paddingTop: 6 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Frage Tagro…"
          style={{ flex: 1, padding: '12px 16px', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontSize: 15, outline: 'none', background: 'var(--surface)', color: 'var(--text)', minHeight: 44 }} />
        <button onClick={() => send()} disabled={!input.trim() || loading} className="tap-scale" style={{
          width: 44, height: 44, borderRadius: 'var(--r)', border: 'none', flexShrink: 0,
          background: input.trim() && !loading ? 'var(--text)' : 'var(--surface-2)',
          color: input.trim() ? '#fff' : 'var(--text-muted)',
          cursor: input.trim() ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {loading ? <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M9 7h8v8"/></svg>}
        </button>
      </div>
    </div>
  )
}
