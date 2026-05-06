'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import LoadingScreen from '@/components/LoadingScreen'
import NewProjectModal from '@/components/NewProjectModal'
import NewTaskModal from '@/components/NewTaskModal'
import ProjectPreview from '@/components/ProjectPreview'

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

function Metric({ label, value, sub }: { label:string; value:string|number; sub:string }) {
  return (
    <div style={{ flex:1, minWidth:0, padding:'2px 4px' }}>
      <p style={{ fontSize:10.5, fontWeight:600, color:'var(--text-muted)', letterSpacing:'.04em', textTransform:'uppercase', margin:'0 0 6px', opacity:.75 }}>{label}</p>
      <p style={{ fontSize:26, fontWeight:600, color:'var(--text)', margin:'0 0 2px', lineHeight:1, letterSpacing:'-.6px' }}>{value}</p>
      <span style={{ fontSize:11, color:'var(--text-muted)' }}>{sub}</span>
    </div>
  )
}

function SectionLabel({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:14 }}>
      <h3 style={{ fontSize:13, fontWeight:600, color:'var(--text)', margin:0, letterSpacing:'-.1px' }}>{children}</h3>
      {action}
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
  const [showNewTask, setShowNewTask] = useState(false)
  const [taskFromReport, setTaskFromReport] = useState(false)
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
    <div className="page-content" style={{ maxWidth:1180 }}>
      <style>{`
        @keyframes spin    { to{transform:rotate(360deg);} }
        @keyframes barFill { from{width:0} to{width:${phase?.pct ?? 0}%} }
        .dash-bar     { animation: barFill 1s cubic-bezier(.16,1,.3,1) both .3s }
        .dash-layout  { display:grid; grid-template-columns:1fr 280px; gap:48px; align-items:start; }
        .dash-metrics { display:grid; grid-template-columns:repeat(4,1fr); gap:0; }
        .dash-metrics > div + div { border-left:1px solid var(--border); padding-left:18px !important; }
        .dash-hero { display:grid; grid-template-columns:260px 1fr; gap:0; min-height:200px; }
        .dash-hero > .hero-info { padding:22px 26px; }
        @media(max-width:1100px) {
          .dash-layout  { grid-template-columns:1fr !important; gap:32px !important; }
          .dash-right   { display:none !important; }
        }
        @media(max-width:760px) {
          .dash-hero { grid-template-columns:1fr !important; }
          .dash-hero > .hero-info { padding:18px 20px !important; }
          .dash-metrics { grid-template-columns:repeat(2,1fr) !important; gap:18px 0 !important; }
          .dash-metrics > div + div { border-left:none !important; padding-left:4px !important; }
          .dash-metrics > div:nth-child(3) { border-top:1px solid var(--border); padding-top:14px !important; }
          .dash-metrics > div:nth-child(4) { border-top:1px solid var(--border); padding-top:14px !important; }
        }
        .row-hover { transition:background .1s ease; cursor:pointer; }
        .row-hover:hover { background:var(--surface-2); }
        .ghost-btn { background:transparent; border:1px solid var(--border); color:var(--text-secondary); border-radius:8px; transition:border-color .12s, color .12s, background .12s; }
        .ghost-btn:hover { border-color:var(--border-strong); color:var(--text); }
      `}</style>

      {/* ── Greeting ── */}
      <div className="animate-fade-up" style={{ marginBottom:36 }}>
        <h1 style={{ margin:0, fontSize:28, fontWeight:600, letterSpacing:'-.7px' }}>{greeting}{displayName ? `, ${displayName}` : ''}</h1>
        <p style={{ margin:'6px 0 0', color:'var(--text-muted)', fontSize:13 }}>
          {projects.length} Projekt{projects.length!==1?'e':''} · {allTasks.length} Tasks{phase ? ` · ${phase.label}` : ''}
        </p>
      </div>

      {/* ── Empty state ── */}
      {!main && (
        <div className="animate-fade-up-1" style={{ borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)', padding:'80px 32px', textAlign:'center' }}>
          <h2 style={{ fontSize:22, fontWeight:600, letterSpacing:'-.4px', lineHeight:1.2, margin:'0 0 10px', color:'var(--text)' }}>Starte dein erstes Projekt</h2>
          <p style={{ fontSize:14, color:'var(--text-muted)', maxWidth:380, margin:'0 auto 28px', lineHeight:1.6 }}>
            Beschreibe deine Idee — Tagro strukturiert alles in Epics und Tasks.
          </p>
          <button onClick={() => setShowNewProject(true)} style={{ padding:'10px 24px', background:'var(--btn-prim)', color:'var(--btn-prim-text)', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            Projekt erstellen →
          </button>
        </div>
      )}

      {main && phase && (
        <div className="dash-layout">
          {/* ══════════ LEFT COLUMN ══════════ */}
          <div style={{ minWidth:0 }}>

            {/* ── HERO: Vercel-Style Production Deployment Karte ── */}
            <div className="animate-fade-up-1 dash-hero" style={{ border:'1px solid var(--border)', borderRadius:14, overflow:'hidden', background:'var(--card)' }}>
              {/* Preview left */}
              <Link href={`/project/${main.id}`} style={{ textDecoration:'none', display:'block', borderRight:'1px solid var(--border)', overflow:'hidden', alignSelf:'stretch' }}>
                <ProjectPreview title={main.title} color={main.color} progress={completePct} width="100%" height="100%"/>
              </Link>

              {/* Info right */}
              <div className="hero-info" style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div>
                  <p style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', margin:'0 0 4px' }}>Aktuelles Projekt</p>
                  <h2 style={{ fontSize:18, fontWeight:600, letterSpacing:'-.3px', margin:'0 0 4px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{main.title}</h2>
                  {main.description && <p style={{ fontSize:13, color:'var(--text-muted)', margin:0, lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{main.description}</p>}
                </div>

                <div style={{ display:'flex', alignItems:'center', gap:7, flexWrap:'wrap' }}>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:12, color:'var(--text-secondary)' }}>
                    <span style={{ width:7, height:7, borderRadius:'50%', background: main.color || 'var(--text-muted)' }}/>
                    {phase.label}
                  </span>
                  <span style={{ color:'var(--text-muted)', fontSize:11 }}>·</span>
                  <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{tasks.length} Tasks</span>
                  <span style={{ color:'var(--text-muted)', fontSize:11 }}>·</span>
                  <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{completePct}% fertig</span>
                </div>

                {/* Inline progress milestones */}
                <div>
                  <div style={{ position:'relative', height:4, background:'var(--surface-2)', borderRadius:4, marginBottom:8 }}>
                    <div className="dash-bar" style={{ height:'100%', width:`${phase.pct}%`, background: main.color || 'var(--text)', borderRadius:4 }}/>
                    {MILESTONES.map(ms => (
                      <div key={ms.label} style={{ position:'absolute', top:'50%', left:`${ms.pct}%`, transform:'translate(-50%,-50%)', width:7, height:7, borderRadius:'50%', background: phase.pct>=ms.pct ? (main.color||'var(--text)') : 'var(--card)', border:`1.5px solid ${phase.pct>=ms.pct?(main.color||'var(--text)'):'var(--border-strong)'}` }}/>
                    ))}
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    {MILESTONES.map(ms => (
                      <span key={ms.label} style={{ fontSize:9.5, fontWeight:500, color: phase.pct>=ms.pct?'var(--text-secondary)':'var(--text-muted)' }}>{ms.label}</span>
                    ))}
                  </div>
                </div>

                <div style={{ display:'flex', gap:6, marginTop:'auto' }}>
                  <Link href={`/project/${main.id}`} style={{ flex:1, textDecoration:'none' }}>
                    <button style={{ width:'100%', height:30, background:'var(--btn-prim)', color:'var(--btn-prim-text)', border:'none', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                      Projekt öffnen →
                    </button>
                  </Link>
                  <button onClick={() => { setTaskFromReport(false); setShowNewTask(true) }} className="ghost-btn"
                    style={{ height:30, padding:'0 12px', fontSize:11.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:5 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                    Task
                  </button>
                </div>
              </div>
            </div>

            {/* ── Inline metrics row ── */}
            <div className="dash-metrics animate-fade-up-1" style={{ marginTop:36, marginBottom:36, paddingTop:22, paddingBottom:22, borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)' }}>
              <Metric label="Fortschritt" value={`${completePct}%`} sub={phase.label}/>
              <Metric label="Offen" value={todo} sub={`${inProgress} in Arbeit`}/>
              <Metric label="Erledigt" value={done} sub={`von ${tasks.length} gesamt`}/>
              <Metric label="Projekte" value={projects.length} sub={`${allTasks.length} Tasks total`}/>
            </div>

            {/* ── STATUSBERICHT — Hauptmarketing-Block ── */}
            <div className="animate-fade-up-2" style={{ marginBottom:36 }}>
              <SectionLabel action={
                <span style={{ fontSize:11.5, color:'var(--text-muted)', fontWeight:500 }}>
                  Verständlich · Auf Deutsch · Echtzeit
                </span>
              }>
                Statusbericht
              </SectionLabel>

              <div style={{ border:'1px solid var(--border)', borderRadius:14, overflow:'hidden', background:'var(--card)' }}>
                {/* Header inside */}
                <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:32, height:32, borderRadius:8, background: main.color ? main.color + '1a' : 'var(--surface-2)', border:`1px solid ${main.color ? main.color + '33' : 'var(--border)'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <span style={{ fontSize:14, color: main.color || 'var(--text-secondary)', fontWeight:700 }}>✦</span>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:13, fontWeight:600, color:'var(--text)', margin:0, letterSpacing:'-.1px' }}>Wo steht dein Projekt?</p>
                    <p style={{ fontSize:11.5, color:'var(--text-muted)', margin:'2px 0 0' }}>
                      Tagro fasst Fortschritt, Blocker und nächste Schritte zusammen — du verstehst sofort, was gerade passiert.
                    </p>
                  </div>
                </div>

                {/* Body — current report or empty */}
                <div style={{ padding:'18px 20px', minHeight: 100 }}>
                  {report ? (
                    <p style={{ fontSize:14, color:'var(--text)', lineHeight:1.7, margin:0, whiteSpace:'pre-wrap' }}>{report}</p>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      <p style={{ fontSize:13.5, color:'var(--text-muted)', margin:0, lineHeight:1.65, fontStyle:'italic' }}>
                        Noch kein Bericht erstellt. Lass Tagro automatisch einen Bericht generieren — oder schreib selbst einen.
                      </p>
                      <div style={{ display:'flex', gap:10, marginTop:6, fontSize:11.5, color:'var(--text-muted)' }}>
                        <span>• Was wurde diese Woche erledigt</span>
                        <span>• Wo gibt's Blocker</span>
                        <span>• Nächste Meilensteine</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action bar */}
                <div style={{ borderTop:'1px solid var(--border)', padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11.5, color:'var(--text-muted)' }}>
                    <span style={{ width:6, height:6, borderRadius:'50%', background: report ? '#22c55e' : 'var(--border-strong)' }}/>
                    {report ? 'Aktueller Bericht erstellt' : 'Kein aktiver Bericht'}
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={generateReport} disabled={genReport} className="ghost-btn"
                      style={{ height:28, padding:'0 11px', fontSize:11.5, fontWeight:600, cursor:genReport?'default':'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:5 }}>
                      {genReport ? <span style={{ width:10, height:10, border:'2px solid rgba(128,128,128,.3)', borderTopColor:'currentColor', borderRadius:'50%', animation:'spin .7s linear infinite' }}/> : <span>✦</span>}
                      {genReport ? 'Tagro denkt' : report ? 'Neu generieren' : 'Mit Tagro generieren'}
                    </button>
                    {report && (
                      <button onClick={() => { setTaskFromReport(true); setShowNewTask(true) }} className="ghost-btn"
                        style={{ height:28, padding:'0 11px', fontSize:11.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:5 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                        Task daraus
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Active tasks ── */}
            {activeTasks.length > 0 && (
              <div className="animate-fade-up-2" style={{ marginBottom:36 }}>
                <SectionLabel action={
                  <Link href={`/project/${main.id}`} style={{ fontSize:12, color:'var(--text-muted)', fontWeight:500, textDecoration:'none' }}>Alle ansehen →</Link>
                }>Aktive Tasks</SectionLabel>
                <div>
                  {activeTasks.slice(0, 7).map((t, i, arr) => (
                    <div key={t.id} className="row-hover" style={{ padding:'11px 12px', borderTop: i===0?'1px solid var(--border)':'none', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
                      <span style={{ width:6, height:6, borderRadius:'50%', flexShrink:0, background: t.status==='doing' ? (main.color || 'var(--text-secondary)') : 'var(--border-strong)' }}/>
                      <span style={{ fontSize:13, color:'var(--text)', flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</span>
                      <span style={{ fontSize:11, fontWeight:500, color:'var(--text-muted)', flexShrink:0 }}>
                        {t.priority === 'critical' ? 'Kritisch · ' : ''}{t.status==='doing'?'Aktiv':'Offen'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── All projects ── */}
            {projects.length > 1 && (
              <div className="animate-fade-up-3" style={{ marginBottom:36 }}>
                <SectionLabel action={
                  <span style={{ fontSize:11.5, color:'var(--text-muted)', fontWeight:500 }}>{projects.length} · {allTasks.length} Tasks</span>
                }>Alle Projekte</SectionLabel>
                <div>
                  {projects.map((proj, i, arr) => {
                    const ph  = PHASE[proj.status] ?? PHASE.intake
                    const pt  = allTasks.filter(t => t.project_id===proj.id)
                    const pd  = pt.filter(t => t.status==='done').length
                    const pct = pt.length ? Math.round(pd/pt.length*100) : ph.pct
                    const pCol = proj.color || 'var(--text-secondary)'
                    return (
                      <Link key={proj.id} href={`/project/${proj.id}`} style={{ textDecoration:'none', color:'inherit' }}>
                        <div className="row-hover" style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 12px', borderTop:i===0?'1px solid var(--border)':'none', borderBottom:'1px solid var(--border)' }}>
                          <span style={{ width:8, height:8, borderRadius:'50%', background:pCol, flexShrink:0 }}/>
                          <span style={{ fontSize:13, fontWeight:500, color:'var(--text)', flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{proj.title}</span>
                          <div style={{ width:120, height:3, background:'var(--surface-2)', borderRadius:2, flexShrink:0, overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${pct}%`, background: pCol }}/>
                          </div>
                          <span style={{ fontSize:12, fontWeight:500, color:'var(--text-muted)', flexShrink:0, width:38, textAlign:'right' }}>{pct}%</span>
                          <span style={{ fontSize:11, fontWeight:500, color:'var(--text-muted)', flexShrink:0, width:80, textAlign:'right' }}>{ph.label}</span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Activity ── */}
            {activity.length > 0 && (
              <div className="animate-fade-up-3" style={{ marginBottom:36 }}>
                <SectionLabel>Aktivität</SectionLabel>
                <div>
                  {activity.slice(0,8).map((a, i) => (
                    <div key={a.id} style={{ padding:'11px 12px', borderTop:i===0?'1px solid var(--border)':'none', borderBottom:'1px solid var(--border)', display:'flex', gap:12 }}>
                      <span style={{ width:5, height:5, borderRadius:'50%', background:'var(--border-strong)', flexShrink:0, marginTop:7 }}/>
                      <p style={{ fontSize:12.5, color:'var(--text-secondary)', margin:0, flex:1, lineHeight:1.5, overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{a.message}</p>
                      <span style={{ fontSize:11, color:'var(--text-muted)', flexShrink:0 }}>{timeAgo(a.created_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ══════════ RIGHT COLUMN ══════════ */}
          <div className="dash-right animate-fade-up-2" style={{ display:'flex', flexDirection:'column', gap:34 }}>

            {/* Donut + milestones */}
            <div>
              <SectionLabel>Fortschritt</SectionLabel>
              <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                <DonutChart pct={phase.pct}/>
                <div style={{ flex:1, display:'flex', flexDirection:'column', gap:7 }}>
                  {MILESTONES.map((ms, i) => {
                    const reached = phase.pct>=ms.pct
                    const isCurr  = phaseIdx===i
                    return (
                      <div key={ms.label} style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ width:5, height:5, borderRadius:'50%', flexShrink:0, background: reached ? (main.color || 'var(--text-secondary)') : isCurr ? 'var(--text-muted)' : 'var(--border-strong)' }}/>
                        <span style={{ fontSize:11.5, fontWeight: isCurr?600:500, color:reached?'var(--text-secondary)':isCurr?'var(--text)':'var(--text-muted)', flex:1 }}>{ms.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div>
              <SectionLabel>Schnellzugriff</SectionLabel>
              <div style={{ display:'flex', flexDirection:'column' }}>
                {[
                  { href:'/onboarding', label:'Neues Projekt mit AI' },
                  { href:'/estimator',  label:'Preisschätzer'  },
                  { href:'/addons',     label:'Add-Ons'         },
                  { href:'/messages',   label:'Nachrichten'     },
                ].map((a: any, i, arr) => {
                  const inner = (
                    <>
                      {a.label}
                      <svg style={{ marginLeft:'auto' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6"/></svg>
                    </>
                  )
                  const sty: any = { textDecoration:'none', display:'flex', alignItems:'center', gap:9, padding:'9px 10px', borderTop:i===0?'1px solid var(--border)':'none', borderBottom:'1px solid var(--border)', color:'var(--text-secondary)', fontSize:12.5, fontWeight:500 }
                  return a.onClick ? (
                    <button key={a.label} onClick={a.onClick} className="row-hover" style={{ ...sty, background:'transparent', border:'none', borderTop:sty.borderTop, borderBottom:sty.borderBottom, cursor:'pointer', fontFamily:'inherit', textAlign:'left', width:'100%' }}>
                      {inner}
                    </button>
                  ) : (
                    <Link key={a.href} href={a.href} className="row-hover" style={sty}>
                      {inner}
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Zahlungsplan */}
            <div>
              <SectionLabel><span>Zahlungsplan <span style={{ color:'var(--text-muted)', fontWeight:400 }}>· Meilensteine</span></span></SectionLabel>
              <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
                {MILESTONES.map((ms, i) => {
                  const reached = phase.pct>=ms.pct
                  const isCurr  = phaseIdx===i
                  return (
                    <div key={ms.label}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                        <span style={{ fontSize:12, fontWeight: isCurr?600:500, color:reached?'var(--text-secondary)':isCurr?'var(--text)':'var(--text-muted)' }}>{ms.label}</span>
                        <span style={{ fontSize:11, color:'var(--text-muted)' }}>
                          {ms.payPct}% · {reached?'bezahlt':isCurr?'fällig':'offen'}
                        </span>
                      </div>
                      <div style={{ height:2, background:'var(--surface-2)', borderRadius:2, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:reached?'100%':isCurr?'50%':'0%', background:reached?(main.color||'var(--text)'):'var(--text-muted)', transition:'width .8s ease' }}/>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Festag Kontakt */}
            <div>
              <SectionLabel>Dein Festag Team</SectionLabel>
              <div style={{ display:'flex', flexDirection:'column' }}>
                <a href="mailto:stefandirnberger@viawen.com" className="row-hover" style={{ textDecoration:'none', color:'var(--text)', display:'flex', flexDirection:'column', padding:'10px 10px', borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)' }}>
                  <span style={{ fontSize:10, fontWeight:600, color:'var(--text-muted)', letterSpacing:'.04em' }}>E-MAIL</span>
                  <span style={{ fontSize:12.5, fontWeight:500, color:'var(--text)', marginTop:2 }}>stefandirnberger@viawen.com</span>
                </a>
                <a href="https://wa.me/4989123456" target="_blank" rel="noopener" className="row-hover" style={{ textDecoration:'none', color:'var(--text)', display:'flex', flexDirection:'column', padding:'10px 10px', borderBottom:'1px solid var(--border)' }}>
                  <span style={{ fontSize:10, fontWeight:600, color:'var(--text-muted)', letterSpacing:'.04em' }}>WHATSAPP</span>
                  <span style={{ fontSize:12.5, fontWeight:500, color:'var(--text)', marginTop:2 }}>+49 089 123 456 78</span>
                </a>
                <p style={{ fontSize:10.5, color:'var(--text-muted)', margin:'10px 0 0', lineHeight:1.5 }}>Antwortzeit &lt; 24h · Mo–Fr 9–18 Uhr</p>
              </div>
            </div>

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
          onClose={() => { setShowNewTask(false); setTaskFromReport(false) }}
          onCreated={() => { setShowNewTask(false); setTaskFromReport(false); window.location.reload() }}
          defaultProjectId={main.id}
          defaultDescription={taskFromReport && report ? report : undefined}
          source={taskFromReport ? 'status_report' : 'manual'}
        />
      )}
    </div>
  )
}
