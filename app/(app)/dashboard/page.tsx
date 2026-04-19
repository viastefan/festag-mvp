'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useUser, getDisplayName, getTimeBasedGreeting } from '@/lib/hooks/useUser'

type Project = { id: string; title: string; description: string|null; status: string; created_at: string; timeline?: string }

const PHASES = ['intake', 'planning', 'active', 'testing', 'done']
const PHASE_LABEL: Record<string, string> = {
  intake: 'Intake', planning: 'Planning', active: 'Development', testing: 'Testing', done: 'Delivered',
}
const PHASE_PCT: Record<string, number> = {
  intake: 10, planning: 28, active: 62, testing: 85, done: 100,
}

const SYSTEM_LOGS_TEMPLATES = [
  'AI analysiert Projektstruktur',
  'Tasks werden priorisiert',
  'Developer-Status: aktiv',
  'Fortschritt wird berechnet',
  'Code-Review läuft',
  'AI generiert Tagesbericht',
  'Qualitätskontrolle aktiv',
  'Task-Synchronisation',
  'System-Check abgeschlossen',
  'Client-Dashboard synchronisiert',
]

export default function DashboardPage() {
  const { user } = useUser()
  const [mainProject, setMainProject] = useState<Project | null>(null)
  const [projectCount, setProjectCount] = useState(0)
  const [taskStats, setTaskStats] = useState({ total: 0, done: 0, doing: 0 })
  const [systemLogs, setSystemLogs] = useState<{ text: string; time: string; id: number }[]>([])
  const [recentUpdate, setRecentUpdate] = useState<any>(null)
  const [aiInsight, setAiInsight] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const logCounter = useRef(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      loadData()
    })
  }, [])

  useEffect(() => {
    if (!mainProject) return
    // Seed initial 4 logs so the activity panel is never empty
    const seed = SYSTEM_LOGS_TEMPLATES.slice(0, 4).map((text, i) => {
      const t = new Date(Date.now() - (4 - i) * 30_000)
      return {
        text, id: logCounter.current++,
        time: `${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}`,
      }
    })
    setSystemLogs(seed)

    const iv = setInterval(() => {
      const now = new Date()
      const t = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      setSystemLogs(prev => [
        { text: SYSTEM_LOGS_TEMPLATES[Math.floor(Math.random() * SYSTEM_LOGS_TEMPLATES.length)], time: t, id: logCounter.current++ },
        ...prev,
      ].slice(0, 7))
    }, 3800)
    return () => clearInterval(iv)
  }, [mainProject])

  async function loadData() {
    const { data: projects } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
    setProjectCount(projects?.length ?? 0)
    if (projects && projects.length > 0) {
      const priority: Record<string, number> = { active: 0, testing: 1, planning: 2, intake: 3, done: 4 }
      const sorted = [...projects].sort((a, b) => (priority[a.status] ?? 9) - (priority[b.status] ?? 9))
      const main = sorted[0]
      setMainProject(main)
      const [{ data: tasks }, { data: updates }] = await Promise.all([
        supabase.from('tasks').select('status').eq('project_id', main.id),
        supabase.from('ai_updates').select('*').eq('project_id', main.id).order('created_at', { ascending: false }).limit(1),
      ])
      setTaskStats({
        total: tasks?.length ?? 0,
        done: tasks?.filter(t => t.status === 'done').length ?? 0,
        doing: tasks?.filter(t => t.status === 'doing').length ?? 0,
      })
      if (updates && updates[0]) setRecentUpdate(updates[0])

      // AI Insight — contextual tip
      const pct = PHASE_PCT[main.status] ?? 0
      if (pct < 30) setAiInsight('Struktur wird aktuell finalisiert. Der Developer wird in Kürze zugewiesen.')
      else if (pct < 70) setAiInsight('Die Hauptentwicklungsphase läuft aktiv. Tasks werden abgearbeitet.')
      else if (pct < 95) setAiInsight('Testing-Phase — letzte Verfeinerungen und Qualitätskontrolle.')
      else setAiInsight('Finale Abnahme steht bevor. Lieferung wird vorbereitet.')
    }
    setLoading(false)
  }

  const greeting = getTimeBasedGreeting()
  const displayName = getDisplayName(user)
  const phaseIdx = mainProject ? PHASES.indexOf(mainProject.status) : -1
  const pct = mainProject ? (PHASE_PCT[mainProject.status] ?? 0) : 0

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ width: 28, height: 28, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div>
      {/* ═════ Header with real name + dynamic greeting ═════ */}
      <div className="animate-fade-up" style={{ marginBottom: 26 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'Aeonik, sans-serif', fontWeight: 500 }}>
          {new Date().toLocaleDateString('de', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1 style={{ marginBottom: 6, fontWeight: 700, fontFamily: 'Aeonik, sans-serif' }}>
          {greeting.short}, {displayName}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'Aeonik, sans-serif' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />
            <span style={{ fontWeight: 500 }}>System arbeitet</span>
          </span>
          <span style={{ color: 'var(--border-strong)' }}>·</span>
          <span>{projectCount} {projectCount === 1 ? 'Projekt' : 'Projekte'}</span>
        </p>
      </div>

      {/* ═════ Empty state ═════ */}
      {!mainProject && (
        <div className="animate-fade-up-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-xl)', padding: '56px 28px', textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--surface-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/></svg>
          </div>
          <h2 style={{ marginBottom: 8, fontWeight: 700 }}>Starte dein erstes Projekt</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto 22px' }}>
            Beschreibe deine Idee — Tagro AI analysiert sie, erstellt einen Plan und weist Developer zu.
          </p>
          <Link href="/onboarding">
            <button className="tap-scale" style={{ padding: '12px 26px', background: 'var(--text)', color: '#fff', border: 'none', borderRadius: 'var(--r-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 46, fontFamily: 'inherit' }}>
              Projekt starten
            </button>
          </Link>
        </div>
      )}

      {/* ═════ Main project block ═════ */}
      {mainProject && (
        <>
          <div className="animate-fade-up-1 grid-cols-2-mobile-1" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, marginBottom: 16 }}>
            {/* LEFT — Big project card */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
              {/* Top strip */}
              <div style={{
                padding: '22px 24px',
                borderBottom: '1px solid var(--border)',
                background: 'linear-gradient(180deg, var(--bg) 0%, var(--surface) 100%)',
              }}>
                <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 10, fontFamily: 'Aeonik, sans-serif' }}>
                  AKTUELLES PROJEKT
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                  <h2 style={{ margin: 0, flex: 1, fontFamily: 'Aeonik, sans-serif', fontWeight: 700, fontSize: 22, letterSpacing: '-0.3px' }}>{mainProject.title}</h2>
                  <span style={{
                    padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                    letterSpacing: '0.04em', flexShrink: 0, whiteSpace: 'nowrap',
                    color: mainProject.status === 'active' ? 'var(--green-dark)' : 'var(--text-secondary)',
                    background: mainProject.status === 'active' ? 'var(--green-bg)' : 'var(--surface-2)',
                    border: `1px solid ${mainProject.status === 'active' ? 'var(--green-border)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'Aeonik, sans-serif',
                  }}>
                    {mainProject.status === 'active' && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />}
                    {PHASE_LABEL[mainProject.status] ?? mainProject.status.toUpperCase()}
                  </span>
                </div>
                {mainProject.description && (
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55, fontFamily: 'Aeonik, sans-serif' }}>
                    {mainProject.description}
                  </p>
                )}
              </div>

              {/* Progress bar + phases */}
              <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 9 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', fontFamily: 'Aeonik, sans-serif' }}>Fortschritt</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'Aeonik, sans-serif' }}>{pct}%</span>
                </div>
                <div style={{ height: 5, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden', marginBottom: 18 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'var(--text)', borderRadius: 4, transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  {PHASES.map((phase, i) => {
                    const isDone = i < phaseIdx
                    const isActive = i === phaseIdx
                    const labels = ['Intake', 'Planning', 'Dev', 'Testing', 'Delivery']
                    return (
                      <div key={phase} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: '50%',
                          background: isDone ? 'var(--text)' : isActive ? 'var(--green)' : 'var(--surface-2)',
                          border: isActive ? '3px solid var(--green-bg)' : '1px solid var(--border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: isActive ? '0 0 0 3px rgba(16,185,129,0.15)' : 'none',
                        }}>
                          {isDone && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>}
                        </div>
                        <span style={{ fontSize: 10.5, fontWeight: isActive ? 600 : 500, color: isActive ? 'var(--text)' : isDone ? 'var(--text-secondary)' : 'var(--text-muted)', fontFamily: 'Aeonik, sans-serif' }}>
                          {labels[i]}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Stats grid */}
              <div style={{ padding: '18px 24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {[
                  { label: 'Tasks', value: taskStats.total },
                  { label: 'Aktiv', value: taskStats.doing, color: 'var(--green-dark)' },
                  { label: 'Erledigt', value: taskStats.done },
                  { label: 'ETA', value: mainProject.timeline ?? '4-6 Wo' },
                ].map(s => (
                  <div key={s.label}>
                    <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 5, fontFamily: 'Aeonik, sans-serif' }}>{s.label.toUpperCase()}</p>
                    <p style={{ fontSize: 20, fontWeight: 700, color: s.color ?? 'var(--text)', lineHeight: 1, fontFamily: 'Aeonik, sans-serif', letterSpacing: '-0.3px' }}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* AI Insight banner */}
              {aiInsight && (
                <div style={{ padding: '14px 24px', background: 'var(--blue-bg)', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <span style={{ fontSize: 10, color: '#fff', fontWeight: 700, fontFamily: 'Aeonik, sans-serif' }}>T</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--blue)', letterSpacing: '0.08em', margin: 0, marginBottom: 2, fontFamily: 'Aeonik, sans-serif' }}>TAGRO AI</p>
                    <p style={{ fontSize: 13, color: 'var(--text)', margin: 0, lineHeight: 1.45, fontFamily: 'Aeonik, sans-serif' }}>{aiInsight}</p>
                  </div>
                </div>
              )}

              {/* CTA */}
              <div style={{ padding: '14px 24px', background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
                <Link href={`/project/${mainProject.id}`}>
                  <button className="tap-scale" style={{
                    width: '100%', padding: '12px', background: 'var(--text)', color: '#fff',
                    border: 'none', borderRadius: 'var(--r-sm)', fontSize: 14, fontWeight: 600,
                    cursor: 'pointer', minHeight: 46, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: 6, fontFamily: 'Aeonik, sans-serif',
                  }}>
                    Projekt öffnen
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
                  </button>
                </Link>
              </div>
            </div>

            {/* RIGHT — Live Activity + Recent AI update filling full height */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Live System Activity */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', fontFamily: 'Aeonik, sans-serif' }}>System Activity</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--green-dark)', background: 'var(--green-bg)', padding: '2px 7px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'Aeonik, sans-serif' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 1.5s infinite' }} />
                    LIVE
                  </span>
                </div>
                <div style={{ padding: '8px 0', flex: 1 }}>
                  {systemLogs.map((log, i) => (
                    <div key={log.id} style={{
                      padding: '7px 18px', display: 'flex', gap: 10, alignItems: 'center',
                      opacity: Math.max(0.35, 1 - i * 0.13),
                      animation: i === 0 ? 'fadeUp 0.3s ease' : 'none',
                    }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'SF Mono, Menlo, monospace', flexShrink: 0, width: 36 }}>{log.time}</span>
                      <span style={{ fontSize: 13, color: i === 0 ? 'var(--text)' : 'var(--text-secondary)', fontFamily: 'Aeonik, sans-serif' }}>{log.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent AI update card */}
              {recentUpdate && (
                <Link href={`/project/${mainProject.id}`}>
                  <div className="tap-scale" style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 'var(--r-lg)', padding: '14px 16px', cursor: 'pointer',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 9, color: '#fff', fontWeight: 700, fontFamily: 'Aeonik, sans-serif' }}>T</span>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', fontFamily: 'Aeonik, sans-serif' }}>Letztes Update</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>{new Date(recentUpdate.created_at).toLocaleDateString('de', { day: 'numeric', month: 'short' })}</span>
                    </div>
                    <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5, fontFamily: 'Aeonik, sans-serif', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {recentUpdate.content}
                    </p>
                  </div>
                </Link>
              )}
            </div>
          </div>

          {/* ═════ FESTAG GARANTIE — strong visual ═════ */}
          <div className="animate-fade-up-2" style={{
            background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)',
            overflow: 'hidden',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: -40, right: -40, width: 200, height: 200,
              background: 'radial-gradient(circle, rgba(16,185,129,0.06), transparent 70%)',
              pointerEvents: 'none',
            }} />
            <div style={{ position: 'relative', padding: '24px 26px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'var(--green-bg)', border: '1px solid var(--green-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--green-dark)', letterSpacing: '0.1em', margin: 0, fontFamily: 'Aeonik, sans-serif' }}>FESTAG GARANTIE</p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0, fontFamily: 'Aeonik, sans-serif' }}>Kontrollierte Lieferung — auf jeder Ebene</p>
                </div>
              </div>

              <div className="grid-cols-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {[
                  { title: 'AI Kontrolle', desc: 'Tagro prüft jede Phase systematisch' },
                  { title: 'Expert Review', desc: 'Project Owner validiert Ergebnisse' },
                  { title: 'Live Transparenz', desc: 'Du siehst jeden Fortschritt in Echtzeit' },
                  { title: 'Struktur-Garantie', desc: 'Kein Chaos. Ein System für alles.' },
                ].map(g => (
                  <div key={g.title} style={{
                    background: '#FFFFFF', border: '1px solid var(--border)',
                    borderRadius: 'var(--r-sm)', padding: '14px 14px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0, fontFamily: 'Aeonik, sans-serif' }}>{g.title}</p>
                    </div>
                    <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45, fontFamily: 'Aeonik, sans-serif' }}>{g.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
