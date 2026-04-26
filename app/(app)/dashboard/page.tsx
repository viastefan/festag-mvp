'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import LoadingScreen from '@/components/LoadingScreen'
import ThemeToggle from '@/components/ThemeToggle'

type Project = { id: string; title: string; description: string|null; status: string; created_at: string }

const PHASE_CFG: Record<string, { label: string; pct: number }> = {
  intake:   { label: 'Intake',      pct: 10 },
  planning: { label: 'Planning',    pct: 28 },
  active:   { label: 'Development', pct: 62 },
  testing:  { label: 'Testing',     pct: 85 },
  done:     { label: 'Delivered',   pct: 100 },
}

const SYSTEM_LOGS = [
  'AI analysiert Projektstruktur',
  'Tasks werden priorisiert',
  'Developer-Status: aktiv',
  'Fortschritt wird berechnet',
  'AI generiert Tagesbericht',
  'Code-Review läuft',
  'Qualitätskontrolle aktiv',
  'Deployment-Pipeline bereit',
  'System-Health: optimal',
  'Backlog aktualisiert',
]

export default function DashboardPage() {
  const [projects,    setProjects]    = useState<Project[]>([])
  const [mainProject, setMainProject] = useState<Project | null>(null)
  const [taskStats,   setTaskStats]   = useState({ total: 0, done: 0, doing: 0 })
  const [firstName,   setFirstName]   = useState('')
  const [email,       setEmail]       = useState('')
  const [systemLogs,  setSystemLogs]  = useState<{ text: string; time: string; id: number }[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showLoader,  setShowLoader]  = useState(() => {
    if (typeof window === 'undefined') return false
    return !sessionStorage.getItem('festag_dash_loaded')
  })
  const [counter,     setCounter]     = useState(0)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      setEmail(data.session.user.email ?? '')
      // Get first_name for greeting
      const { data: p } = await supabase.from('profiles').select('first_name, full_name').eq('id', data.session.user.id).single()
      if (p) setFirstName(p.first_name ?? p.full_name?.split(' ')[0] ?? '')
      loadData()
    })
  }, [])

  useEffect(() => {
    if (!mainProject) return
    let i = 0
    const push = () => {
      const now = new Date()
      const t = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`
      setSystemLogs(prev => [{ text: SYSTEM_LOGS[i % SYSTEM_LOGS.length], time: t, id: Date.now()+i }, ...prev].slice(0, 7))
      i++
    }
    push()
    const iv = setInterval(push, 3500)
    const cv = setInterval(() => setCounter(c => c + 1), 1500)
    return () => { clearInterval(iv); clearInterval(cv) }
  }, [mainProject])

  async function loadData() {
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
    if (data?.length) {
      setProjects(data)
      const prio: Record<string,number> = { active:0, testing:1, planning:2, intake:3, done:4 }
      const main = [...data].sort((a,b) => (prio[a.status]??9)-(prio[b.status]??9))[0]
      setMainProject(main)
      const { data: tasks } = await supabase.from('tasks').select('status').eq('project_id', main.id)
      setTaskStats({ total: tasks?.length??0, done: tasks?.filter(t=>t.status==='done').length??0, doing: tasks?.filter(t=>t.status==='doing').length??0 })
    }
    setLoading(false)
  }

  const name = firstName || email.split('@')[0].split('.')[0]
  const displayName = name.charAt(0).toUpperCase() + name.slice(1)
  const h = new Date().getHours()
  const greeting = h < 12 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend'
  const phaseCfg = mainProject ? PHASE_CFG[mainProject.status] ?? PHASE_CFG.intake : null
  const pct = phaseCfg?.pct ?? 0

  if (showLoader) return <LoadingScreen onDone={() => {
    if (typeof window !== 'undefined') sessionStorage.setItem('festag_dash_loaded', '1')
    setShowLoader(false)
  }} />
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <div style={{ width:28, height:28, border:'2px solid var(--border)', borderTopColor:'var(--text)', borderRadius:'50%', animation:'spin .8s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ padding:'32px 40px 40px', maxWidth:1200 }}>
      <style>{`
        @keyframes progressFill { from{width:0;}to{width:${pct}%;} }
        @keyframes logSlide { from{opacity:0;transform:translateX(-6px);}to{opacity:1;transform:translateX(0);} }
        .progress-bar { animation: progressFill 1.2s cubic-bezier(.16,1,.3,1) both .3s; }
        .log-new { animation: logSlide .3s ease both; }
        .card-lift { transition: transform .15s, box-shadow .15s; }
        .card-lift:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); }
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
        @media(max-width:768px){.dash-header{flex-direction:column;gap:12px;}.dash-search{width:100%!important;}}
      `}</style>

      {/* ── GREETING (header is now in layout) ── */}
      <div className="animate-fade-up" style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:28, fontWeight:700, letterSpacing:'-.6px', lineHeight:1.15, marginBottom:4, color:'var(--text)' }}>
          {greeting}, {displayName}.
        </h1>
        <p style={{ fontSize:14, color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:8, margin:0 }}>
          <span>{projects.length} {projects.length === 1 ? 'Projekt' : 'Projekte'}</span>
          <span>·</span>
          <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
            <span style={{ width:5, height:5, borderRadius:'50%', background:'var(--green)', animation:'pulse 2s infinite', display:'inline-block' }}/>
            Tagro AI Online
          </span>
        </p>
      </div>

      {/* News banner */}
      <div className="animate-fade-up-1" style={{ background: 'var(--text)', borderRadius: 12, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', right: -20, top: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,.04)' }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--green)', background: 'rgba(16,185,129,.15)', padding: '3px 8px', borderRadius: 5, letterSpacing: '0.08em', flexShrink: 0 }}>NEU</span>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,.9)', flex: 1, margin: 0 }}>
          <strong style={{ color: '#fff' }}>Tagro AI 2.0</strong> — Strukturierte Berichte, Tagesberichte, intelligente Projektplanung
        </p>
        <Link href="/ai" style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', fontWeight: 600, flexShrink: 0 }}>Mehr →</Link>
      </div>

      {/* Empty state */}
      {!mainProject && (
        <div className="animate-fade-up-2" style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius: 20, padding: '56px 24px', textAlign: 'center', boxShadow: '0 8px 30px rgba(0,0,0,.04)' }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--surface-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#181D1C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></svg>
          </div>
          <h2 style={{ marginBottom: 8 }}>Starte dein erstes Projekt</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 380, margin: '0 auto 22px' }}>
            Beschreibe deine Idee — Tagro AI analysiert und strukturiert alles in Sekunden.
          </p>
          <Link href="/onboarding">
            <button className="tap-scale" style={{ padding: '12px 24px', background: 'var(--text)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 16px rgba(15,23,42,.2)' }}>
              Projekt starten
            </button>
          </Link>
        </div>
      )}

      {/* Main project */}
      {mainProject && phaseCfg && (
        <>
          <div className="animate-fade-up-2 grid-cols-2-mobile-1" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, marginBottom: 16 }}>

            {/* Project card */}
            <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,.04)' }}>
              <div style={{ padding: '22px 24px', borderBottom: '1px solid var(--border)' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 10 }}>AKTUELLES PROJEKT</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
                  <h2 style={{ margin: 0, flex: 1 }}>{mainProject.title}</h2>
                  <span style={{ padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, color: mainProject.status === 'active' ? 'var(--green-dark)' : 'var(--text-secondary)', background: mainProject.status === 'active' ? 'var(--green-bg)' : 'var(--surface-2)', border: `1px solid ${mainProject.status === 'active' ? 'var(--green-border)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    {mainProject.status === 'active' && <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />}
                    {phaseCfg.label}
                  </span>
                </div>
                {mainProject.description && <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{mainProject.description}</p>}
              </div>

              <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Fortschritt</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{pct}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}>
                  <div className="progress-bar" style={{ height: '100%', width: `${pct}%`, background: 'var(--text)', borderRadius: 6 }} />
                </div>
                {/* Phase timeline */}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  {['intake','planning','active','testing','done'].map((ph, i) => {
                    const phases = ['intake','planning','active','testing','done']
                    const cur = phases.indexOf(mainProject.status)
                    const isDone = i < cur; const isAct = i === cur
                    return (
                      <div key={ph} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: isDone ? 'var(--text)' : isAct ? 'var(--green)' : 'var(--surface-2)', border: isAct ? '3px solid var(--green-bg)' : '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isAct ? '0 0 0 3px rgba(16,185,129,.12)' : 'none', transition: 'all .3s' }}>
                          {isDone && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>}
                        </div>
                        <span style={{ fontSize: 10, fontWeight: isAct ? 700 : 500, color: isAct ? 'var(--text)' : isDone ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                          {['Intake','Planning','Dev','Testing','Done'][i]}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                {[
                  { l: 'TASKS',    v: taskStats.total,         c: 'var(--text)' },
                  { l: 'AKTIV',    v: taskStats.doing,         c: 'var(--amber)' },
                  { l: 'ERLEDIGT', v: taskStats.done,          c: 'var(--green-dark)' },
                  { l: 'ETA',      v: '4–6 Wo',                c: 'var(--text)' },
                ].map(s => (
                  <div key={s.l}>
                    <p style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 4 }}>{s.l}</p>
                    <p style={{ fontSize: 20, fontWeight: 700, color: s.c, lineHeight: 1, margin: 0 }}>{s.v}</p>
                  </div>
                ))}
              </div>

              <div style={{ padding: '12px 24px', background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
                <Link href={`/project/${mainProject.id}`}>
                  <button className="tap-scale" style={{ width: '100%', padding: '11px', background: 'var(--text)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 2px 8px rgba(15,23,42,.15)' }}>
                    Projekt öffnen
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6"/></svg>
                  </button>
                </Link>
              </div>
            </div>

            {/* Live system activity */}
            <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 20px rgba(0,0,0,.04)' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', margin: 0 }}>System Activity</p>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '2px 0 0', fontFamily: 'monospace' }}>tagro.engine.v2</p>
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--green-dark)', background: 'var(--green-bg)', padding: '3px 8px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid var(--green-border)', letterSpacing: '0.06em' }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 1.5s infinite' }} />LIVE
                </span>
              </div>
              <div style={{ flex: 1, padding: '8px 0', minHeight: 200 }}>
                {systemLogs.map((log, i) => (
                  <div key={log.id} className={i===0?'log-new':''} style={{ padding: '5px 16px', display: 'flex', gap: 10, alignItems: 'center', opacity: Math.max(.2, 1-i*.13), borderBottom: i<systemLogs.length-1?'1px solid var(--surface-2)':'none' }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace', flexShrink: 0, width: 56 }}>{log.time}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      {i===0 && <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 1s infinite' }} />}
                      <span style={{ fontSize: 12, color: i===0?'var(--text)':'var(--text-secondary)' }}>{log.text}</span>
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)' }}>CYCLES:</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }} key={counter}>{counter.toString().padStart(4,'0')}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>OK</span>
              </div>
            </div>
          </div>

          {/* More projects */}
          {projects.length > 1 && (
            <div className="animate-fade-up-3" style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 12 }}>WEITERE PROJEKTE</p>
              <div className="grid-cols-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                {projects.filter(p=>p.id!==mainProject.id).map(p => {
                  const pc = PHASE_CFG[p.status] ?? PHASE_CFG.intake
                  return (
                    <Link key={p.id} href={`/project/${p.id}`}>
                      <div className="card-lift" style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius: 12, padding: '14px 16px', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', flex: 1, paddingRight: 6, margin: 0 }}>{p.title}</p>
                          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--surface-2)', padding: '2px 7px', borderRadius: 5, flexShrink: 0 }}>{pc.label.toUpperCase()}</span>
                        </div>
                        <div style={{ height: 3, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pc.pct}%`, background: 'var(--text)', borderRadius: 3 }} />
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Garantie */}
          <div className="animate-fade-up-4" style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius: 12, padding: '18px 24px', boxShadow: '0 4px 20px rgba(0,0,0,.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', margin: 0, letterSpacing: '0.06em' }}>FESTAG GARANTIE</p>
            </div>
            <div className="grid-cols-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
              {['Strukturierte Umsetzung','AI + Project Owner Kontrolle','Transparente Fortschritte','Kontrollierte Lieferung'].map(g => (
                <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M5 13l4 4L19 7"/></svg>
                  <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{g}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
