'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'

type Task = { id: string; title: string; status: string; project_id: string; project_title?: string }
type Filter = 'all' | 'todo' | 'doing' | 'done'

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { loadTasks() }, [])

  async function loadTasks() {
    setLoading(true)
    const { data: projects } = await supabase.from('projects').select('id, title')
    const { data: tasksData } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
    if (tasksData && projects) {
      const projectMap = Object.fromEntries(projects.map(p => [p.id, p.title]))
      setTasks(tasksData.map(t => ({ ...t, project_title: projectMap[t.project_id] })))
    }
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('tasks').update({ status }).eq('id', id)
    setTasks(tasks.map(t => t.id === id ? { ...t, status } : t))
  }

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter)
  const counts = { all: tasks.length, todo: tasks.filter(t => t.status === 'todo').length, doing: tasks.filter(t => t.status === 'doing').length, done: tasks.filter(t => t.status === 'done').length }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>Tasks</h1>
        <p style={{ fontSize: 14, color: '#9CA3AF' }}>Alle Tasks über deine Projekte</p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(['all', 'todo', 'doing', 'done'] as Filter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '7px 16px', borderRadius: 20, border: '1px solid',
            borderColor: filter === f ? '#2F6BFF' : '#E6E8EE',
            background: filter === f ? '#EEF3FF' : '#fff',
            color: filter === f ? '#2F6BFF' : '#6B7280',
            fontSize: 13, fontWeight: filter === f ? 600 : 400, cursor: 'pointer'
          }}>
            {f === 'all' ? 'Alle' : f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
          </button>
        ))}
      </div>

      {/* Task list */}
      {loading ? <p style={{ color: '#9CA3AF', fontSize: 14 }}>Lädt...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', background: '#fff', borderRadius: 12, border: '1px dashed #E6E8EE' }}>
              Keine Tasks gefunden.
            </div>
          ) : filtered.map(task => (
            <div key={task.id} style={s.taskRow}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{task.title}</p>
                <Link href={`/project/${task.project_id}`} style={{ fontSize: 12, color: '#2F6BFF', textDecoration: 'none' }}>
                  {task.project_title ?? 'Projekt'}
                </Link>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <StatusBadge status={task.status} />
                <select value={task.status} onChange={e => updateStatus(task.id, e.target.value)} style={s.select}>
                  <option value="todo">To Do</option>
                  <option value="doing">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  taskRow: { background: '#fff', border: '1px solid #E6E8EE', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16 },
  select: { padding: '6px 10px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 12, outline: 'none', cursor: 'pointer', background: '#fff' },
}
