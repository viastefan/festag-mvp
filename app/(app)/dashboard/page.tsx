'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Project = { id: string; title: string; description: string|null; status: string; created_at: string }

const PHASE_CFG: Record<string, { label: string; pct: number }> = {
  intake:   { label: 'Intake',      pct: 10 },
  planning: { label: 'Planning',    pct: 28 },
  active:   { label: 'Development', pct: 62 },
  testing:  { label: 'Testing',     pct: 85 },
  done:     { label: 'Delivered',   pct: 100 },
}

const SYSTEM_LOGS_TEMPLATES = [
  'AI analysiert Projektstruktur',
  'Tasks werden priorisiert',
  'Developer-Status: aktiv',
  'Fortschritt wird berechnet',
  'AI generiert Tagesbericht',
  'Code-Review läuft',
  'System-Check abgeschlossen',
  'Qualitätskontrolle aktiv',
]

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [mainProject, setMainProject] = useState<Project | null>(null)
  const [taskStats, setTaskStats] = useState({ total: 0, done: 0, doing: 0 })
  const [userEmail, setUserEmail] = useState('')
  const [systemLogs, setSystemLogs] = useState<{ text: string; time: string; id: number }[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      setUserEmail(data.session.user.email ?? '')
      loadData()
    })
  }, [])

  useEffect(() => {
    if (!mainProject) return
    let i = 0
    const push = () => {
      const now = new Date()
      const t = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`
      setSystemLogs(prev => [{ text: SYSTEM_LOGS_TEMPLATES[i % SYSTEM_LOGS_TEMPLATES.length], time: t, id: Date.now() + i }, ...prev].slice(0, 5))
      i++
    }
    push()
    const iv = setInterval(push, 3800)
    return () => clearInterval(iv)
  }, [mainProject])

  async function loadData() {
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
    if (data && data.length > 0) {
      setProjects(data)
      const priority: Record<string, number> = { active: 0, testing: 1, planning: 2, intake: 3, done: 4 }
      const sorted = [...data].sort((a, b) => (priority[a.status] ?? 9) - (priority[b.status] ?? 9))
      const main = sorted[0]
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

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ width: 28, height: 28, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="animate-fade-up" style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
          {new Date().toLocaleDateString('de', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1 style={{ marginBottom: 6 }}>
          {greeting}, {name.charAt(0).toUpperCase() + name.slice(1)}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />
            System arbeitet
          </span>
          <span style={{ color: 'var(--border-strong)' }}>·</span>
          <span>{projects.length} {projects.length === 1 ? 'Projekt' : 'Projekte'}</span>
        </p>
      </div>

      {/* Empty */}
      {!mainProject && (
        <div className="animate-fade-up-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-xl)', padding: '56px 28px', textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--surface-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></svg>
          </div>
          <h2 style={{ marginBottom: 8 }}>Starte dein erstes Projekt</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto 22px' }}>
            Beschreibe deine Idee — Tagro AI analysiert sie, erstellt einen Plan und weist Developer zu.
          </p>
          <Link href="/onboarding">
            <button className="tap-scale" style={{ padding: '12px 24px', background: 'var(--text)', color: '#fff', border: 'none', borderRadius: 'var(--r-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 44 }}>
              Projekt starten
            </button>
          </Link>
        </div>
      )}

      {/* Main project */}
      {mainProject && phaseCfg && (
        <>
          <div className="animate-fade-up-1 grid-cols-2-mobile-1" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginBottom: 16 }}>
            {/* LEFT: Main project card */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
              <div style={{ padding: '22px 24px', borderBottom: '1px solid var(--border)' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 10 }}>
                  AKTUELLES PROJEKT
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <h2 style={{ margin: 0, flex: 1 }}>{mainProject.title}</h2>
                  <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, color: mainProject.status === 'active' ? 'var(--green-dark)' : 'var(--text-secondary)', background: mainProject.status === 'active' ? 'var(--green-bg)' : 'var(--surface-2)', border: `1px solid ${mainProject.status === 'active' ? 'var(--green-border)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, whiteSpace: 'nowrap' }}>
                    {mainProject.status === 'active' && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />}
                    {phaseCfg.label}
                  </span>
                </div>
                {mainProject.description && (
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 6 }}>{mainProject.description}</p>
                )}
              </div>

              {/* Progress bar */}
              <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Fortschritt</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{pct}%</span>
                </div>
                <div style={{ height: 5, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden', marginBottom: 18 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'var(--text)', borderRadius: 4, transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }} />
                </div>

                {/* Phase timeline */}
                <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
                  {['intake','planning','active','testing','done'].map((phaseKey, i) => {
                    const phases = ['intake','planning','active','testing','done']
                    const currentIdx = phases.indexOf(mainProject.status)
                    const isDone = i < currentIdx
                    const isActive = i === currentIdx
                    const labels = ['Intake','Planning','Dev','Testing','Delivery']
                    return (
                      <div key={phaseKey} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: '50%',
                          background: isDone ? 'var(--text)' : isActive ? 'var(--green)' : 'var(--surface-2)',
                          border: isActive ? '3px solid var(--green-bg)' : '1px solid var(--border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: isActive ? '0 0 0 3px rgba(16,185,129,0.15)' : 'none',
                        }}>
                          {isDone && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>}
                        </div>
                        <span style={{ fontSize: 10.5, fontWeight: isActive ? 600 : 500, color: isActive ? 'var(--text)' : isDone ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                          {labels[i]}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Task metrics */}
              <div style={{ padding: '18px 24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {[
                  { label: 'Tasks', value: taskStats.total },
                  { label: 'Aktiv', value: taskStats.doing, color: 'var(--green-dark)' },
                  { label: 'Erledigt', value: taskStats.done },
                  { label: 'ETA', value: '4-6 Wo' },
                ].map(s => (
                  <div key={s.label}>
                    <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 5 }}>{s.label.toUpperCase()}</p>
                    <p style={{ fontSize: 20, fontWeight: 700, color: s.color ?? 'var(--text)', lineHeight: 1 }}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div style={{ padding: '14px 24px', background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
                <Link href={`/project/${mainProject.id}`}>
                  <button className="tap-scale" style={{ width: '100%', padding: '11px', background: 'var(--text)', color: '#fff', border: 'none', borderRadius: 'var(--r-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    Projekt öffnen
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
                  </button>
                </Link>
              </div>
            </div>

            {/* RIGHT: Live System Activity */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>System Activity</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--green-dark)', background: 'var(--green-bg)', padding: '2px 7px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 1.5s infinite' }} />
                  LIVE
                </span>
              </div>
              <div style={{ padding: '10px 0', flex: 1, minHeight: 220 }}>
                {systemLogs.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>System startet…</div>
                ) : systemLogs.map((log, i) => (
                  <div key={log.id} style={{ padding: '7px 18px', display: 'flex', gap: 10, alignItems: 'center', opacity: Math.max(0.35, 1 - i * 0.15), animation: i === 0 ? 'fadeUp 0.3s ease' : 'none' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'SF Mono, Menlo, monospace', flexShrink: 0, width: 36 }}>{log.time}</span>
                    <span style={{ fontSize: 13, color: i === 0 ? 'var(--text)' : 'var(--text-secondary)' }}>{log.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Secondary projects */}
          {projects.length > 1 && (
            <div className="animate-fade-up-2" style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 12 }}>WEITERE PROJEKTE</p>
              <div className="grid-cols-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                {projects.filter(p => p.id !== mainProject.id).map(p => {
                  const pc = PHASE_CFG[p.status] ?? PHASE_CFG.intake
                  return (
                    <Link key={p.id} href={`/project/${p.id}`}>
                      <div className="tap-scale" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', flex: 1, paddingRight: 6 }}>{p.title}</p>
                          <span style={{ padding: '2px 7px', borderRadius: 5, fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--surface-2)', flexShrink: 0 }}>{pc.label}</span>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pc.pct}% abgeschlossen</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Festag Garantie */}
          <div className="animate-fade-up-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', letterSpacing: '0.04em' }}>FESTAG GARANTIE</p>
            </div>
            <div className="grid-cols-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
              {[
                'Strukturierte Umsetzung',
                'AI + Project Owner Kontrolle',
                'Transparente Fortschritte',
                'Kontrollierte Lieferung',
              ].map(g => (
                <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M5 13l4 4L19 7"/></svg>
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
