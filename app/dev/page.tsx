'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function DevHome() {
  const [jobs, setJobs] = useState<any[]>([])
  const [myTasks, setMyTasks] = useState<any[]>([])
  const [stats, setStats] = useState({ active: 0, completed: 0, pending: 0 })
  const [userId, setUserId] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      setUserId(data.session.user.id)
      
      // Available projects (jobs) - projects without assigned team
      const { data: projs } = await supabase.from('projects').select('*').order('created_at', { ascending: false }).limit(5)
      setJobs(projs ?? [])
      
      // My assigned tasks
      const { data: tasks } = await supabase.from('tasks').select('*,projects(title)').eq('assigned_to', data.session.user.id).order('created_at', { ascending: false })
      setMyTasks(tasks ?? [])
      setStats({
        active: tasks?.filter(t => t.status === 'doing').length ?? 0,
        completed: tasks?.filter(t => t.status === 'done').length ?? 0,
        pending: tasks?.filter(t => t.status === 'todo').length ?? 0,
      })
    })
  }, [])

  async function acceptJob(projectId: string) {
    const supabase = createClient()
    await supabase.from('project_members').upsert({ project_id: projectId, user_id: userId, role: 'dev' })
    await supabase.from('projects').update({ status: 'active' }).eq('id', projectId)
    await supabase.from('messages').insert({
      project_id: projectId, sender_id: userId,
      message: 'Ein Festag Developer hat dein Projekt übernommen. Die Umsetzung beginnt.',
      is_ai: true,
    })
    window.location.reload()
  }

  return (
    <div className="animate-fade-up">
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: 4 }}>FESTAG · DEVELOPER PANEL</p>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px' }}>Execution Dashboard</h1>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'AKTIV', value: stats.active, color: '#30D158' },
          { label: 'OFFEN', value: stats.pending, color: '#FF9F0A' },
          { label: 'ERLEDIGT', value: stats.completed, color: '#5856D6' },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px 20px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: 6 }}>{s.label}</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Available Jobs */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 14 }}>
          Verfügbare Jobs · {jobs.filter(j => j.status === 'planning' || j.status === 'intake').length}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {jobs.filter(j => j.status === 'planning' || j.status === 'intake').map(j => (
            <div key={j.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 3 }}>{j.title}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{j.description || 'Keine Beschreibung'}</p>
              </div>
              <button onClick={() => acceptJob(j.id)} style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #30D158, #32D74B)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Job annehmen →
              </button>
            </div>
          ))}
          {jobs.filter(j => j.status === 'planning' || j.status === 'intake').length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.08)' }}>
              Aktuell keine offenen Jobs
            </div>
          )}
        </div>
      </div>

      {/* My Active Tasks */}
      <div>
        <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 14 }}>
          Meine Tasks
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {myTasks.map(t => (
            <div key={t.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{t.title}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{t.projects?.title}</p>
              </div>
              <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: t.status === 'done' ? 'rgba(48,209,88,0.15)' : t.status === 'doing' ? 'rgba(255,159,10,0.15)' : 'rgba(255,255,255,0.06)', color: t.status === 'done' ? '#30D158' : t.status === 'doing' ? '#FF9F0A' : 'rgba(255,255,255,0.4)' }}>
                {t.status.toUpperCase()}
              </span>
            </div>
          ))}
          {myTasks.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Keine Tasks zugewiesen</div>
          )}
        </div>
      </div>
    </div>
  )
}
