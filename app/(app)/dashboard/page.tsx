'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import LoadingScreen from '@/components/LoadingScreen'

type Project = { id: string; title: string; description: string | null; status: string; created_at: string }
type Task    = { id: string; title: string; status: string; priority?: string; project_id: string }

const PHASE: Record<string, { label: string; pct: number; color: string }> = {
  intake:   { label: 'Intake',        pct: 10,  color: 'var(--amber)' },
  planning: { label: 'Planning',      pct: 28,  color: 'var(--amber)' },
  active:   { label: 'In Arbeit',     pct: 62,  color: 'var(--green)' },
  testing:  { label: 'Testing',       pct: 85,  color: 'var(--green)' },
  done:     { label: 'Abgeschlossen', pct: 100, color: 'var(--text-muted)' },
}

const MILESTONES = [
  { label: 'Kickoff',   phase: 'intake',   pct: 10,  payPct: 20 },
  { label: 'Design OK', phase: 'planning', pct: 28,  payPct: 25 },
  { label: 'MVP Live',  phase: 'active',   pct: 62,  payPct: 30 },
  { label: 'Testing',   phase: 'testing',  pct: 85,  payPct: 15 },
  { label: 'Delivery',  phase: 'done',     pct: 100, payPct: 10 },
]

/* ── SVG Donut chart ── */
function DonutChart({ pct, color }: { pct: number; color: string }) {
  const R = 40, cx = 50, cy = 50
  const circ = 2 * Math.PI * R
  const filled = circ * (pct / 100)
  return (
    <div style={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
      <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--surface-2)" strokeWidth="11"/>
        <circle cx={cx} cy={cy} r={R} fill="none"
          stroke={color} strokeWidth="11"
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(.16,1,.3,1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{pct}%</span>
        <span style={{ fontSize: 8, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '.06em', marginTop: 3 }}>DONE</span>
      </div>
    </div>
  )
}

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
    setGenReport(true); setReport('')
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
    <div className="page-content" style={{ maxWidth: 1240 }}>
      <style>{`
        @keyframes barFill { from{width:0} to{width:${phase?.pct ?? 0}%} }
        .dash-bar { animation: barFill 1s cubic-bezier(.16,1,.3,1) both .3s }
        .dash-layout { display:grid; grid-template-columns:1fr 284px; gap:16px; align-items:start; }
        @media(max-width:1100px) {
          .dash-layout { grid-template-columns:1fr !important; }
          .dash-right { display:none !important; }
        }
        @media(max-width:768px) {
          .dash-stats { grid-template-columns: repeat(2,1fr) !important }
          .dash-stat-last { border-right: 1px solid var(--border) !important }
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
        <div className="dash-layout">

          {/* ══════════ LEFT COLUMN ══════════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>

            {/* ── Main project card ── */}
            <div className="animate-fade-up-1" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
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

              {/* Progress bar */}
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
                  { l: 'TASKS',     v: tasks.length, c: 'var(--text)' },
                  { l: 'IN ARBEIT', v: inProgress,   c: inProgress > 0 ? 'var(--amber-dark)' : 'var(--text)' },
                  { l: 'ERLEDIGT',  v: done,          c: done > 0 ? 'var(--green-dark)' : 'var(--text)', extra: 'dash-stat-last' },
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

            {/* ── Active tasks + Status report ── */}
            <div className="animate-fade-up-2 workload-grid" style={{ display: 'grid', gridTemplateColumns: activeTasks.length > 0 ? '1fr 300px' : '1fr', gap: 12 }}>

              {activeTasks.length > 0 && (
                <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
                  <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Aktive Tasks</p>
                    <Link href={`/project/${main.id}`} style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textDecoration: 'none' }}>Alle →</Link>
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

              {/* Status report */}
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-xs)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 11, color: 'var(--accent-text)', fontWeight: 700 }}>✦</span>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Tagro Statusbericht</p>
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
                    {genReport
                      ? <><span style={{ width: 13, height: 13, border: '2px solid rgba(128,128,128,.3)', borderTopColor: 'currentColor', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> Generiert…</>
                      : <>{report ? '↺ Neu generieren' : '+ Bericht erstellen'}</>
                    }
                  </button>
                </div>
              </div>
            </div>

            {/* ── Workload Overview ── */}
            <div className="animate-fade-up-3" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
              <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Arbeitspensum — alle Projekte</p>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{allTasks.length} Tasks</span>
              </div>
              <div style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', height: 8, borderRadius: 6, overflow: 'hidden', marginBottom: 16, background: 'var(--surface-2)' }}>
                  {allDone > 0 && <div style={{ width: `${allDone / totalAll * 100}%`, background: 'var(--green)' }} />}
                  {allActive > 0 && <div style={{ width: `${allActive / totalAll * 100}%`, background: 'var(--amber)' }} />}
                  {allTodo2 > 0 && <div style={{ width: `${allTodo2 / totalAll * 100}%`, background: 'var(--border-strong)' }} />}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                  {projects.slice(0, 5).map(proj => {
                    const pt = allTasks.filter(t => t.project_id === proj.id)
                    const pd = pt.filter(t => t.status === 'done').length
                    const ph = PHASE[proj.status] ?? PHASE.intake
                    return (
                      <Link key={proj.id} href={`/project/${proj.id}`} style={{ textDecoration: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', width: 150, minWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proj.title}</span>
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
                <div style={{ display: 'flex', gap: 20, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
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

          </div>{/* end LEFT */}

          {/* ══════════ RIGHT SIDEBAR ══════════ */}
          <div className="dash-right animate-fade-up-2" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* ── Donut: Projektfortschritt ── */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Projektfortschritt</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{main.title}</p>
              </div>
              <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: 18 }}>
                <DonutChart pct={phase.pct} color={phase.color} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {MILESTONES.map((ms, i) => {
                    const reached = phase.pct >= ms.pct
                    const isCurr  = phaseIdx === i
                    return (
                      <div key={ms.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                          background: reached ? 'var(--green-bg)' : isCurr ? 'var(--amber-bg)' : 'transparent',
                          border: `1.5px solid ${reached ? 'var(--green-border)' : isCurr ? 'var(--amber)' : 'var(--border)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {reached
                            ? <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="var(--green-dark)" strokeWidth="3.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                            : <span style={{ width: 4, height: 4, borderRadius: '50%', background: isCurr ? 'var(--amber)' : 'var(--border-strong)' }} />
                          }
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: reached ? 'var(--text-secondary)' : isCurr ? 'var(--text)' : 'var(--text-muted)', flex: 1 }}>{ms.label}</span>
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.04em', color: reached ? 'var(--green-dark)' : isCurr ? 'var(--amber-dark)' : 'var(--text-muted)' }}>
                          {reached ? '✓' : isCurr ? '●' : '○'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* ── Zahlungsplan / Kostenverteilung ── */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Zahlungsplan</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '3px 0 0' }}>Meilenstein-basiert</p>
              </div>
              <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {MILESTONES.map((ms, i) => {
                  const reached = phase.pct >= ms.pct
                  const isCurr  = phaseIdx === i
                  return (
                    <div key={ms.label}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: reached ? 'var(--text-secondary)' : isCurr ? 'var(--text)' : 'var(--text-muted)' }}>{ms.label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>{ms.payPct}%</span>
                          <span style={{
                            fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, letterSpacing: '.05em',
                            color: reached ? 'var(--green-dark)' : isCurr ? 'var(--amber-dark)' : 'var(--text-muted)',
                            background: reached ? 'var(--green-bg)' : isCurr ? 'var(--amber-bg)' : 'var(--surface-2)',
                            border: `1px solid ${reached ? 'var(--green-border)' : 'var(--border)'}`,
                          }}>
                            {reached ? 'PAID' : isCurr ? 'FÄLLIG' : 'OFFEN'}
                          </span>
                        </div>
                      </div>
                      <div style={{ height: 3, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: reached ? '100%' : isCurr ? '50%' : '0%', background: reached ? 'var(--green)' : 'var(--amber)', borderRadius: 3, transition: 'width .8s ease' }} />
                      </div>
                    </div>
                  )
                })}
                <div style={{ marginTop: 6, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, lineHeight: 1.45 }}>
                    Zahlungsdetails werden mit deinem Projekt-Manager besprochen.
                  </p>
                </div>
              </div>
            </div>

            {/* ── Weitere Projekte ── */}
            {projects.length > 1 && (
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Weitere Projekte</p>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{projects.length - 1}</span>
                </div>
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {projects.filter(p => p.id !== main.id).slice(0, 5).map(p => {
                    const ph = PHASE[p.status] ?? PHASE.intake
                    return (
                      <Link key={p.id} href={`/project/${p.id}`} style={{ textDecoration: 'none' }}>
                        <div style={{ padding: '9px 10px', borderRadius: 10, transition: 'background .12s', cursor: 'pointer' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{p.title}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: p.status === 'active' ? 'var(--green-dark)' : 'var(--text-muted)', marginLeft: 8, flexShrink: 0 }}>{ph.pct}%</span>
                          </div>
                          <div style={{ height: 3, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${ph.pct}%`, background: ph.color, borderRadius: 3 }} />
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Quick Actions ── */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-xs)', padding: '16px 18px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.1em', margin: '0 0 12px', textTransform: 'uppercase' }}>Schnellzugriff</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { href: '/onboarding', icon: '＋', label: 'Neues Projekt starten' },
                  { href: '/estimator',  icon: '◈',  label: 'Preisschätzer' },
                  { href: '/addons',     icon: '⊕',  label: 'Add-Ons ansehen' },
                ].map(a => (
                  <Link key={a.href} href={a.href} style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', transition: 'border-color .12s, background .12s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface)'; }}>
                      <span style={{ fontSize: 14, lineHeight: 1, color: 'var(--text-muted)' }}>{a.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{a.label}</span>
                      <svg style={{ marginLeft: 'auto' }} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6"/></svg>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* ── Tagro AI Status Widget ── */}
            <div style={{ background: 'var(--btn-prim)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
              <div style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 13, color: 'var(--btn-prim-text)', fontWeight: 700 }}>✦</span>
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--btn-prim-text)', margin: 0, lineHeight: 1 }}>Tagro Status</p>
                    <p style={{ fontSize: 10, color: 'var(--btn-prim-text)', margin: '2px 0 0', opacity: .55, lineHeight: 1 }}>KI-Projektbericht</p>
                  </div>
                </div>
                {report ? (
                  <p style={{ fontSize: 12.5, lineHeight: 1.65, color: 'var(--btn-prim-text)', margin: '0 0 14px', opacity: .88 }}>{report}</p>
                ) : (
                  <p style={{ fontSize: 12.5, lineHeight: 1.65, color: 'var(--btn-prim-text)', margin: '0 0 14px', opacity: .45, fontStyle: 'italic' }}>
                    Tagro analysiert deinen Projektfortschritt und liefert dir einen klaren Bericht.
                  </p>
                )}
                <button onClick={generateReport} disabled={genReport}
                  style={{ width: '100%', padding: '9px', background: 'rgba(255,255,255,.12)', color: 'var(--btn-prim-text)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: genReport ? 'default' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, transition: 'background .15s' }}
                  onMouseEnter={e => { if (!genReport) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.18)' }}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.12)'}
                >
                  {genReport
                    ? <><span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'var(--btn-prim-text)', borderRadius: '50%', animation: 'spin .7s linear infinite' }}/> Generiert…</>
                    : <>{report ? '↺ Neu generieren' : '+ Statusbericht'}</>
                  }
                </button>
              </div>
            </div>

            {/* ── Festag Kontakt ── */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Dein Festag Team</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '3px 0 0' }}>Persönlicher Kontakt</p>
              </div>
              <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <a href="mailto:hello@festag.io" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', padding: '9px 10px', borderRadius: 10, transition: 'background .1s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/></svg>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', margin: 0, letterSpacing: '.06em' }}>E-MAIL</p>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', margin: '2px 0 0' }}>hello@festag.io</p>
                  </div>
                </a>
                <a href="https://wa.me/4989123456" target="_blank" rel="noopener" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', padding: '9px 10px', borderRadius: 10, transition: 'background .1s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--green-bg)', border: '1px solid var(--green-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green-dark)" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.3h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.9a16 16 0 0 0 6.19 6.19l.95-.95a2 2 0 0 1 2.1-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', margin: 0, letterSpacing: '.06em' }}>WHATSAPP</p>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', margin: '2px 0 0' }}>+49 (0)89 123 456 78</p>
                  </div>
                </a>
                <div style={{ marginTop: 4, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                    Antwortzeit: &lt; 24h · Mo–Fr 9–18 Uhr
                  </p>
                </div>
              </div>
            </div>

            {/* ── So funktioniert Festag ── */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>So läuft dein Projekt</p>
              </div>
              <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { step: '1', label: 'AI strukturiert',  sub: 'Tagro zerlegt dein Projekt automatisch' },
                  { step: '2', label: 'Team übernimmt',   sub: 'Festag-Entwickler arbeiten die Tasks ab' },
                  { step: '3', label: 'Du siehst Fortschritt', sub: 'Tägliche KI-Updates ohne Meetings' },
                  { step: '4', label: 'Delivery',         sub: 'Geprüft, getestet, übergeben' },
                ].map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 7, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>{s.step}</span>
                    </div>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{s.label}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0', lineHeight: 1.4 }}>{s.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>{/* end RIGHT */}

        </div>
      )}
    </div>
  )
}
