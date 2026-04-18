'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Project = { id: string; title: string; description: string|null; status: string; created_at: string }

const PHASE_CFG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  intake:   { label: 'INTAKE',       color: '#92400E', bg: '#FEF3C7', dot: '#F59E0B' },
  planning: { label: 'PLANNING',     color: '#1E40AF', bg: '#DBEAFE', dot: '#3B82F6' },
  active:   { label: 'DEVELOPMENT',  color: '#065F46', bg: '#D1FAE5', dot: '#10B981' },
  testing:  { label: 'TESTING',      color: '#6D28D9', bg: '#EDE9FE', dot: '#7C3AED' },
  done:     { label: 'DELIVERED',    color: '#374151', bg: '#F3F4F6', dot: '#9CA3AF' },
}

const SYSTEM_LOGS = [
  'AI analysiert Projektstruktur…',
  'Tasks werden priorisiert…',
  'Developer-Zuweisung läuft…',
  'Fortschritt wird berechnet…',
  'Code-Review gestartet…',
  'Deployment-Pipeline aktiv…',
  'AI generiert nächste Schritte…',
  'System-Check abgeschlossen…',
  'Qualitätskontrolle läuft…',
  'Festag Garantie-Check aktiv…',
]

const SUGGESTIONS = [
  'SaaS-Plattform mit Nutzerauthentifizierung und Dashboard',
  'E-Commerce App mit Produktkatalog und Checkout',
  'AI-Chatbot für Kundenservice mit CRM-Integration',
  'Mobile-first Buchungsplattform mit Kalender',
]

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [taskCounts, setTaskCounts] = useState<Record<string, { total: number; done: number }>>({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [aiInput, setAiInput] = useState('')
  const [aiMode, setAiMode] = useState<'idle'|'processing'|'done'>('idle')
  const [userEmail, setUserEmail] = useState('')
  const [systemLogs, setSystemLogs] = useState<{ text: string; time: string; id: number }[]>([])
  const [logIndex, setLogIndex] = useState(0)
  const [systemMode, setSystemMode] = useState<'Planning'|'Execution'|'Monitoring'>('Monitoring')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      setUserEmail(data.session.user.email ?? '')
      loadData()
    })
  }, [])

  // Simulate live system activity
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`
      setSystemLogs(prev => {
        const next = [{ text: SYSTEM_LOGS[logIndex % SYSTEM_LOGS.length], time: timeStr, id: Date.now() }, ...prev].slice(0, 8)
        return next
      })
      setLogIndex(i => i + 1)
      // Rotate system mode
      const modes: Array<'Planning'|'Execution'|'Monitoring'> = ['Planning','Execution','Monitoring']
      setSystemMode(modes[Math.floor(Math.random() * 3)])
    }, 4000)
    return () => clearInterval(interval)
  }, [logIndex])

  async function loadData() {
    setLoading(true)
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
    if (data) {
      setProjects(data)
      const counts: Record<string, { total: number; done: number }> = {}
      await Promise.all(data.map(async p => {
        const { data: tasks } = await supabase.from('tasks').select('status').eq('project_id', p.id)
        counts[p.id] = { total: tasks?.length ?? 0, done: tasks?.filter(t => t.status === 'done').length ?? 0 }
      }))
      setTaskCounts(counts)
    }
    setLoading(false)
  }

  async function createProject(title?: string, desc?: string) {
    const t = title || newTitle
    if (!t.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: proj } = await supabase.from('projects').insert({
      title: t, description: desc || newDesc || null, user_id: user!.id
    }).select().single()
    setNewTitle(''); setNewDesc(''); setShowModal(false); setSaving(false)
    await loadData()
    if (proj) window.location.href = `/project/${proj.id}`
  }

  async function handleAI() {
    if (!aiInput.trim() || aiMode === 'processing') return
    setAiMode('processing')
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 500,
          system: `Du bist Tagro, die AI von Festag. Analysiere den Kundenwunsch und antworte NUR mit validem JSON (kein Markdown):
{"title":"Projekttitel max 50 Zeichen","description":"1 Satz Beschreibung","tasks":["Task 1","Task 2","Task 3","Task 4"]}`,
          messages: [{ role: 'user', content: aiInput }]
        })
      })
      const data = await res.json()
      const text = data.content?.[0]?.text ?? ''
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      await createProject(parsed.title, parsed.description)
    } catch {
      await createProject(aiInput.slice(0, 60))
    }
    setAiMode('done')
    setAiInput('')
    setTimeout(() => setAiMode('idle'), 2000)
  }

  const totalTasks = Object.values(taskCounts).reduce((a, b) => a + b.total, 0)
  const doneTasks = Object.values(taskCounts).reduce((a, b) => a + b.done, 0)
  const activeProjects = projects.filter(p => p.status === 'active').length
  const name = userEmail.split('@')[0]
  const h = new Date().getHours()
  const greeting = h < 12 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend'
  const lastUpdate = projects.length > 0 ? 'vor 2 Minuten' : 'noch keine Aktivität'

  return (
    <div>
      {/* HEADER */}
      <div className="animate-fade-up" style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.4px', marginBottom: 4 }}>
          {greeting}, {name.charAt(0).toUpperCase() + name.slice(1)}.
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            {activeProjects} Projekte aktiv
          </span>
          <span>·</span>
          <span>System arbeitet</span>
          <span>·</span>
          <span>Letztes Update {lastUpdate}</span>
        </p>
      </div>

      {/* 3-COLUMN GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, marginBottom: 20 }}>

        {/* LEFT: AI CONTROL CENTER */}
        <div className="animate-fade-up-1" style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow)',
        }}>
          {/* Top bar */}
          <div style={{
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            padding: '14px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #2563EB, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff' }}>✦</div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '0.06em' }}>TAGRO AI SYSTEM</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em' }}>FESTAG PRODUCTION ENGINE</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#10B981', display: 'flex', alignItems: 'center', gap: 4, letterSpacing: '0.08em' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                AI ACTIVE
              </span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)' }}>
                MODE: {systemMode.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Input */}
          <div style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <textarea
                ref={inputRef}
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAI() }}
                placeholder="Beschreibe dein Projekt… KI strukturiert es automatisch."
                rows={2}
                style={{
                  flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '10px 14px', fontSize: 14, outline: 'none',
                  resize: 'none', color: 'var(--text-primary)', lineHeight: 1.6, fontFamily: 'inherit',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
              <button onClick={handleAI} disabled={!aiInput.trim() || aiMode === 'processing'} style={{
                padding: '10px 16px', borderRadius: 10, border: 'none',
                background: aiInput.trim() && aiMode !== 'processing' ? 'linear-gradient(135deg, #2563EB, #7C3AED)' : 'var(--surface2)',
                color: aiInput.trim() && aiMode !== 'processing' ? '#fff' : 'var(--text-muted)',
                fontSize: 13, fontWeight: 600, cursor: aiInput.trim() ? 'pointer' : 'default',
                transition: 'all 0.2s', whiteSpace: 'nowrap' as const, flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {aiMode === 'processing' ? (
                  <>
                    <span style={{ width: 10, height: 10, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block', flexShrink: 0 }} />
                    Analysiert…
                  </>
                ) : aiMode === 'done' ? '✓ Erstellt' : (
                  <>✦ Starten</>
                )}
              </button>
            </div>

            {/* Suggestions */}
            {!aiInput && (
              <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => { setAiInput(s); inputRef.current?.focus() }} style={{
                    padding: '4px 10px', borderRadius: 20, border: '1px solid var(--border)',
                    background: 'transparent', fontSize: 11, color: 'var(--text-muted)',
                    cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.color = 'var(--accent)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: LIVE SYSTEM ACTIVITY */}
        <div className="animate-fade-up-1" style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow)',
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>SYSTEM ACTIVITY</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#10B981', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
              LIVE
            </span>
          </div>
          <div style={{ padding: '10px 0', height: 130, overflowY: 'hidden' }}>
            {systemLogs.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>System startet…</div>
            ) : systemLogs.map((log, i) => (
              <div key={log.id} style={{
                padding: '5px 16px', display: 'flex', gap: 8, alignItems: 'center',
                opacity: Math.max(0.3, 1 - i * 0.12),
                animation: i === 0 ? 'fadeUp 0.3s ease' : 'none',
              }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace', flexShrink: 0 }}>{log.time}</span>
                <span style={{ fontSize: 12, color: i === 0 ? 'var(--text-secondary)' : 'var(--text-muted)' }}>{log.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* STATS ROW */}
      <div className="animate-fade-up-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'PROJEKTE', value: projects.length, sub: `${activeProjects} aktiv`, accent: '#2563EB' },
          { label: 'TASKS', value: totalTasks, sub: `${doneTasks} erledigt`, accent: '#059669' },
          { label: 'FORTSCHRITT', value: `${totalTasks ? Math.round(doneTasks/totalTasks*100) : 0}%`, sub: 'gesamt', accent: '#7C3AED' },
          { label: 'SYSTEM', value: 'AKTIV', sub: 'AI läuft', accent: '#D97706' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '14px 18px', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: s.accent, borderRadius: '4px 0 0 4px' }} />
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 6 }}>{s.label}</p>
            <p style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--text-primary)', lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontSize: 11, color: s.accent, marginTop: 4, fontWeight: 600 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* PROJECTS */}
      <div className="animate-fade-up-3">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Projekte</h2>
          <button onClick={() => setShowModal(true)} style={{
            padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
            background: 'var(--surface)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            color: 'var(--text-secondary)',
          }}>+ Neu</button>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 12 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ height: 160, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
                {[60,40,80].map((w,j) => (
                  <div key={j} style={{ height: 10, width: `${w}%`, marginBottom: 10, background: 'linear-gradient(90deg, var(--surface2) 25%, var(--border) 50%, var(--surface2) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', borderRadius: 4 }} />
                ))}
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div style={{ background: 'var(--surface)', border: '1px dashed var(--border2)', borderRadius: 'var(--radius-lg)', padding: '52px 32px', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, margin: '0 auto 16px' }}>✦</div>
            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Das System wartet auf deinen ersten Input</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Beschreibe dein Projekt oben — Tagro AI strukturiert es automatisch in Tasks, Phasen und Timelines.</p>
            <button onClick={() => inputRef.current?.focus()} style={{ padding: '10px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Projekt starten →
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 12 }}>
            {projects.map((p, i) => {
              const tc = taskCounts[p.id] ?? { total: 0, done: 0 }
              const pct = tc.total ? Math.round(tc.done/tc.total*100) : 0
              const pc = PHASE_CFG[p.status] ?? PHASE_CFG.intake
              const lastAct = ['vor 3 Min.','vor 12 Min.','vor 1 Std.','gerade eben'][i % 4]
              return (
                <Link key={p.id} href={`/project/${p.id}`}>
                  <div
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '18px 20px', cursor: 'pointer', transition: 'all 0.18s', boxShadow: 'var(--shadow-sm)' }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = 'var(--shadow)'; el.style.transform = 'translateY(-2px)'; el.style.borderColor = 'var(--border2)' }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = 'var(--shadow-sm)'; el.style.transform = 'translateY(0)'; el.style.borderColor = 'var(--border)' }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0, flex: 1, paddingRight: 8, lineHeight: 1.3 }}>{p.title}</h3>
                      <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: pc.color, background: pc.bg, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: pc.dot, display: 'inline-block' }} />
                        {pc.label}
                      </span>
                    </div>

                    {/* AI system message */}
                    <p style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>✦</span>
                      {p.status === 'active' ? 'AI überwacht aktiv · Developer arbeiten' :
                       p.status === 'planning' ? 'AI generiert Tasks…' :
                       p.status === 'intake' ? 'System analysiert Anforderungen…' :
                       p.status === 'done' ? 'Projekt erfolgreich abgeschlossen' : 'System prüft…'}
                    </p>

                    {/* Progress */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>
                        <span>{tc.total} Tasks · {tc.done} erledigt</span>
                        <span style={{ fontWeight: 600, color: pct === 100 ? '#059669' : 'var(--text-secondary)' }}>{pct}%</span>
                      </div>
                      <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#10B981' : 'linear-gradient(90deg, #2563EB, #7C3AED)', borderRadius: 4, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>

                    {/* Footer */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Aktiv {lastAct}</span>
                      <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>Öffnen →</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, animation: 'fadeIn 0.15s' }}
          onClick={() => setShowModal(false)}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', padding: 28, width: '100%', maxWidth: 420, boxShadow: 'var(--shadow-lg)', animation: 'fadeUp 0.2s' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, letterSpacing: '-0.3px' }}>Neues Projekt</h3>
            <label style={lbl}>Titel *</label>
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Projektname" autoFocus
              onKeyDown={e => e.key === 'Enter' && createProject()}
              style={{ ...inp, marginBottom: 14 }} />
            <label style={lbl}>Beschreibung</label>
            <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Kurze Beschreibung…"
              style={{ ...inp, height: 72, resize: 'vertical' as const }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={() => setShowModal(false)} style={btnSec}>Abbrechen</button>
              <button onClick={() => createProject()} disabled={saving || !newTitle.trim()} style={{ ...btnPri, flex: 1, opacity: saving || !newTitle.trim() ? 0.5 : 1 }}>
                {saving ? 'Erstellt…' : 'Projekt erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }
const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, outline: 'none', background: 'var(--surface2)', color: 'var(--text-primary)', boxSizing: 'border-box' as const, fontFamily: 'inherit' }
const btnPri: React.CSSProperties = { padding: '10px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
const btnSec: React.CSSProperties = { padding: '10px 16px', background: 'var(--surface2)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }
