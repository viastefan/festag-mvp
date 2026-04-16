'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'

type Project = { id: string; title: string; description: string | null; status: string }
type Task = { id: string; title: string; status: string; description: string | null }
type Message = { id: string; message: string; created_at: string; sender_id: string }
type AIUpdate = { id: string; content: string; type: string; created_at: string }
type DailyReport = { id: string; summary: string; hours_worked: number; blockers: string | null; created_at: string }

const PROJECT_STATUSES = ['intake', 'planning', 'active', 'done']
const TASK_STATUSES = ['todo', 'doing', 'done']

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [aiUpdates, setAiUpdates] = useState<AIUpdate[]>([])
  const [reports, setReports] = useState<DailyReport[]>([])
  const [newTask, setNewTask] = useState('')
  const [newMsg, setNewMsg] = useState('')
  const [reportText, setReportText] = useState('')
  const [reportHours, setReportHours] = useState('8')
  const [reportBlockers, setReportBlockers] = useState('')
  const [userId, setUserId] = useState('')
  const [activeTab, setActiveTab] = useState<'tasks' | 'messages' | 'ai' | 'reports'>('tasks')
  const [generatingAI, setGeneratingAI] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      setUserId(data.session.user.id)
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
    if (t) setTasks(t)
    if (m) setMessages(m)
    if (ai) setAiUpdates(ai)
    if (rep) setReports(rep)
  }

  async function addTask() {
    if (!newTask.trim()) return
    await supabase.from('tasks').insert({ project_id: id, title: newTask })
    setNewTask(''); loadAll()
  }

  async function updateTaskStatus(taskId: string, status: string) {
    await supabase.from('tasks').update({ status }).eq('id', taskId)
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status } : t))
  }

  async function deleteTask(taskId: string) {
    await supabase.from('tasks').delete().eq('id', taskId)
    setTasks(tasks.filter(t => t.id !== taskId))
  }

  async function updateProjectStatus(status: string) {
    await supabase.from('projects').update({ status }).eq('id', id)
    setProject(p => p ? { ...p, status } : p)
  }

  async function sendMessage() {
    if (!newMsg.trim() || !userId) return
    await supabase.from('messages').insert({ project_id: id, sender_id: userId, message: newMsg })
    setNewMsg(''); loadAll()
  }

  async function submitReport() {
    if (!reportText.trim() || !userId) return
    await supabase.from('daily_reports').insert({
      project_id: id, developer_id: userId,
      summary: reportText, hours_worked: parseFloat(reportHours) || 0,
      blockers: reportBlockers || null
    })
    setReportText(''); setReportBlockers(''); setReportHours('8')
    loadAll()
  }

  async function generateAIUpdate() {
    if (!project) return
    setGeneratingAI(true)
    const done = tasks.filter(t => t.status === 'done').length
    const doing = tasks.filter(t => t.status === 'doing').length
    const todo = tasks.filter(t => t.status === 'todo').length
    const latestReport = reports[0]
    
    const content = `📊 **Tägliches Projekt-Update — ${new Date().toLocaleDateString('de')}**

**Projekt:** ${project.title}
**Status:** ${project.status.toUpperCase()}

**Task-Übersicht:**
✅ Erledigt: ${done} Tasks
🔄 In Bearbeitung: ${doing} Tasks  
📋 Ausstehend: ${todo} Tasks
📈 Fortschritt: ${tasks.length ? Math.round(done / tasks.length * 100) : 0}%

${latestReport ? `**Heutiger Developer-Report:**
${latestReport.summary}
⏱ Geleistete Stunden: ${latestReport.hours_worked}h
${latestReport.blockers ? `⚠️ Blocker: ${latestReport.blockers}` : '✅ Keine Blocker'}` : '**Kein Developer-Report heute.**'}

**Nächste Schritte:**
${tasks.filter(t => t.status === 'todo').slice(0, 3).map(t => `• ${t.title}`).join('\n') || '• Alle Tasks erledigt'}

_Generiert von Festag AI System_`

    await supabase.from('ai_updates').insert({
      project_id: id, content, type: 'daily_summary'
    })
    setGeneratingAI(false)
    loadAll()
  }

  if (!project) return <div style={{ padding: 40, color: '#9CA3AF' }}>Lädt...</div>

  const done = tasks.filter(t => t.status === 'done').length
  const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0
  const grouped = {
    todo: tasks.filter(t => t.status === 'todo'),
    doing: tasks.filter(t => t.status === 'doing'),
    done: tasks.filter(t => t.status === 'done')
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 16 }}>
        <Link href="/dashboard" style={{ color: '#2F6BFF', textDecoration: 'none' }}>Dashboard</Link>
        {' / '}{project.title}
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{project.title}</h1>
        <select value={project.status} onChange={e => updateProjectStatus(e.target.value)} style={s.select}>
          {PROJECT_STATUSES.map(st => <option key={st} value={st}>{st.charAt(0).toUpperCase() + st.slice(1)}</option>)}
        </select>
      </div>
      {project.description && <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 16 }}>{project.description}</p>}

      {/* Progress bar */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>
          <span>{tasks.length} Tasks · {done} erledigt</span><span>{pct}%</span>
        </div>
        <div style={{ height: 6, background: '#F3F4F6', borderRadius: 4 }}>
          <div style={{ width: `${pct}%`, height: '100%', background: '#2F6BFF', borderRadius: 4, transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #E6E8EE', marginBottom: 24, gap: 0 }}>
        {([
          { key: 'tasks', label: '✓ Tasks' },
          { key: 'ai', label: '🤖 AI Updates' },
          { key: 'reports', label: '📋 Dev Reports' },
          { key: 'messages', label: '💬 Messages' },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: '10px 20px', border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: 13, fontWeight: activeTab === tab.key ? 600 : 400,
            color: activeTab === tab.key ? '#2F6BFF' : '#6B7280',
            borderBottom: activeTab === tab.key ? '2px solid #2F6BFF' : '2px solid transparent',
            marginBottom: -1
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* TASKS TAB */}
      {activeTab === 'tasks' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <input value={newTask} onChange={e => setNewTask(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTask()}
              placeholder="Task hinzufügen..." style={{ ...s.input, flex: 1 }} />
            <button onClick={addTask} style={s.btnPrimary}>+ Hinzufügen</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {TASK_STATUSES.map(col => (
              <div key={col}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <StatusBadge status={col} />
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>{grouped[col as keyof typeof grouped].length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {grouped[col as keyof typeof grouped].map(task => (
                    <div key={task.id} style={s.taskCard}>
                      <p style={{ fontSize: 14, fontWeight: 500, margin: '0 0 10px' }}>{task.title}</p>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {TASK_STATUSES.filter(st => st !== col).map(st => (
                          <button key={st} onClick={() => updateTaskStatus(task.id, st)} style={s.taskBtn}>→ {st}</button>
                        ))}
                        <button onClick={() => deleteTask(task.id)} style={{ ...s.taskBtn, color: '#EF4444' }}>✕</button>
                      </div>
                    </div>
                  ))}
                  {grouped[col as keyof typeof grouped].length === 0 && (
                    <div style={{ border: '1px dashed #E6E8EE', borderRadius: 8, padding: 16, textAlign: 'center', color: '#D1D5DB', fontSize: 13 }}>Keine Tasks</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI UPDATES TAB */}
      {activeTab === 'ai' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>AI System Updates</h3>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9CA3AF' }}>Automatische Projektzusammenfassungen für den Kunden</p>
            </div>
            <button onClick={generateAIUpdate} disabled={generatingAI} style={{ ...s.btnPrimary, background: '#7C3AED', opacity: generatingAI ? 0.6 : 1 }}>
              {generatingAI ? '⏳ Generiert...' : '🤖 AI Update erstellen'}
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {aiUpdates.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', background: '#F9FAFB', borderRadius: 12, border: '1px dashed #E6E8EE' }}>
                <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 4px' }}>Noch keine AI Updates</p>
                <p style={{ fontSize: 13, color: '#9CA3AF' }}>Klick "AI Update erstellen" um eine automatische Zusammenfassung zu generieren</p>
              </div>
            )}
            {aiUpdates.map(update => (
              <div key={update.id} style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#7C3AED', background: '#EDE9FE', padding: '3px 10px', borderRadius: 20 }}>
                    🤖 {update.type.replace('_', ' ').toUpperCase()}
                  </span>
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                    {new Date(update.created_at).toLocaleDateString('de')} {new Date(update.created_at).toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <pre style={{ margin: 0, fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: '#374151' }}>
                  {update.content}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DEV REPORTS TAB */}
      {activeTab === 'reports' && (
        <div>
          <div style={{ background: '#fff', border: '1px solid #E6E8EE', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>📋 Tagesbericht einreichen</h3>
            <label style={s.label}>Was habe ich heute gemacht?</label>
            <textarea value={reportText} onChange={e => setReportText(e.target.value)}
              placeholder="Beschreibe deine heutige Arbeit..." style={{ ...s.input, height: 100, resize: 'vertical' as const }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <div>
                <label style={s.label}>Geleistete Stunden</label>
                <input type="number" value={reportHours} onChange={e => setReportHours(e.target.value)} min="0" max="24" step="0.5" style={s.input} />
              </div>
              <div>
                <label style={s.label}>Blocker (optional)</label>
                <input value={reportBlockers} onChange={e => setReportBlockers(e.target.value)} placeholder="Was hat blockiert?" style={s.input} />
              </div>
            </div>
            <button onClick={submitReport} disabled={!reportText.trim()} style={{ ...s.btnPrimary, marginTop: 16, opacity: !reportText.trim() ? 0.6 : 1 }}>
              Bericht einreichen
            </button>
          </div>

          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Bisherige Berichte</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {reports.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF', background: '#F9FAFB', borderRadius: 12, border: '1px dashed #E6E8EE' }}>Noch keine Berichte.</div>
            )}
            {reports.map(r => (
              <div key={r.id} style={{ background: '#fff', border: '1px solid #E6E8EE', borderRadius: 10, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#065F46', background: '#D1FAE5', padding: '3px 10px', borderRadius: 20 }}>
                    ⏱ {r.hours_worked}h gearbeitet
                  </span>
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                    {new Date(r.created_at).toLocaleDateString('de', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </span>
                </div>
                <p style={{ margin: '0 0 8px', fontSize: 14 }}>{r.summary}</p>
                {r.blockers && <p style={{ margin: 0, fontSize: 13, color: '#EF4444' }}>⚠️ Blocker: {r.blockers}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MESSAGES TAB */}
      {activeTab === 'messages' && (
        <div>
          <div style={s.msgFeed}>
            {messages.length === 0 && <p style={{ color: '#9CA3AF', textAlign: 'center', fontSize: 14, padding: 20 }}>Noch keine Nachrichten.</p>}
            {messages.map(m => (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.sender_id === userId ? 'flex-end' : 'flex-start' }}>
                <div style={{ ...s.bubble, ...(m.sender_id === userId ? s.bubbleOwn : s.bubbleOther) }}>
                  <p style={{ margin: 0, fontSize: 14 }}>{m.message}</p>
                </div>
                <span style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 4px 0' }}>
                  {new Date(m.created_at).toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input value={newMsg} onChange={e => setNewMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Nachricht..." style={{ ...s.input, flex: 1 }} />
            <button onClick={sendMessage} style={s.btnPrimary}>Senden</button>
          </div>
        </div>
      )}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  select: { padding: '7px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 13, outline: 'none', cursor: 'pointer', background: '#fff' },
  input: { width: '100%', padding: '9px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, outline: 'none', background: '#FAFAFA', boxSizing: 'border-box' as const },
  label: { fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 },
  btnPrimary: { padding: '9px 18px', background: '#2F6BFF', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' as const },
  taskCard: { background: '#fff', border: '1px solid #E6E8EE', borderRadius: 10, padding: 14 },
  taskBtn: { padding: '3px 8px', fontSize: 11, border: '1px solid #E6E8EE', background: '#F9FAFB', borderRadius: 6, cursor: 'pointer', color: '#6B7280', fontWeight: 500 },
  msgFeed: { display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 400, overflowY: 'auto', background: '#F9FAFB', borderRadius: 12, padding: 16 },
  bubble: { padding: '10px 14px', borderRadius: 12, maxWidth: '70%' },
  bubbleOwn: { background: '#EEF3FF', border: '1px solid #C7D7FF' },
  bubbleOther: { background: '#fff', border: '1px solid #E6E8EE' },
}
