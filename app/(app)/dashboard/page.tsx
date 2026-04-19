'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import LoadingScreen from '@/components/LoadingScreen'

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
  const [projects, setProjects] = useState<Project[]>([])
  const [mainProject, setMainProject] = useState<Project | null>(null)
  const [taskStats, setTaskStats] = useState({ total: 0, done: 0, doing: 0 })
  const [userEmail, setUserEmail] = useState('')
  const [systemLogs, setSystemLogs] = useState<{ text: string; time: string; id: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [showLoader, setShowLoader] = useState(true)
  const [pulse, setPulse] = useState(false)
  const [counter, setCounter] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      setUserEmail(data.session.user.email ?? '')
      loadData()
    })
  }, [])

  // Live pulse animation ticker
  useEffect(() => {
    const iv = setInterval(() => {
      setPulse(p => !p)
      setCounter(c => c + 1)
    }, 1500)
    return () => clearInterval(iv)
  }, [])

  // System activity feed
  useEffect(() => {
    if (!mainProject) return
    let i = 0
    const push = () => {
      const now = new Date()
      const t = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`
      setSystemLogs(prev => [
        { text: SYSTEM_LOGS[i % SYSTEM_LOGS.length], time: t, id: Date.now() + i },
        ...prev
      ].slice(0, 7))
      i++
    }
    push()
    const iv = setInterval(push, 3200)
    return () => clearInterval(iv)
  }, [mainProject])

  async function loadData() {
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
    if (data && data.length > 0) {
      setProjects(data)
      const priority: Record<string, number> = { active: 0, testing: 1, planning: 2, intake: 3, done: 4 }
      const main = [...data].sort((a, b) => (priority[a.status] ?? 9) - (priority[b.status] ?? 9))[0]
      setMainProject(main)
      const { data: tasks } = await supabase.from('tasks').select('status').eq('project_id', main.id)
      setTaskStats({
        total: tasks?.length ?? 0,
        done: tasks?.filter(t => t.status === 'done').length ?? 0,
        doing: tasks?.filter(t => t.status === 'doing').length ?? 0,
      })
    }
    setLoading(false)
  }

  const name = userEmail.split('@')[0].split('.')[0]
  const h = new Date().getHours()
  const greeting = h < 12 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend'
  const phaseCfg = mainProject ? PHASE_CFG[mainProject.status] ?? PHASE_CFG.intake : null
  const pct = phaseCfg?.pct ?? 0

  if (showLoader) return <LoadingScreen onDone={() => setShowLoader(false)} />

  return (
    <div>
      <style>{`
        @keyframes progressFill { from { width: 0; } to { width: ${pct}%; } }
        @keyframes countUp { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes logSlide { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes glow { 0%,100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.3); } 50% { box-shadow: 0 0 0 6px rgba(16,185,129,0); } }
        .live-dot { animation: glow 2s infinite; }
        .progress-bar { animation: progressFill 1.2s cubic-bezier(0.16,1,0.3,1) both 0.3s; }
        .stat-num { animation: countUp 0.4s ease both; }
        .log-row { animation: logSlide 0.3s ease both; }
        .card-hover { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .card-hover:hover { transform: translateY(-2px); box-shadow: var(--shadow); }
      `}</style>

      {/* Animated header */}
      <div className="animate-fade-up" style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
          {new Date().toLocaleDateString('de', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1 style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
          {greeting}, {name.charAt(0).toUpperCase() + name.slice(1)}
          {/* Live status chip — animates */}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: 'var(--green-bg)', border: '1px solid var(--green-border)', fontSize: 11, fontWeight: 700, color: 'var(--green-dark)', letterSpacing: '0.04em', transition: 'opacity 0.3s', opacity: pulse ? 1 : 0.7 }}>
            <span className="live-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
            SYSTEM AKTIV
          </span>
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{projects.length} {projects.length === 1 ? 'Projekt' : 'Projekte'}</span>
          <span style={{ color: 'var(--border-strong)' }}>·</span>
          <span>Tagro AI Online</span>
          <span style={{ color: 'var(--border-strong)' }}>·</span>
          <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>
            {new Date().toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </p>
      </div>

      {/* News Banner */}
      <div className="animate-fade-up-1" style={{ background: 'var(--text)', borderRadius: 'var(--r-lg)', padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', right: -30, top: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--green)', background: 'rgba(16,185,129,0.15)', padding: '3px 8px', borderRadius: 5, letterSpacing: '0.08em', flexShrink: 0 }}>NEU</span>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', flex: 1, margin: 0 }}>
          <strong style={{ color: '#fff' }}>Tagro AI 2.0</strong> — Strukturierte Antworten, Tagesberichte, intelligente Task-Generierung
        </p>
        <Link href="/ai" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600, flexShrink: 0 }}>Mehr →</Link>
      </div>

      {/* Empty */}
      {!mainProject && !loading && (
        <div className="animate-fade-up-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-xl)', padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--surface-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, border: '1px solid var(--border)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></svg>
          </div>
          <h2 style={{ marginBottom: 8 }}>Starte dein erstes Projekt</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 380, margin: '0 auto 22px' }}>
            Beschreibe deine Idee — Tagro AI analysiert und strukturiert alles in Sekunden.
          </p>
          <Link href="/onboarding">
            <button className="tap-scale" style={{ padding: '12px 24px', background: 'var(--text)', color: '#fff', border: 'none', borderRadius: 'var(--r-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 44 }}>Projekt starten</button>
          </Link>
        </div>
      )}

      {/* Main project + system */}
      {mainProject && phaseCfg && (
        <>
          <div className="animate-fade-up-2 grid-cols-2-mobile-1" style={{ display: 'grid', gridTemplateColumns: '1fr 310px', gap: 16, marginBottom: 16 }}>
            {/* Main Project Card */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', position: 'relative' }}>
              {/* Top section */}
              <div style={{ padding: '22px 24px', borderBottom: '1px solid var(--border)' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 10 }}>AKTUELLES PROJEKT</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                  <h2 style={{ margin: 0, flex: 1 }}>{mainProject.title}</h2>
                  <span style={{ padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, color: mainProject.status === 'active' ? 'var(--green-dark)' : 'var(--text-secondary)', background: mainProject.status === 'active' ? 'var(--green-bg)' : 'var(--surface-2)', border: `1px solid ${mainProject.status === 'active' ? 'var(--green-border)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    {mainProject.status === 'active' && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />}
                    {phaseCfg.label}
                  </span>
                </div>
                {mainProject.description && (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{mainProject.description}</p>
                )}
              </div>

              {/* Animated progress */}
              <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Gesamtfortschritt</span>
                  <span className="stat-num" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{pct}%</span>
                </div>
                {/* Animated progress bar */}
                <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 6, overflow: 'hidden', marginBottom: 18 }}>
                  <div className="progress-bar" style={{ height: '100%', width: `${pct}%`, background: 'var(--text)', borderRadius: 6 }} />
                </div>
                {/* Phase dots */}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  {['intake','planning','active','testing','done'].map((phase, i) => {
                    const phases = ['intake','planning','active','testing','done']
                    const cur = phases.indexOf(mainProject.status)
                    const isDone = i < cur; const isActive = i === cur
                    const labels = ['Intake','Planning','Dev','Testing','Delivery']
                    return (
                      <div key={phase} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: isDone ? 'var(--text)' : isActive ? 'var(--green)' : 'var(--surface-2)', border: isActive ? '3px solid var(--green-bg)' : '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isActive ? '0 0 0 3px rgba(16,185,129,0.15)' : 'none', transition: 'all 0.3s' }}>
                          {isDone && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>}
                        </div>
                        <span style={{ fontSize: 10.5, fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--text)' : isDone ? 'var(--text-secondary)' : 'var(--text-muted)' }}>{labels[i]}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Animated stats row */}
              <div style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                {[
                  { label: 'TASKS',    value: taskStats.total,                   color: 'var(--text)' },
                  { label: 'AKTIV',    value: taskStats.doing,                   color: '#F59E0B' },
                  { label: 'ERLEDIGT', value: taskStats.done,                    color: 'var(--green-dark)' },
                  { label: 'ETA',      value: '4-6W',                            color: 'var(--text)' },
                ].map((s, i) => (
                  <div key={s.label} className="stat-num" style={{ animationDelay: `${i * 0.08}s` }}>
                    <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 5 }}>{s.label}</p>
                    <p style={{ fontSize: 20, fontWeight: 700, color: s.color, lineHeight: 1, margin: 0 }}>{s.value}</p>
                  </div>
                ))}
              </div>

              <div style={{ padding: '12px 24px', background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
                <Link href={`/project/${mainProject.id}`}>
                  <button className="tap-scale" style={{ width: '100%', padding: '11px', background: 'var(--text)', color: '#fff', border: 'none', borderRadius: 'var(--r-sm)', fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    Projekt öffnen <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6"/></svg>
                  </button>
                </Link>
              </div>
            </div>

            {/* Live System Activity — real logs */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg)' }}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', margin: '0 0 2px' }}>System Activity</p>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0, fontFamily: 'monospace' }}>tagro.engine.v2</p>
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--green-dark)', background: 'var(--green-bg)', padding: '3px 8px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid var(--green-border)', letterSpacing: '0.06em' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 1.5s infinite' }} />
                  LIVE
                </span>
              </div>

              <div style={{ flex: 1, padding: '8px 0', minHeight: 220, overflowY: 'hidden' }}>
                {systemLogs.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                    <div style={{ width: 16, height: 16, border: '2px solid var(--border)', borderTopColor: 'var(--green)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 8px' }} />
                    System startet…
                  </div>
                ) : systemLogs.map((log, i) => (
                  <div key={log.id} className={i === 0 ? 'log-row' : ''} style={{ padding: '5px 16px', display: 'flex', gap: 10, alignItems: 'center', opacity: Math.max(0.2, 1 - i * 0.13), borderBottom: i < systemLogs.length - 1 ? '1px solid var(--surface-2)' : 'none' }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace', flexShrink: 0, width: 56, letterSpacing: '-0.3px' }}>{log.time}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      {i === 0 && <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--green)', flexShrink: 0, animation: 'pulse 1s infinite' }} />}
                      <span style={{ fontSize: 12, color: i === 0 ? 'var(--text)' : 'var(--text-secondary)' }}>{log.text}</span>
                    </span>
                  </div>
                ))}
              </div>

              {/* Animated ticker at bottom */}
              <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)' }}>CYCLES:</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }} key={counter}>{counter.toString().padStart(4, '0')}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>OK</span>
              </div>
            </div>
          </div>

          {/* More projects */}
          {projects.length > 1 && (
            <div className="animate-fade-up-3" style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 12 }}>WEITERE PROJEKTE</p>
              <div className="grid-cols-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10 }}>
                {projects.filter(p => p.id !== mainProject.id).map(p => {
                  const pc = PHASE_CFG[p.status] ?? PHASE_CFG.intake
                  return (
                    <Link key={p.id} href={`/project/${p.id}`}>
                      <div className="card-hover" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '14px 16px', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', flex: 1, paddingRight: 6, margin: 0 }}>{p.title}</p>
                          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--surface-2)', padding: '2px 7px', borderRadius: 5, flexShrink: 0 }}>{pc.label.toUpperCase()}</span>
                        </div>
                        <div style={{ height: 3, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pc.pct}%`, background: 'var(--text)', borderRadius: 3, transition: 'width 0.6s ease' }} />
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Festag Garantie */}
          <div className="animate-fade-up-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '18px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', margin: 0, letterSpacing: '0.06em' }}>FESTAG GARANTIE</p>
            </div>
            <div className="grid-cols-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
              {[
                'Strukturierte Umsetzung',
                'AI + Project Owner Kontrolle',
                'Transparente Fortschritte',
                'Kontrollierte Lieferung',
              ].map(g => (
                <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M5 13l4 4L19 7"/></svg>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{g}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
