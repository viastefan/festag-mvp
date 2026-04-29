'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import ChatMarkdown from '@/components/ChatMarkdown'

type Msg = { role: 'user' | 'ai'; text: string; time: string }
type Project = { id: string; title: string; status: string; description?: string }
type Task = { id: string; title: string; status: string; project_id: string }

const PHASE: Record<string, string> = { intake: 'Intake', planning: 'Planning', active: 'In Arbeit', testing: 'Testing', done: 'Abgeschlossen' }

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

export default function AIPage() {
  const [msgs,     setMsgs]     = useState<Msg[]>([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks,    setTasks]    = useState<Task[]>([])
  const [initDone, setInitDone] = useState(false)
  const feedRef  = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const sb = createClient()

  useEffect(() => {
    sb.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      const { data: p } = await sb.from('projects').select('id,title,status,description').order('created_at', { ascending: false }).limit(8)
      const { data: t } = await sb.from('tasks').select('id,title,status,project_id').order('created_at', { ascending: false }).limit(50)
      setProjects(p ?? [])
      setTasks(t ?? [])

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
    return '\n\nAktuelle Projekte:\n' + projects.map(p => `- ${p.title} (${PHASE[p.status] ?? p.status})${p.description ? ': ' + p.description : ''}`).join('\n')
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
        const title = d.decomposed?.project_title ?? 'Demo-Projekt'
        const epics = d.decomposed?.epics?.length ?? 0
        const tasks = d.decomposed?.epics?.reduce((a: number, e: any) => a + (e.tasks?.length ?? 0), 0) ?? 0
        setMsgs(m => [...m, {
          role: 'ai',
          text: `**Demo-Projekt erstellt: "${title}"**\n\n- ${epics} Epics\n- ${tasks} Tasks\n- Status: \`intake\`\n\n[Projekt öffnen →](/project/${d.projectId})`,
          time: fmt(),
        }])
        // Projekte neu laden für Sidebar
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
    if (inputRef.current) { inputRef.current.style.height = 'auto' }

    const userMsg: Msg = { role: 'user', text: msg, time: fmt() }
    setMsgs(m => [...m, userMsg])

    // Shortcut: "test projekt" → AI-generiertes Demo-Projekt anlegen
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

  const totalTasks = tasks.length
  const doneTasks  = tasks.filter(t => t.status === 'done').length
  const inProgress = tasks.filter(t => t.status === 'doing').length
  const pct = totalTasks ? Math.round(doneTasks / totalTasks * 100) : 0

  return (
    <div style={{ display: 'flex', height: 'calc(100dvh - 56px)', overflow: 'hidden' }}>
      <style>{`
        .ai-msg-in { animation: fadeUp .25s cubic-bezier(.16,1,.3,1) both }
        .ai-sidebar { display: none; }
        @media(min-width:769px) {
          .ai-sidebar { display: flex; }
          .ai-quick { gap: 6px !important }
          .ai-quick button { font-size: 12px !important }
        }
        @media(max-width:768px) {
          .ai-quick button { font-size: 11px !important; padding: 5px 10px !important }
        }
      `}</style>

      {/* ── MAIN CHAT COLUMN ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Header */}
        <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 14, color: 'var(--accent-text)', fontWeight: 700 }}>✦</span>
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0, lineHeight: 1 }}>Tagro AI</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0', lineHeight: 1 }}>Production Engine</p>
            </div>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: 'var(--green-dark)', background: 'var(--green-bg)', padding: '4px 10px', borderRadius: 8, border: '1px solid var(--green-border)' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />
            AKTIV
          </span>
        </div>

        {/* Feed */}
        <div ref={feedRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {msgs.map((m, i) => (
            <div key={i} className={i === msgs.length - 1 ? 'ai-msg-in' : ''} style={{ display: 'flex', gap: 12, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
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
                  color: m.role === 'ai' ? 'var(--text)' : '#FFFFFF',
                  fontSize: 14, lineHeight: 1.6, wordBreak: 'break-word',
                }}>
                  {m.role === 'ai'
                    ? <ChatMarkdown text={m.text} />
                    : <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#FFFFFF', fontWeight: 600 }}>{m.text}</p>}
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

        {/* Quick actions + Input — zentriert in einem Container */}
        <div style={{ width: '100%', maxWidth: 760, margin: '0 auto', padding: '0 20px 20px', flexShrink: 0 }}>
          <div className="ai-quick" style={{ padding: '0 0 10px', display: 'flex', gap: 8, overflowX: 'auto' }}>
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

          <div className="ai-input-wrap" style={{ display: 'flex', gap: 8, alignItems: 'flex-end', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '10px 12px 10px 16px', transition: 'border-color .15s' }}
            onFocusCapture={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--text-muted)'}
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
              style={{ width: 36, height: 36, borderRadius: 10, border: 'none', flexShrink: 0, background: input.trim() && !loading ? 'var(--btn-prim)' : 'var(--surface-2)', color: input.trim() && !loading ? '#FFFFFF' : 'var(--text-muted)', cursor: input.trim() && !loading ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s' }}>
              {loading
                ? <span style={{ width: 14, height: 14, border: '2px solid rgba(128,128,128,.3)', borderTopColor: 'currentColor', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M7 17L17 7M9 7h8v8"/></svg>
              }
            </button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', margin: '8px 0 0', opacity: .55 }}>
            Enter zum Senden · Shift+Enter für neue Zeile · Tipp: <code style={{ fontFamily: 'ui-monospace,monospace', background: 'var(--surface-2)', padding: '1px 5px', borderRadius: 4 }}>test projekt</code> für Demo
          </p>
        </div>
      </div>

      {/* ── RIGHT SIDEBAR — desktop only ── */}
      <div className="ai-sidebar" style={{ width: 300, borderLeft: '1px solid var(--border)', flexDirection: 'column', gap: 0, overflowY: 'auto', background: 'var(--bg)' }}>

        {/* Global stats */}
        <div style={{ padding: '20px 20px 0' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 12px' }}>Übersicht</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Projekte', value: projects.length, color: 'var(--text)' },
              { label: 'Tasks', value: totalTasks, color: 'var(--text)' },
              { label: 'Erledigt', value: doneTasks, color: 'var(--green-dark)' },
              { label: 'Aktiv', value: inProgress, color: 'var(--amber-dark)' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '11px 13px' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.06em', margin: '0 0 4px' }}>{s.label.toUpperCase()}</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: s.color, margin: 0, lineHeight: 1 }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          {totalTasks > 0 && (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '13px 14px', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Gesamtfortschritt</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{pct}%</span>
              </div>
              <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'var(--green)', borderRadius: 4, transition: 'width 1s cubic-bezier(.16,1,.3,1)' }} />
              </div>
            </div>
          )}
        </div>

        {/* Projects list */}
        {projects.length > 0 && (
          <div style={{ padding: '0 20px 16px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>Projekte</p>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              {projects.slice(0, 5).map((p, i) => (
                <Link key={p.id} href={`/project/${p.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                  <div style={{
                    padding: '10px 13px', borderBottom: i < Math.min(projects.length, 5) - 1 ? '1px solid var(--border)' : 'none',
                    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', transition: 'background .1s',
                  }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text)', flexShrink: 0 }}>
                      {p.title.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
                      <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>{PHASE[p.status] ?? p.status}</p>
                    </div>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: p.status === 'active' ? 'var(--green)' : p.status === 'done' ? 'var(--text-muted)' : 'var(--amber)' }} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Tagro capabilities */}
        <div style={{ padding: '0 20px 16px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>Tagro kann</p>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            {[
              { icon: '📊', label: 'Statusberichte erstellen' },
              { icon: '🎯', label: 'Risiken identifizieren' },
              { icon: '✅', label: 'Tasks priorisieren' },
              { icon: '🗺️', label: 'Roadmaps planen' },
              { icon: '📝', label: 'Projekt strukturieren' },
            ].map((c, i) => (
              <button key={c.label} onClick={() => send(c.label)} disabled={loading}
                style={{ width: '100%', padding: '9px 13px', borderBottom: i < 4 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: 9, background: 'transparent', border: 'none', borderBottom: i < 4 ? '1px solid var(--border)' : 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'background .1s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <span style={{ fontSize: 14, flexShrink: 0 }}>{c.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quick start new project */}
        <div style={{ padding: '0 20px 20px' }}>
          <div style={{ background: 'var(--accent)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-text)', margin: '0 0 6px', opacity: .7, letterSpacing: '.06em' }}>NEUES PROJEKT</p>
            <p style={{ fontSize: 12, color: 'var(--accent-text)', margin: '0 0 12px', lineHeight: 1.5, opacity: .85 }}>Beschreibe deine Idee — Tagro strukturiert alles.</p>
            <Link href="/onboarding">
              <button className="tap-scale" style={{ width: '100%', height: 36, background: 'rgba(255,255,255,0.12)', color: 'var(--accent-text)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Projekt starten →
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
