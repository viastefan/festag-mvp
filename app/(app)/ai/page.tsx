'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import ChatMarkdown from '@/components/ChatMarkdown'
import ChatInput from '@/components/ChatInput'

type Msg     = { role: 'user' | 'ai'; text: string; time: string }
type Project = { id: string; title: string; status: string; description?: string }
type Task    = { id: string; title: string; status: string; project_id: string }

const PHASE: Record<string, string> = {
  intake: 'Intake', planning: 'Planning',
  active: 'In Arbeit', testing: 'Testing', done: 'Abgeschlossen',
}

const TEST_TRIGGER = /^\s*test[\s\-_]*projekt\s*$/i

const SYSTEM = `Du bist Tagro, das AI-Produktionssystem von Festag.
Verhalte dich wie ein erfahrener CTO und Projektmanager in einem.
Beantworte Fragen klar und direkt. Maximal 5 Sätze pro Antwort.
Wenn du Projektdaten hast, nutze sie konkret.
Sprache: Deutsch. Kein Smalltalk. Keine Emojis.

FORMATIERUNG: Nutze Markdown wenn es Klarheit schafft.
- **fett** für Schlüsselbegriffe
- Listen (- oder 1.) für mehrere Punkte
- \`code\` für Datei-, Feld- oder Statusnamen
- Überschriften (### oder ####) nur bei längeren Berichten
Halte den Text trotzdem knapp.`

const QUICK = [
  'Was ist der aktuelle Projektstatus?',
  'Welche Tasks sind kritisch?',
  'Was sind die nächsten Schritte?',
  'Erstelle einen Fortschrittsbericht',
  'Wo gibt es Risiken?',
]

const TAGRO_CAN = [
  { icon: '📊', label: 'Statusberichte erstellen' },
  { icon: '🎯', label: 'Risiken identifizieren' },
  { icon: '✅', label: 'Tasks priorisieren' },
  { icon: '🗺️', label: 'Roadmaps planen' },
  { icon: '🏗️', label: 'Projekt strukturieren' },
]

export default function AIPage() {
  const [msgs,     setMsgs]     = useState<Msg[]>([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks,    setTasks]    = useState<Task[]>([])
  const feedRef = useRef<HTMLDivElement>(null)
  const sb = createClient()

  useEffect(() => {
    sb.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      const { data: p } = await sb.from('projects').select('id,title,status,description').order('created_at', { ascending: false }).limit(8)
      const { data: t } = await sb.from('tasks').select('id,title,status,project_id').order('created_at', { ascending: false }).limit(50)
      setProjects(p ?? [])
      setTasks(t ?? [])
      setMsgs([{
        role: 'ai',
        text: p?.length
          ? `Ich bin Tagro — dein AI-Projektmanager. Du hast ${p.length} aktives Projekt${p.length !== 1 ? 'e' : ''}. Wie kann ich dir helfen?`
          : 'Ich bin Tagro — dein AI-Projektmanager. Du hast noch keine Projekte. Starte ein Projekt um loszulegen.',
        time: fmt(),
      }])
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
    return '\n\nAktuelle Projekte:\n' + projects.map(p =>
      `- ${p.title} (${PHASE[p.status] ?? p.status})${p.description ? ': ' + p.description : ''}`
    ).join('\n')
  }

  async function createTestProject() {
    setLoading(true)
    try {
      const { data: { session } } = await sb.auth.getSession()
      const userId = session?.user.id
      if (!userId) { setLoading(false); return }
      const res = await fetch('/api/ai/test-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const d = await res.json()
      if (d.projectId) {
        const title  = d.decomposed?.project_title ?? 'Demo-Projekt'
        const epics  = d.decomposed?.epics?.length ?? 0
        const ntasks = d.decomposed?.epics?.reduce((a: number, e: any) => a + (e.tasks?.length ?? 0), 0) ?? 0
        setMsgs(m => [...m, { role: 'ai', text: `**Demo-Projekt erstellt: "${title}"**\n\n- ${epics} Epics\n- ${ntasks} Tasks\n- Status: \`intake\`\n\n[Projekt öffnen →](/project/${d.projectId})`, time: fmt() }])
        const { data: p } = await sb.from('projects').select('id,title,status,description').order('created_at', { ascending: false }).limit(8)
        setProjects(p ?? [])
      } else {
        setMsgs(m => [...m, { role: 'ai', text: `Konnte Demo-Projekt nicht anlegen: ${d.error ?? 'unbekannter Fehler'}`, time: fmt() }])
      }
    } catch {
      setMsgs(m => [...m, { role: 'ai', text: 'Verbindungsfehler beim Anlegen des Demo-Projekts.', time: fmt() }])
    }
    setLoading(false)
  }

  async function send(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')

    const userMsg: Msg = { role: 'user', text: msg, time: fmt() }
    setMsgs(m => [...m, userMsg])

    if (TEST_TRIGGER.test(msg)) {
      setMsgs(m => [...m, { role: 'ai', text: 'Tagro generiert ein realistisches Demo-Projekt — einen Moment…', time: fmt() }])
      createTestProject()
      return
    }

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
      const text = d.content?.[0]?.text
      if (text) {
        setMsgs(m => [...m, { role: 'ai', text, time: fmt() }])
      } else {
        const errMsg = d?.message || d?.error || 'Unbekannter Fehler'
        setMsgs(m => [...m, { role: 'ai', text: `**AI-Fehler:** ${errMsg}`, time: fmt() }])
      }
    } catch (e: any) {
      setMsgs(m => [...m, { role: 'ai', text: `**Verbindungsfehler:** ${e?.message ?? 'unbekannt'}`, time: fmt() }])
    }
    setLoading(false)
  }

  const totalTasks = tasks.length
  const doneTasks  = tasks.filter(t => t.status === 'done').length
  const inProgress = tasks.filter(t => t.status === 'doing').length
  const pct        = totalTasks ? Math.round(doneTasks / totalTasks * 100) : 0

  return (
    <div style={{ display: 'flex', height: 'calc(100dvh - 0px)', overflow: 'hidden' }}>
      <style>{`
        .ai-msg-in { animation: fadeUp .25s cubic-bezier(.16,1,.3,1) both }
        .ai-sidebar { display: none; }
        .ai-quick { scrollbar-width: none; -ms-overflow-style: none; }
        .ai-quick::-webkit-scrollbar { display: none; }
        .q-chip { padding:5px 13px; border-radius:20px; border:1px solid var(--border); background:var(--surface); font-size:12px; color:var(--text-secondary); cursor:pointer; white-space:nowrap; flex-shrink:0; font-family:inherit; font-weight:500; transition:border-color .1s, background .1s; }
        .q-chip:hover { border-color:var(--border-strong); background:var(--card); color:var(--text); }
        .tagro-can-row { display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid var(--border); font-size:12.5px; color:var(--text-secondary); font-weight:500; }
        .tagro-can-row:last-child { border-bottom:none; }
        @media(min-width:900px) {
          .ai-sidebar { display:flex !important; }
        }
      `}</style>

      {/* ── MAIN CHAT ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Header */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: 'var(--bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--bg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0, lineHeight: 1.1 }}>Tagro AI</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0', lineHeight: 1 }}>Production Engine</p>
            </div>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, color: 'var(--green-dark)', background: 'var(--green-bg)', padding: '4px 10px', borderRadius: 8, border: '1px solid var(--green-border)', letterSpacing: '.06em' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />
            AKTIV
          </span>
        </div>

        {/* Message feed */}
        <div ref={feedRef} style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 22 }}>
          {msgs.map((m, i) => (
            <div key={i} className={i === msgs.length - 1 ? 'ai-msg-in' : ''}
              style={{ display: 'flex', gap: 10, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {m.role === 'ai' && (
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 3 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--bg)" strokeWidth="2.2" strokeLinecap="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></svg>
                </div>
              )}
              <div style={{ maxWidth: '80%', display: 'flex', flexDirection: 'column', gap: 4, alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  padding: '11px 15px',
                  borderRadius: m.role === 'ai' ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
                  background: m.role === 'ai' ? 'var(--card)' : 'var(--btn-prim)',
                  border: m.role === 'ai' ? '1px solid var(--border)' : 'none',
                  color: m.role === 'ai' ? 'var(--text)' : 'var(--btn-prim-text)',
                  fontSize: 14, lineHeight: 1.6, wordBreak: 'break-word',
                }}>
                  {m.role === 'ai'
                    ? <ChatMarkdown text={m.text} />
                    : <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--btn-prim-text)', fontWeight: 600 }}>{m.text}</p>
                  }
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '.02em' }}>
                  {m.role === 'ai' ? 'Tagro' : 'Du'} · {m.time}
                </span>
              </div>
              {m.role === 'user' && (
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 3 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2"><circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6"/></svg>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="ai-msg-in" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--bg)" strokeWidth="2.2" strokeLinecap="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></svg>
              </div>
              <div style={{ padding: '12px 16px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '4px 16px 16px 16px', display: 'flex', gap: 5, alignItems: 'center' }}>
                {[0, 1, 2].map(j => (
                  <span key={j} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)', animation: `pulse 1.2s ${j * 0.2}s ease-in-out infinite` }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input area — with quick chips + ChatInput */}
        <div style={{ flexShrink: 0, padding: '0 16px 20px', background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
          {/* Quick chips */}
          <div className="ai-quick" style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '12px 0 10px' }}>
            {QUICK.map(q => (
              <button key={q} onClick={() => send(q)} disabled={loading} className="q-chip">
                {q}
              </button>
            ))}
          </div>

          {/* ChatInput component — same as copilot/onboarding */}
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={() => send()}
            loading={loading}
            placeholder="Frag Tagro — was soll dein Projekt können?"
            autoFocus
            banner={
              <p style={{ fontSize: 10.5, color: 'var(--text-muted)', textAlign: 'center', margin: '7px 0 0', letterSpacing: '.03em' }}>
                ⏎ Senden · ⇧⏎ Neue Zeile
              </p>
            }
          />
        </div>
      </div>

      {/* ── RIGHT SIDEBAR — desktop only ── */}
      <div className="ai-sidebar" style={{
        width: 280,
        borderLeft: '1px solid var(--border)',
        flexDirection: 'column',
        overflowY: 'auto',
        background: 'var(--bg)',
        scrollbarWidth: 'none',
      }}>

        {/* Übersicht */}
        <div style={{ padding: '20px 18px 0' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 12px' }}>Übersicht</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
            {[
              { label: 'Projekte', value: projects.length },
              { label: 'Tasks',    value: totalTasks },
              { label: 'Erledigt', value: doneTasks,  green: true },
              { label: 'Aktiv',    value: inProgress, amber: true },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '11px 13px' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.06em', margin: '0 0 5px' }}>{s.label.toUpperCase()}</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: (s as any).green ? 'var(--green-dark)' : (s as any).amber ? 'var(--amber-dark)' : 'var(--text)', margin: 0, lineHeight: 1, letterSpacing: '-.4px' }}>{s.value}</p>
              </div>
            ))}
          </div>

          {totalTasks > 0 && (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '13px 14px', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)' }}>Gesamtfortschritt</span>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text)' }}>{pct}%</span>
              </div>
              <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'var(--green)', borderRadius: 4, transition: 'width 1s cubic-bezier(.16,1,.3,1)' }} />
              </div>
            </div>
          )}
        </div>

        {/* Projects */}
        {projects.length > 0 && (
          <div style={{ padding: '0 18px 14px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>Projekte</p>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              {projects.slice(0, 5).map((p, i) => (
                <Link key={p.id} href={`/project/${p.id}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderBottom: i < Math.min(projects.length, 5) - 1 ? '1px solid var(--border)' : 'none', textDecoration: 'none', transition: 'background .1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)',
                  }}>
                    {p.title.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
                    <p style={{ fontSize: 10.5, color: 'var(--text-muted)', margin: 0, textTransform: 'capitalize' }}>{PHASE[p.status] ?? p.status}</p>
                  </div>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.status === 'active' ? 'var(--green)' : p.status === 'done' ? 'var(--text-muted)' : 'var(--amber)', flexShrink: 0 }} />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Tagro kann */}
        <div style={{ padding: '0 18px 20px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>Tagro kann</p>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '4px 14px' }}>
            {TAGRO_CAN.map(c => (
              <div key={c.label} className="tagro-can-row" style={{ cursor: 'pointer' }}
                onClick={() => send(c.label)}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>{c.icon}</span>
                <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 500 }}>{c.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* New project CTA */}
        <div style={{ padding: '0 18px 20px', marginTop: 'auto' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.08em', margin: '0 0 8px', textTransform: 'uppercase' }}>Neues Projekt</p>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: 1.5 }}>Lass Tagro dein nächstes Projekt strukturieren.</p>
            <Link href="/new-project"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', background: 'var(--btn-prim)', color: 'var(--btn-prim-text)', borderRadius: 9, fontSize: 12.5, fontWeight: 700, textDecoration: 'none' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Starten
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
