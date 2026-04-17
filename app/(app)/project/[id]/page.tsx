'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import Link from 'next/link'

type Project = { id: string; title: string; description: string | null; status: string }
type Task = { id: string; title: string; status: string }
type Message = { id: string; message: string; created_at: string; sender_id: string; sender_email?: string; is_ai?: boolean }
type AIUpdate = { id: string; content: string; type: string; created_at: string }
type DailyReport = { id: string; summary: string; hours_worked: number; blockers: string | null; created_at: string }

const PHASES = ['intake','planning','active','testing','done']
const PHASE_LABELS: Record<string,string> = {
  intake:'INTAKE', planning:'PLANNING', active:'DEVELOPMENT', testing:'TESTING', done:'DELIVERED'
}

const ADDONS = ['AI Cinematics','SEO Expert','Motion Design','Web-Full Stack','AI Chatbot','Payments','Branding']

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [aiUpdates, setAiUpdates] = useState<AIUpdate[]>([])
  const [reports, setReports] = useState<DailyReport[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [newTask, setNewTask] = useState('')
  const [userId, setUserId] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [activeTab, setActiveTab] = useState<'overview'|'tasks'|'reports'>('overview')
  const [generatingAI, setGeneratingAI] = useState(false)
  const [reportText, setReportText] = useState('')
  const [reportHours, setReportHours] = useState('8')
  const [aiThinking, setAiThinking] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      setUserId(data.session.user.id)
      setUserEmail(data.session.user.email ?? '')
      loadAll()
    })
  }, [id])

  async function loadAll() {
    const [{ data: proj }, { data: t }, { data: m }, { data: ai }, { data: rep }] = await Promise.all([
      supabase.from('projects').select('*').eq('id', id).single(),
      supabase.from('tasks').select('*').eq('project_id', id).order('created_at'),
      supabase.from('messages').select('*').eq('project_id', id).order('created_at'),
      supabase.from('ai_updates').select('*').eq('project_id', id).order('created_at', { ascending: false }),
      supabase.from('daily_reports').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    ])
    if (proj) setProject(proj)
    setTasks(t ?? [])
    setMessages(m ?? [])
    setAiUpdates(ai ?? [])
    setReports(rep ?? [])
  }

  async function sendMessage() {
    if (!newMsg.trim() || !userId) return
    const msg = newMsg
    setNewMsg('')
    await supabase.from('messages').insert({ project_id: id, sender_id: userId, message: msg })
    loadAll()
    // Trigger AI response
    setAiThinking(true)
    setTimeout(async () => {
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 300,
            system: `Du bist Tagro, die AI von Festag. Dein Ton: professionell, knapp, klar. Antworte auf Nachrichten über das Softwareprojekt "${project?.title}". Maximal 2 Sätze.`,
            messages: [{ role: 'user', content: msg }]
          })
        })
        const data = await res.json()
        const aiMsg = data.content?.[0]?.text
        if (aiMsg) {
          await supabase.from('messages').insert({
            project_id: id, sender_id: userId, message: aiMsg, is_ai: true
          })
          loadAll()
        }
      } catch {}
      setAiThinking(false)
    }, 1200)
  }

  async function addTask() {
    if (!newTask.trim()) return
    await supabase.from('tasks').insert({ project_id: id, title: newTask })
    setNewTask(''); loadAll()
  }

  async function updateTask(taskId: string, status: string) {
    await supabase.from('tasks').update({ status }).eq('id', taskId)
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status } : t))
  }

  async function deleteTask(taskId: string) {
    await supabase.from('tasks').delete().eq('id', taskId)
    setTasks(tasks.filter(t => t.id !== taskId))
  }

  async function updateStatus(status: string) {
    await supabase.from('projects').update({ status }).eq('id', id)
    setProject(p => p ? { ...p, status } : p)
  }

  async function generateAIUpdate() {
    if (!project) return
    setGeneratingAI(true)
    const done = tasks.filter(t => t.status === 'done').length
    const pct = tasks.length ? Math.round(done/tasks.length*100) : 0
    const latestReport = reports[0]
    
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          system: 'Du bist Tagro, die AI von Festag. Erstelle einen professionellen Tagesbericht für den Kunden. Kein Markdown, kein Formatierung. Klare, strukturierte Sätze auf Deutsch.',
          messages: [{
            role: 'user',
            content: `Projekt: ${project.title}\nStatus: ${project.status}\nFortschritt: ${pct}%\nTasks: ${done}/${tasks.length} erledigt\nAktuelle Tasks in Arbeit: ${tasks.filter(t=>t.status==='doing').map(t=>t.title).join(', ') || 'keine'}\nDeveloper-Report heute: ${latestReport?.summary || 'kein Bericht'}`
          }]
        })
      })
      const data = await res.json()
      const content = data.content?.[0]?.text ?? `Tagesupdate ${new Date().toLocaleDateString('de')}: Fortschritt ${pct}% · ${done}/${tasks.length} Tasks abgeschlossen.`
      await supabase.from('ai_updates').insert({ project_id: id, content, type: 'daily_summary' })
    } catch {
      await supabase.from('ai_updates').insert({
        project_id: id,
        content: `Tagesupdate ${new Date().toLocaleDateString('de')}: Fortschritt ${pct}%. ${done} von ${tasks.length} Tasks abgeschlossen.`,
        type: 'daily_summary'
      })
    }
    setGeneratingAI(false)
    loadAll()
  }

  async function submitReport() {
    if (!reportText.trim()) return
    await supabase.from('daily_reports').insert({
      project_id: id, developer_id: userId,
      summary: reportText, hours_worked: parseFloat(reportHours) || 0
    })
    setReportText('')
    loadAll()
  }

  if (!project) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>
      Lädt...
    </div>
  )

  const done = tasks.filter(t => t.status === 'done').length
  const pct = tasks.length ? Math.round(done/tasks.length*100) : 0
  const phaseIndex = PHASES.indexOf(project.status)

  return (
    <div className="animate-fade-up" style={{ maxWidth: 1100 }}>
      {/* Breadcrumb */}
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20, letterSpacing: '0.04em' }}>
        <Link href="/dashboard" style={{ color: 'var(--text-muted)' }}>DASHBOARD</Link>
        <span style={{ margin: '0 8px' }}>›</span>
        <span style={{ color: 'var(--text-secondary)' }}>AKTUELLES PROJEKT</span>
      </p>

      {/* Header — exact from frame */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
            AKTUELLES PROJEKT
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--text-primary)', lineHeight: 1.2, maxWidth: 600 }}>
            {project.title}
          </h1>
          {project.description && (
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 8 }}>{project.description}</p>
          )}
        </div>
        {/* Phase Badge — like "DEVELOPMENT" in frame */}
        <span style={{
          padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          background: project.status === 'active' ? '#EEF3FF' : project.status === 'done' ? '#D1FAE5' : '#F3F4F6',
          color: project.status === 'active' ? 'var(--accent)' : project.status === 'done' ? 'var(--green)' : 'var(--text-secondary)',
          border: `1px solid ${project.status === 'active' ? '#C7D7FF' : project.status === 'done' ? '#A7F3D0' : 'var(--border)'}`,
          cursor: 'pointer', flexShrink: 0, marginTop: 4,
        }}>
          {PHASE_LABELS[project.status] ?? project.status.toUpperCase()}
        </span>
      </div>

      {/* Status buttons — like "IN PROGRESS" + "AUFTRAG HINZUFÜGEN" in frame */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
        <button style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '8px 16px', borderRadius: 30, border: '1px solid var(--border)',
          background: 'var(--surface)', fontSize: 12, fontWeight: 600,
          color: 'var(--text-primary)', cursor: 'default',
          letterSpacing: '0.04em', textTransform: 'uppercase',
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: project.status === 'active' ? '#10B981' : '#F59E0B', display: 'inline-block', animation: project.status === 'active' ? 'pulse 2s infinite' : 'none' }} />
          {project.status === 'active' ? 'IN PROGRESS' : project.status.toUpperCase()}
        </button>
        <button onClick={() => setActiveTab('tasks')} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 30, border: '1px solid var(--border)',
          background: 'var(--surface)', fontSize: 12, fontWeight: 600,
          color: 'var(--text-secondary)', cursor: 'pointer', letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}>
          ⊕ AUFTRAG HINZUFÜGEN
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {PHASES.map((phase, i) => (
            <button key={phase} onClick={() => updateStatus(phase)} style={{
              width: 8, height: 8, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0,
              background: i <= phaseIndex ? 'var(--accent)' : 'var(--border)',
              transition: 'background 0.2s',
            }} title={PHASE_LABELS[phase]} />
          ))}
        </div>
      </div>

      {/* Main 2-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, alignItems: 'start' }}>

        {/* LEFT: Tabs + Content */}
        <div>
          {/* Tab navigation */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
            {[
              { key: 'overview', label: 'Übersicht' },
              { key: 'tasks', label: `Tasks (${tasks.length})` },
              { key: 'reports', label: 'Dev Reports' },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} style={{
                padding: '9px 18px', border: 'none', background: 'transparent', cursor: 'pointer',
                fontSize: 13, fontWeight: activeTab === tab.key ? 600 : 400,
                color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-muted)',
                borderBottom: `2px solid ${activeTab === tab.key ? 'var(--accent)' : 'transparent'}`,
                marginBottom: -1, transition: 'all 0.15s',
              }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Progress */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Gesamtfortschritt</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{pct}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent), #818CF8)', borderRadius: 4, transition: 'width 0.6s ease' }} />
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                  {[
                    { label: 'Offen', count: tasks.filter(t=>t.status==='todo').length, color: 'var(--text-muted)' },
                    { label: 'In Arbeit', count: tasks.filter(t=>t.status==='doing').length, color: '#F59E0B' },
                    { label: 'Erledigt', count: tasks.filter(t=>t.status==='done').length, color: 'var(--green)' },
                  ].map(s => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}: <strong style={{ color: 'var(--text-primary)' }}>{s.count}</strong></span>
                    </div>
                  ))}
                </div>
              </div>

              {/* System Flow — "what is the system doing" */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>System Activity</span>
                  <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                    LIVE
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { phase: 'Planung', done: phaseIndex >= 1, active: phaseIndex === 0 },
                    { phase: 'Zuweisung', done: phaseIndex >= 2, active: phaseIndex === 1 },
                    { phase: 'Development', done: phaseIndex >= 3, active: phaseIndex === 2 },
                    { phase: 'Review & Testing', done: phaseIndex >= 4, active: phaseIndex === 3 },
                    { phase: 'Delivery', done: phaseIndex >= 5, active: phaseIndex === 4 },
                  ].map((step, i) => (
                    <div key={step.phase} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
                        background: step.done ? 'var(--accent)' : step.active ? '#EEF3FF' : 'var(--surface2)',
                        border: step.active ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                        color: step.done ? '#fff' : step.active ? 'var(--accent)' : 'var(--text-muted)',
                        fontWeight: 700,
                      }}>
                        {step.done ? '✓' : i+1}
                      </div>
                      <span style={{ fontSize: 13, color: step.done ? 'var(--text-primary)' : step.active ? 'var(--accent)' : 'var(--text-muted)', fontWeight: step.active ? 600 : 400 }}>
                        {step.phase}
                      </span>
                      {step.active && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-light)', padding: '1px 6px', borderRadius: 10, letterSpacing: '0.06em' }}>
                          AKTIV
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Updates */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Tagro AI · Updates</span>
                  <button onClick={generateAIUpdate} disabled={generatingAI} style={{
                    padding: '5px 12px', borderRadius: 20, border: 'none',
                    background: 'var(--accent)', color: '#fff', fontSize: 11, fontWeight: 600,
                    cursor: generatingAI ? 'default' : 'pointer', opacity: generatingAI ? 0.6 : 1,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    {generatingAI ? '⏳' : '✦'} {generatingAI ? 'Generiert...' : 'Update erstellen'}
                  </button>
                </div>
                {aiUpdates.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>Noch keine AI Updates. Klick "Update erstellen".</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {aiUpdates.slice(0,3).map(u => (
                      <div key={u.id} style={{ background: '#F8F7FF', border: '1px solid #E8E4FF', borderRadius: 10, padding: '12px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--purple)' }}>✦ TAGRO AI</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {new Date(u.created_at).toLocaleDateString('de', {day:'2-digit',month:'2-digit'})} · {new Date(u.created_at).toLocaleTimeString('de',{hour:'2-digit',minute:'2-digit'})}
                          </span>
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{u.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TASKS */}
          {activeTab === 'tasks' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input value={newTask} onChange={e => setNewTask(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTask()}
                  placeholder="Task hinzufügen..."
                  style={{ flex: 1, padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, outline: 'none', background: 'var(--surface2)' }} />
                <button onClick={addTask} style={{ padding: '9px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  + Hinzufügen
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                {['todo','doing','done'].map(col => {
                  const colTasks = tasks.filter(t => t.status === col)
                  const colConfig = {
                    todo: { label: 'To Do', color: 'var(--text-muted)', bg: 'var(--surface2)' },
                    doing: { label: 'In Progress', color: '#D97706', bg: '#FEF3C7' },
                    done: { label: 'Done', color: '#059669', bg: '#D1FAE5' },
                  }[col]!
                  return (
                    <div key={col}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: colConfig.color, background: colConfig.bg, padding: '2px 8px', borderRadius: 10, letterSpacing: '0.06em' }}>
                          {colConfig.label.toUpperCase()}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{colTasks.length}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {colTasks.map(task => (
                          <div key={task.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                            <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 8px', color: 'var(--text-primary)' }}>{task.title}</p>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {['todo','doing','done'].filter(s => s !== col).map(s => (
                                <button key={s} onClick={() => updateTask(task.id, s)} style={{
                                  padding: '2px 7px', fontSize: 10, border: '1px solid var(--border)',
                                  background: 'var(--surface2)', borderRadius: 5, cursor: 'pointer',
                                  color: 'var(--text-muted)', fontWeight: 500,
                                }}>→ {s}</button>
                              ))}
                              <button onClick={() => deleteTask(task.id)} style={{
                                padding: '2px 6px', fontSize: 10, border: '1px solid #FEE2E2',
                                background: '#FFF5F5', borderRadius: 5, cursor: 'pointer', color: '#DC2626',
                              }}>✕</button>
                            </div>
                          </div>
                        ))}
                        {colTasks.length === 0 && (
                          <div style={{ border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)', padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                            Leer
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* DEV REPORTS */}
          {activeTab === 'reports' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '18px 20px' }}>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Tagesbericht einreichen</p>
                <textarea value={reportText} onChange={e => setReportText(e.target.value)}
                  placeholder="Was habe ich heute geleistet?" rows={3}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, outline: 'none', resize: 'vertical' as const, background: 'var(--surface2)', boxSizing: 'border-box' as const }} />
                <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                  <input type="number" value={reportHours} onChange={e => setReportHours(e.target.value)} min="1" max="24"
                    style={{ width: 70, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, outline: 'none', background: 'var(--surface2)' }} />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Stunden</span>
                  <button onClick={submitReport} disabled={!reportText.trim()} style={{ marginLeft: 'auto', padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: !reportText.trim() ? 0.5 : 1 }}>
                    Bericht senden
                  </button>
                </div>
              </div>
              {reports.map(r => (
                <div key={r.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--green)', background: 'var(--green-light)', padding: '2px 8px', borderRadius: 10 }}>⏱ {r.hours_worked}h</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(r.created_at).toLocaleDateString('de')}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>{r.summary}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Live Dialog & AI — EXACT from frame */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Live Dialog Card */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', overflow: 'hidden',
            boxShadow: 'var(--shadow)',
          }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Live Dialog & AI</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                ANTWORTZEIT: &lt; 5 MIN
              </span>
            </div>

            {/* Messages */}
            <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 340, overflowY: 'auto', minHeight: 120 }}>
              {messages.length === 0 && !aiThinking && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
                  Starte eine Konversation mit Tagro AI...
                </p>
              )}
              {messages.map((m) => {
                const isAI = (m as any).is_ai
                const isOwn = m.sender_id === userId && !isAI
                return (
                  <div key={m.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    {/* Avatar */}
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      background: isAI ? 'linear-gradient(135deg, var(--accent), #7C3AED)' : 'var(--surface2)',
                      border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: isAI ? 14 : 13, fontWeight: 700,
                      color: isAI ? '#fff' : 'var(--text-secondary)',
                    }}>
                      {isAI ? '✦' : (userEmail.charAt(0) || 'U').toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                          {isAI ? 'Tagro (fesTag AI)' : isOwn ? (userEmail.split('@')[0]) : 'Developer'}
                        </span>
                        {isAI && (
                          <span style={{ fontSize: 10, fontWeight: 600, color: '#fff', background: 'var(--accent)', padding: '0px 5px', borderRadius: 6 }}>AI</span>
                        )}
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {new Date(m.created_at).toLocaleTimeString('de', {hour:'2-digit',minute:'2-digit'})}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>{m.message}</p>
                    </div>
                  </div>
                )
              })}
              {aiThinking && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', flexShrink: 0 }}>✦</div>
                  <div style={{ paddingTop: 8 }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[0,1,2].map(i => (
                        <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: `pulse 1s ${i*0.2}s infinite` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                value={newMsg} onChange={e => setNewMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Nachricht an Tagro oder Developer..."
                style={{
                  flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 20, padding: '7px 14px', fontSize: 13, outline: 'none',
                  color: 'var(--text-primary)',
                }}
              />
              <button onClick={sendMessage} style={{
                width: 30, height: 30, borderRadius: '50%', border: 'none',
                background: newMsg.trim() ? 'var(--accent)' : 'var(--surface2)',
                color: newMsg.trim() ? '#fff' : 'var(--text-muted)',
                cursor: newMsg.trim() ? 'pointer' : 'default', fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s', flexShrink: 0,
              }}>
                ↗
              </button>
            </div>
          </div>

          {/* Add-on Marketplace — exact from frame */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.08em', marginBottom: 10 }}>ADD-ONS</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ADDONS.map(addon => (
                <button key={addon} style={{
                  padding: '4px 10px', borderRadius: 20, border: '1px solid var(--border)',
                  background: 'var(--surface2)', fontSize: 11, color: 'var(--text-secondary)',
                  cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 4,
                  fontWeight: 500,
                }}>
                  {addon} <span style={{ fontSize: 10, color: 'var(--accent)' }}>+</span>
                </button>
              ))}
            </div>
          </div>

          {/* Festag Guarantee */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.08em', marginBottom: 12 }}>FESTAG GARANTIE</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'AI Check', status: pct > 30, pending: pct > 0 && pct <= 30 },
                { label: 'Project Owner Review', status: false, pending: pct > 60 },
                { label: 'Controlled Release', status: false, pending: false },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.label}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, letterSpacing: '0.06em',
                    background: item.status ? 'var(--green-light)' : item.pending ? 'var(--orange-light)' : 'var(--surface2)',
                    color: item.status ? 'var(--green)' : item.pending ? 'var(--orange)' : 'var(--text-muted)',
                  }}>
                    {item.status ? '✓ PASSED' : item.pending ? 'PENDING' : 'WAITING'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
