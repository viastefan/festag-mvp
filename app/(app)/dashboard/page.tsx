'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import LoadingScreen from '@/components/LoadingScreen'

type Project = { id: string; title: string; description: string | null; status: string; created_at: string }
type Task    = { id: string; title: string; status: string; priority?: string }

const PHASE: Record<string, { label: string; pct: number; color: string }> = {
  intake:   { label: 'Intake',         pct: 10,  color: 'var(--amber)' },
  planning: { label: 'Planning',        pct: 28,  color: 'var(--amber)' },
  active:   { label: 'In Arbeit',       pct: 62,  color: 'var(--green)' },
  testing:  { label: 'Testing',         pct: 85,  color: 'var(--green)' },
  done:     { label: 'Abgeschlossen',   pct: 100, color: 'var(--text-muted)' },
}

export default function DashboardPage() {
  const [projects,   setProjects]   = useState<Project[]>([])
  const [main,       setMain]       = useState<Project | null>(null)
  const [tasks,      setTasks]      = useState<Task[]>([])
  const [firstName,  setFirstName]  = useState('')
  const [loading,    setLoading]    = useState(true)
  const [showLoader, setShowLoader] = useState(() =>
    typeof window !== 'undefined' && !sessionStorage.getItem('festag_dash_loaded')
  )
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      const { data: p } = await supabase.from('profiles').select('first_name,full_name').eq('id', data.session.user.id).single()
      if (p) setFirstName(p.first_name ?? p.full_name?.split(' ')[0] ?? '')
      const { data: projs } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
      if (projs?.length) {
        setProjects(projs)
        const prio: Record<string, number> = { active: 0, testing: 1, planning: 2, intake: 3, done: 4 }
        const m = [...projs].sort((a, b) => (prio[a.status] ?? 9) - (prio[b.status] ?? 9))[0]
        setMain(m)
        const { data: t } = await supabase.from('tasks').select('*').eq('project_id', m.id)
        setTasks(t ?? [])
      }
      setLoading(false)
    })
  }, [])

  const h = new Date().getHours()
  const greeting = h < 12 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend'
  const displayName = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : ''

  if (showLoader) return <LoadingScreen onDone={() => {
    sessionStorage.setItem('festag_dash_loaded', '1')
    setShowLoader(false)
  }} />

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
      <div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
    </div>
  )

  const phase       = main ? (PHASE[main.status] ?? PHASE.intake) : null
  const done        = tasks.filter(t => t.status === 'done').length
  const inProgress  = tasks.filter(t => t.status === 'doing').length
  const todo        = tasks.filter(t => t.status === 'todo').length
  const activeTasks = tasks.filter(t => t.status !== 'done')

  return (
    <div className="dash-wrap page-content" style={{ maxWidth: 920 }}>
      <style>{`
        @keyframes barFill { from{width:0} to{width:${phase?.pct ?? 0}%} }
        .dash-bar { animation: barFill 1s cubic-bezier(.16,1,.3,1) both .3s }
        @media(max-width:768px) {
          .dash-stats { grid-template-columns: repeat(2,1fr) !important }
          .dash-stat-last { border-right: 1px solid var(--border) !important }
          .other-grid { grid-template-columns: repeat(2,1fr) !important }
        }
      `}</style>

      {/* Greeting */}
      <div className="animate-fade-up page-header">
        <h1>{greeting}{displayName ? `, ${displayName}` : ''}.</h1>
        <p style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{projects.length} Projekt{projects.length !== 1 ? 'e' : ''}</span>
          <span>·</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite', display: 'inline-block' }} />
            Tagro AI aktiv
          </span>
        </p>
      </div>

      {/* Empty state */}
      {!main && (
        <div className="animate-fade-up-1" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, padding: '64px 24px', textAlign: 'center' }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--surface-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.6" strokeLinecap="round">
              <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>
            </svg>
          </div>
          <h2 style={{ marginBottom: 8 }}>Starte dein erstes Projekt</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 360, margin: '0 auto 24px', lineHeight: 1.6 }}>
            Beschreibe deine Idee — Tagro AI strukturiert alles in Sekunden.
          </p>
          <Link href="/onboarding">
            <button className="tap-scale" style={{ padding: '12px 28px', background: 'var(--btn-prim)', color: 'var(--btn-prim-text)', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Projekt starten →
            </button>
          </Link>
        </div>
      )}

      {main && phase && (
        <>
          {/* Main project card */}
          <div className="animate-fade-up-1" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', marginBottom: 12, boxShadow: 'var(--shadow-xs)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.12em', textTransform: 'uppercase', margin: '0 0 5px' }}>Aktuelles Projekt</p>
                <h2 style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-.3px', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{main.title}</h2>
                {main.description && <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{main.description}</p>}
              </div>
              <span style={{
                height: 28, padding: '0 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                color: main.status === 'active' ? 'var(--green-dark)' : main.status === 'done' ? 'var(--text-muted)' : 'var(--amber-dark)',
                background: main.status === 'active' ? 'var(--green-bg)' : main.status === 'done' ? 'var(--surface-2)' : 'var(--amber-bg)',
                border: `1px solid ${main.status === 'active' ? 'var(--green-border)' : 'var(--border)'}`,
                flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5,
              }}>
                {main.status === 'active' && <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />}
                {phase.label}
              </span>
            </div>

            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Fortschritt</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{phase.pct}%</span>
              </div>
              <div style={{ height: 5, background: 'var(--surface-2)', borderRadius: 5, overflow: 'hidden' }}>
                <div className="dash-bar" style={{ height: '100%', width: `${phase.pct}%`, background: phase.color, borderRadius: 5 }} />
              </div>
            </div>

            <div className="dash-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: '1px solid var(--border)' }}>
              {[
                { l: 'TASKS',     v: tasks.length, c: 'var(--text)' },
                { l: 'IN ARBEIT', v: inProgress,   c: inProgress > 0 ? 'var(--amber)' : 'var(--text)' },
                { l: 'ERLEDIGT',  v: done,          c: done > 0 ? 'var(--green-dark)' : 'var(--text)',  extra: 'dash-stat-last' },
                { l: 'OFFEN',     v: todo,          c: 'var(--text)' },
              ].map((s, i) => (
                <div key={i} className={s.extra ?? ''} style={{ padding: '14px 20px', borderRight: i < 3 ? '1px solid var(--border)' : 'none' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.1em', margin: '0 0 5px' }}>{s.l}</p>
                  <p style={{ fontSize: 22, fontWeight: 700, margin: 0, color: s.c, lineHeight: 1 }}>{s.v}</p>
                </div>
              ))}
            </div>

            <div style={{ padding: '14px 24px' }}>
              <Link href={`/project/${main.id}`}>
                <button className="tap-scale" style={{ width: '100%', height: 42, background: 'var(--btn-prim)', color: 'var(--btn-prim-text)', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  Projekt öffnen
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 6l6 6-6 6"/></svg>
                </button>
              </Link>
            </div>
          </div>

          {/* Active tasks */}
          {activeTasks.length > 0 && (
            <div className="animate-fade-up-2" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', marginBottom: 12, boxShadow: 'var(--shadow-xs)' }}>
              <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Aktive Tasks</p>
                <Link href={`/project/${main.id}`} style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textDecoration: 'none' }}>Alle ansehen →</Link>
              </div>
              {activeTasks.slice(0, 6).map((t, i, arr) => (
                <div key={t.id} style={{ padding: '11px 24px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: t.status === 'doing' ? 'var(--green)' : t.priority === 'critical' ? 'var(--red)' : 'var(--border-strong)' }} />
                  <span style={{ fontSize: 13, color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', background: 'var(--surface-2)', padding: '2px 7px', borderRadius: 5, flexShrink: 0, letterSpacing: '.04em' }}>
                    {t.status === 'doing' ? 'AKTIV' : t.priority === 'critical' ? 'KRITISCH' : 'OFFEN'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Other projects */}
          {projects.length > 1 && (
            <div className="animate-fade-up-3">
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.1em', textTransform: 'uppercase', margin: '20px 0 10px' }}>Weitere Projekte</p>
              <div className="other-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                {projects.filter(p => p.id !== main.id).map(p => {
                  const ph = PHASE[p.status] ?? PHASE.intake
                  return (
                    <Link key={p.id} href={`/project/${p.id}`} style={{ textDecoration: 'none' }}>
                      <div className="tap-scale" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', cursor: 'pointer', transition: 'border-color .15s' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '0 0 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
                        <div style={{ height: 3, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                          <div style={{ height: '100%', width: `${ph.pct}%`, background: ph.color, borderRadius: 3 }} />
                        </div>
                        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', margin: 0, letterSpacing: '.04em' }}>{ph.label.toUpperCase()} · {ph.pct}%</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
