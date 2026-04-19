'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import Link from 'next/link'

type Project = { id: string; title: string; description: string|null; status: string }
type Task = { id: string; title: string; status: string; priority?: string }
type Msg = { id: string; message: string; created_at: string; sender_id: string; is_ai?: boolean }

const PHASES = ['intake','planning','active','testing','done']
const PHASE_LABEL: Record<string,string> = { intake:'Intake', planning:'Planning', active:'Development', testing:'Testing', done:'Delivered' }

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [messages, setMessages] = useState<Msg[]>([])
  const [aiUpdates, setAiUpdates] = useState<any[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [newTask, setNewTask] = useState('')
  const [userId, setUserId] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [activeTab, setActiveTab] = useState<'overview'|'tasks'|'updates'>('overview')
  const [aiThinking, setAiThinking] = useState(false)
  const [generatingAI, setGeneratingAI] = useState(false)
  const [online, setOnline] = useState(true)
  const msgEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      setUserId(data.session.user.id)
      setUserEmail(data.session.user.email ?? '')
      loadAll()
    })

    // Realtime subscription for messages
    const channel = supabase
      .channel(`project-messages-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `project_id=eq.${id}` }, (payload) => {
        setMessages(prev => [...prev, payload.new as Msg])
        setAiThinking(false)
      })
      .subscribe((status) => setOnline(status === 'SUBSCRIBED'))

    return () => { supabase.removeChannel(channel) }
  }, [id])

  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

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
    // Optimistic insert
    const optimistic: Msg = { id: 'tmp-' + Date.now(), message: msg, created_at: new Date().toISOString(), sender_id: userId, is_ai: false }
    setMessages(prev => [...prev, optimistic])
    await supabase.from('messages').insert({ project_id: id, sender_id: userId, message: msg, is_ai: false })
    setAiThinking(true)
    // AI response
    setTimeout(async () => {
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514', max_tokens: 200,
            system: `Du bist Tagro, AI-System von Festag. Antworte klar, max 2 Sätze. Kein Smalltalk. Projekt: "${project?.title}"`,
            messages: [{ role: 'user', content: msg }]
          })
        })
        const data = await res.json()
        const aiMsg = data.content?.[0]?.text
        if (aiMsg) await supabase.from('messages').insert({ project_id: id, sender_id: userId, message: aiMsg, is_ai: true })
      } catch {}
      setAiThinking(false)
    }, 1000)
  }

  async function addTask() {
    if (!newTask.trim()) return
    const { data } = await supabase.from('tasks').insert({ project_id: id, title: newTask, status: 'todo' }).select().single()
    if (data) setTasks(prev => [...prev, data])
    setNewTask('')
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
    const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 300,
          system: 'Du bist Tagro. Erstelle einen professionellen Tagesbericht auf Deutsch. Keine Emojis. 3-4 Sätze.',
          messages: [{ role: 'user', content: `Projekt: ${project.title}. Status: ${PHASE_LABEL[project.status]}. Fortschritt: ${pct}%. ${done}/${tasks.length} Tasks erledigt.` }]
        })
      })
      const data = await res.json()
      const content = data.content?.[0]?.text ?? `Update: ${pct}% abgeschlossen, ${done}/${tasks.length} Tasks erledigt.`
      const { data: inserted } = await supabase.from('ai_updates').insert({ project_id: id, content, type: 'daily_summary' }).select().single()
      if (inserted) setAiUpdates(prev => [inserted, ...prev])
    } catch {}
    setGeneratingAI(false)
  }

  if (!project) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div style={{ width: 28, height: 28, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  const done = tasks.filter(t => t.status === 'done').length
  const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0
  const phaseIdx = PHASES.indexOf(project.status)
  const PHASECFG: Record<string, { label: string; color: string; bg: string }> = {
    intake:   { label: 'Intake',       color: 'var(--amber)',      bg: 'var(--amber-bg)' },
    planning: { label: 'Planning',     color: '#3B82F6',           bg: '#DBEAFE' },
    active:   { label: 'Development',  color: 'var(--green-dark)', bg: 'var(--green-bg)' },
    testing:  { label: 'Testing',      color: '#7C3AED',           bg: '#EDE9FE' },
    done:     { label: 'Delivered',    color: 'var(--text-muted)', bg: 'var(--surface-2)' },
  }
  const pc = PHASECFG[project.status] ?? PHASECFG.intake

  return (
    <div className="animate-fade-up">
      {/* Breadcrumb */}
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
        <Link href="/dashboard" style={{ color: 'var(--text-muted)' }}>Dashboard</Link>
        <span style={{ margin: '0 6px' }}>/</span>
        <span>Projekt</span>
      </p>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 8 }}>PROJEKT</p>
          <h1 style={{ marginBottom: 6 }}>{project.title}</h1>
          {project.description && <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{project.description}</p>}
        </div>
        <span style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, color: pc.color, background: pc.bg, display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          {project.status === 'active' && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />}
          {pc.label}
        </span>
      </div>

      {/* Phase controls */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 22, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {PHASES.map((phase, i) => (
            <button key={phase} onClick={() => updateStatus(phase)} className="tap-scale" style={{
              width: 9, height: 9, borderRadius: '50%', cursor: 'pointer', padding: 0,
              background: i <= phaseIdx ? 'var(--text)' : 'var(--border)',
              transition: 'all 0.2s',
            }} title={PHASE_LABEL[phase]} />
          ))}
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>{PHASE_LABEL[project.status]}</span>
        </div>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: online ? 'var(--green)' : 'var(--amber)', animation: online ? 'pulse 2s infinite' : 'none' }} />
          {online ? 'Live' : 'Offline'}
        </span>
      </div>

      {/* Main layout */}
      <div className="grid-cols-2-mobile-1" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>
        {/* LEFT */}
        <div>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
            {([
              { key: 'overview', label: 'Übersicht' },
              { key: 'tasks',    label: `Tasks (${tasks.length})` },
              { key: 'updates',  label: 'AI Updates' },
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Progress */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Fortschritt</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{pct}%</span>
                </div>
                <div style={{ height: 5, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden', marginBottom: 14 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'var(--text)', borderRadius: 4, transition: 'width 0.6s ease' }} />
                </div>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Offen',     count: tasks.filter(t => t.status === 'todo').length, color: 'var(--text-muted)' },
                    { label: 'In Arbeit', count: tasks.filter(t => t.status === 'doing').length, color: 'var(--amber)' },
                    { label: 'Erledigt',  count: tasks.filter(t => t.status === 'done').length,  color: 'var(--green)' },
                  ].map(s => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}: <strong style={{ color: 'var(--text)' }}>{s.count}</strong></span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Phase flow */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>System Flow</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--green-dark)', background: 'var(--green-bg)', padding: '2px 7px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />AKTIV
                  </span>
                </div>
                {['Planung','Zuweisung','Development','Testing','Delivery'].map((step, i) => (
                  <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < 4 ? '1px solid var(--surface-2)' : 'none' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: i < phaseIdx ? 'var(--text)' : i === phaseIdx ? 'var(--green)' : 'var(--surface-2)', border: i === phaseIdx ? '3px solid var(--green-bg)' : '1px solid var(--border)' }}>
                      {i < phaseIdx && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>}
                    </div>
                    <span style={{ fontSize: 13, color: i <= phaseIdx ? 'var(--text)' : 'var(--text-muted)', fontWeight: i === phaseIdx ? 600 : 500 }}>{step}</span>
                    {i === phaseIdx && <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--green-dark)', background: 'var(--green-bg)', padding: '1px 6px', borderRadius: 8, marginLeft: 'auto' }}>AKTIV</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()}
                  placeholder="Task hinzufügen…" style={{ flex: 1, padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', fontSize: 14, outline: 'none', background: 'var(--surface)' }} />
                <button onClick={addTask} className="tap-scale" style={{ padding: '10px 16px', background: 'var(--text)', color: '#fff', border: 'none', borderRadius: 'var(--r-sm)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {['todo','doing','done'].map(col => {
                  const colTasks = tasks.filter(t => t.status === col)
                  const colors = { todo: 'var(--text-muted)', doing: 'var(--amber)', done: 'var(--green)' }[col] ?? 'var(--text)'
                  const labels = { todo: 'To Do', doing: 'In Progress', done: 'Done' }[col] ?? col
                  return (
                    <div key={col}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: colors }} />
                        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', margin: 0 }}>{(labels as string).toUpperCase()} · {colTasks.length}</p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {colTasks.map(task => (
                          <div key={task.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '10px 12px' }}>
                            <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 8px', color: 'var(--text)' }}>{task.title}</p>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {['todo','doing','done'].filter(s => s !== col).map(s => (
                                <button key={s} onClick={() => updateTask(task.id, s)} style={{ padding: '3px 7px', fontSize: 10, border: '1px solid var(--border)', background: 'var(--bg)', borderRadius: 5, cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: 'inherit' }}>→ {s}</button>
                              ))}
                              <button onClick={() => deleteTask(task.id)} style={{ padding: '3px 6px', fontSize: 10, border: '1px solid #FECACA', background: 'var(--red-bg)', borderRadius: 5, cursor: 'pointer', color: 'var(--red)' }}>✕</button>
                            </div>
                          </div>
                        ))}
                        {colTasks.length === 0 && <div style={{ border: '1px dashed var(--border)', borderRadius: 'var(--r-sm)', padding: 12, textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>Leer</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {activeTab === 'updates' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>Tagro AI Updates</p>
                <button onClick={generateAIUpdate} disabled={generatingAI} className="tap-scale" style={{ padding: '6px 12px', background: 'var(--text)', color: '#fff', border: 'none', borderRadius: 'var(--r-sm)', fontSize: 11, fontWeight: 600, cursor: 'pointer', opacity: generatingAI ? 0.5 : 1 }}>
                  {generatingAI ? 'Generiert…' : '+ Update erstellen'}
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {aiUpdates.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: 'var(--r)' }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>Noch keine Updates</p>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Klick "+ Update erstellen" für eine AI-Zusammenfassung</p>
                  </div>
                ) : aiUpdates.map(u => (
                  <div key={u.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>TAGRO AI</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(u.created_at).toLocaleDateString('de', { day: '2-digit', month: 'short' })} · {new Date(u.created_at).toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p style={{ fontSize: 14, color: 'var(--text)', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{u.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — Chat */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', flex: 1 }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Live Dialog</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: online ? 'var(--green-dark)' : 'var(--text-muted)', background: online ? 'var(--green-bg)' : 'var(--surface-2)', padding: '2px 7px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: online ? 'var(--green)' : 'var(--text-muted)', animation: online ? 'pulse 1.5s infinite' : 'none' }} />
                  {online ? 'LIVE' : 'OFFLINE'}
                </span>
              </div>
            </div>

            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12, height: 340, overflowY: 'auto' }}>
              {messages.length === 0 && !aiThinking && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0', margin: 0 }}>Schreib Tagro eine Nachricht…</p>
              )}
              {messages.map(m => {
                const isAI = m.is_ai
                return (
                  <div key={m.id} style={{ display: 'flex', gap: 9 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: isAI ? 'var(--text)' : 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: isAI ? '#fff' : 'var(--text-secondary)', fontWeight: 600, flexShrink: 0, border: isAI ? 'none' : '1px solid var(--border)' }}>
                      {isAI ? 'T' : (userEmail.charAt(0) || 'U').toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{isAI ? 'Tagro' : 'Du'}</span>
                        {isAI && <svg width="11" height="11" viewBox="0 0 24 24" fill="#007AFF"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{new Date(m.created_at).toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>{m.message}</p>
                    </div>
                  </div>
                )
              })}
              {aiThinking && (
                <div style={{ display: 'flex', gap: 9 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', fontWeight: 600, flexShrink: 0 }}>T</div>
                  <div style={{ paddingTop: 10 }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[0,1,2].map(i => <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-muted)', animation: `pulse 1s ${i*0.2}s infinite` }} />)}
                    </div>
                  </div>
                </div>
              )}
              <div ref={msgEndRef} />
            </div>

            <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
              <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Nachricht…" style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 20, padding: '8px 14px', fontSize: 13, outline: 'none' }} />
              <button onClick={sendMessage} className="tap-scale" style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', flexShrink: 0, background: newMsg.trim() ? 'var(--text)' : 'var(--surface-2)', color: newMsg.trim() ? '#fff' : 'var(--text-muted)', cursor: newMsg.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
              {['AI Cinematics','Branding','SEO','Chatbot'].map(a => (
                <button key={a} style={{ padding: '5px 10px', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--surface-2)', fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                  {a} <span style={{ color: 'var(--text)', fontWeight: 600 }}>+</span>
                </button>
              ))}
            </div>
          </div>

          {/* Festag Garantie */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '14px 16px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 10 }}>FESTAG GARANTIE</p>
            {[
              { label: 'AI Check', done: pct > 30 },
              { label: 'Project Owner Review', done: pct > 70 },
              { label: 'Controlled Release', done: project.status === 'done' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.label}</span>
                <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 5, background: item.done ? 'var(--green-bg)' : 'var(--surface-2)', color: item.done ? 'var(--green-dark)' : 'var(--text-muted)' }}>
                  {item.done ? 'PASSED' : 'PENDING'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
