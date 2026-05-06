'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import LoadingScreen from '@/components/LoadingScreen'
import NewProjectModal from '@/components/NewProjectModal'

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
  { label: 'Kickoff',   phase: 'intake',   pct: 10,  payPct: 20 },
  { label: 'Design OK', phase: 'planning', pct: 28,  payPct: 25 },
  { label: 'MVP Live',  phase: 'active',   pct: 62,  payPct: 30 },
  { label: 'Testing',   phase: 'testing',  pct: 85,  payPct: 15 },
  { label: 'Delivery',  phase: 'done',     pct: 100, payPct: 10 },
]

function DonutChart({ pct }: { pct: number }) {
  const R = 40, cx = 50, cy = 50, circ = 2 * Math.PI * R
  return (
    <div style={{ position:'relative', width:100, height:100, flexShrink:0 }}>
      <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform:'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--surface-2)" strokeWidth="11"/>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--text-secondary)" strokeWidth="11"
          strokeDasharray={`${circ*(pct/100)} ${circ*(1-pct/100)}`}
          strokeLinecap="round" style={{ transition:'stroke-dasharray 1.2s cubic-bezier(.16,1,.3,1)' }}
        />
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontSize:17, fontWeight:700, color:'var(--text)', lineHeight:1 }}>{pct}%</span>
        <span style={{ fontSize:8, color:'var(--text-muted)', fontWeight:700, letterSpacing:'.06em', marginTop:3 }}>DONE</span>
      </div>
    </div>
  )
}

function MetricCard({ label, value, sub }: { label:string; value:string|number; sub:string }) {
  return (
    <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:'16px 20px', flex:1, minWidth:0 }}>
      <p style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.1em', textTransform:'uppercase', margin:'0 0 8px' }}>{label}</p>
      <p style={{ fontSize:28, fontWeight:700, color:'var(--text)', margin:'0 0 4px', lineHeight:1, letterSpacing:'-.5px' }}>{value}</p>
      <span style={{ fontSize:11, color:'var(--text-muted)' }}>{sub}</span>
    </div>
  )
}

export default function DashboardPage() {
  const [projects,   setProjects]   = useState<Project[]>([])
  const [main,       setMain]       = useState<Project|null>(null)
  const [tasks,      setTasks]      = useState<Task[]>([])
  const [allTasks,   setAllTasks]   = useState<Task[]>([])
  const [activity,   setActivity]   = useState<Activity[]>([])
  const [firstName,  setFirstName]  = useState('')
  const [userRole,   setUserRole]   = useState('client')
  const [loading,    setLoading]    = useState(true)
  const [genReport,  setGenReport]  = useState(false)
  const [report,     setReport]     = useState('')
  const [showNewProject, setShowNewProject] = useState(false)
  const [showLoader, setShowLoader] = useState(() =>
    typeof window !== 'undefined' && !sessionStorage.getItem('festag_dash_loaded')
  )
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      const uid = data.session.user.id
      const { data: p } = await supabase.from('profiles').select('first_name,full_name,role').eq('id', uid).single()
      if (p) {
        setFirstName((p as any).first_name ?? (p as any).full_name?.split(' ')[0] ?? '')
        setUserRole((p as any).role ?? 'client')
      }
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
      const { data: feed } = await supabase
        .from('activity_feed')
        .select('*')
        .order('created_at', { ascending:false })
        .limit(12)
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
          messages:[{ role:'user', content:`Projekt: "${main.title}". Phase: ${PHASE[main.status]?.label}. Fortschritt: ${pct}%. ${done} von ${tasks.length} Tasks erledigt. Erstelle einen Statusbericht.` }],
        }),
      })
      const d = await res.json()
      setReport(d.content?.[0]?.text ?? 'Statusbericht konnte nicht erstellt werden.')
    } catch { setReport('Verbindungsfehler. Bitte erneut versuchen.') }
    setGenReport(false)
  }

  const h = new Date().getHours()
  const greeting     = h < 12 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend'
  const displayName  = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : ''
  const isDevOrAdmin = userRole === 'dev' || userRole === 'admin'

  if (showLoader) return <LoadingScreen onDone={() => { sessionStorage.setItem('festag_dash_loaded','1'); setShowLoader(false) }}/>
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'50vh' }}>
      <div style={{ width:24, height:24, border:'2px solid var(--border)', borderTopColor:'var(--text)', borderRadius:'50%', animation:'spin .8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  )

  const phase       = main ? (PHASE[main.status] ?? PHASE.intake) : null
  const done        = tasks.filter(t => t.status==='done').length
  const inProgress  = tasks.filter(t => t.status==='doing').length
  const todo        = tasks.filter(t => t.status==='todo').length
  const activeTasks = tasks.filter(t => t.status!=='done')
  const allDone     = allTasks.filter(t => t.status==='done').length
  const allActive   = allTasks.filter(t => t.status==='doing').length
  const allTodo2    = allTasks.filter(t => t.status==='todo').length
  const totalAll    = allTasks.length || 1
  const phaseIdx    = main ? ['intake','planning','active','testing','done'].indexOf(main.status) : -1
  const completePct = tasks.length ? Math.round(done/tasks.length*100) : 0

  function timeAgo(dateStr: string) {
    const d = Date.now() - new Date(dateStr).getTime()
    if (d < 60000)      return 'Gerade'
    if (d < 3600000)    return `vor ${Math.floor(d/60000)} Min`
    if (d < 86400000)   return `vor ${Math.floor(d/3600000)} Std`
    return `vor ${Math.floor(d/86400000)} Tagen`
  }

  return (
    <div className="page-content" style={{ maxWidth:1300 }}>
      <style>{`
        @keyframes spin    { to{transform:rotate(360deg);} }
        @keyframes barFill { from{width:0} to{width:${phase?.pct ?? 0}%} }
        .dash-bar     { animation: barFill 1s cubic-bezier(.16,1,.3,1) both .3s }
        .dash-layout  { display:grid; grid-template-columns:1fr 300px; gap:14px; align-items:start; }
        .dash-metrics { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
        @media(max-width:1100px) {
          .dash-layout  { grid-template-columns:1fr !important; }
          .dash-right   { display:none !important; }
          .dash-metrics { grid-template-columns:repeat(2,1fr) !important; }
        }
        @media(max-width:640px) {
          .dash-metrics { grid-template-columns:repeat(2,1fr) !important; }
          .workload-grid { grid-template-columns:1fr !important; }
        }
        .proj-row-card { transition:background .12s, border-color .12s; }
        .proj-row-card:hover { background:var(--surface-2) !important; }
        .act-row:hover { background:var(--card) !important; }
      `}</style>

      {/* ── Greeting ── */}
      <div className="animate-fade-up page-header">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ margin:0 }}>{greeting}{displayName ? `, ${displayName}` : ''}.</h1>
            <p style={{ margin:'4px 0 0', color:'var(--text-muted)', fontSize:13 }}>
              {projects.length} Projekt{projects.length!==1?'e':''} · {allTasks.length} Tasks · Phase: {phase?.label ?? '—'}
            </p>
          </div>
          <button onClick={() => setShowNewProject(true)} style={{ height:36, padding:'0 16px', background:'var(--btn-prim)', color:'var(--btn-prim-text)', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            Neues Projekt
          </button>
        </div>
      </div>

      {/* ── Empty state ── */}
      {!main && (
        <div className="animate-fade-up-1" style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:20, padding:'72px 32px', textAlign:'center' }}>
          <p style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'var(--text-muted)', margin:'0 0 16px', opacity:.6 }}>Noch kein Projekt</p>
          <h2 style={{ fontSize:28, fontWeight:800, letterSpacing:'-.6px', lineHeight:1.1, margin:'0 0 12px', color:'var(--text)' }}>Starte dein erstes Projekt.</h2>
          <p style={{ fontSize:14, color:'var(--text-secondary)', maxWidth:340, margin:'0 auto 32px', lineHeight:1.65, fontWeight:500 }}>
            Beschreibe deine Idee — Tagro strukturiert alles in Epics und Tasks.
          </p>
          <button onClick={() => setShowNewProject(true)} className="tap-scale" style={{ padding:'13px 32px', background:'var(--btn-prim)', color:'var(--btn-prim-text)', border:'none', borderRadius:12, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            Neues Projekt erstellen →
          </button>
        </div>
      )}

      {main && phase && (
        <>
          {/* ── Metric cards row ── */}
          <div className="dash-metrics animate-fade-up-1" style={{ marginBottom:14 }}>
            <MetricCard label="Fortschritt" value={`${completePct}%`} sub={phase.label}/>
            <MetricCard label="Offen" value={todo} sub={`${inProgress} in Arbeit`}/>
            <MetricCard label="Erledigt" value={done} sub={`von ${tasks.length} gesamt`}/>
            <MetricCard label="Projekte" value={projects.length} sub={`${allTasks.length} Tasks total`}/>
          </div>

          <div className="dash-layout">
            {/* ══════════ LEFT COLUMN ══════════ */}
            <div style={{ display:'flex', flexDirection:'column', gap:12, minWidth:0 }}>

              {/* ── Main project card ── */}
              <div className="animate-fade-up-1" style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:20, overflow:'hidden', borderLeft: main.color ? `3px solid ${main.color}` : '1px solid var(--border)' }}>
                <div style={{ padding:'18px 24px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16 }}>
                  <div style={{ flex:1, minWidth:0, display:'flex', alignItems:'flex-start', gap:12 }}>
                    <div style={{ width:36, height:36, borderRadius:10, background: main.color ? main.color + '22' : 'var(--surface-2)', border: `1px solid ${main.color ? main.color + '44' : 'var(--border)'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>
                      <span style={{ fontSize:15, fontWeight:700, color: main.color || 'var(--text)' }}>{main.title.charAt(0)}</span>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.1em', textTransform:'uppercase', margin:'0 0 3px' }}>Aktuelles Projekt</p>
                      <h2 style={{ fontSize:18, fontWeight:700, letterSpacing:'-.3px', margin:'0 0 3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{main.title}</h2>
                      {main.description && <p style={{ fontSize:12, color:'var(--text-muted)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{main.description}</p>}
                    </div>
                  </div>
                  <span style={{ height:26, padding:'0 10px', borderRadius:8, fontSize:11, fontWeight:700, flexShrink:0, color:'var(--text-secondary)', background:'var(--surface-2)', border:'1px solid var(--border)', display:'inline-flex', alignItems:'center' }}>
                    {phase.label}
                  </span>
                </div>

                {/* Progress */}
                <div style={{ padding:'16px 24px', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                    <span style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)' }}>Projektfortschritt</span>
                    <span style={{ fontSize:13, fontWeight:700, color:'var(--text-secondary)' }}>{phase.pct}%</span>
                  </div>
                  <div style={{ position:'relative', height:7, background:'var(--surface-2)', borderRadius:7, overflow:'visible', marginBottom:22 }}>
                    <div className="dash-bar" style={{ height:'100%', width:`${phase.pct}%`, background: main.color || 'var(--text)', borderRadius:7, position:'relative', zIndex:1 }}/>
                    {MILESTONES.map(ms => (
                      <div key={ms.label} style={{ position:'absolute', top:'50%', left:`${ms.pct}%`, transform:'translate(-50%,-50%)', width:10, height:10, borderRadius:'50%', background:phase.pct>=ms.pct?(main.color||'var(--text)'):'var(--surface)', border:`2px solid ${phase.pct>=ms.pct?(main.color||'var(--text)'):'var(--border-strong)'}`, zIndex:2, transition:'background .3s' }}/>
                    ))}
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    {MILESTONES.map(ms => (
                      <span key={ms.label} style={{ fontSize:9, fontWeight:700, letterSpacing:'.04em', color:phase.pct>=ms.pct?'var(--text-secondary)':'var(--text-muted)', textTransform:'uppercase' }}>{ms.label}</span>
                    ))}
                  </div>
                </div>

                {/* Task stats */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', borderBottom:'1px solid var(--border)' }}>
                  {[
                    { l:'TASKS',     v:tasks.length },
                    { l:'IN ARBEIT', v:inProgress   },
                    { l:'ERLEDIGT',  v:done          },
                    { l:'OFFEN',     v:todo          },
                  ].map((s,i) => (
                    <div key={i} style={{ padding:'13px 18px', borderRight:i<3?'1px solid var(--border)':'none' }}>
                      <p style={{ fontSize:9, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.1em', margin:'0 0 5px' }}>{s.l}</p>
                      <p style={{ fontSize:22, fontWeight:700, margin:0, color:'var(--text)', lineHeight:1 }}>{s.v}</p>
                    </div>
                  ))}
                </div>

                <div style={{ padding:'13px 24px', display:'flex', gap:8 }}>
                  <Link href={`/project/${main.id}`} style={{ flex:1, textDecoration:'none' }}>
                    <button className="tap-scale" style={{ width:'100%', height:40, background:'var(--btn-prim)', color:'var(--btn-prim-text)', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                      Projekt öffnen
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 6l6 6-6 6"/></svg>
                    </button>
                  </Link>
                  <button onClick={generateReport} disabled={genReport}
                    style={{ height:40, padding:'0 14px', background:'var(--surface-2)', color:'var(--text-secondary)', border:'1px solid var(--border)', borderRadius:10, fontSize:12, fontWeight:700, cursor:genReport?'default':'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                    {genReport ? <span style={{ width:12, height:12, border:'2px solid rgba(128,128,128,.3)', borderTopColor:'currentColor', borderRadius:'50%', animation:'spin .7s linear infinite' }}/> : <span style={{ fontSize:12 }}>✦</span>}
                    {genReport ? 'Lädt…' : 'KI-Bericht'}
                  </button>
                </div>

                {/* AI report inline */}
                {report && (
                  <div style={{ padding:'14px 24px', borderTop:'1px solid var(--border)', background:'var(--surface)', display:'flex', gap:12 }}>
                    <div style={{ width:26, height:26, borderRadius:7, background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <span style={{ fontSize:10, color:'var(--accent-text)', fontWeight:700 }}>✦</span>
                    </div>
                    <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.65, margin:0 }}>{report}</p>
                  </div>
                )}
              </div>

              {/* ── Active tasks ── */}
              {activeTasks.length > 0 && (
                <div className="animate-fade-up-2" style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:20, overflow:'hidden' }}>
                  <div style={{ padding:'13px 24px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', margin:0 }}>Aktive Tasks</p>
                    <Link href={`/project/${main.id}`} style={{ fontSize:12, color:'var(--text-muted)', fontWeight:600, textDecoration:'none' }}>Alle ansehen →</Link>
                  </div>
                  {activeTasks.slice(0, 7).map((t, i, arr) => (
                    <div key={t.id} style={{ padding:'10px 24px', borderBottom:i<arr.length-1?'1px solid var(--border)':'none', display:'flex', alignItems:'center', gap:12 }}>
                      <span style={{ width:6, height:6, borderRadius:'50%', flexShrink:0, background:'var(--border-strong)' }}/>
                      <span style={{ fontSize:13, color:'var(--text)', flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</span>
                      <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                        {t.priority === 'critical' && <span style={{ fontSize:9, fontWeight:700, color:'var(--text-muted)', background:'var(--surface-2)', padding:'2px 6px', borderRadius:4, letterSpacing:'.05em' }}>KRITISCH</span>}
                        <span style={{ fontSize:9, fontWeight:700, color:'var(--text-muted)', background:'var(--surface-2)', padding:'2px 7px', borderRadius:4, letterSpacing:'.04em' }}>
                          {t.status==='doing'?'AKTIV':'OFFEN'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── All projects workload ── */}
              {projects.length > 1 && (
                <div className="animate-fade-up-3" style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:20, overflow:'hidden' }}>
                  <div style={{ padding:'13px 24px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', margin:0 }}>Alle Projekte</p>
                    <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600 }}>{projects.length} Projekte · {allTasks.length} Tasks</span>
                  </div>

                  {/* Mono stacked bar */}
                  <div style={{ padding:'14px 24px 10px', borderBottom:'1px solid var(--border)' }}>
                    <div style={{ display:'flex', height:6, borderRadius:6, overflow:'hidden', background:'var(--surface-2)' }}>
                      {allDone>0   && <div style={{ width:`${allDone/totalAll*100}%`,   background:'var(--text)', transition:'width .6s ease' }}/>}
                      {allActive>0 && <div style={{ width:`${allActive/totalAll*100}%`, background:'var(--text-secondary)', transition:'width .6s ease' }}/>}
                    </div>
                    <div style={{ display:'flex', gap:16, marginTop:8 }}>
                      {[{l:`${allDone} Erledigt`,c:'var(--text)'},{l:`${allActive} Aktiv`,c:'var(--text-secondary)'},{l:`${allTodo2} Offen`,c:'var(--border-strong)'}].map(s => (
                        <span key={s.l} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--text-muted)' }}>
                          <span style={{ width:7, height:7, borderRadius:2, background:s.c, flexShrink:0 }}/>{s.l}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ padding:'8px 12px' }}>
                    {projects.map((proj, i) => {
                      const ph  = PHASE[proj.status] ?? PHASE.intake
                      const pt  = allTasks.filter(t => t.project_id===proj.id)
                      const pd  = pt.filter(t => t.status==='done').length
                      const pct = pt.length ? Math.round(pd/pt.length*100) : ph.pct
                      return (
                        <Link key={proj.id} href={`/project/${proj.id}`} style={{ textDecoration:'none' }}>
                          <div className="proj-row-card" style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:12, cursor:'pointer', background:proj.id===main.id?'var(--surface-2)':'transparent', marginBottom:2 }}>
                            <div style={{ width:30, height:30, borderRadius:8, background: proj.color ? proj.color + '22' : 'var(--surface-2)', border:`1px solid ${proj.color ? proj.color + '44' : 'var(--border)'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                              <span style={{ fontSize:12, fontWeight:700, color: proj.color || 'var(--text-secondary)' }}>{proj.title.charAt(0)}</span>
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <p style={{ fontSize:13, fontWeight:600, color:'var(--text)', margin:'0 0 4px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{proj.title}</p>
                              <div style={{ height:3, background:'var(--surface-2)', borderRadius:4, overflow:'hidden' }}>
                                <div style={{ height:'100%', width:`${pct}%`, background: proj.color || 'var(--text)', borderRadius:4, transition:'width .6s ease' }}/>
                              </div>
                            </div>
                            <div style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3 }}>
                              <span style={{ fontSize:12, fontWeight:700, color:'var(--text)' }}>{pct}%</span>
                              <span style={{ fontSize:9, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.05em' }}>{ph.label.toUpperCase()}</span>
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ══════════ RIGHT SIDEBAR ══════════ */}
            <div className="dash-right animate-fade-up-2" style={{ display:'flex', flexDirection:'column', gap:12 }}>

              {/* ── Donut progress ── */}
              <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:20, overflow:'hidden' }}>
                <div style={{ padding:'13px 18px', borderBottom:'1px solid var(--border)' }}>
                  <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', margin:0 }}>Projektfortschritt</p>
                  <p style={{ fontSize:11, color:'var(--text-muted)', margin:'2px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{main.title}</p>
                </div>
                <div style={{ padding:'18px', display:'flex', alignItems:'center', gap:16 }}>
                  <DonutChart pct={phase.pct}/>
                  <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
                    {MILESTONES.map((ms, i) => {
                      const reached = phase.pct>=ms.pct
                      const isCurr  = phaseIdx===i
                      return (
                        <div key={ms.label} style={{ display:'flex', alignItems:'center', gap:7 }}>
                          <div style={{ width:15, height:15, borderRadius:'50%', flexShrink:0, background:'transparent', border:`1.5px solid ${reached?'var(--text-secondary)':'var(--border)'}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <span style={{ width:4, height:4, borderRadius:'50%', background:reached?'var(--text-secondary)':isCurr?'var(--text-muted)':'var(--border-strong)' }}/>
                          </div>
                          <span style={{ fontSize:11, fontWeight:600, color:reached?'var(--text-secondary)':isCurr?'var(--text)':'var(--text-muted)', flex:1 }}>{ms.label}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* ── Tagro AI Status ── */}
              <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:20, overflow:'hidden' }}>
                <div style={{ padding:'16px 18px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                    <div style={{ width:28, height:28, borderRadius:8, background:'var(--surface-2)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <span style={{ fontSize:12, color:'var(--text-secondary)', fontWeight:700 }}>✦</span>
                    </div>
                    <div>
                      <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', margin:0, lineHeight:1 }}>Tagro Status</p>
                      <p style={{ fontSize:10, color:'var(--text-muted)', margin:'2px 0 0', lineHeight:1 }}>KI-Projektbericht</p>
                    </div>
                  </div>
                  <p style={{ fontSize:12.5, lineHeight:1.65, color:'var(--text-secondary)', margin:'0 0 12px', opacity:report?.8:.4, fontStyle:report?'normal':'italic' }}>
                    {report || 'Tagro analysiert deinen Projektfortschritt und liefert einen klaren Bericht.'}
                  </p>
                  <button onClick={generateReport} disabled={genReport}
                    style={{ width:'100%', padding:'8px', background:'var(--surface-2)', color:'var(--text-secondary)', border:'1px solid var(--border)', borderRadius:9, fontSize:12, fontWeight:700, cursor:genReport?'default':'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                    {genReport ? <><span style={{ width:12, height:12, border:'2px solid var(--border)', borderTopColor:'var(--text)', borderRadius:'50%', animation:'spin .7s linear infinite' }}/> Generiert…</>
                      : <>{report ? '↺ Neu generieren' : '+ Statusbericht'}</>}
                  </button>
                </div>
              </div>

              {/* ── Activity feed ── */}
              {activity.length > 0 && (
                <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:20, overflow:'hidden' }}>
                  <div style={{ padding:'13px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', margin:0 }}>Aktivität</p>
                  </div>
                  <div style={{ padding:'8px 0' }}>
                    {activity.slice(0,8).map((a, i) => (
                      <div key={a.id} className="act-row" style={{ display:'flex', gap:10, padding:'9px 16px', borderRadius:0, transition:'background .1s', cursor:'default' }}>
                        <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--border-strong)', flexShrink:0, marginTop:5 }}/>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ fontSize:12, color:'var(--text-secondary)', margin:0, lineHeight:1.5, overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{a.message}</p>
                          <p style={{ fontSize:10, color:'var(--text-muted)', margin:'2px 0 0' }}>{timeAgo(a.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Quick actions ── */}
              <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:20, overflow:'hidden', padding:'14px 16px' }}>
                <p style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.1em', margin:'0 0 10px', textTransform:'uppercase' }}>Schnellzugriff</p>
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  {[
                    { href:'/onboarding', label:'Neues Projekt starten', icon:'＋' },
                    { href:'/estimator',  label:'Preisschätzer',         icon:'◈' },
                    { href:'/addons',     label:'Add-Ons ansehen',       icon:'⊕' },
                    { href:'/messages',   label:'Nachrichten',           icon:'✉' },
                  ].map(a => (
                    <Link key={a.href} href={a.href} style={{ textDecoration:'none' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 10px', borderRadius:9, border:'1px solid var(--border)', cursor:'pointer', transition:'all .12s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor='var(--border-strong)'; (e.currentTarget as HTMLElement).style.background='var(--surface-2)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor='var(--border)'; (e.currentTarget as HTMLElement).style.background='transparent'; }}>
                        <span style={{ fontSize:13, color:'var(--text-muted)' }}>{a.icon}</span>
                        <span style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)' }}>{a.label}</span>
                        <svg style={{ marginLeft:'auto' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6"/></svg>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* ── Zahlungsplan ── */}
              <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:20, overflow:'hidden' }}>
                <div style={{ padding:'13px 18px', borderBottom:'1px solid var(--border)' }}>
                  <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', margin:0 }}>Zahlungsplan</p>
                  <p style={{ fontSize:11, color:'var(--text-muted)', margin:'2px 0 0' }}>Meilenstein-basiert</p>
                </div>
                <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:7 }}>
                  {MILESTONES.map((ms, i) => {
                    const reached = phase.pct>=ms.pct
                    const isCurr  = phaseIdx===i
                    return (
                      <div key={ms.label}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:3 }}>
                          <span style={{ fontSize:12, fontWeight:600, color:reached?'var(--text-secondary)':isCurr?'var(--text)':'var(--text-muted)' }}>{ms.label}</span>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <span style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)' }}>{ms.payPct}%</span>
                            <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:4, letterSpacing:'.05em', color:'var(--text-muted)', background:'var(--surface-2)', border:'1px solid var(--border)' }}>
                              {reached?'PAID':isCurr?'FÄLLIG':'OFFEN'}
                            </span>
                          </div>
                        </div>
                        <div style={{ height:3, background:'var(--surface-2)', borderRadius:3, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:reached?'100%':isCurr?'50%':'0%', background:'var(--text)', borderRadius:3, transition:'width .8s ease' }}/>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* ── Festag Kontakt ── */}
              <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:20, overflow:'hidden' }}>
                <div style={{ padding:'13px 18px', borderBottom:'1px solid var(--border)' }}>
                  <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', margin:0 }}>Dein Festag Team</p>
                </div>
                <div style={{ padding:'12px 14px', display:'flex', flexDirection:'column', gap:6 }}>
                  <a href="mailto:stefandirnberger@viawen.com" style={{ display:'flex', alignItems:'center', gap:9, textDecoration:'none', padding:'8px 8px', borderRadius:9, transition:'background .1s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='var(--surface-2)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='transparent'}>
                    <div style={{ width:30, height:30, borderRadius:8, background:'var(--surface-2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/></svg>
                    </div>
                    <div><p style={{ fontSize:9, fontWeight:700, color:'var(--text-muted)', margin:0, letterSpacing:'.06em' }}>E-MAIL</p><p style={{ fontSize:12, fontWeight:600, color:'var(--text)', margin:'1px 0 0' }}>stefandirnberger@viawen.com</p></div>
                  </a>
                  <a href="https://wa.me/4989123456" target="_blank" rel="noopener" style={{ display:'flex', alignItems:'center', gap:9, textDecoration:'none', padding:'8px 8px', borderRadius:9, transition:'background .1s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='var(--surface-2)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='transparent'}>
                    <div style={{ width:30, height:30, borderRadius:8, background:'var(--surface-2)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.3h3a2 2 0 0 1 2 1.72c.13.81.37 1.6.7 2.35a2 2 0 0 1-.45 2.11L7.91 9.4a16 16 0 0 0 6.19 6.19l.95-.95a2 2 0 0 1 2.1-.45c.75.33 1.54.57 2.35.7A2 2 0 0 1 22 16.92z"/></svg>
                    </div>
                    <div><p style={{ fontSize:9, fontWeight:700, color:'var(--text-muted)', margin:0, letterSpacing:'.06em' }}>WHATSAPP</p><p style={{ fontSize:12, fontWeight:600, color:'var(--text)', margin:'1px 0 0' }}>+49 089 123 456 78</p></div>
                  </a>
                  <div style={{ padding:'8px 10px', background:'var(--surface-2)', borderRadius:9, border:'1px solid var(--border)' }}>
                    <p style={{ fontSize:10, color:'var(--text-muted)', margin:0, lineHeight:1.5 }}>Antwortzeit &lt; 24h · Mo–Fr 9–18 Uhr</p>
                  </div>
                </div>
              </div>

            </div>{/* end RIGHT */}
          </div>
        </>
      )}

      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreated={(id) => { setShowNewProject(false); window.location.href = `/project/${id}` }}
        />
      )}
    </div>
  )
}
