'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import LoadingScreen from '@/components/LoadingScreen'
import ThemeToggle from '@/components/ThemeToggle'
import { createClient } from '@/lib/supabase/client'

type Project = { id: string; title: string; description: string | null; status: string; created_at: string }

const PHASE_CFG: Record<string, { label: string; pct: number }> = {
  intake: { label: 'Intake', pct: 10 },
  planning: { label: 'Planning', pct: 28 },
  active: { label: 'Development', pct: 62 },
  testing: { label: 'Testing', pct: 85 },
  done: { label: 'Delivered', pct: 100 },
}

const PHASES = ['intake', 'planning', 'active', 'testing', 'done']
const PHASE_COPY = ['Briefing', 'Scope', 'Build', 'Review', 'Launch']

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [mainProject, setMainProject] = useState<Project | null>(null)
  const [taskStats, setTaskStats] = useState({ total: 0, done: 0, doing: 0 })
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [showLoader, setShowLoader] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        window.location.href = '/login'
        return
      }

      setEmail(data.session.user.email ?? '')
      const { data: p } = await supabase
        .from('profiles')
        .select('first_name, full_name')
        .eq('id', data.session.user.id)
        .single()

      if (p) setFirstName(p.first_name ?? p.full_name?.split(' ')[0] ?? '')
      loadData()
    })
  }, [])

  async function loadData() {
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false })

    if (data?.length) {
      setProjects(data)
      const prio: Record<string, number> = { active: 0, testing: 1, planning: 2, intake: 3, done: 4 }
      const main = [...data].sort((a, b) => (prio[a.status] ?? 9) - (prio[b.status] ?? 9))[0]
      setMainProject(main)

      const { data: tasks } = await supabase.from('tasks').select('status').eq('project_id', main.id)
      setTaskStats({
        total: tasks?.length ?? 0,
        done: tasks?.filter((t) => t.status === 'done').length ?? 0,
        doing: tasks?.filter((t) => t.status === 'doing').length ?? 0,
      })
    }

    setLoading(false)
  }

  const displayName = useMemo(() => {
    const raw = firstName || email.split('@')[0].split('.')[0] || 'Stefan'
    return raw.charAt(0).toUpperCase() + raw.slice(1)
  }, [email, firstName])

  const phaseCfg = mainProject ? PHASE_CFG[mainProject.status] ?? PHASE_CFG.intake : null
  const pct = phaseCfg?.pct ?? 0
  const openTasks = Math.max(taskStats.total - taskStats.done, 0)
  const activeProjects = projects.filter((p) => p.status !== 'done').length
  const phaseIdx = mainProject ? Math.max(PHASES.indexOf(mainProject.status), 0) : 0

  if (showLoader) return <LoadingScreen onDone={() => setShowLoader(false)} />
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ width: 28, height: 28, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      </div>
    )
  }

  return (
    <div className="portal-dashboard">
      <style>{`
        .portal-dashboard { max-width: 1220px; padding: 34px 40px 48px; }
        .portal-topbar { display:flex; align-items:center; gap:14px; margin-bottom:26px; }
        .portal-title { flex:1; min-width:0; }
        .portal-eyebrow { font-size:11px; line-height:1; font-weight:700; letter-spacing:.11em; text-transform:uppercase; color:var(--text-muted); margin:0 0 10px; }
        .portal-title h1 { font-size:30px; letter-spacing:0; margin:0; }
        .portal-title p { font-size:14px; margin:7px 0 0; color:var(--text-secondary); }
        .portal-search { position:relative; width:260px; flex-shrink:0; }
        .portal-search input { width:100%; height:36px; padding:0 12px 0 34px; background:var(--surface); border:1px solid var(--border); border-radius:var(--r); color:var(--text); font-size:13px; box-shadow:var(--shadow-xs); }
        .portal-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--r-lg); box-shadow:var(--shadow-xs); }
        .portal-btn { height:36px; display:inline-flex; align-items:center; justify-content:center; gap:7px; padding:0 13px; background:var(--text); color:var(--btn-prim-text); border-radius:var(--r); font-size:13px; font-weight:650; text-decoration:none; white-space:nowrap; }
        .kpi-grid { display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:10px; margin-bottom:14px; }
        .kpi { padding:15px 16px; }
        .kpi span { display:block; font-size:11px; color:var(--text-muted); margin-bottom:7px; }
        .kpi strong { display:block; font-size:22px; line-height:1; letter-spacing:0; color:var(--text); }
        .work-grid { display:grid; grid-template-columns:minmax(0, 1fr) 320px; gap:14px; margin-bottom:14px; }
        .panel-head { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:16px 18px; border-bottom:1px solid var(--border); }
        .panel-head p { margin:0; font-size:12px; color:var(--text-muted); }
        .status-pill { display:inline-flex; align-items:center; gap:6px; height:24px; padding:0 9px; border:1px solid var(--border); border-radius:999px; color:var(--text-secondary); background:var(--bg); font-size:11px; font-weight:650; }
        .project-body { padding:20px 18px 18px; }
        .project-body h2 { font-size:22px; letter-spacing:0; margin:0 0 6px; }
        .project-body p { font-size:14px; margin:0; max-width:760px; }
        .progress-track { height:7px; background:var(--surface-2); border-radius:999px; overflow:hidden; margin:18px 0 18px; }
        .progress-fill { height:100%; background:linear-gradient(90deg, var(--text), color-mix(in srgb, var(--text) 78%, var(--green))); border-radius:999px; transition:width .6s cubic-bezier(.16,1,.3,1); }
        .phase-row { display:grid; grid-template-columns:repeat(5, minmax(0, 1fr)); gap:8px; }
        .phase-item { border:1px solid var(--border); border-radius:var(--r); padding:10px; background:var(--bg); }
        .phase-item.is-active { border-color:var(--border-strong); background:var(--surface); box-shadow:var(--shadow-xs); }
        .phase-dot { width:7px; height:7px; border-radius:50%; background:var(--text-muted); margin-bottom:8px; }
        .phase-item.is-done .phase-dot, .phase-item.is-active .phase-dot { background:var(--text); }
        .phase-item strong { display:block; font-size:12px; color:var(--text); margin-bottom:2px; }
        .phase-item span { display:block; font-size:11px; color:var(--text-muted); }
        .side-list { padding:6px 0; }
        .side-row { display:flex; align-items:center; justify-content:space-between; gap:14px; padding:12px 16px; border-bottom:1px solid var(--border); }
        .side-row:last-child { border-bottom:none; }
        .side-row span { font-size:12px; color:var(--text-muted); }
        .side-row strong { font-size:13px; color:var(--text); text-align:right; }
        .table { overflow:hidden; }
        .table-row { display:grid; grid-template-columns:minmax(0, 1.35fr) 120px 120px 90px; gap:14px; align-items:center; padding:13px 16px; border-top:1px solid var(--border); color:var(--text); }
        .table-row:first-child { border-top:none; }
        .table-head { background:var(--bg); color:var(--text-muted); font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; }
        .table-title { min-width:0; }
        .table-title strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:13.5px; }
        .table-title span { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12px; color:var(--text-muted); margin-top:2px; }
        .quiet-empty { padding:54px 24px; text-align:center; }
        .quiet-empty h2 { margin:0 0 8px; }
        .quiet-empty p { max-width:420px; margin:0 auto 20px; font-size:14px; }
        @media(max-width:900px) {
          .portal-dashboard { padding:18px 0 24px; }
          .portal-topbar { align-items:flex-start; flex-wrap:wrap; }
          .portal-title { flex-basis:100%; }
          .portal-search { width:100%; }
          .kpi-grid, .work-grid { grid-template-columns:1fr; }
          .phase-row { grid-template-columns:1fr; }
          .table-row { grid-template-columns:minmax(0, 1fr) 84px; }
          .table-row > :nth-child(3), .table-row > :nth-child(4) { display:none; }
        }
      `}</style>

      <div className="portal-topbar animate-fade-up">
        <div className="portal-title">
          <p className="portal-eyebrow">Client Portal</p>
          <h1>{displayName}, hier steht dein Workspace.</h1>
          <p>{activeProjects} aktive Projekte, {taskStats.doing} Tasks in Umsetzung, {openTasks} offene Entscheidungen.</p>
        </div>

        <div className="portal-search">
          <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input placeholder="Projekte suchen" />
        </div>

        <Link href="/new-project" className="portal-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Neues Projekt
        </Link>
        <ThemeToggle position="relative" />
      </div>

      {!mainProject || !phaseCfg ? (
        <div className="portal-card quiet-empty animate-fade-up-1">
          <h2>Starte dein erstes Projekt</h2>
          <p>Beschreibe deine Idee, wir strukturieren Scope, Prioritäten und die ersten Umsetzungsschritte.</p>
          <Link href="/onboarding" className="portal-btn">Projekt starten</Link>
        </div>
      ) : (
        <>
          <div className="kpi-grid animate-fade-up-1">
            {[
              { label: 'Aktive Projekte', value: activeProjects },
              { label: 'Projektfortschritt', value: `${pct}%` },
              { label: 'Tasks gesamt', value: taskStats.total },
              { label: 'Erledigt', value: taskStats.done },
            ].map((item) => (
              <div key={item.label} className="portal-card kpi">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>

          <div className="work-grid animate-fade-up-2">
            <section className="portal-card">
              <div className="panel-head">
                <div>
                  <h3 style={{ margin: 0 }}>Aktuelles Projekt</h3>
                  <p>Priorisierter Arbeitsstand</p>
                </div>
                <span className="status-pill">{phaseCfg.label}</span>
              </div>

              <div className="project-body">
                <h2>{mainProject.title}</h2>
                {mainProject.description && <p>{mainProject.description}</p>}
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="phase-row">
                  {PHASES.map((phase, i) => (
                    <div key={phase} className={`phase-item ${i < phaseIdx ? 'is-done' : ''} ${i === phaseIdx ? 'is-active' : ''}`}>
                      <div className="phase-dot" />
                      <strong>{PHASE_CFG[phase].label}</strong>
                      <span>{PHASE_COPY[i]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <aside className="portal-card">
              <div className="panel-head">
                <div>
                  <h3 style={{ margin: 0 }}>Nächste Schritte</h3>
                  <p>Kompakter Überblick</p>
                </div>
              </div>
              <div className="side-list">
                <div className="side-row"><span>Status</span><strong>{phaseCfg.label}</strong></div>
                <div className="side-row"><span>Offene Tasks</span><strong>{openTasks}</strong></div>
                <div className="side-row"><span>In Umsetzung</span><strong>{taskStats.doing}</strong></div>
                <div className="side-row"><span>ETA</span><strong>4-6 Wochen</strong></div>
              </div>
              <div style={{ padding: 16, borderTop: '1px solid var(--border)' }}>
                <Link href={`/project/${mainProject.id}`} className="portal-btn" style={{ width: '100%' }}>
                  Projekt öffnen
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
                </Link>
              </div>
            </aside>
          </div>

          <section className="portal-card table animate-fade-up-3">
            <div className="panel-head">
              <div>
                <h3 style={{ margin: 0 }}>Projektportfolio</h3>
                <p>{projects.length} {projects.length === 1 ? 'Eintrag' : 'Einträge'}</p>
              </div>
              <Link href="/messages" style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 650 }}>Messages</Link>
            </div>
            <div className="table-row table-head">
              <span>Projekt</span>
              <span>Phase</span>
              <span>Fortschritt</span>
              <span></span>
            </div>
            {projects.map((p) => {
              const cfg = PHASE_CFG[p.status] ?? PHASE_CFG.intake
              return (
                <Link key={p.id} href={`/project/${p.id}`} className="table-row">
                  <div className="table-title">
                    <strong>{p.title}</strong>
                    <span>{p.description || 'Keine Beschreibung hinterlegt'}</span>
                  </div>
                  <span className="status-pill">{cfg.label}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{cfg.pct}%</span>
                  <span style={{ justifySelf: 'end', color: 'var(--text-muted)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
                  </span>
                </Link>
              )
            })}
          </section>
        </>
      )}
    </div>
  )
}
