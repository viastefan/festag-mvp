'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Project = { id: string; title: string; description: string | null; status: string; created_at: string }

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  intake:   { label: 'Intake',    color: '#92400E', bg: '#FEF3C7', dot: '#F59E0B' },
  planning: { label: 'Planning',  color: '#1E40AF', bg: '#DBEAFE', dot: '#3B82F6' },
  active:   { label: 'Active',    color: '#065F46', bg: '#D1FAE5', dot: '#10B981' },
  done:     { label: 'Done',      color: '#374151', bg: '#F3F4F6', dot: '#9CA3AF' },
}

const AI_SUGGESTIONS = [
  'Erstelle eine neue SaaS-App mit Nutzerauthentifizierung',
  'Ich brauche ein E-Commerce Dashboard mit Analytics',
  'Baue mir einen AI-Chatbot für meinen Kundenservice',
  'Entwickle eine mobile-first Buchungsplattform',
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
  const [aiProcessing, setAiProcessing] = useState(false)
  const [aiResult, setAiResult] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      setUserEmail(data.session.user.email ?? '')
      loadData()
    })
  }, [])

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
    setNewTitle(''); setNewDesc(''); setShowModal(false)
    await loadData()
    setSaving(false)
    if (proj) window.location.href = `/project/${proj.id}`
  }

  async function handleAISubmit() {
    if (!aiInput.trim()) return
    setAiProcessing(true)
    setAiResult('')

    // Call Claude API to process the request
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `Du bist Tagro, die AI des Festag Software Production System. 
Deine Aufgabe: Analysiere den Kundenwunsch und erstelle einen strukturierten Projektplan.
Antworte IMMER auf Deutsch in diesem exakten JSON Format ohne Markdown:
{"title":"Projekttitel","description":"Kurze Beschreibung","tasks":["Task 1","Task 2","Task 3","Task 4","Task 5"],"timeline":"Geschätzte Zeit","complexity":"Einfach|Mittel|Komplex"}`,
          messages: [{ role: 'user', content: `Kundenwunsch: ${aiInput}` }]
        })
      })
      const data = await response.json()
      const text = data.content?.[0]?.text ?? ''
      
      try {
        const parsed = JSON.parse(text)
        setAiResult(JSON.stringify(parsed))
        // Auto-create project
        await createProject(parsed.title, parsed.description)
      } catch {
        setAiResult(text)
      }
    } catch (e) {
      // Fallback: create project directly from input
      await createProject(aiInput.slice(0, 60) + (aiInput.length > 60 ? '...' : ''))
    }
    setAiProcessing(false)
    setAiInput('')
  }

  const totalTasks = Object.values(taskCounts).reduce((a, b) => a + b.total, 0)
  const doneTasks = Object.values(taskCounts).reduce((a, b) => a + b.done, 0)
  const activeProjects = projects.filter(p => p.status === 'active').length
  const firstName = userEmail.split('@')[0].split('.')[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend'

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Header */}
      <div className="animate-fade-up" style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 2 }}>
          {new Date().toLocaleDateString('de', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>
          {greeting}, {firstName.charAt(0).toUpperCase() + firstName.slice(1)} 👋
        </h1>
      </div>

      {/* AI Input — Hero Element */}
      <div className="animate-fade-up-1" style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        padding: '20px 24px',
        marginBottom: 28,
        boxShadow: 'var(--shadow)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle gradient accent */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, var(--accent), #818CF8, #7C3AED)',
          borderRadius: '24px 24px 0 0',
        }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--accent), #7C3AED)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, marginTop: 2,
          }}>
            ✦
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              Tagro AI · Festag Production System
            </p>
            <textarea
              ref={inputRef}
              value={aiInput}
              onChange={e => setAiInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAISubmit() }}
              placeholder="Beschreibe dein Projekt oder deinen Wunsch... (⌘+Enter zum Senden)"
              rows={2}
              style={{
                width: '100%', background: 'transparent', border: 'none', outline: 'none',
                fontSize: 15, color: 'var(--text-primary)', resize: 'none', lineHeight: 1.6,
                fontFamily: 'inherit',
              }}
            />
            {/* Suggestions */}
            {!aiInput && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                {AI_SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => { setAiInput(s); inputRef.current?.focus() }} style={{
                    padding: '4px 10px', borderRadius: 20, border: '1px solid var(--border)',
                    background: 'var(--surface2)', fontSize: 12, color: 'var(--text-secondary)',
                    cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                  }}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'flex-start' }}>
            <button onClick={() => setShowModal(true)} style={{
              padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
              background: 'transparent', fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer',
              fontWeight: 500,
            }}>
              Manuell
            </button>
            <button onClick={handleAISubmit} disabled={!aiInput.trim() || aiProcessing} style={{
              padding: '8px 18px', borderRadius: 'var(--radius-sm)', border: 'none',
              background: aiInput.trim() ? 'var(--accent)' : 'var(--border)',
              color: aiInput.trim() ? '#fff' : 'var(--text-muted)',
              fontSize: 13, fontWeight: 600, cursor: aiInput.trim() ? 'pointer' : 'default',
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {aiProcessing ? (
                <>
                  <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                  Analysiert...
                </>
              ) : '✦ Projekt starten'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="animate-fade-up-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Projekte', value: projects.length, sub: `${activeProjects} aktiv`, color: 'var(--accent)' },
          { label: 'Tasks', value: totalTasks, sub: `${doneTasks} erledigt`, color: 'var(--green)' },
          { label: 'Fortschritt', value: `${totalTasks ? Math.round(doneTasks/totalTasks*100) : 0}%`, sub: 'gesamt', color: 'var(--purple)' },
          { label: 'Team', value: '—', sub: 'Mitglieder', color: 'var(--orange)' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '16px 20px',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{s.label}</p>
            <p style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontSize: 12, color: s.color, marginTop: 4, fontWeight: 500 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Projects */}
      <div className="animate-fade-up-3">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Projekte</h2>
          <button onClick={() => setShowModal(true)} style={{
            padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
            background: 'var(--surface)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4,
          }}>
            + Neu
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, height: 140 }}>
                <div style={{ height: 12, width: '60%', background: 'linear-gradient(90deg, var(--surface2) 25%, var(--border) 50%, var(--surface2) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', borderRadius: 4, marginBottom: 8 }} />
                <div style={{ height: 10, width: '40%', background: 'var(--surface2)', borderRadius: 4 }} />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div style={{
            background: 'var(--surface)', border: '1px dashed var(--border2)',
            borderRadius: 'var(--radius-lg)', padding: '48px 32px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Noch keine Projekte</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Beschreibe dein Projekt oben oder erstelle eines manuell.</p>
            <button onClick={() => setShowModal(true)} style={{
              padding: '10px 20px', borderRadius: 'var(--radius-sm)', border: 'none',
              background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              + Erstes Projekt erstellen
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
            {projects.map((p, i) => {
              const tc = taskCounts[p.id] ?? { total: 0, done: 0 }
              const pct = tc.total ? Math.round(tc.done/tc.total*100) : 0
              const sc = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.intake
              return (
                <Link key={p.id} href={`/project/${p.id}`}>
                  <div style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)', padding: '18px 20px',
                    cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: 'var(--shadow-sm)',
                    animationDelay: `${i * 0.05}s`,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border2)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0, flex: 1, paddingRight: 8 }}>{p.title}</h3>
                      <span style={{ fontSize: 11, fontWeight: 600, color: sc.color, background: sc.bg, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: sc.dot, marginRight: 4, verticalAlign: 'middle' }} />
                        {sc.label}
                      </span>
                    </div>
                    {p.description && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>{p.description}</p>}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>
                        <span>{tc.total} Tasks</span>
                        <span style={{ color: pct === 100 ? 'var(--green)' : 'var(--text-muted)', fontWeight: pct === 100 ? 600 : 400 }}>{pct}%</span>
                      </div>
                      <div style={{ height: 3, background: 'var(--surface2)', borderRadius: 4 }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? 'var(--green)' : 'var(--accent)', borderRadius: 4, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 200, animation: 'fadeIn 0.15s ease',
        }} onClick={() => setShowModal(false)}>
          <div style={{
            background: 'var(--surface)', borderRadius: 'var(--radius-xl)',
            padding: '28px', width: '100%', maxWidth: 440,
            boxShadow: 'var(--shadow-lg)', animation: 'fadeUp 0.2s ease',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>Neues Projekt</h3>
            <label style={lbl}>Titel *</label>
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="z.B. E-Commerce Dashboard" autoFocus
              style={inp} onKeyDown={e => e.key === 'Enter' && createProject()} />
            <label style={{ ...lbl, marginTop: 14 }}>Beschreibung</label>
            <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Kurze Projektbeschreibung..."
              style={{ ...inp, height: 80, resize: 'vertical' as const }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={() => setShowModal(false)} style={btnSecondary}>Abbrechen</button>
              <button onClick={() => createProject()} disabled={saving || !newTitle.trim()} style={{
                ...btnPrimary, flex: 1, opacity: saving || !newTitle.trim() ? 0.5 : 1
              }}>
                {saving ? 'Erstellt...' : 'Projekt erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }
const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, outline: 'none', background: 'var(--surface2)', color: 'var(--text-primary)', boxSizing: 'border-box' as const, transition: 'border-color 0.15s' }
const btnPrimary: React.CSSProperties = { padding: '10px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const btnSecondary: React.CSSProperties = { padding: '10px 16px', background: 'var(--surface2)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }
