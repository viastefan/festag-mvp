'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import LoadingScreen from '@/components/LoadingScreen'
import NewProjectModal from '@/components/NewProjectModal'
import NewTaskModal from '@/components/NewTaskModal'

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
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <div style={{ width:20, height:20, border:'1.5px solid var(--border)', borderTopColor:'var(--text)', borderRadius:'50%', animation:'spin .8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
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
    <div className="page-content" style={{ maxWidth: undefined }}>
      <style>{`
        @keyframes spin    { to{transform:rotate(360deg);} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;} }
        .dash-row { display:flex; align-items:center; gap:0; border-bottom:1px solid var(--border); }
        .dash-row:first-child { border-top:1px solid var(--border); }
        .dash-row:hover { background:var(--surface-2); }
        .dash-col-name { flex:1; min-width:0; padding:10px 12px; }
        .dash-col-stat { padding:10px 14px; font-size:12px; color:var(--text-muted); font-weight:500; white-space:nowrap; }
        .dash-col-bar  { padding:10px 14px; width:120px; }
        .dash-section  { margin-bottom:40px; }
        .dash-label    { font-size:11px; font-weight:600; color:var(--text-muted); letter-spacing:.06em; text-transform:uppercase; margin:0 0 14px; }
        .stat-item { display:flex; flex-direction:column; gap:3px; }
        .stat-value { font-size:22px; font-weight:600; color:var(--text); letter-spacing:-.5px; line-height:1; }
        .stat-sub { font-size:11px; color:var(--text-muted); font-weight:500; }
        .task-row { display:flex; align-items:center; gap:10px; padding:9px 0; border-bottom:1px solid var(--border); }
        .task-row:first-child { border-top:1px solid var(--border); }
        .quick-link { display:flex; align-items:center; justify-content:space-between; padding:9px 0; border-bottom:1px solid var(--border); text-decoration:none; color:var(--text-secondary); font-size:13px; font-weight:500; transition:color .1s; }
        .quick-link:first-child { border-top:1px solid var(--border); }
        .quick-link:hover { color:var(--text); }
      `}</style>

      {/* ── Greeting ── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:40, animation:'fadeUp .25s both' }}>
        <div>
          <h1 style={{ margin:0, fontSize:24, fontWeight:600, letterSpacing:'-.6px', color:'var(--text)' }}>
            {greeting}{displayName ? `, ${displayName}` : ''}
          </h1>
          <p style={{ margin:'5px 0 0', fontSize:12.5, color:'var(--text-muted)', fontWeight:400 }}>
            {projects.length} Projekt{projects.length!==1?'e':''} · {allTasks.length} Tasks
          </p>
        </div>
        <button
          onClick={() => setShowNewProject(true)}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, fontSize:12.5, fontWeight:600, color:'var(--text)', cursor:'pointer', fontFamily:'inherit', flexShrink:0, transition:'border-color .12s, background .12s' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor='var(--border-strong)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor='var(--border)'}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          Neues Projekt
        </button>
      </div>

      {/* ── Empty ── */}
      {!main && (
        <div style={{ padding:'80px 0', textAlign:'center', borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)', animation:'fadeUp .3s both' }}>
          <p style={{ fontSize:14, fontWeight:600, color:'var(--text)', margin:'0 0 6px' }}>Noch kein Projekt</p>
          <p style={{ fontSize:12.5, color:'var(--text-muted)', maxWidth:320, margin:'0 auto 24px', lineHeight:1.6 }}>
            Erstelle dein erstes Projekt und lass Tagro die Struktur automatisch aufbauen.
          </p>
          <button onClick={() => setShowNewProject(true)} style={{ padding:'9px 20px', background:'var(--btn-prim)', color:'var(--btn-prim-text)', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            Projekt erstellen
          </button>
        </div>
      )}

      {main && phase && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 260px', gap:40, alignItems:'start' }}>

          {/* ══ LEFT ══ */}
          <div>

            {/* ── Active project card ── */}
            <div className="dash-section" style={{ animation:'fadeUp .25s .05s both' }}>
              <p className="dash-label">Aktuelles Projekt</p>
              <div style={{ border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', background:'var(--surface)' }}>
                {/* Top row */}
                <div style={{ display:'flex', alignItems:'flex-start', gap:14, padding:'18px 20px', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                      <span style={{ width:7, height:7, borderRadius:'50%', border:`2px solid ${projColor || 'var(--border-strong)'}`, background:'transparent', flexShrink:0, boxSizing:'border-box' }}/>
                      <Link href={`/project/${main.id}`} style={{ textDecoration:'none' }}>
                        <h2 style={{ fontSize:15, fontWeight:600, letterSpacing:'-.2px', margin:0, color:'var(--text)' }}>{main.title}</h2>
                      </Link>
                      <span style={{ flexShrink:0, fontSize:10.5, fontWeight:600, color:'var(--text-muted)', background:'var(--surface-2)', border:'1px solid var(--border)', padding:'1px 7px', borderRadius:5, letterSpacing:'.02em' }}>
                        {phase.label}
                      </span>
                    </div>
                    {main.description && (
                      <p style={{ margin:0, fontSize:12.5, color:'var(--text-secondary)', lineHeight:1.55, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                        {main.description}
                      </p>
                    )}
                  </div>
                  <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                    <Link href={`/project/${main.id}`} style={{ padding:'6px 13px', background:'var(--btn-prim)', color:'var(--btn-prim-text)', borderRadius:7, fontSize:12, fontWeight:600, textDecoration:'none', display:'inline-block', transition:'opacity .1s' }}>
                      Öffnen
                    </Link>
                    <button onClick={() => setShowNewTask(true)}
                      style={{ padding:'6px 11px', background:'transparent', border:'1px solid var(--border)', borderRadius:7, fontSize:12, fontWeight:600, color:'var(--text-secondary)', cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:5, transition:'border-color .1s, color .1s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor='var(--border-strong)'; (e.currentTarget as HTMLElement).style.color='var(--text)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor='var(--border)'; (e.currentTarget as HTMLElement).style.color='var(--text-secondary)' }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                      Task
                    </button>
                  </div>
                </div>

                {/* Progress strip */}
                <div style={{ padding:'14px 20px' }}>
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
                  <div style={{ position:'relative', height:3, background:'var(--surface-2)', borderRadius:3, marginBottom:8 }}>
                    <div style={{ height:'100%', width:`${phase.pct}%`, background: projColor || 'var(--text-secondary)', borderRadius:3, transition:'width 1s cubic-bezier(.16,1,.3,1)' }}/>
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
              <div className="dash-section" style={{ animation:'fadeUp .25s .1s both' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                  <p className="dash-label" style={{ margin:0 }}>Projekte</p>
                  <button onClick={() => setShowNewProject(true)} style={{ background:'transparent', border:'none', cursor:'pointer', fontSize:11.5, fontWeight:600, color:'var(--text-muted)', fontFamily:'inherit', padding:0, display:'flex', alignItems:'center', gap:4 }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color='var(--text)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color='var(--text-muted)'}
                  >
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
                            <div style={{ height:2, background:'var(--surface-2)', borderRadius:2, overflow:'hidden' }}>
                              <div style={{ height:'100%', width:`${pct}%`, background: col || 'var(--text-muted)', borderRadius:2, transition:'width .6s ease' }}/>
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
              <div className="dash-section" style={{ animation:'fadeUp .25s .15s both' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                  <p className="dash-label" style={{ margin:0 }}>Aktive Tasks</p>
                  <Link href={`/project/${main.id}`} style={{ fontSize:11.5, color:'var(--text-muted)', fontWeight:600, textDecoration:'none' }}
                    onMouseEnter={(e:any) => e.currentTarget.style.color='var(--text)'}
                    onMouseLeave={(e:any) => e.currentTarget.style.color='var(--text-muted)'}
                  >Alle →</Link>
                </div>
                {activeTasks.slice(0, 8).map((t, i, arr) => (
                  <div key={t.id} className="task-row" style={{ borderTop: i===0?'1px solid var(--border)':'none' }}>
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
            <div className="dash-section" style={{ animation:'fadeUp .25s .2s both' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                <p className="dash-label" style={{ margin:0 }}>Statusbericht</p>
                <button onClick={generateReport} disabled={genReport}
                  style={{ background:'transparent', border:'none', cursor:genReport?'default':'pointer', fontSize:11.5, fontWeight:600, color:'var(--text-muted)', fontFamily:'inherit', padding:0, display:'flex', alignItems:'center', gap:4 }}
                  onMouseEnter={e => { if (!genReport) (e.currentTarget as HTMLElement).style.color='var(--text)' }}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color='var(--text-muted)'}
                >
                  {genReport ? <span style={{ width:10, height:10, border:'1.5px solid transparent', borderTopColor:'currentColor', borderRadius:'50%', animation:'spin .7s linear infinite', display:'inline-block' }}/> : <span style={{ fontSize:11 }}>✦</span>}
                  {genReport ? 'Lädt…' : report ? 'Neu' : 'Mit Tagro generieren'}
                </button>
              </div>
              <div style={{ padding:'16px 18px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10 }}>
                {report ? (
                  <p style={{ fontSize:13, color:'var(--text)', lineHeight:1.7, margin:0, whiteSpace:'pre-wrap' }}>{report}</p>
                ) : (
                  <p style={{ fontSize:12.5, color:'var(--text-muted)', margin:0, fontStyle:'italic', lineHeight:1.65 }}>
                    Kein Bericht — Tagro fasst Fortschritt, Blocker und nächste Schritte automatisch zusammen.
                  </p>
                )}
              </div>
            </div>

          </div>{/* end LEFT */}

          {/* ══ RIGHT ══ */}
          <div style={{ display:'flex', flexDirection:'column', gap:32, animation:'fadeUp .25s .1s both' }}>

            {/* Stats */}
            <div>
              <p className="dash-label">Übersicht</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                {[
                  { label:'Fortschritt', value:`${completePct}%`, sub: phase.label },
                  { label:'Offen',       value: todo,              sub:`${inProgress} aktiv` },
                  { label:'Erledigt',    value: done,              sub:`von ${tasks.length}` },
                  { label:'Projekte',    value: projects.length,   sub:`${allTasks.length} Tasks` },
                ].map(s => (
                  <div key={s.label} className="stat-item" style={{ padding:'12px 14px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10 }}>
                    <span className="stat-value">{s.value}</span>
                    <span style={{ fontSize:10, fontWeight:600, color:'var(--text-muted)', letterSpacing:'.04em', textTransform:'uppercase', marginTop:1 }}>{s.label}</span>
                    <span className="stat-sub">{s.sub}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Schnellzugriff */}
            <div>
              <p className="dash-label">Schnellzugriff</p>
              {[
                { href:'/onboarding', label:'Neues Projekt mit AI' },
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
                  {activity.slice(0, 6).map((a, i) => (
                    <div key={a.id} style={{ display:'flex', gap:10, padding:'8px 0', borderTop: i===0?'1px solid var(--border)':'none', borderBottom:'1px solid var(--border)' }}>
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
