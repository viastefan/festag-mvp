'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import LoadingScreen from '@/components/LoadingScreen'

type Project = { id: string; title: string; description: string | null; status: string; created_at: string }
type Task    = { id: string; title: string; status: string; priority?: string; project_id: string }

const PHASE: Record<string, { label: string; pct: number; color: string }> = {
  intake:   { label: 'Intake',       pct: 10,  color: 'var(--amber)' },
  planning: { label: 'Planning',     pct: 28,  color: 'var(--amber)' },
  active:   { label: 'In Arbeit',    pct: 62,  color: 'var(--green)' },
  testing:  { label: 'Testing',      pct: 85,  color: 'var(--green)' },
  done:     { label: 'Abgeschlossen',pct: 100, color: 'var(--text-muted)' },
}

const MILESTONES = [
  { label: 'Kickoff',    phase: 'intake',   pct: 10  },
  { label: 'Design OK',  phase: 'planning', pct: 28  },
  { label: 'MVP Live',   phase: 'active',   pct: 62  },
  { label: 'Testing',    phase: 'testing',  phase2: 'testing', pct: 85  },
  { label: 'Delivery',   phase: 'done',     pct: 100 },
]

export default function DashboardPage() {
  const [projects,   setProjects]   = useState<Project[]>([])
  const [main,       setMain]       = useState<Project | null>(null)
  const [tasks,      setTasks]      = useState<Task[]>([])
  const [allTasks,   setAllTasks]   = useState<Task[]>([])
  const [firstName,  setFirstName]  = useState('')
  const [loading,    setLoading]    = useState(true)
  const [genReport,  setGenReport]  = useState(false)
  const [report,     setReport]     = useState('')
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
        const [{ data: t }, { data: at }] = await Promise.all([
          supabase.from('tasks').select('*').eq('project_id', m.id),
          supabase.from('tasks').select('*').in('project_id', projs.map(pr => pr.id)),
        ])
        setTasks(t ?? [])
        setAllTasks(at ?? [])
      }
      setLoading(false)
    })
  }, [])

  async function generateReport() {
    if (!main || genReport) return
    setGenReport(true)
    setReport('')
    const done = tasks.filter(t => t.status === 'done').length
    const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: 'Du bist Tagro. Erstelle einen kurzen Statusbericht auf Deutsch. 3-4 Sätze. Klar und direkt. Keine Emojis.',
          max_tokens: 280,
          messages: [{ role: 'user', content: `Projekt: "${main.title}". Phase: ${PHASE[main.status]?.label}. Fortschritt: ${pct}%. ${done} von ${tasks.length} Tasks erledigt. Erstelle einen Statusbericht.` }],
        }),
      })
      const d = await res.json()
      setReport(d.content?.[0]?.text ?? 'Statusbericht konnte nicht erstellt werden.')
    } catch { setReport('Verbindungsfehler. Bitte erneut versuchen.') }
    setGenReport(false)
  }

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

  const phase      = main ? (PHASE[main.status] ?? PHASE.intake) : null
  const done       = tasks.filter(t => t.status === 'done').length
  const inProgress = tasks.filter(t => t.status === 'doing').length
  const todo       = tasks.filter(t => t.status === 'todo').length
  const activeTasks = tasks.filter(t => t.status !== 'done')

  const allDone     = allTasks.filter(t => t.status === 'done').length
  const allActive   = allTasks.filter(t => t.status === 'doing').length
  const allTodo2    = allTasks.filter(t => t.status === 'todo').length
  const totalAll    = allTasks.length || 1

  const phaseIdx = main ? ['intake','planning','active','testing','done'].indexOf(main.status) : -1

  return (
    <div className="dash-wrap page-content" style={{ maxWidth: 980 }}>
      <style>{`
        @keyframes barFill { from{width:0} to{width:${phase?.pct ?? 0}%} }
        .dash-bar { animation: barFill 1s cubic-bezier(.16,1,.3,1) both .3s }
        @media(max-width:768px) {
          .dash-stats { grid-template-columns: repeat(2,1fr) !important }
          .dash-stat-last { border-right: 1px solid var(--border) !important }
          .other-grid { grid-template-columns: repeat(2,1fr) !important }
          .dash-bottom-grid { grid-template-columns: 1fr !important }
          .workload-grid { grid-template-columns: 1fr !important }
        }
      `}</style>

      {/* Greeting */}
      <div className="animate-fade-up page-header">
        <h1>{greeting}{displayName ? `, ${displayName}` : ''}.</h1>
        <p style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{projects.length} Projekt{projects.length !== 1 ? 'e' : ''} · {allTasks.length} Tasks gesamt</span>
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
          {/* ── Main project card ── */}
          <div className="animate-fade-up-1" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', marginBottom: 12, boxShadow: 'var(--shadow-xs)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.12em', textTransform: 'uppercase', margin: '0 0 5px' }}>Aktuelles Projekt</p>
                <h2 style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-.3px', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{main.title}</h2>
                {main.description && <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{main.description}</p>}
              </div>
              <span style={{
                height: 28, padding: '0 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, flexShrink: 0,
                color: main.status === 'active' ? 'var(--green-dark)' : main.status === 'done' ? 'var(--text-muted)' : 'var(--amber-dark)',
                background: main.status === 'active' ? 'var(--green-bg)' : main.status === 'done' ? 'var(--surface-2)' : 'var(--amber-bg)',
                border: `1px solid ${main.status === 'active' ? 'var(--green-border)' : 'var(--border)'}`,
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}>
                {main.status === 'active' && <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />}
                {phase.label}
              </span>
            </div>

            {/* Progress bar with milestone markers */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Fortschritt</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{phase.pct}%</span>
              </div>
              <div style={{ position: 'relative', height: 6, background: 'var(--surface-2)', borderRadius: 6, overflow: 'visible', marginBottom: 22 }}>
                <div className="dash-bar" style={{ height: '100%', width: `${phase.pct}%`, background: phase.color, borderRadius: 6, position: 'relative', zIndex: 1 }} />
                {MILESTONES.map((ms) => (
                  <div key={ms.label} style={{
                    position: 'absolute', top: '50%', left: `${ms.pct}%`,
                    transform: 'translate(-50%, -50%)',
                    width: 10, height: 10, borderRadius: '50%',
                    background: phase.pct >= ms.pct ? phase.color : 'var(--surface-2)',
                    border: `2px solid ${phase.pct >= ms.pct ? phase.color : 'var(--border-strong)'}`,
                    zIndex: 2, transition: 'background .3s',
                  }} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {MILESTONES.map((ms) => (
                  <div key={ms.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.04em', color: phase.pct >= ms.pct ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                      {ms.label.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats row */}
            <div className="dash-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: '1px solid var(--border)' }}>
              {[
                { l: 'TASKS',     v: tasks.length,  c: 'var(--text)' },
                { l: 'IN ARBEIT', v: inProgress,    c: inProgress > 0 ? 'var(--amber-dark)' : 'var(--text)' },
                { l: 'ERLEDIGT',  v: done,           c: done > 0 ? 'var(--green-dark)' : 'var(--text)', extra: 'dash-stat-last' },
                { l: 'OFFEN',     v: todo,           c: 'var(--text)' },
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

          {/* ── Active tasks + Status report (side by side on desktop) ── */}
          <div className="animate-fade-up-2 workload-grid" style={{ display: 'grid', gridTemplateColumns: activeTasks.length > 0 ? '1fr 340px' : '1fr', gap: 12, marginBottom: 12 }}>

            {/* Active tasks */}
            {activeTasks.length > 0 && (
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
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

            {/* Status report card */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-xs)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--accent-text)', fontWeight: 700 }}>✦</span>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Tagro Statusbericht</p>
                </div>
              </div>
              <div style={{ flex: 1, padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {report ? (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>{report}</p>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                    Lass Tagro AI einen aktuellen Statusbericht für dein Projekt generieren.
                  </p>
                )}
                <button onClick={generateReport} disabled={genReport} className="tap-scale" style={{
                  width: '100%', height: 40, marginTop: 'auto',
                  background: genReport ? 'var(--surface-2)' : 'var(--accent)',
                  color: genReport ? 'var(--text-muted)' : 'var(--accent-text)',
                  border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700,
                  cursor: genReport ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                }}>
                  {genReport ? (
                    <><span style={{ width: 13, height: 13, border: '2px solid rgba(128,128,128,.3)', borderTopColor: 'currentColor', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> Generiert…</>
                  ) : (
                    <>{report ? '↺ Neu generieren' : '+ Bericht erstellen'}</>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ── Workload Overview ── */}
          <div className="animate-fade-up-3" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', marginBottom: 12, boxShadow: 'var(--shadow-xs)' }}>
            <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Arbeitspensum — alle Projekte</p>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{allTasks.length} Tasks</span>
            </div>
            <div style={{ padding: '20px 24px' }}>
              {/* Stacked bar */}
              <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', marginBottom: 16, background: 'var(--surface-2)' }}>
                {allDone > 0 && <div style={{ width: `${allDone / totalAll * 100}%`, background: 'var(--green)', transition: 'width .8s ease' }} />}
                {allActive > 0 && <div style={{ width: `${allActive / totalAll * 100}%`, background: 'var(--amber)', transition: 'width .8s ease' }} />}
                {allTodo2 > 0 && <div style={{ width: `${allTodo2 / totalAll * 100}%`, background: 'var(--border-strong)', transition: 'width .8s ease' }} />}
              </div>
              {/* Per-project bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {projects.slice(0, 5).map(proj => {
                  const pt = allTasks.filter(t => t.project_id === proj.id)
                  const pd = pt.filter(t => t.status === 'done').length
                  const pPct = pt.length ? Math.round(pd / pt.length * 100) : 0
                  const ph = PHASE[proj.status] ?? PHASE.intake
                  return (
                    <Link key={proj.id} href={`/project/${proj.id}`} style={{ textDecoration: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', width: 160, minWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proj.title}</span>
                        <div style={{ flex: 1, height: 5, background: 'var(--surface-2)', borderRadius: 5, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${ph.pct}%`, background: ph.color, borderRadius: 5, transition: 'width .6s ease' }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', width: 36, textAlign: 'right', flexShrink: 0 }}>{ph.pct}%</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: proj.status === 'active' ? 'var(--green-dark)' : 'var(--text-muted)', background: proj.status === 'active' ? 'var(--green-bg)' : 'var(--surface-2)', padding: '2px 7px', borderRadius: 5, flexShrink: 0, letterSpacing: '.04em', minWidth: 56, textAlign: 'center', border: `1px solid ${proj.status === 'active' ? 'var(--green-border)' : 'var(--border)'}` }}>
                          {ph.label.toUpperCase()}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
              {/* Legend */}
              <div style={{ display: 'flex', gap: 20, marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                {[
                  { label: `${allDone} Erledigt`, color: 'var(--green)' },
                  { label: `${allActive} In Arbeit`, color: 'var(--amber)' },
                  { label: `${allTodo2} Offen`, color: 'var(--border-strong)' },
                ].map(l => (
                  <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: l.color, flexShrink: 0 }} />
                    {l.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ── Bottom row: Milestone tracker + Other projects ── */}
          <div className="animate-fade-up-4 dash-bottom-grid" style={{ display: 'grid', gridTemplateColumns: projects.length > 1 ? '320px 1fr' : '1fr', gap: 12 }}>

            {/* Milestone / Next payment */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
              <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Meilensteine & Zahlung</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '3px 0 0' }}>{main.title}</p>
              </div>
              <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {MILESTONES.map((ms, i) => {
                  const reached = phase.pct >= ms.pct
                  const isCurrent = phaseIdx === i
                  return (
                    <div key={ms.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                        background: reached ? 'var(--green-bg)' : isCurrent ? 'var(--amber-bg)' : 'var(--surface-2)',
                        border: `1.5px solid ${reached ? 'var(--green-border)' : isCurrent ? 'var(--amber)' : 'var(--border)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {reached
                          ? <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--green-dark)" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                          : <span style={{ width: 5, height: 5, borderRadius: '50%', background: isCurrent ? 'var(--amber)' : 'var(--border-strong)' }} />
                        }
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: reached ? 'var(--text-secondary)' : isCurrent ? 'var(--text)' : 'var(--text-muted)', margin: 0 }}>{ms.label}</p>
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.05em', color: reached ? 'var(--green-dark)' : isCurrent ? 'var(--amber-dark)' : 'var(--text-muted)', background: reached ? 'var(--green-bg)' : isCurrent ? 'var(--amber-bg)' : 'var(--surface-2)', padding: '2px 7px', borderRadius: 5, border: `1px solid ${reached ? 'var(--green-border)' : 'var(--border)'}` }}>
                        {reached ? 'DONE' : isCurrent ? 'AKTIV' : 'PENDING'}
                      </span>
                    </div>
                  )
                })}
              </div>
              <div style={{ padding: '0 24px 16px' }}>
                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><path d="M1 10h22"/></svg>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>Zahlungsplan wird mit deinem Projekt-Owner besprochen.</p>
                </div>
              </div>
            </div>

            {/* Other projects */}
            {projects.length > 1 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>Weitere Projekte</p>
                <div className="other-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                  {projects.filter(p => p.id !== main.id).map(p => {
                    const ph = PHASE[p.status] ?? PHASE.intake
                    return (
                      <Link key={p.id} href={`/project/${p.id}`} style={{ textDecoration: 'none' }}>
                        <div className="tap-scale" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', cursor: 'pointer', transition: 'border-color .15s', height: '100%' }}
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
          </div>
        </>
      )}
    </div>
  )
}
