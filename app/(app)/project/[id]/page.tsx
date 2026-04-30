'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import ChatMarkdown from '@/components/ChatMarkdown'
import { projectColor } from '@/components/Sidebar'
import { effectiveRole, isDevOrAdmin } from '@/lib/role'

type Project = { id: string; title: string; description: string|null; status: string }
type Task = { id: string; title: string; status: string; priority?: string }
type Msg = { id: string; message: string; created_at: string; sender_id: string; is_ai?: boolean }

const PHASES = ['intake','planning','active','testing','done']
const PHASE_LABEL: Record<string,string> = { intake:'Intake', planning:'Planning', active:'Development', testing:'Testing', done:'Delivered' }
const PHASE_COLOR: Record<string,string> = { intake:'#6366f1', planning:'#f59e0b', active:'#22c55e', testing:'#0ea5e9', done:'var(--text-muted)' }
const PRIORITY_COLOR: Record<string,string> = { critical:'#ef4444', high:'#f97316', medium:'#f59e0b', low:'#22c55e' }

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
  const [userRole, setUserRole] = useState<'client'|'dev'|'admin'|''>('')
  const [activeLeft, setActiveLeft] = useState<'tasks'|'updates'>('tasks')
  const [aiThinking, setAiThinking] = useState(false)
  const [generatingAI, setGeneratingAI] = useState(false)
  const [online, setOnline] = useState(false)
  const msgEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // canEdit = Devs/Admins: dürfen Status setzen, alles löschen, Phase ändern, kein Limit
  // Clients: dürfen Tasks NUR in "todo" anlegen und löschen — max 20 pro Woche
  // Hinweis: Frontend-Gating; für echten Schutz Supabase RLS zusätzlich konfigurieren.
  // Effective role: respects 'festag_view_as' localStorage so admin can test as client.
  const eff = effectiveRole(userRole || null)
  const canEdit = isDevOrAdmin(userRole || null)

  const TASK_WEEK_LIMIT = 20
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000
  const logKey = userId ? `task_create_log_${userId}` : ''

  function getRecentCreations(): number[] {
    if (typeof window === 'undefined' || !logKey) return []
    try {
      const raw = window.localStorage.getItem(logKey)
      if (!raw) return []
      const arr: number[] = JSON.parse(raw)
      const cutoff = Date.now() - WEEK_MS
      const fresh = arr.filter(t => t > cutoff)
      if (fresh.length !== arr.length) window.localStorage.setItem(logKey, JSON.stringify(fresh))
      return fresh
    } catch { return [] }
  }

  function recordCreation() {
    if (typeof window === 'undefined' || !logKey) return
    const recent = getRecentCreations()
    recent.push(Date.now())
    window.localStorage.setItem(logKey, JSON.stringify(recent))
  }

  const [clientUsage, setClientUsage] = useState(0)
  useEffect(() => {
    if (eff === 'client') setClientUsage(getRecentCreations().length)
  }, [userRole, userId])
  const clientRemaining = Math.max(0, TASK_WEEK_LIMIT - clientUsage)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      const uid = data.session.user.id
      setUserId(uid)
      setUserEmail(data.session.user.email ?? '')
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', uid).single()
      const role = (prof as any)?.role
      if (role === 'admin' || role === 'dev' || role === 'client') setUserRole(role)
      loadAll()
    })

    // Realtime
    const channel = supabase
      .channel(`proj-${id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages', filter: `project_id=eq.${id}`
      }, (payload) => {
        setMessages(prev => [...prev.filter(m => !m.id.startsWith('tmp-')), payload.new as Msg])
        setAiThinking(false)
      })
      .subscribe(status => setOnline(status === 'SUBSCRIBED'))

    return () => { supabase.removeChannel(channel) }
  }, [id])

  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, aiThinking])

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
    const tmpId = 'tmp-' + Date.now()
    setMessages(prev => [...prev, { id: tmpId, message: msg, created_at: new Date().toISOString(), sender_id: userId, is_ai: false }])
    await supabase.from('messages').insert({ project_id: id, sender_id: userId, message: msg, is_ai: false })
    setAiThinking(true)
    setTimeout(async () => {
      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            max_tokens: 200,
            system: `Du bist Tagro, AI-System von Festag. Antworte klar, max 2 Sätze. Kein Smalltalk. Projekt: "${project?.title || 'Unbekannt'}"`,
            messages: [{ role: 'user', content: msg }],
          }),
        })
        const data = await res.json()
        const aiMsg = data.content?.[0]?.text
        if (aiMsg) await supabase.from('messages').insert({ project_id: id, sender_id: userId, message: aiMsg, is_ai: true })
        else setAiThinking(false)
      } catch { setAiThinking(false) }
    }, 900)
  }

  async function addTask() {
    if (!newTask.trim()) return
    if (eff === 'client') {
      const recent = getRecentCreations()
      if (recent.length >= TASK_WEEK_LIMIT) {
        alert(`Wochenlimit erreicht: max ${TASK_WEEK_LIMIT} neue Tasks pro 7 Tage.\nDas Limit setzt sich automatisch zurück, sobald ältere Einträge mehr als 7 Tage alt sind.`)
        return
      }
    }
    const { data, error } = await supabase.from('tasks').insert({ project_id: id, title: newTask.trim(), status: 'todo' }).select().single()
    if (error) { alert(`Konnte Task nicht anlegen: ${error.message}`); return }
    if (data) {
      setTasks(prev => [...prev, data])
      if (eff === 'client') {
        recordCreation()
        setClientUsage(getRecentCreations().length)
      }
    }
    setNewTask('')
  }

  async function updateTask(taskId: string, status: string) {
    await supabase.from('tasks').update({ status }).eq('id', taskId)
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status } : t))
  }

  async function deleteTask(taskId: string) {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    if (!canEdit && task.status !== 'todo') {
      alert('Nur Tasks in der Spalte "To Do" können gelöscht werden.')
      return
    }
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
    const doing = tasks.filter(t => t.status === 'doing').length
    const todo = tasks.filter(t => t.status === 'todo').length
    const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0

    const taskOverview = tasks.length
      ? `\nTasks im Detail:\n${tasks.slice(0, 20).map(t => `- [${t.status}] ${t.title}`).join('\n')}`
      : ''

    const userPrompt =
      `Projekt: "${project.title}"\n` +
      (project.description ? `Beschreibung: ${project.description}\n` : '') +
      `Phase: ${PHASE_LABEL[project.status]}\n` +
      `Fortschritt: ${pct}% (${done} erledigt, ${doing} aktiv, ${todo} offen)` +
      taskOverview +
      `\n\nErstelle jetzt einen professionellen Statusbericht.`

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          max_tokens: 500,
          system: `Du bist Tagro, der AI-Projektmanager von Festag. Erstelle einen professionellen Statusbericht auf Deutsch.
Struktur (nutze Markdown):
**Erledigt:** Was wurde abgeschlossen
**In Arbeit:** Was läuft gerade
**Nächste Schritte:** Was kommt als Nächstes
**Risiken:** Falls erkennbar — sonst weglassen

Regeln: Keine Emojis. Knapp und konkret. Beziehe dich auf konkrete Tasks wenn möglich.`,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      })
      const data = await res.json()
      if (data?.error) {
        alert(`Bericht konnte nicht erstellt werden: ${data.error}`)
        setGeneratingAI(false)
        return
      }
      const content = data.content?.[0]?.text
      if (!content) {
        alert('Tagro hat keinen Inhalt zurückgegeben. Bitte erneut versuchen.')
        setGeneratingAI(false)
        return
      }
      const { data: inserted, error } = await supabase.from('ai_updates').insert({ project_id: id, content, type: 'daily_summary' }).select().single()
      if (error) { alert(`Speicherfehler: ${error.message}`); setGeneratingAI(false); return }
      if (inserted) setAiUpdates(prev => [inserted, ...prev])
    } catch (e: any) {
      alert(`Fehler: ${e?.message ?? 'Verbindungsproblem'}`)
    }
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
  const pCol = projectColor(project.id)
  const phaseCol = PHASE_COLOR[project.status] ?? pCol

  return (
    <div className="page-content animate-fade-up" style={{ maxWidth: 1160 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}} @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.3;}}`}</style>

      {/* Breadcrumb */}
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
        <Link href="/dashboard" style={{ color: 'var(--text-muted)', textDecoration:'none' }}>Dashboard</Link>
        <span style={{ margin: '0 6px', opacity:.4 }}>/</span>
        <span style={{ color: 'var(--text-secondary)' }}>Projekt</span>
      </p>

      {/* Header card with color accent */}
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:20, overflow:'hidden', marginBottom:14 }}>
        <div style={{ height:4, background:`linear-gradient(to right, ${pCol}, ${phaseCol})` }}/>
        <div style={{ padding:'18px 24px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16 }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:14, flex:1, minWidth:0 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:`${pCol}18`, border:`2px solid ${pCol}30`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ fontSize:18, fontWeight:700, color:pCol }}>{project.title.charAt(0)}</span>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <h1 style={{ marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:20 }}>{project.title}</h1>
              {project.description && <p style={{ fontSize:13, color:'var(--text-secondary)', margin:0, lineHeight:1.5 }}>{project.description}</p>}
            </div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
            {/* Phase stepper */}
            <div style={{ display:'flex', gap:4, alignItems:'center', background:'var(--surface-2)', borderRadius:10, padding:'5px 8px' }}
              title={canEdit ? 'Phase ändern' : 'Phase wird vom Entwicklerteam gesteuert'}>
              {PHASES.map((phase, i) => {
                const isActive = i === phaseIdx
                const isPast   = i < phaseIdx
                return canEdit ? (
                  <button key={phase} onClick={() => updateStatus(phase)} title={PHASE_LABEL[phase]}
                    style={{ width:isActive?24:8, height:8, borderRadius:4, border:'none', cursor:'pointer', padding:0, transition:'all .2s',
                      background: isPast||isActive ? PHASE_COLOR[phase]??pCol : 'var(--border)' }}/>
                ) : (
                  <span key={phase} title={PHASE_LABEL[phase]}
                    style={{ width:isActive?24:8, height:8, borderRadius:4, transition:'all .2s',
                      background: isPast||isActive ? PHASE_COLOR[phase]??pCol : 'var(--border)' }}/>
                )
              })}
            </div>
            <span style={{ padding:'5px 11px', borderRadius:8, fontSize:11, fontWeight:700, flexShrink:0,
              color:project.status==='active'?'#16a34a':project.status==='done'?'var(--text-muted)':'#d97706',
              background:project.status==='active'?'rgba(34,197,94,.1)':project.status==='done'?'var(--surface-2)':'rgba(245,158,11,.1)',
              border:`1px solid ${project.status==='active'?'rgba(34,197,94,.25)':project.status==='done'?'var(--border)':'rgba(245,158,11,.25)'}`,
              display:'inline-flex', alignItems:'center', gap:5 }}>
              {project.status==='active' && <span style={{ width:5, height:5, borderRadius:'50%', background:'#22c55e', animation:'pulse 2s infinite' }}/>}
              {PHASE_LABEL[project.status] ?? project.status}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ padding:'0 24px 18px', borderTop:'1px solid var(--border)', paddingTop:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
            <span style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)' }}>Gesamtfortschritt</span>
            <span style={{ fontSize:13, fontWeight:700, color:phaseCol }}>{pct}%</span>
          </div>
          <div style={{ height:6, background:'var(--surface-2)', borderRadius:6, overflow:'hidden', marginBottom:12 }}>
            <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(to right, ${pCol}, ${phaseCol})`, borderRadius:6, transition:'width .6s ease' }}/>
          </div>
          <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
            {[
              { label:'Offen',    count: tasks.filter(t => t.status === 'todo').length, color:'var(--text-muted)' },
              { label:'Aktiv',    count: tasks.filter(t => t.status === 'doing').length, color:'#f59e0b' },
              { label:'Erledigt', count: done,                                           color:'#22c55e' },
            ].map(s => (
              <span key={s.label} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--text-muted)' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:s.color }}/>
                {s.label}: <strong style={{ color:'var(--text)' }}>{s.count}</strong>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ MAIN 2-COL LAYOUT ═══ */}
      <div className="grid-cols-2-mobile-1" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 14 }}>

        {/* LEFT — Tasks + Status Updates */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Tab switcher */}
          <div style={{ display: 'flex', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', padding: 3, gap: 2 }}>
            {([
              { key: 'tasks', label: `Tasks (${tasks.length})` },
              { key: 'updates', label: 'AI Statusbericht' },
            ] as const).map(tab => (
              <button key={tab.key} onClick={() => setActiveLeft(tab.key)} style={{
                flex: 1, padding: '8px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontSize: 13, fontFamily: 'inherit', transition: 'all 0.12s',
                background: activeLeft === tab.key ? 'var(--surface)' : 'transparent',
                color: activeLeft === tab.key ? 'var(--text)' : 'var(--text-muted)',
                fontWeight: activeLeft === tab.key ? 600 : 500,
                boxShadow: activeLeft === tab.key ? 'var(--shadow-xs)' : 'none',
              }}>{tab.label}</button>
            ))}
          </div>

          {/* TASKS TAB */}
          {activeLeft === 'tasks' && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
              {/* Add task input — Clients dürfen auch, mit Wochenlimit */}
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={newTask} onChange={e => setNewTask(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addTask()}
                    placeholder={eff === 'client' && clientRemaining === 0 ? 'Wochenlimit erreicht' : 'Task hinzufügen…'}
                    disabled={eff === 'client' && clientRemaining === 0}
                    style={{ flex: 1, padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', fontSize: 13, outline: 'none', background: 'var(--bg)', opacity: eff === 'client' && clientRemaining === 0 ? 0.5 : 1 }}
                  />
                  <button onClick={addTask} disabled={!newTask.trim() || (eff === 'client' && clientRemaining === 0)} className="tap-scale" style={{ padding: '9px 14px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: 'var(--r-sm)', fontSize: 12, fontWeight: 600, cursor: newTask.trim() && !(eff === 'client' && clientRemaining === 0) ? 'pointer' : 'default', opacity: newTask.trim() && !(eff === 'client' && clientRemaining === 0) ? 1 : 0.4 }}>
                    + Hinzufügen
                  </button>
                </div>
                {eff === 'client' && (
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '8px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: clientRemaining > 5 ? 'var(--green)' : clientRemaining > 0 ? 'var(--amber)' : 'var(--red)' }} />
                    {clientRemaining} von {TASK_WEEK_LIMIT} neuen Tasks diese Woche übrig · Status-Wechsel macht das Entwicklerteam
                  </p>
                )}
              </div>

              {/* Kanban columns */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
                {[
                  { status: 'todo',  label: 'To Do',      color: 'var(--text-muted)', bg:'var(--surface-2)' },
                  { status: 'doing', label: 'In Progress', color: '#d97706',           bg:'rgba(245,158,11,.06)' },
                  { status: 'done',  label: 'Done',        color: '#16a34a',           bg:'rgba(34,197,94,.05)' },
                ].map((col, ci) => {
                  const colTasks = tasks.filter(t => t.status === col.status)
                  return (
                    <div key={col.status} style={{ borderRight: ci < 2 ? '1px solid var(--border)' : 'none', padding: 12, background: colTasks.length > 0 ? col.bg : 'transparent', transition:'background .2s' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10, padding:'2px 0' }}>
                        <span style={{ width:7, height:7, borderRadius:'50%', background:col.color }}/>
                        <span style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.07em' }}>
                          {col.label.toUpperCase()}
                        </span>
                        <span style={{ marginLeft:'auto', fontSize:10, fontWeight:700, color:col.color, background:`${col.color}18`, padding:'1px 6px', borderRadius:5 }}>{colTasks.length}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                        {colTasks.map(task => {
                          const showDelete = canEdit || (eff === 'client' && col.status === 'todo')
                          const showStatusButtons = canEdit
                          const showActions = showDelete || showStatusButtons
                          const priColor = task.priority ? PRIORITY_COLOR[task.priority] : null
                          return (
                            <div key={task.id} style={{ background:'var(--bg)', border:`1px solid var(--border)`, borderRadius:10, overflow:'hidden' }}>
                              {priColor && <div style={{ height:2.5, background:priColor }}/>}
                              <div style={{ padding:'9px 11px' }}>
                                <p style={{ fontSize:12.5, fontWeight:500, color:'var(--text)', margin: showActions ? '0 0 8px' : '0', lineHeight:1.4 }}>{task.title}</p>
                                {task.priority && task.priority !== 'medium' && (
                                  <span style={{ display:'inline-block', fontSize:9, fontWeight:700, color:priColor!, background:`${priColor}18`, padding:'1px 5px', borderRadius:4, letterSpacing:'.05em', marginBottom:showActions?6:0 }}>
                                    {task.priority.toUpperCase()}
                                  </span>
                                )}
                                {showActions && (
                                  <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
                                    {showStatusButtons && ['todo','doing','done'].filter(s => s !== col.status).map(s => {
                                      const next = { todo:'← Todo', doing:'→ Aktiv', done:'✓ Done' }[s] ?? s
                                      return (
                                        <button key={s} onClick={() => updateTask(task.id, s)}
                                          style={{ padding:'2px 7px', fontSize:9.5, border:'1px solid var(--border)', background:'var(--surface)', borderRadius:5, cursor:'pointer', color:'var(--text-secondary)', fontFamily:'inherit', transition:'background .1s' }}>
                                          {next}
                                        </button>
                                      )
                                    })}
                                    {showDelete && (
                                      <button onClick={() => deleteTask(task.id)} title="Task löschen"
                                        style={{ padding:'2px 6px', fontSize:9.5, border:'1px solid rgba(239,68,68,.2)', background:'rgba(239,68,68,.06)', borderRadius:5, cursor:'pointer', color:'#ef4444' }}>✕</button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                        {colTasks.length === 0 && (
                          <div style={{ border: '1px dashed var(--border)', borderRadius: 'var(--r-sm)', padding: '10px 8px', textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>Leer</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* AI UPDATES TAB */}
          {activeLeft === 'updates' && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Tagro AI Statusberichte</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>AI-generierte Zusammenfassungen</p>
                </div>
                <button onClick={generateAIUpdate} disabled={generatingAI} className="tap-scale" style={{ padding: '7px 13px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: 'var(--r-sm)', fontSize: 11, fontWeight: 600, cursor: 'pointer', opacity: generatingAI ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {generatingAI ? (
                    <>
                      <span style={{ width: 11, height: 11, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                      Generiert…
                    </>
                  ) : '+ Bericht erstellen'}
                </button>
              </div>
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 440, overflowY: 'auto' }}>
                {aiUpdates.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 'var(--r)' }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', margin: '0 0 4px' }}>Noch keine Berichte</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Klick "+ Bericht erstellen" für eine AI-Zusammenfassung</p>
                  </div>
                ) : aiUpdates.map(u => (
                  <div key={u.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
                    <div style={{ padding: '8px 14px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>TAGRO AI · STATUSBERICHT</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {new Date(u.created_at).toLocaleDateString('de', { day: '2-digit', month: 'short' })} · {new Date(u.created_at).toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ padding: '12px 14px', fontSize: 13.5, color: 'var(--text)', lineHeight: 1.65 }}>
                      <ChatMarkdown text={u.content} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — Live Chat (always visible) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Chat box */}
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:20, overflow:'hidden', display:'flex', flexDirection:'column', height:480 }}>
            <div style={{ padding:'13px 18px', borderBottom:'1px solid var(--border)', background:'var(--bg)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:28, height:28, borderRadius:8, background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span style={{ fontSize:11, color:'var(--accent-text)', fontWeight:700 }}>✦</span>
                </div>
                <div>
                  <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', margin:0 }}>Live Dialog & AI</p>
                  <p style={{ fontSize:10, color:'var(--text-muted)', margin:'1px 0 0' }}>Tagro + Developer Kommunikation</p>
                </div>
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, color: online ? 'var(--green-dark)' : 'var(--text-muted)', background: online ? 'var(--green-bg)' : 'var(--surface-2)', padding: '3px 8px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 4, border: `1px solid ${online ? 'var(--green-border)' : 'var(--border)'}`, letterSpacing: '0.06em' }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: online ? 'var(--green)' : 'var(--text-muted)', animation: online ? 'pulse 1.5s infinite' : 'none' }} />
                {online ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {messages.length === 0 && !aiThinking && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0', margin: 0 }}>
                  Starte eine Konversation mit Tagro…
                </p>
              )}
              {messages.map(m => {
                const isAI = m.is_ai
                return (
                  <div key={m.id} style={{ display: 'flex', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: isAI ? 'var(--text)' : 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: isAI ? '#fff' : 'var(--text-secondary)', fontWeight: 600, flexShrink: 0, border: isAI ? 'none' : '1px solid var(--border)' }}>
                      {isAI ? 'T' : (userEmail.charAt(0) || 'U').toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginBottom: 3 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)' }}>{isAI ? 'Tagro' : 'Du'}</span>
                        {isAI && <svg width="11" height="11" viewBox="0 0 24 24" fill="#007AFF"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          {new Date(m.created_at).toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>{m.message}</p>
                    </div>
                  </div>
                )
              })}
              {aiThinking && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--accent-text)', fontWeight: 600, flexShrink: 0 }}>T</div>
                  <div style={{ paddingTop: 8, display: 'flex', gap: 4 }}>
                    {[0,1,2].map(i => <span key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--text-muted)', animation: `pulse 1s ${i*0.2}s infinite` }} />)}
                  </div>
                </div>
              )}
              <div ref={msgEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 7 }}>
              <input
                value={newMsg} onChange={e => setNewMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Nachricht an Tagro / Developer…"
                style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 20, padding: '8px 14px', fontSize: 13, outline: 'none' }}
              />
              <button onClick={sendMessage} disabled={!newMsg.trim()} className="tap-scale" style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', flexShrink: 0, background: newMsg.trim() ? 'var(--text)' : 'var(--surface-2)', color: newMsg.trim() ? '#fff' : 'var(--text-muted)', cursor: newMsg.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 17L17 7M9 7h8v8"/></svg>
              </button>
            </div>
          </div>

          {/* Quick Add-ons */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '12px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>ADD-ONS</span>
              <Link href="/addons" style={{ fontSize: 11, color: 'var(--text)', fontWeight: 600 }}>Alle →</Link>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {['AI Cinematics','Branding','SEO','Chatbot'].map(a => (
                <button key={a} style={{ padding: '4px 10px', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--surface-2)', fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  {a} <span style={{ color: 'var(--text)' }}>+</span>
                </button>
              ))}
            </div>
          </div>

          {/* Festag Garantie */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '12px 16px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 9 }}>FESTAG GARANTIE</p>
            {[
              { label: 'AI Check',             done: pct > 30 },
              { label: 'Project Owner Review', done: pct > 70 },
              { label: 'Controlled Release',   done: project.status === 'done' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.label}</span>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: item.done ? 'var(--green-bg)' : 'var(--surface-2)', color: item.done ? 'var(--green-dark)' : 'var(--text-muted)', letterSpacing: '0.04em' }}>
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
