'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import LoadingScreen from '@/components/LoadingScreen'
import NewProjectModal from '@/components/NewProjectModal'
import NewTaskModal from '@/components/NewTaskModal'
import AudioBriefingButton from '@/components/AudioBriefingButton'

type Project  = { id: string; title: string; description: string | null; status: string; created_at: string; color: string | null }
type Task     = { id: string; title: string; status: string; priority?: string; project_id: string; updated_at?: string }
type Activity = { id: string; type: string; message: string; created_at: string; project_id?: string }

const PHASE: Record<string, { label: string; pct: number }> = {
  intake:   { label: 'Intake',        pct: 10  },
  planning: { label: 'Planung',       pct: 28  },
  active:   { label: 'In Arbeit',     pct: 62  },
  testing:  { label: 'Testing',       pct: 85  },
  done:     { label: 'Abgeschlossen', pct: 100 },
}

const MILESTONES = [
  { label: 'Kickoff',   pct: 10  },
  { label: 'Design',    pct: 28  },
  { label: 'MVP',       pct: 62  },
  { label: 'Testing',   pct: 85  },
  { label: 'Delivery',  pct: 100 },
]

export default function DashboardPage() {
  const [projects,  setProjects]  = useState<Project[]>([])
  const [main,      setMain]      = useState<Project|null>(null)
  const [tasks,     setTasks]     = useState<Task[]>([])
  const [allTasks,  setAllTasks]  = useState<Task[]>([])
  const [activity,  setActivity]  = useState<Activity[]>([])
  const [firstName, setFirstName] = useState('')
  const [loading,   setLoading]   = useState(true)
  const [report,    setReport]    = useState('')
  const [genReport, setGenReport] = useState(false)
  const [showNewProject, setShowNewProject] = useState(false)
  const [showNewTask,    setShowNewTask]    = useState(false)
  const [showLoader, setShowLoader] = useState(() =>
    typeof window !== 'undefined' && !sessionStorage.getItem('festag_dash_loaded')
  )
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      const uid = data.session.user.id
      const { data: p } = await supabase.from('profiles').select('first_name,full_name,role').eq('id', uid).single()
      if (p) setFirstName((p as any).first_name ?? (p as any).full_name?.split(' ')[0] ?? '')

      const { data: projs } = await supabase.from('projects').select('*').order('created_at', { ascending:false })
      if (projs?.length) {
        setProjects(projs)
        const prio: Record<string,number> = { active:0, testing:1, planning:2, intake:3, done:4 }
        const m = [...(projs as any[])].sort((a,b) => (prio[a.status]??9)-(prio[b.status]??9))[0]
        setMain(m)
        const [{ data: t }, { data: at }] = await Promise.all([
          supabase.from('tasks').select('*').eq('project_id', m.id),
          supabase.from('tasks').select('*').in('project_id', (projs as any[]).map(pr => pr.id)),
        ])
        setTasks(t ?? [])
        setAllTasks(at ?? [])
      }
      const { data: feed } = await supabase.from('activity_feed').select('*').order('created_at',{ascending:false}).limit(8)
      setActivity(feed ?? [])
      setLoading(false)
    })
  }, [])

  async function generateReport() {
    if (!main || genReport) return
    setGenReport(true); setReport('')
    const done = tasks.filter(t => t.status==='done').length
    const pct  = tasks.length ? Math.round(done/tasks.length*100) : 0
    try {
      const res = await fetch('/api/ai/chat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          system:'Du bist Tagro. Erstelle einen kurzen Statusbericht auf Deutsch. 3-4 Sätze. Klar und direkt. Keine Emojis.',
          max_tokens:280,
          messages:[{ role:'user', content:`Projekt: "${main.title}". Phase: ${PHASE[main.status]?.label}. Fortschritt: ${pct}%. ${done} von ${tasks.length} Tasks erledigt.` }],
        }),
      })
      const d = await res.json()
      setReport(d.content?.[0]?.text ?? '')
    } catch {}
    setGenReport(false)
  }

  const h = new Date().getHours()
  const greeting = h < 12 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend'
  const displayName = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : ''

  function timeAgo(dateStr: string) {
    const d = Date.now() - new Date(dateStr).getTime()
    if (d < 60000)    return 'Gerade'
    if (d < 3600000)  return `vor ${Math.floor(d/60000)} Min`
    if (d < 86400000) return `vor ${Math.floor(d/3600000)} Std`
    return `vor ${Math.floor(d/86400000)}d`
  }

  if (showLoader) return <LoadingScreen onDone={() => { sessionStorage.setItem('festag_dash_loaded','1'); setShowLoader(false) }}/>
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh', color:'var(--text-muted)', fontWeight:700 }}>
      Workspace wird vorbereitet.
    </div>
  )

  const phase       = main ? (PHASE[main.status] ?? PHASE.intake) : null
  const done        = tasks.filter(t => t.status==='done').length
  const inProgress  = tasks.filter(t => t.status==='doing').length
  const todo        = tasks.filter(t => t.status==='todo').length
  const activeTasks = tasks.filter(t => t.status!=='done')
  const completePct = tasks.length ? Math.round(done/tasks.length*100) : 0
  const phaseIdx    = main ? ['intake','planning','active','testing','done'].indexOf(main.status) : -1
  const projColor   = main?.color || null  // never fallback to green

  return (
    <div className="page-content dashboard-os" style={{ maxWidth: undefined }}>
      <style>{`
        @keyframes spin { to{transform:rotate(360deg);} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;} }
        .dashboard-os {
          --dash-ease:cubic-bezier(.16,1,.3,1);
          --dash-hairline:color-mix(in srgb, var(--border) 42%, transparent);
          --dash-muted:color-mix(in srgb, var(--text-muted) 82%, transparent);
          color:var(--text);
          padding-bottom:72px;
        }
        .dash-hero {
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:28px;
          margin-bottom:58px;
          animation:fadeUp .32s var(--dash-ease) both;
        }
        .dash-title {
          margin:0;
          font-size:clamp(34px, 4.2vw, 56px);
          line-height:.98;
          font-weight:740;
          letter-spacing:0;
          color:var(--text);
        }
        .dash-meta {
          margin:12px 0 0;
          font-size:14px;
          color:var(--text-muted);
          font-weight:520;
          letter-spacing:-.01em;
        }
        .dash-actions { display:flex; align-items:center; gap:10px; flex-shrink:0; padding-top:2px; }
        .dash-button {
          height:36px;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:7px;
          padding:0 15px;
          border-radius:11px;
          border:1px solid color-mix(in srgb, var(--border) 54%, transparent);
          background:color-mix(in srgb, var(--surface) 64%, transparent);
          color:var(--text);
          font:inherit;
          font-size:12.5px;
          font-weight:690;
          letter-spacing:-.01em;
          cursor:pointer;
          text-decoration:none;
          box-shadow:0 14px 34px rgba(0,0,0,.035);
          transition:transform .24s var(--dash-ease), background .24s var(--dash-ease), border-color .24s var(--dash-ease), box-shadow .24s var(--dash-ease), opacity .24s var(--dash-ease);
        }
        .dash-button:hover {
          transform:translateY(-1px);
          background:color-mix(in srgb, var(--surface-2) 34%, var(--surface));
          border-color:color-mix(in srgb, var(--border-strong) 46%, transparent);
          box-shadow:0 20px 46px rgba(0,0,0,.055);
        }
        .dash-button.primary {
          background:var(--btn-prim);
          color:var(--btn-prim-text);
          border-color:transparent;
          box-shadow:0 18px 44px rgba(0,0,0,.11);
        }
        .dash-layout {
          display:grid;
          grid-template-columns:minmax(0, 1fr) 286px;
          gap:56px;
          align-items:start;
        }
        .dash-section {
          margin-bottom:56px;
          animation:fadeUp .34s var(--dash-ease) both;
        }
        .dash-section-head {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:16px;
          margin-bottom:16px;
        }
        .dash-label {
          margin:0;
          color:var(--dash-muted);
          font-size:12px;
          font-weight:680;
          letter-spacing:.01em;
          text-transform:none;
        }
        .dash-soft-action {
          background:transparent;
          border:0;
          padding:0;
          color:var(--text-muted);
          font:inherit;
          font-size:12px;
          font-weight:660;
          cursor:pointer;
          display:inline-flex;
          align-items:center;
          gap:5px;
          transition:color .18s var(--dash-ease), opacity .18s var(--dash-ease);
        }
        .dash-soft-action:hover { color:var(--text); }
        .dash-current {
          border-radius:24px;
          overflow:hidden;
          background:
            linear-gradient(135deg, color-mix(in srgb, var(--surface) 58%, transparent), transparent 72%),
            color-mix(in srgb, var(--surface) 36%, transparent);
          border:1px solid color-mix(in srgb, var(--border) 34%, transparent);
          box-shadow:0 24px 70px rgba(0,0,0,.045);
          backdrop-filter:blur(18px) saturate(145%);
          -webkit-backdrop-filter:blur(18px) saturate(145%);
        }
        .dash-current-top { display:flex; align-items:flex-start; gap:16px; padding:22px 24px 18px; }
        .dash-current-actions { display:flex; align-items:center; gap:7px; flex-shrink:0; }
        .dash-chip {
          display:inline-flex;
          align-items:center;
          height:22px;
          padding:0 8px;
          border-radius:999px;
          background:color-mix(in srgb, var(--surface-2) 48%, transparent);
          color:var(--text-muted);
          font-size:10.5px;
          font-weight:680;
          letter-spacing:.01em;
        }
        .dash-current-progress {
          padding:16px 24px 20px;
          background:linear-gradient(180deg, transparent, color-mix(in srgb, var(--surface-2) 18%, transparent));
        }
        .dash-row {
          display:flex;
          align-items:center;
          gap:0;
          min-height:50px;
          margin:5px -16px;
          padding-left:4px;
          padding-right:4px;
          border-radius:15px;
          background:transparent;
          transition:background .28s var(--dash-ease), transform .28s var(--dash-ease), box-shadow .28s var(--dash-ease), opacity .28s var(--dash-ease);
        }
        .dash-row:hover {
          background:color-mix(in srgb, var(--surface-2) 22%, transparent);
          transform:translateY(-1px) scale(1.002);
          box-shadow:0 18px 44px rgba(0,0,0,.035);
          backdrop-filter:blur(12px);
          -webkit-backdrop-filter:blur(12px);
        }
        .dash-col-name { flex:1; min-width:0; padding:12px 18px; }
        .dash-col-stat { padding:12px 14px; font-size:12px; color:var(--text-muted); font-weight:540; white-space:nowrap; }
        .dash-col-bar { padding:12px 14px; width:132px; }
        .dash-progress-track {
          height:2px;
          background:color-mix(in srgb, var(--surface-2) 34%, transparent);
          border-radius:99px;
          overflow:hidden;
          opacity:.55;
          transition:opacity .26s var(--dash-ease), background .26s var(--dash-ease);
        }
        .dash-row:hover .dash-progress-track { opacity:1; background:color-mix(in srgb, var(--surface-2) 54%, transparent); }
        .dash-progress-fill { height:100%; border-radius:99px; opacity:.78; transition:width .7s var(--dash-ease), opacity .26s var(--dash-ease); }
        .dash-row:hover .dash-progress-fill { opacity:1; }
        .task-row {
          display:flex;
          align-items:center;
          gap:11px;
          min-height:42px;
          padding:0 18px;
          margin:4px -16px;
          border-radius:14px;
          transition:background .24s var(--dash-ease), transform .24s var(--dash-ease), box-shadow .24s var(--dash-ease);
        }
        .task-row:hover {
          background:color-mix(in srgb, var(--surface-2) 20%, transparent);
          transform:translateY(-1px) scale(1.001);
          box-shadow:0 14px 34px rgba(0,0,0,.026);
        }
        .dash-report {
          padding:2px 0 0;
          max-width:760px;
        }
        .dash-report-text {
          margin:0;
          color:var(--text-secondary);
          font-size:14px;
          line-height:1.85;
          letter-spacing:-.015em;
          white-space:pre-wrap;
        }
        .dash-report-empty {
          margin:0;
          color:var(--text-muted);
          font-size:13px;
          line-height:1.7;
          font-style:italic;
        }
        .dash-side-rail {
          display:flex;
          flex-direction:column;
          gap:42px;
          animation:fadeUp .34s .08s var(--dash-ease) both;
          position:sticky;
          top:30px;
        }
        .stat-grid { display:grid; grid-template-columns:1fr 1fr; gap:18px 20px; }
        .stat-item { display:flex; flex-direction:column; gap:4px; }
        .stat-value { font-size:24px; font-weight:680; color:var(--text); letter-spacing:-.055em; line-height:1; }
        .stat-caption { font-size:10.5px; font-weight:670; color:var(--text-muted); letter-spacing:.045em; text-transform:uppercase; }
        .stat-sub { font-size:11px; color:var(--text-muted); font-weight:520; }
        .quick-link {
          display:flex;
          align-items:center;
          justify-content:space-between;
          min-height:34px;
          margin:2px -9px;
          padding:0 9px;
          border-radius:11px;
          text-decoration:none;
          color:var(--text-secondary);
          font-size:13px;
          font-weight:560;
          transition:background .2s var(--dash-ease), color .2s var(--dash-ease), transform .2s var(--dash-ease);
        }
        .quick-link:hover {
          color:var(--text);
          background:color-mix(in srgb, var(--surface-2) 18%, transparent);
          transform:translateX(1px);
        }
        .activity-row {
          display:flex;
          gap:10px;
          padding:8px 0;
          color:var(--text-muted);
        }
        @media (max-width: 1120px) {
          .dash-layout { grid-template-columns:1fr; gap:32px; }
          .dash-side-rail { position:static; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:26px; }
        }
        @media (max-width: 760px) {
          .dash-hero { flex-direction:column; margin-bottom:36px; }
          .dash-title { font-size:34px; }
          .dash-actions { width:100%; flex-wrap:wrap; }
          .dash-current-top { flex-direction:column; }
          .dash-current-actions { width:100%; }
          .dash-current-actions .dash-button { flex:1; }
          .dash-col-stat:nth-of-type(2),
          .dash-col-bar { display:none; }
          .dash-side-rail { display:flex; }
        }
      `}</style>

      {/* ── Greeting ── */}
      <div className="dash-hero">
        <div>
          <h1 className="dash-title">
            {greeting}{displayName ? `, ${displayName}` : ''}
          </h1>
          <p className="dash-meta">
            {projects.length} Projekt{projects.length!==1?'e':''} · {allTasks.length} Tasks
          </p>
        </div>
        <div className="dash-actions">
          <AudioBriefingButton
            type="dashboard_briefing"
            label="Briefing anhören"
            projectTitle={main?.title}
            report={report || `${projects.length} Projekte, ${allTasks.length} Tasks. Aktueller Fokus: ${main?.title ?? 'kein aktives Projekt'}.`}
            projectStatus={main ? PHASE[main.status]?.label : undefined}
            progress={completePct}
            blockerCount={allTasks.filter((task) => task.status === 'blocked' || task.status === 'waiting').length}
            decisionCount={allTasks.filter((task) => task.status === 'waiting').length}
            nextSteps={[main ? `${main.title} prüfen` : 'erstes Projekt erstellen']}
          />
          <button
            onClick={() => setShowNewProject(true)}
            className="dash-button"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            Neues Projekt
          </button>
        </div>
      </div>

      {/* ── Empty ── */}
      {!main && (
        <div style={{ padding:'92px 0', textAlign:'center', animation:'fadeUp .34s var(--dash-ease) both' }}>
          <p style={{ fontSize:14, fontWeight:600, color:'var(--text)', margin:'0 0 6px' }}>Noch kein Projekt</p>
          <p style={{ fontSize:12.5, color:'var(--text-muted)', maxWidth:320, margin:'0 auto 24px', lineHeight:1.6 }}>
            Erstelle dein erstes Projekt und lass Tagro die Struktur automatisch aufbauen.
          </p>
          <button onClick={() => setShowNewProject(true)} className="dash-button primary">
            Projekt erstellen
          </button>
        </div>
      )}

      {main && phase && (
        <div className="dash-layout">

          {/* ══ LEFT ══ */}
          <div>

            {/* ── Active project card ── */}
            <div className="dash-section" style={{ animationDelay:'.05s' }}>
              <p className="dash-label">Aktuelles Projekt</p>
              <div className="dash-current">
                {/* Top row */}
                <div className="dash-current-top">
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                      <span style={{ width:7, height:7, borderRadius:'50%', border:`2px solid ${projColor || 'var(--border-strong)'}`, background:'transparent', flexShrink:0, boxSizing:'border-box' }}/>
                      <Link href={`/project/${main.id}`} style={{ textDecoration:'none' }}>
                        <h2 style={{ fontSize:15, fontWeight:600, letterSpacing:'-.2px', margin:0, color:'var(--text)' }}>{main.title}</h2>
                      </Link>
                      <span className="dash-chip">
                        {phase.label}
                      </span>
                    </div>
                    {main.description && (
                      <p style={{ margin:0, fontSize:12.5, color:'var(--text-secondary)', lineHeight:1.55, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                        {main.description}
                      </p>
                    )}
                  </div>
                  <div className="dash-current-actions">
                    <Link href={`/project/${main.id}`} className="dash-button primary" style={{ height:32, padding:'0 13px' }}>
                      Öffnen
                    </Link>
                    <button onClick={() => setShowNewTask(true)}
                      className="dash-button"
                      style={{ height:32, padding:'0 12px' }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                      Task
                    </button>
                  </div>
                </div>

                {/* Progress strip */}
                <div className="dash-current-progress">
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                    <div style={{ display:'flex', gap:16 }}>
                      {([
                        { label:'Offen',    val:todo      },
                        { label:'Aktiv',    val:inProgress},
                        { label:'Erledigt', val:done      },
                      ] as const).map(s => (
                        <span key={s.label} style={{ fontSize:12, color:'var(--text-muted)', fontWeight:500 }}>
                          <span style={{ color:'var(--text)', fontWeight:600 }}>{s.val}</span> {s.label}
                        </span>
                      ))}
                    </div>
                    <span style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)' }}>{completePct}%</span>
                  </div>
                  {/* Milestone progress */}
                  <div style={{ position:'relative', height:2, background:'color-mix(in srgb, var(--surface-2) 42%, transparent)', borderRadius:3, marginBottom:9 }}>
                    <div style={{ height:'100%', width:`${phase.pct}%`, background: projColor || 'var(--text-secondary)', opacity:.76, borderRadius:3, transition:'width 1s cubic-bezier(.16,1,.3,1)' }}/>
                    {MILESTONES.map(ms => (
                      <div key={ms.label} style={{ position:'absolute', top:'50%', left:`${ms.pct}%`, transform:'translate(-50%,-50%)', width:6, height:6, borderRadius:'50%', background: phase.pct>=ms.pct ? (projColor||'var(--text-secondary)') : 'var(--card)', border:`1.5px solid ${phase.pct>=ms.pct?(projColor||'var(--text-secondary)'):'var(--border-strong)'}`, boxSizing:'border-box' }}/>
                    ))}
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    {MILESTONES.map((ms, i) => (
                      <span key={ms.label} style={{ fontSize:9.5, color: phase.pct>=ms.pct?'var(--text-secondary)':'var(--text-muted)', fontWeight: phaseIdx===i?600:400 }}>{ms.label}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── All projects table ── */}
            {projects.length > 0 && (
              <div className="dash-section" style={{ animationDelay:'.1s' }}>
                <div className="dash-section-head">
                  <p className="dash-label">Projekte</p>
                  <button onClick={() => setShowNewProject(true)} className="dash-soft-action">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                    Neu
                  </button>
                </div>
                <div>
                  {projects.map((proj, i) => {
                    const ph   = PHASE[proj.status] ?? PHASE.intake
                    const pt   = allTasks.filter(t => t.project_id===proj.id)
                    const pd   = pt.filter(t => t.status==='done').length
                    const pct  = pt.length ? Math.round(pd/pt.length*100) : 0
                    const col  = proj.color || null
                    return (
                      <Link key={proj.id} href={`/project/${proj.id}`} style={{ textDecoration:'none', color:'inherit', display:'block' }}>
                        <div className="dash-row" style={{ cursor:'pointer' }}>
                          <div className="dash-col-name">
                            <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
                              <span style={{ width:6, height:6, borderRadius:'50%', border:`2px solid ${col || 'var(--border-strong)'}`, background:'transparent', flexShrink:0, boxSizing:'border-box' }}/>
                              <span style={{ fontSize:13, fontWeight:500, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{proj.title}</span>
                            </div>
                          </div>
                          <div className="dash-col-stat">{ph.label}</div>
                          <div className="dash-col-stat">{pt.length} Tasks</div>
                          <div className="dash-col-bar">
                            <div className="dash-progress-track">
                              <div className="dash-progress-fill" style={{ width:`${pct}%`, background: col || 'var(--text-muted)' }}/>
                            </div>
                          </div>
                          <div className="dash-col-stat" style={{ width:38, textAlign:'right' }}>{pct}%</div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Active tasks ── */}
            {activeTasks.length > 0 && (
              <div className="dash-section" style={{ animationDelay:'.15s' }}>
                <div className="dash-section-head">
                  <p className="dash-label">Aktive Tasks</p>
                  <Link href={`/project/${main.id}`} className="dash-soft-action" style={{ textDecoration:'none' }}>Alle →</Link>
                </div>
                {activeTasks.slice(0, 8).map((t, i, arr) => (
                  <div key={t.id} className="task-row">
                    <span style={{ width:6, height:6, borderRadius:'50%', background:'transparent', border:`1.5px solid ${t.status==='doing'?(projColor||'var(--text-secondary)'):'var(--border-strong)'}`, flexShrink:0, boxSizing:'border-box' }}/>
                    <span style={{ flex:1, fontSize:12.5, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</span>
                    <span style={{ fontSize:11, color:'var(--text-muted)', flexShrink:0 }}>
                      {t.status==='doing' ? 'Aktiv' : 'Offen'}
                      {t.priority === 'critical' ? ' · Kritisch' : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* ── Tagro Statusbericht ── */}
            <div className="dash-section" style={{ animationDelay:'.2s' }}>
              <div className="dash-section-head">
                <p className="dash-label">Statusbericht</p>
                <button onClick={generateReport} disabled={genReport}
                  className="dash-soft-action"
                  style={{ cursor:genReport?'default':'pointer', opacity:genReport ? .72 : 1 }}
                >
                  {genReport ? <span style={{ width:10, height:10, border:'1.5px solid transparent', borderTopColor:'currentColor', borderRadius:'50%', animation:'spin .7s linear infinite', display:'inline-block' }}/> : <span style={{ fontSize:11 }}>✦</span>}
                  {genReport ? 'Lädt…' : report ? 'Neu' : 'Mit Tagro generieren'}
                </button>
              </div>
              <div className="dash-report">
                {report ? (
                  <p className="dash-report-text">{report}</p>
                ) : (
                  <p className="dash-report-empty">
                    Kein Bericht — Tagro fasst Fortschritt, Blocker und nächste Schritte automatisch zusammen.
                  </p>
                )}
              </div>
            </div>

          </div>{/* end LEFT */}

          {/* ══ RIGHT ══ */}
          <div className="dash-side-rail">

            {/* Stats */}
            <div>
              <p className="dash-label">Übersicht</p>
              <div className="stat-grid">
                {[
                  { label:'Fortschritt', value:`${completePct}%`, sub: phase.label },
                  { label:'Offen',       value: todo,              sub:`${inProgress} aktiv` },
                  { label:'Erledigt',    value: done,              sub:`von ${tasks.length}` },
                  { label:'Projekte',    value: projects.length,   sub:`${allTasks.length} Tasks` },
                ].map(s => (
                  <div key={s.label} className="stat-item">
                    <span className="stat-value">{s.value}</span>
                    <span className="stat-caption">{s.label}</span>
                    <span className="stat-sub">{s.sub}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Schnellzugriff */}
            <div>
              <p className="dash-label">Schnellzugriff</p>
              {[
                { href:'/projects?new=1', label:'Neues Projekt mit AI' },
                { href:'/estimator',  label:'Preisschätzer'        },
                { href:'/addons',     label:'Add-Ons'              },
                { href:'/messages',   label:'Nachrichten'          },
              ].map(a => (
                <Link key={a.href} href={a.href} className="quick-link">
                  {a.label}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M9 6l6 6-6 6"/></svg>
                </Link>
              ))}
            </div>

            {/* Recent activity */}
            {activity.length > 0 && (
              <div>
                <p className="dash-label">Aktivität</p>
                <div>
                  {activity.slice(0, 6).map((a) => (
                    <div key={a.id} className="activity-row">
                      <span style={{ width:5, height:5, borderRadius:'50%', border:'1.5px solid var(--border-strong)', background:'transparent', flexShrink:0, marginTop:6, boxSizing:'border-box' }}/>
                      <p style={{ fontSize:11.5, color:'var(--text-muted)', margin:0, flex:1, lineHeight:1.45, overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{a.message}</p>
                      <span style={{ fontSize:10.5, color:'var(--text-muted)', flexShrink:0, marginTop:1 }}>{timeAgo(a.created_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>{/* end RIGHT */}
        </div>
      )}

      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreated={(id) => { setShowNewProject(false); window.location.href = `/project/${id}` }}
        />
      )}
      {showNewTask && main && (
        <NewTaskModal
          onClose={() => setShowNewTask(false)}
          onCreated={() => { setShowNewTask(false); window.location.reload() }}
          defaultProjectId={main.id}
          source="manual"
        />
      )}
    </div>
  )
}
