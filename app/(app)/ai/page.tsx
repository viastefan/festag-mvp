'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

type Msg = { role: 'user'|'ai'; text: string; time: string }
type Project = { id: string; title: string; status: string }

const QUICK = [
  'Was ist der Status meiner Projekte?',
  'Was wurde heute gemacht?',
  'Was sind die nächsten Schritte?',
  'Erstelle mir einen Projektplan',
  'Wie viele Tasks sind offen?',
]

const AI_SYSTEM = `Du bist Tagro, die AI von Festag – einem AI-nativen Software-Produktionssystem.
Dein Charakter: professionell, präzise, systemorientiert. Kein Small Talk.
Du sprichst wie ein intelligentes System, nicht wie ein Chatbot.
Antworte immer auf Deutsch. Maximal 3–4 Sätze.
Wenn du über Projektstatus sprichst, strukturiere deine Antwort klar.`

export default function AIHubPage() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'ai', text: 'Willkommen bei Festag. Ich bin Tagro — das AI-System hinter deiner Softwareproduktion. Beschreibe dein Projekt oder stelle mir eine Frage.', time: new Date().toLocaleTimeString('de', {hour:'2-digit',minute:'2-digit'}) }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [systemMode, setSystemMode] = useState('MONITORING')
  const feedRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      supabase.from('projects').select('id,title,status').then(({ data: p }) => setProjects(p ?? []))
    })
    const modes = ['MONITORING','PLANNING','EXECUTION','ANALYSIS']
    const iv = setInterval(() => setSystemMode(modes[Math.floor(Math.random()*4)]), 5000)
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

    try {
      const ctx = projects.length > 0
        ? `\nAktuelle Projekte des Nutzers: ${projects.map(p => `${p.title} (${p.status})`).join(', ')}`
        : '\nNoch keine Projekte vorhanden.'

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 400,
          system: AI_SYSTEM + ctx,
          messages: [
            ...msgs.filter(m => m.role !== 'ai' || msgs.indexOf(m) > 0).slice(-6).map(m => ({
              role: m.role === 'ai' ? 'assistant' : 'user',
              content: m.text
            })),
            { role: 'user', content: msg }
          ]
        })
      })
      const data = await res.json()
      const reply = data.content?.[0]?.text ?? 'System verarbeitet Anfrage…'
      setMsgs(m => [...m, { role: 'ai', text: reply, time: new Date().toLocaleTimeString('de', {hour:'2-digit',minute:'2-digit'}) }])
    } catch {
      setMsgs(m => [...m, { role: 'ai', text: 'Verbindung zum AI-System unterbrochen. Bitte erneut versuchen.', time: new Date().toLocaleTimeString('de', {hour:'2-digit',minute:'2-digit'}) }])
    }
    setLoading(false)
  }

  return (
    <div className="animate-fade-up" style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #2563EB, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#fff' }}>✦</div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.3px' }}>Tagro AI Hub</h1>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>FESTAG PRODUCTION AI · MODE: {systemMode}</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: '#D1FAE5', borderRadius: 20, border: '1px solid #A7F3D0' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#065F46' }}>AKTIV</span>
          </div>
        </div>

        {/* System stats */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: 'Projekte', value: projects.length.toString() },
            { label: 'AI-Kontext', value: 'Geladen' },
            { label: 'Antwortzeit', value: '< 3s' },
          ].map(s => (
            <div key={s.label} style={{ padding: '4px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, display: 'flex', gap: 5 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.label}:</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chat feed */}
      <div ref={feedRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 8 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', animation: i === msgs.length-1 ? 'slideUp 0.25s ease' : 'none' }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: m.role === 'ai' ? 'linear-gradient(135deg, #2563EB, #7C3AED)' : 'var(--surface2)',
              border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: m.role === 'ai' ? 13 : 12, color: m.role === 'ai' ? '#fff' : 'var(--text-secondary)', fontWeight: 700,
            }}>
              {m.role === 'ai' ? '✦' : 'S'}
            </div>
            <div style={{ flex: 1, maxWidth: '85%' }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {m.role === 'ai' ? 'Tagro (fesTag AI)' : 'Du'}
                </span>
                {m.role === 'ai' && <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: '#7C3AED', padding: '1px 5px', borderRadius: 4 }}>AI</span>}
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.time}</span>
              </div>
              <div style={{
                background: m.role === 'ai' ? 'var(--surface)' : 'var(--accent-light)',
                border: `1px solid ${m.role === 'ai' ? 'var(--border)' : '#C7D7FF'}`,
                borderRadius: 12, borderTopLeftRadius: m.role === 'ai' ? 2 : 12,
                borderTopRightRadius: m.role === 'user' ? 2 : 12,
                padding: '10px 14px',
              }}>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>{m.text}</p>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #2563EB, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff' }}>✦</div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, borderTopLeftRadius: 2, padding: '12px 16px', display: 'flex', gap: 5 }}>
              {[0,1,2].map(j => <span key={j} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: `pulse 1s ${j*0.2}s infinite` }} />)}
            </div>
          </div>
        )}
      </div>

      {/* Quick prompts */}
      <div style={{ paddingTop: 12, paddingBottom: 8, display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {QUICK.map(q => (
          <button key={q} onClick={() => send(q)} style={{
            padding: '5px 12px', borderRadius: 20, border: '1px solid var(--border)',
            background: 'var(--surface)', fontSize: 12, color: 'var(--text-secondary)',
            cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'inherit',
          }}>
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 8, paddingTop: 8 }}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Frage Tagro AI…"
          style={{
            flex: 1, padding: '12px 16px', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', fontSize: 14, outline: 'none',
            background: 'var(--surface)', color: 'var(--text-primary)', transition: 'border-color 0.2s',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <button onClick={() => send()} disabled={!input.trim() || loading} style={{
          width: 44, height: 44, borderRadius: 'var(--radius)', border: 'none',
          background: input.trim() && !loading ? 'linear-gradient(135deg, #2563EB, #7C3AED)' : 'var(--surface2)',
          color: input.trim() && !loading ? '#fff' : 'var(--text-muted)',
          fontSize: 16, cursor: input.trim() ? 'pointer' : 'default', display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s',
        }}>
          {loading ? <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> : '↗'}
        </button>
      </div>
    </div>
  )
}
