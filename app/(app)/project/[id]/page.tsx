'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import StatusBadge from '@/components/StatusBadge'
import Link from 'next/link'

type Project = { id: string; title: string; description: string | null; status: string }
type Task = { id: string; title: string; status: string; description: string | null }
type Message = { id: string; message: string; created_at: string; sender_id: string }

const PROJECT_STATUSES = ['intake', 'planning', 'active', 'done']
const TASK_STATUSES = ['todo', 'doing', 'done']

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [newTask, setNewTask] = useState('')
  const [newMsg, setNewMsg] = useState('')
  const [userId, setUserId] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'tasks' | 'messages'>('tasks')
  const supabase = createClient()

  useEffect(() => {
    loadAll()
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? ''))
  }, [id])

  async function loadAll() {
    const [{ data: proj }, { data: t }, { data: m }] = await Promise.all([
      supabase.from('projects').select('*').eq('id', id).single(),
      supabase.from('tasks').select('*').eq('project_id', id).order('created_at'),
      supabase.from('messages').select('*').eq('project_id', id).order('created_at'),
    ])
    if (proj) setProject(proj)
    if (t) setTasks(t)
    if (m) setMessages(m)
  }

  async function addTask() {
    if (!newTask.trim()) return
    await supabase.from('tasks').insert({ project_id: id, title: newTask })
    setNewTask('')
    loadAll()
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
    if (!newMsg.trim()) return
    await supabase.from('messages').insert({ project_id: id, sender_id: userId, message: newMsg })
    setNewMsg('')
    loadAll()
  }

  if (!project) return <div style={{ padding: 40, color: '#9CA3AF' }}>Lädt...</div>

  const done = tasks.filter(t => t.status === 'done').length
  const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0
  const grouped = { todo: tasks.filter(t => t.status === 'todo'), doing: tasks.filter(t => t.status === 'doing'), done: tasks.filter(t => t.status === 'done') }

  return (
    <div>
      {/* Breadcrumb */}
      <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 16 }}>
        <Link href="/dashboard" style={{ color: '#2F6BFF', textDecoration: 'none' }}>Dashboard</Link>
        {' / '}{project.title}
      </p>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{project.title}</h1>
        <select value={project.status} onChange={e => updateProjectStatus(e.target.value)} style={s.select}>
          {PROJECT_STATUSES.map(st => <option key={st} value={st}>{st.charAt(0).toUpperCase() + st.slice(1)}</option>)}
        </select>
      </div>
      {project.description && <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 16 }}>{project.description}</p>}

      {/* Progress */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>
          <span>{tasks.length} Tasks · {done} erledigt</span><span>{pct}%</span>
        </div>
        <div style={{ height: 6, background: '#F3F4F6', borderRadius: 4 }}>
          <div style={{ width: `${pct}%`, height: '100%', background: '#2F6BFF', borderRadius: 4 }} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #E6E8EE', marginBottom: 24 }}>
        {(['tasks', 'messages'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            ...s.tab, ...(activeTab === tab ? s.tabActive : {})
          }}>
            {tab === 'tasks' ? '✓ Tasks' : '◻ Messages'}
          </button>
        ))}
      </div>

      {activeTab === 'tasks' && (
        <div>
          {/* Add task */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
            <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()} placeholder="Task hinzufügen..." style={{ ...s.input, flex: 1 }} />
            <button onClick={addTask} style={s.btnPrimary}>Hinzufügen</button>
          </div>

          {/* Kanban columns */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {TASK_STATUSES.map(col => (
              <div key={col}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <StatusBadge status={col} />
                  <span style={{ fontSize: 13, color: '#9CA3AF' }}>{grouped[col as keyof typeof grouped].length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {grouped[col as keyof typeof grouped].map(task => (
                    <div key={task.id} style={s.taskCard}>
                      <p style={{ fontSize: 14, fontWeight: 500, margin: '0 0 10px' }}>{task.title}</p>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {TASK_STATUSES.filter(s => s !== col).map(st => (
                          <button key={st} onClick={() => updateTaskStatus(task.id, st)} style={s.taskBtn}>
                            → {st}
                          </button>
                        ))}
                        <button onClick={() => deleteTask(task.id)} style={{ ...s.taskBtn, color: '#EF4444' }}>✕</button>
                      </div>
                    </div>
                  ))}
                  {grouped[col as keyof typeof grouped].length === 0 && (
                    <div style={{ border: '1px dashed #E6E8EE', borderRadius: 8, padding: 16, textAlign: 'center', color: '#D1D5DB', fontSize: 13 }}>
                      Keine Tasks
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'messages' && (
        <div>
          <div style={s.msgFeed}>
            {messages.length === 0 && (
              <p style={{ color: '#9CA3AF', textAlign: 'center', fontSize: 14, padding: 20 }}>Noch keine Nachrichten.</p>
            )}
            {messages.map(m => (
              <div key={m.id} style={{ ...s.msgBubble, ...(m.sender_id === userId ? s.msgOwn : {}) }}>
                <p style={{ margin: 0, fontSize: 14 }}>{m.message}</p>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9CA3AF' }}>
                  {new Date(m.created_at).toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Nachricht..." style={{ ...s.input, flex: 1 }} />
            <button onClick={sendMessage} style={s.btnPrimary}>Senden</button>
          </div>
        </div>
      )}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  select: { padding: '7px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 13, outline: 'none', cursor: 'pointer', background: '#fff' },
  tab: { padding: '10px 20px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, color: '#6B7280', fontWeight: 500, borderBottom: '2px solid transparent', marginBottom: -1 },
  tabActive: { color: '#2F6BFF', fontWeight: 600, borderBottom: '2px solid #2F6BFF' },
  input: { padding: '9px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, outline: 'none', background: '#FAFAFA', boxSizing: 'border-box' as const },
  btnPrimary: { padding: '9px 18px', background: '#2F6BFF', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  taskCard: { background: '#fff', border: '1px solid #E6E8EE', borderRadius: 10, padding: '14px' },
  taskBtn: { padding: '3px 8px', fontSize: 11, border: '1px solid #E6E8EE', background: '#F9FAFB', borderRadius: 6, cursor: 'pointer', color: '#6B7280', fontWeight: 500 },
  msgFeed: { display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 400, overflowY: 'auto', background: '#F9FAFB', borderRadius: 12, padding: 16 },
  msgBubble: { background: '#fff', border: '1px solid #E6E8EE', borderRadius: 10, padding: '10px 14px', maxWidth: '70%', alignSelf: 'flex-start' },
  msgOwn: { background: '#EEF3FF', border: '1px solid #C7D7FF', alignSelf: 'flex-end' },
}
