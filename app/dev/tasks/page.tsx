'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DevTasksPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      setUserId(data.session.user.id)
      const { data: t } = await supabase.from('tasks').select('*, projects(title)').eq('assigned_to', data.session.user.id).order('created_at', { ascending: false })
      setTasks(t ?? []); setLoading(false)
    })
  }, [])

  async function updateStatus(taskId: string, status: string) {
    const supabase = createClient()
    await supabase.from('tasks').update({ status }).eq('id', taskId)
    await supabase.from('dev_activity').insert({ dev_id: userId, task_id: taskId, status })
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status } : t))
  }

  const cols = [
    { status: 'todo',  label: 'To Do',       color: 'var(--text-muted)' },
    { status: 'doing', label: 'In Progress',  color: 'var(--amber)' },
    { status: 'done',  label: 'Done',         color: 'var(--green)' },
  ]

  return (
    <div className="animate-fade-up">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ marginBottom: 4 }}>Meine Tasks</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{tasks.length} Tasks insgesamt</p>
      </div>
      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div> : tasks.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: 'var(--r-lg)', padding: '50px 20px', textAlign: 'center' }}>
          <h2 style={{ marginBottom: 8 }}>Noch keine Tasks</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nimm einen Job an um Tasks zu bekommen.</p>
        </div>
      ) : (
        <div className="grid-cols-2-mobile-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {cols.map(c => {
            const colTasks = tasks.filter(t => t.status === c.status)
            return (
              <div key={c.status}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color }} />
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', margin: 0 }}>{c.label.toUpperCase()} · {colTasks.length}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {colTasks.map(t => (
                    <div key={t.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '12px 14px' }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '0 0 3px' }}>{t.title}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 10px' }}>{t.projects?.title}</p>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {cols.filter(x => x.status !== c.status).map(x => (
                          <button key={x.status} onClick={() => updateStatus(t.id, x.status)} style={{ padding: '4px 8px', fontSize: 10, border: '1px solid var(--border)', background: 'var(--bg)', borderRadius: 6, cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: 'inherit' }}>→ {x.label}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {colTasks.length === 0 && <div style={{ border: '1px dashed var(--border)', borderRadius: 'var(--r)', padding: 16, textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>Leer</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
