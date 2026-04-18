'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

type Msg = { role: 'user'|'ai'; text: string; time: string; structured?: boolean }
type Project = { id: string; title: string; status: string }

const TAGRO_SYSTEM = `Du bist Tagro — das AI-Kernsystem von Festag.

VERHALTEN-REGELN (STRIKT):
- Du bist kein Chatbot. Du bist ein Produktionssystem.
- Jede Antwort folgt IMMER dieser Struktur:

STATUS: [1 kurzer System-Satz]
ANALYSE: [Was du verstanden hast]
AKTION: [Was das System jetzt tut]
NÄCHSTE SCHRITTE: [Konkretes Ergebnis]

- Maximal 4 Zeilen. Jede Zeile klar und direkt.
- Keine Höflichkeitsfloskeln. Keine Weichspüler.
- Klingt wie ein intelligentes System, nicht wie ein Mensch.
- Sprache: Deutsch.

BEISPIEL:
STATUS: Projektanalyse erkannt.
ANALYSE: Ziel ist eine SaaS-Plattform mit Authentifizierung und Dashboard.
AKTION: System zerlegt Anforderungen in 5 Module und 12 Tasks.
NÄCHSTE SCHRITTE: Erste Struktur wird erstellt. Developer-Zuweisung folgt.`

const QUICK_PROMPTS = [
  'Was ist der Status meiner Projekte?',
  'Was wurde heute gemacht?',
  'Was sind die nächsten Schritte?',
  'Generiere Tasks für mein Projekt',
  'Erstelle einen Tagesbericht',
]

export default function AIHubPage() {
  const [msgs, setMsgs] = useState<Msg[]>([{
    role: 'ai',
    text: 'STATUS: System bereit.\nANALYSE: Festag Production Engine aktiv.\nAKTION: Warte auf Eingabe.\nNÄCHSTE SCHRITTE: Beschreibe dein Anliegen.',
    time: new Date().toLocaleTimeString('de', {hour:'2-digit',minute:'2-digit'}),
    structured: true,
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [systemMode, setSystemMode] = useState('MONITORING')
  const [activityLog, setActivityLog] = useState<string[]>(['System gestartet', 'AI-Engine aktiv', 'Bereit für Eingaben'])
  const feedRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      supabase.from('projects').select('id,title,status').then(({ data: p }) => setProjects(p ?? []))
    })
    const modes = ['MONITORING','PLANNING','EXECUTION','ANALYSIS','REVIEW']
    let i = 0
    const iv = setInterval(() => { setSystemMode(modes[i++ % modes.length]) }, 4000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => { feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' }) }, [msgs])

  async function send(text?: string) {
    const msg = text || input
    if (!msg.trim() || loading) return
    setInput('')
    const time = new Date().toLocaleTimeString('de', {hour:'2-digit',minute:'2-digit'})
    setMsgs(m => [...m, { role: 'user', text: msg, time }])
    setLoading(true)
    setActivityLog(a => [`Verarbeite: "${msg.slice(0,30)}…"`, ...a].slice(0,5))

    try {
      const ctx = projects.length > 0 ? `\nNutzerprojekte: ${projects.map(p=>`${p.title}(${p.status})`).join(', ')}` : ''
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
      const reply = data.content?.[0]?.text ?? 'STATUS: Fehler.\nANALYSE: Verbindung unterbrochen.\nAKTION: Retry empfohlen.\nNÄCHSTE SCHRITTE: Erneut versuchen.'
      setMsgs(m => [...m, { role: 'ai', text: reply, time: new Date().toLocaleTimeString('de', {hour:'2-digit',minute:'2-digit'}), structured: true }])
      setActivityLog(a => ['Antwort generiert', ...a].slice(0,5))
    } catch {
      setMsgs(m => [...m, { role: 'ai', text: 'STATUS: System-Fehler.\nANALYSE: API-Verbindung unterbrochen.\nAKTION: Fehler wird geloggt.\nNÄCHSTE SCHRITTE: Erneut versuchen.', time: new Date().toLocaleTimeString('de', {hour:'2-digit',minute:'2-digit'}), structured: true }])
    }
    setLoading(false)
  }

  // Parse structured AI response into sections
  function parseStructured(text: string) {
    const lines = text.split('\n').filter(Boolean)
    return lines.map(line => {
      const colonIdx = line.indexOf(':')
      if (colonIdx > 0 && colonIdx < 20) {
        const key = line.slice(0, colonIdx).trim()
        const val = line.slice(colonIdx + 1).trim()
        return { key, val }
      }
      return { key: '', val: line }
    })
  }

  const keyColors: Record<string, string> = {
    'STATUS': '#60A5FA', 'ANALYSE': '#A78BFA', 'AKTION': '#34D399', 'NÄCHSTE SCHRITTE': '#FBBF24',
  }

  return (
    <div className="animate-fade-up" style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #2563EB, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#fff' }}>✦</div>
            <h1 style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.3px' }}>Tagro AI Hub</h1>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
            PRODUCTION ENGINE · MODE: {systemMode} · {projects.length} PROJEKTE
          </p>
        </div>
        {/* Mini activity log */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', minWidth: 200, display: 'none' }}>
          {activityLog.slice(0,3).map((a, i) => (
            <p key={i} style={{ fontSize: 10, color: i === 0 ? 'var(--text-secondary)' : 'var(--text-muted)', marginBottom: i < 2 ? 3 : 0, fontFamily: 'monospace', opacity: 1 - i * 0.3 }}>
              {i === 0 ? '● ' : '· '}{a}
            </p>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div ref={feedRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 8 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, animation: i === msgs.length-1 ? 'slideUp 0.25s ease' : 'none' }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: m.role === 'ai' ? 'linear-gradient(135deg, #2563EB, #7C3AED)' : 'var(--surface2)',
              border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: m.role === 'ai' ? 13 : 12, color: m.role === 'ai' ? '#fff' : 'var(--text-secondary)', fontWeight: 700,
            }}>
              {m.role === 'ai' ? '✦' : 'S'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{m.role === 'ai' ? 'Tagro' : 'Du'}</span>
                {m.role === 'ai' && <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: '#7C3AED', padding: '1px 5px', borderRadius: 4 }}>AI SYSTEM</span>}
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.time}</span>
              </div>
              {m.structured && m.role === 'ai' ? (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                  {parseStructured(m.text).map((line, j) => (
                    <div key={j} style={{ display: 'flex', gap: 0, borderBottom: j < parseStructured(m.text).length-1 ? '1px solid var(--border)' : 'none' }}>
                      {line.key && (
                        <div style={{ padding: '8px 12px', minWidth: 130, background: 'var(--surface2)', borderRight: '1px solid var(--border)' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: keyColors[line.key] || 'var(--text-muted)', letterSpacing: '0.06em' }}>{line.key}</span>
                        </div>
                      )}
                      <div style={{ padding: '8px 14px', flex: 1 }}>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{line.val}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ background: m.role === 'ai' ? 'var(--surface)' : 'var(--accent-light)', border: `1px solid ${m.role === 'ai' ? 'var(--border)' : '#C7D7FF'}`, borderRadius: 12, padding: '10px 14px' }}>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>{m.text}</p>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #2563EB, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff', flexShrink: 0 }}>✦</div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 5 }}>
              {[0,1,2].map(j => <span key={j} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: `pulse 1s ${j*0.2}s infinite` }} />)}
            </div>
          </div>
        )}
      </div>

      {/* Quick prompts */}
      <div style={{ paddingTop: 10, paddingBottom: 8, display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' as const }}>
        {QUICK_PROMPTS.map(q => (
          <button key={q} onClick={() => send(q)} style={{ padding: '4px 12px', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'inherit' }}>
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Frage Tagro…"
          style={{ flex: 1, padding: '11px 16px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14, outline: 'none', background: 'var(--surface)', color: 'var(--text-primary)', fontFamily: 'inherit' }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <button onClick={() => send()} disabled={!input.trim() || loading} style={{
          width: 44, height: 44, borderRadius: 'var(--radius)', border: 'none', flexShrink: 0,
          background: input.trim() && !loading ? 'linear-gradient(135deg, #2563EB, #7C3AED)' : 'var(--surface2)',
          color: input.trim() ? '#fff' : 'var(--text-muted)', fontSize: 16, cursor: input.trim() ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
        }}>
          {loading ? <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> : '↗'}
        </button>
      </div>
    </div>
  )
}
