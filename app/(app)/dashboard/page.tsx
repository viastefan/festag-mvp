'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import LoadingScreen from '@/components/LoadingScreen'

type Project = { id: string; title: string; description: string|null; status: string; created_at: string }

const PHASE_CFG: Record<string, { label: string; color: string; bg: string; dot: string; pct: number }> = {
  intake:   { label: 'INTAKE',       color: '#92400E', bg: '#FEF3C7', dot: '#F59E0B', pct: 10 },
  planning: { label: 'PLANNING',     color: '#1E40AF', bg: '#DBEAFE', dot: '#3B82F6', pct: 25 },
  active:   { label: 'DEVELOPMENT',  color: '#065F46', bg: '#D1FAE5', dot: '#10B981', pct: 60 },
  testing:  { label: 'TESTING',      color: '#6D28D9', bg: '#EDE9FE', dot: '#7C3AED', pct: 85 },
  done:     { label: 'DELIVERED',    color: '#374151', bg: '#F3F4F6', dot: '#9CA3AF', pct: 100 },
}

const SYSTEM_LOGS_TEMPLATES = [
  'AI analysiert Projektstruktur',
  'Tasks werden priorisiert',
  'Developer-Status: aktiv',
  'Fortschritt wird berechnet',
  'Code-Review läuft',
  'AI generiert Tagesbericht',
  'System-Check abgeschlossen',
  'Qualitätskontrolle aktiv',
]

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [showLoader, setShowLoader] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [mainProject, setMainProject] = useState<Project | null>(null)
  const [taskStats, setTaskStats] = useState({ total: 0, done: 0, doing: 0 })
  const [userEmail, setUserEmail] = useState('')
  const [systemLogs, setSystemLogs] = useState<{ text: string; time: string; id: number }[]>([])
  const [showEmpty, setShowEmpty] = useState(false)
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
    const iv = setInterval(() => {
      const now = new Date()
      const t = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`
      setSystemLogs(prev => [{ text: SYSTEM_LOGS_TEMPLATES[i % SYSTEM_LOGS_TEMPLATES.length], time: t, id: Date.now() }, ...prev].slice(0, 6))
      i++
    }, 3500)
    return () => clearInterval(iv)
  }, [mainProject])

  async function loadData() {
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
    if (data) {
      setProjects(data)
      if (data.length > 0) {
        // Pick the most active one (active > planning > intake > done)
        const priority: Record<string, number> = { active: 0, planning: 1, intake: 2, testing: 3, done: 4 }
        const sorted = [...data].sort((a, b) => (priority[a.status] ?? 9) - (priority[b.status] ?? 9))
        const main = sorted[0]
        setMainProject(main)
        const { data: tasks } = await supabase.from('tasks').select('status').eq('project_id', main.id)
        setTaskStats({
          total: tasks?.length ?? 0,
          done: tasks?.filter(t => t.status === 'done').length ?? 0,
          doing: tasks?.filter(t => t.status === 'doing').length ?? 0,
        })
      } else {
        setShowEmpty(true)
      }
    }
    setLoading(false)
  }

  const name = userEmail.split('@')[0]
  const h = new Date().getHours()
  const greeting = h < 12 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend'
  const pct = mainProject ? (PHASE_CFG[mainProject.status]?.pct ?? 0) : 0
  const phaseCfg = mainProject ? PHASE_CFG[mainProject.status] ?? PHASE_CFG.intake : null

  if (showLoader) return <LoadingScreen onDone={() => setShowLoader(false)} />

  return (
    <div>
      {/* News Banner */}
      <div className="animate-fade-up" style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)', borderRadius: 'var(--radius-lg)', padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: 'rgba(255,255,255,0.2)', padding: '3px 8px', borderRadius: 5, letterSpacing: '0.08em' }}>NEW</span>
        <p style={{ fontSize: 13, color: '#fff', flex: 1, margin: 0 }}>
          <strong>Tagro AI 2.0</strong> ist jetzt live · Strukturierte Antworten, Tagesberichte, intelligente Task-Generierung
        </p>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>→</span>
      </div>

      {/* Header */}
      <div className="animate-fade-up-1" style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 4 }}>
          {greeting}, {name.charAt(0).toUpperCase() + name.slice(1)}.
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            System arbeitet
          </span>
          <span>·</span>
          <span>{projects.length} {projects.length === 1 ? 'Projekt' : 'Projekte'}</span>
          <span>·</span>
          <span>Letztes Update vor 2 Min.</span>
        </p>
      </div>

      {/* Empty state */}
      {!mainProject && showEmpty && (
        <div className="animate-fade-up-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '60px 32px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #007AFF, #5856D6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#fff', margin: '0 auto 20px' }}>✦</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.3px', marginBottom: 8 }}>Das System wartet auf deinen Input</h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24, maxWidth: 440, margin: '0 auto 24px' }}>
            Beschreibe dein Projekt — Tagro AI analysiert, strukturiert und weist Developer zu.
          </p>
          <Link href="/onboarding">
            <button style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #007AFF, #5856D6)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Projekt starten →
            </button>
          </Link>
        </div>
      )}

      {/* Main Project Panel */}
      {mainProject && (
        <>
          <div className="animate-fade-up-2" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, marginBottom: 20 }} >
            {/* LEFT: Main project */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
              {/* Top */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 8 }}>AKTUELLES PROJEKT</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.3px', lineHeight: 1.2, flex: 1 }}>{mainProject.title}</h2>
                  {phaseCfg && (
                    <span style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: phaseCfg.color, background: phaseCfg.bg, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: phaseCfg.dot, display: 'inline-block', animation: mainProject.status === 'active' ? 'pulse 2s infinite' : 'none' }} />
                      {phaseCfg.label}
                    </span>
                  )}
                </div>
                {mainProject.description && (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>{mainProject.description}</p>
                )}
              </div>

              {/* Phase progress bar */}
              <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Gesamtfortschritt</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{pct}%</span>
                </div>
                <div style={{ height: 5, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden', marginBottom: 14 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #007AFF, #5856D6)', borderRadius: 4, transition: 'width 0.8s ease' }} />
                </div>
                {/* Phase timeline */}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  {['Intake','Planning','Development','Testing','Delivery'].map((p, i) => {
                    const phases = ['intake','planning','active','testing','done']
                    const currentIdx = phases.indexOf(mainProject.status)
                    const isDone = i < currentIdx
                    const isActive = i === currentIdx
                    return (
                      <div key={p} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flex: 1 }}>
                        <div style={{
                          width: 16, height: 16, borderRadius: '50%',
                          background: isDone ? '#10B981' : isActive ? 'var(--accent)' : 'var(--surface2)',
                          border: isActive ? '2px solid #DBEAFE' : 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', fontWeight: 700,
                        }}>
                          {isDone ? '✓' : ''}
                        </div>
                        <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--accent)' : isDone ? 'var(--text-secondary)' : 'var(--text-muted)' }}>{p}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Task stats */}
              <div style={{ padding: '18px 24px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                {[
                  { label: 'Tasks', value: taskStats.total, color: 'var(--accent)' },
                  { label: 'Aktiv', value: taskStats.doing, color: '#F59E0B' },
                  { label: 'Erledigt', value: taskStats.done, color: '#10B981' },
                  { label: 'ETA', value: '4-6 Wo', color: '#7C3AED' },
                ].map(s => (
                  <div key={s.label}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 4 }}>{s.label.toUpperCase()}</p>
                    <p style={{ fontSize: 20, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div style={{ padding: '16px 24px', background: 'var(--surface2)', borderTop: '1px solid var(--border)' }}>
                <Link href={`/project/${mainProject.id}`}>
                  <button style={{ width: '100%', padding: '11px', background: 'linear-gradient(135deg, #007AFF, #5856D6)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Projekt öffnen →
                  </button>
                </Link>
              </div>
            </div>

            {/* RIGHT: Live System Activity */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em' }}>SYSTEM ACTIVITY</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#10B981', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981', animation: 'pulse 1.5s infinite' }} />LIVE
                </span>
              </div>
              <div style={{ padding: '10px 0', minHeight: 200, maxHeight: 280, overflowY: 'hidden' }}>
                {systemLogs.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>System startet…</div>
                ) : systemLogs.map((log, i) => (
                  <div key={log.id} style={{ padding: '5px 16px', display: 'flex', gap: 8, alignItems: 'center', opacity: Math.max(0.3, 1 - i * 0.15), animation: i === 0 ? 'fadeUp 0.3s ease' : 'none' }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace', flexShrink: 0 }}>{log.time}</span>
                    <span style={{ fontSize: 12, color: i === 0 ? 'var(--text-secondary)' : 'var(--text-muted)' }}>{log.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Other projects (if any) */}
          {projects.length > 1 && (
            <div className="animate-fade-up-3" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 12 }}>WEITERE PROJEKTE</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 10 }}>
                {projects.filter(p => p.id !== mainProject.id).map(p => {
                  const pc = PHASE_CFG[p.status] ?? PHASE_CFG.intake
                  return (
                    <Link key={p.id} href={`/project/${p.id}`}>
                      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border2)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, flex: 1, paddingRight: 6 }}>{p.title}</p>
                          <span style={{ padding: '2px 7px', borderRadius: 5, fontSize: 10, fontWeight: 700, color: pc.color, background: pc.bg, flexShrink: 0 }}>{pc.label}</span>
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--accent)' }}>✦ AI aktiv</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Festag Garantie */}
      {mainProject && (
        <div className="animate-fade-up-3" style={{ background: 'linear-gradient(135deg, #F0FDF4, #ECFDF5)', border: '1px solid #BBF7D0', borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#059669', letterSpacing: '0.1em', marginBottom: 10 }}>✓ FESTAG GARANTIE</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 }}>
            {[
              '100% strukturierte Umsetzung',
              'AI + Project Owner Kontrolle',
              'Transparente Fortschritte',
              'Klare Lieferung',
            ].map(g => (
              <div key={g} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ color: '#059669', fontSize: 11 }}>✓</span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{g}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
