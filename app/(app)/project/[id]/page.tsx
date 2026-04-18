'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import Link from 'next/link'

type Project = { id: string; title: string; description: string|null; status: string }
type Task = { id: string; title: string; status: string }
type Message = { id: string; message: string; created_at: string; sender_id: string; is_ai?: boolean }
type AIUpdate = { id: string; content: string; type: string; created_at: string }

const PHASES = ['intake','planning','active','testing','done']
const PHASE_LABEL: Record<string,string> = {
  intake: 'Intake', planning: 'Planning', active: 'Development', testing: 'Testing', done: 'Delivered'
}
const ADDONS_QUICK = ['AI Cinematics','SEO Expert','Motion Design','Web-Full Stack']

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [aiUpdates, setAiUpdates] = useState<AIUpdate[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [newTask, setNewTask] = useState('')
  const [userId, setUserId] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [activeTab, setActiveTab] = useState<'overview'|'tasks'|'updates'>('overview')
  const [aiThinking, setAiThinking] = useState(false)
  const [generatingAI, setGeneratingAI] = useState(false)
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
    const [{ data: proj }, { data: t }, { data: m }, { data: ai }] = await Promise.all([
      supabase.from('projects').select('*').eq('id', id).single(),
      supabase.from('tasks').select('*').eq('project_id', id).order('created_at'),
      supabase.from('messages').select('*').eq('project_id', id).order('created_at'),
      supabase.from('ai_updates').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    ])
    if (proj) setProject(proj)
    setTasks(t ?? [])
    setMessages(m ?? [])
    setAiUpdates(ai ?? [])
  }

  async function sendMessage() {
    if (!newMsg.trim() || !userId) return
    const msg = newMsg; setNewMsg('')
    await supabase.from('messages').insert({ project_id: id, sender_id: userId, message: msg, is_ai: false })
    loadAll()
    setAiThinking(true)
    setTimeout(async () => {
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514', max_tokens: 250,
            system: `Du bist Tagro, AI-System von Festag. Antworte klar, professionell, max 2 Sätze. Projekt: "${project?.title}"`,
            messages: [{ role: 'user', content: msg }]
          })
        })
        const data = await res.json()
        const aiMsg = data.content?.[0]?.text
        if (aiMsg) await supabase.from('messages').insert({ project_id: id, sender_id: userId, message: aiMsg, is_ai: true })
        loadAll()
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
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 400,
          system: 'Du bist Tagro. Erstelle einen professionellen Tagesbericht auf Deutsch. Keine Emojis. 3-4 Sätze. Klare Struktur.',
          messages: [{ role: 'user', content: `Projekt: ${project.title}. Status: ${project.status}. Fortschritt: ${pct}%. ${done}/${tasks.length} Tasks erledigt.` }]
        })
      })
      const data = await res.json()
      const content = data.content?.[0]?.text ?? `Tagesupdate: Fortschritt ${pct}%, ${done}/${tasks.length} Tasks abgeschlossen.`
      await supabase.from('ai_updates').insert({ project_id: id, content, type: 'daily_summary' })
    } catch {}
    setGeneratingAI(false); loadAll()
  }

  if (!project) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div style={{ width: 28, height: 28, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>

  const done = tasks.filter(t => t.status === 'done').length
  const pct = tasks.length ? Math.round(done/tasks.length*100) : 0
  const phaseIdx = PHASES.indexOf(project.status)

  return (
    <div className="animate-fade-up">
      {/* Breadcrumb */}
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 18, letterSpacing: '0.04em' }}>
        <Link href="/dashboard" style={{ color: 'var(--text-muted)' }}>DASHBOARD</Link>
        <span style={{ margin: '0 8px' }}>/</span>
        <span>AKTUELLES PROJEKT</span>
      </p>

      {/* Header — clean */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 10 }}>AKTUELLES PROJEKT</p>
          <h1 style={{ marginBottom: 6 }}>{project.title}</h1>
          {project.description && <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{project.description}</p>}
        </div>
        <span style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, color: project.status === 'active' ? 'var(--green-dark)' : 'var(--text-secondary)', background: project.status === 'active' ? 'var(--green-bg)' : 'var(--surface-2)', border: `1px solid ${project.status === 'active' ? 'var(--green-border)' : 'var(--border)'}`, flexShrink: 0 }}>
          {PHASE_LABEL[project.status] ?? project.status}
        </span>
      </div>

      {/* Status pills + phase dots */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <button style={{
          display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 999,
          border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 12, fontWeight: 600,
          color: 'var(--text)', cursor: 'default', letterSpacing: '0.04em',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: project.status === 'active' ? 'var(--green)' : 'var(--amber)', animation: project.status === 'active' ? 'pulse 2s infinite' : 'none' }} />
          IN PROGRESS
        </button>
        <button className="tap-scale" onClick={() => setActiveTab('tasks')} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 999,
          border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 12, fontWeight: 600,
          color: 'var(--text-secondary)', cursor: 'pointer', letterSpacing: '0.04em',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          AUFTRAG HINZUFÜGEN
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          {PHASES.map((phase, i) => (
            <button key={phase} onClick={() => updateStatus(phase)} className="tap-scale" style={{
              width: 8, height: 8, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0,
              background: i <= phaseIdx ? 'var(--text)' : 'var(--border)',
              transition: 'background 0.2s',
            }} title={PHASE_LABEL[phase]} />
          ))}
        </div>
      </div>

      {/* 2-col layout */}
      <div className="grid-cols-2-mobile-1" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>

        {/* LEFT */}
        <div>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 18 }}>
            {([
              { key: 'overview', label: 'Übersicht' },
              { key: 'tasks', label: `Tasks (${tasks.length})` },
              { key: 'updates', label: 'AI Updates' },
            ] as const).map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                padding: '9px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
                fontSize: 13, fontWeight: activeTab === tab.key ? 600 : 500,
                color: activeTab === tab.key ? 'var(--text)' : 'var(--text-muted)',
                borderBottom: `2px solid ${activeTab === tab.key ? 'var(--text)' : 'transparent'}`,
                marginBottom: -1, fontFamily: 'inherit',
              }}>{tab.label}</button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Progress */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Gesamtfortschritt</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{pct}%</span>
                </div>
                <div style={{ height: 5, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'var(--text)', borderRadius: 4, transition: 'width 0.6s ease' }} />
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  {[
                    { label: 'Offen', count: tasks.filter(t=>t.status==='todo').length, color: 'var(--text-muted)' },
                    { label: 'In Arbeit', count: tasks.filter(t=>t.status==='doing').length, color: 'var(--amber)' },
                    { label: 'Erledigt', count: tasks.filter(t=>t.status==='done').length, color: 'var(--green)' },
                  ].map(s => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}: <strong style={{ color: 'var(--text)' }}>{s.count}</strong></span>
                    </div>
                  ))}
                </div>
              </div>

              {/* System Activity */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>System Flow</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--green-dark)', background: 'var(--green-bg)', padding: '2px 7px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />LIVE
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { phase: 'Planung', done: phaseIdx >= 1, active: phaseIdx === 0 },
                    { phase: 'Zuweisung', done: phaseIdx >= 2, active: phaseIdx === 1 },
                    { phase: 'Development', done: phaseIdx >= 3, active: phaseIdx === 2 },
                    { phase: 'Review & Testing', done: phaseIdx >= 4, active: phaseIdx === 3 },
                    { phase: 'Delivery', done: phaseIdx >= 5, active: phaseIdx === 4 },
                  ].map((step, i) => (
                    <div key={step.phase} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: step.done ? 'var(--text)' : step.active ? 'var(--green)' : 'var(--surface-2)',
                        border: step.active ? '2px solid var(--green-bg)' : '1px solid var(--border)',
                      }}>
                        {step.done && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>}
                      </div>
                      <span style={{ fontSize: 13, color: step.done ? 'var(--text)' : step.active ? 'var(--text)' : 'var(--text-muted)', fontWeight: step.active ? 600 : 500 }}>
                        {step.phase}
                      </span>
                      {step.active && <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--green-dark)', background: 'var(--green-bg)', padding: '1px 6px', borderRadius: 8 }}>AKTIV</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()}
                  placeholder="Task hinzufügen…" style={{ flex: 1, padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', fontSize: 14, outline: 'none', background: 'var(--surface)' }} />
                <button onClick={addTask} className="tap-scale" style={{ padding: '10px 16px', background: 'var(--text)', color: '#fff', border: 'none', borderRadius: 'var(--r-sm)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Hinzufügen</button>
              </div>
              <div className="grid-cols-2-mobile-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {['todo','doing','done'].map(col => {
                  const colTasks = tasks.filter(t => t.status === col)
                  const labels = { todo: 'To Do', doing: 'In Progress', done: 'Done' }[col as keyof typeof labels]
                  return (
                    <div key={col}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 8 }}>{(labels as string).toUpperCase()} · {colTasks.length}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {colTasks.map(task => (
                          <div key={task.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '10px 12px' }}>
                            <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 8px', color: 'var(--text)' }}>{task.title}</p>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {['todo','doing','done'].filter(s => s !== col).map(s => (
                                <button key={s} onClick={() => updateTask(task.id, s)} style={{ padding: '3px 7px', fontSize: 10, border: '1px solid var(--border)', background: 'var(--bg)', borderRadius: 5, cursor: 'pointer', color: 'var(--text-secondary)' }}>→ {s}</button>
                              ))}
                              <button onClick={() => deleteTask(task.id)} style={{ padding: '3px 6px', fontSize: 10, border: '1px solid #FECACA', background: 'var(--red-bg)', borderRadius: 5, cursor: 'pointer', color: 'var(--red)' }}>✕</button>
                            </div>
                          </div>
                        ))}
                        {colTasks.length === 0 && <div style={{ border: '1px dashed var(--border)', borderRadius: 'var(--r-sm)', padding: 12, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>Leer</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {activeTab === 'updates' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <p style={{ fontSize: 13, fontWeight: 600 }}>Tagro AI Updates</p>
                <button onClick={generateAIUpdate} disabled={generatingAI} className="tap-scale" style={{ padding: '6px 12px', border: 'none', borderRadius: 'var(--r-sm)', background: 'var(--text)', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', opacity: generatingAI ? 0.5 : 1 }}>
                  {generatingAI ? 'Generiert…' : '+ Update erstellen'}
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {aiUpdates.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: 'var(--r)' }}>
                    <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Noch keine Updates</p>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Klick "Update erstellen" für eine AI-generierte Zusammenfassung</p>
                  </div>
                ) : aiUpdates.map(u => (
                  <div key={u.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>TAGRO AI</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(u.created_at).toLocaleDateString('de')} · {new Date(u.created_at).toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p style={{ fontSize: 13.5, color: 'var(--text)', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{u.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Live Dialog */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Live Dialog & AI</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>ANTWORTZEIT: &lt; 5 MIN</span>
            </div>
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 340, overflowY: 'auto', minHeight: 140 }}>
              {messages.length === 0 && !aiThinking && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>Starte eine Konversation mit Tagro…</p>
              )}
              {messages.map(m => {
                const isAI = m.is_ai
                return (
                  <div key={m.id} style={{ display: 'flex', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: isAI ? 'var(--text)' : 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: isAI ? '#fff' : 'var(--text-secondary)', fontWeight: 600, flexShrink: 0, border: isAI ? 'none' : '1px solid var(--border)' }}>
                      {isAI ? 'T' : (userEmail.charAt(0) || 'U').toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{isAI ? 'Tagro' : 'Du'}</span>
                        {isAI && (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="#007AFF"><circle cx="12" cy="12" r="10" fill="#007AFF"/><path d="M8 12l3 3 5-6" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        )}
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(m.created_at).toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>{m.message}</p>
                    </div>
                  </div>
                )
              })}
              {aiThinking && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', fontWeight: 600, flexShrink: 0 }}>T</div>
                  <div style={{ paddingTop: 8 }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[0,1,2].map(i => <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-muted)', animation: `pulse 1s ${i*0.2}s infinite` }} />)}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
              <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Nachricht an Tagro oder Developer…"
                style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 20, padding: '8px 14px', fontSize: 13, outline: 'none' }} />
              <button onClick={sendMessage} className="tap-scale" style={{
                width: 32, height: 32, borderRadius: '50%', border: 'none', flexShrink: 0,
                background: newMsg.trim() ? 'var(--text)' : 'var(--surface-2)',
                color: newMsg.trim() ? '#fff' : 'var(--text-muted)',
                cursor: newMsg.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 17L17 7M9 7h8v8"/></svg>
              </button>
            </div>
          </div>

          {/* Quick add-ons */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>ADD-ONS</span>
              <Link href="/addons" style={{ fontSize: 11, color: 'var(--text)', fontWeight: 600 }}>Alle →</Link>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ADDONS_QUICK.map(a => (
                <button key={a} style={{ padding: '5px 10px', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--surface-2)', fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                  {a} <span style={{ color: 'var(--text)', fontWeight: 600 }}>+</span>
                </button>
              ))}
            </div>
          </div>

          {/* Festag Garantie */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '14px 16px' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 10 }}>FESTAG GARANTIE</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'AI Check', status: pct > 30 },
                { label: 'Project Owner Review', status: false },
                { label: 'Controlled Release', status: false },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.label}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: item.status ? 'var(--green-bg)' : 'var(--surface-2)', color: item.status ? 'var(--green-dark)' : 'var(--text-muted)' }}>
                    {item.status ? 'PASSED' : 'PENDING'}
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
