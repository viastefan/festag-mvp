'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function DevHome() {
  const [userId, setUserId] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [stats, setStats] = useState({ active: 0, completed: 0, pending: 0, jobs: 0 })
  const [availableJobs, setAvailableJobs] = useState<any[]>([])
  const [myTasks, setMyTasks] = useState<any[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      setUserId(data.session.user.id); setUserEmail(data.session.user.email ?? '')
      const [{ data: projs }, { data: tasks }] = await Promise.all([
        supabase.from('projects').select('*').in('status', ['planning', 'intake']).order('created_at', { ascending: false }).limit(5),
        supabase.from('tasks').select('*, projects(title)').eq('assigned_to', data.session.user.id),
      ])
      setAvailableJobs(projs ?? []); setMyTasks(tasks ?? [])
      setStats({
        active: tasks?.filter(t => t.status === 'doing').length ?? 0,
        completed: tasks?.filter(t => t.status === 'done').length ?? 0,
        pending: tasks?.filter(t => t.status === 'todo').length ?? 0,
        jobs: projs?.length ?? 0,
      })
    })
  }, [])

  const name = userEmail.split('@')[0]
  const h = new Date().getHours()
  const greeting = h < 12 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend'

  return (
    <div className="animate-fade-up">
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 4 }}>FESTAG · DEVELOPER</p>
        <h1 style={{ marginBottom: 4 }}>{greeting}, {name.charAt(0).toUpperCase() + name.slice(1)}</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />Verfügbar</span>
          <span style={{ color: 'var(--border-strong)' }}>·</span>
          <span>{stats.jobs} offene Jobs</span>
        </p>
      </div>
      <div className="grid-cols-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'IN ARBEIT', value: stats.active, color: 'var(--green-dark)' },
          { label: 'OFFEN', value: stats.pending },
          { label: 'ERLEDIGT', value: stats.completed },
          { label: 'NEUE JOBS', value: stats.jobs },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '14px 16px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 6, margin: '0 0 6px' }}>{s.label}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: s.color ?? 'var(--text)', lineHeight: 1, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>
      <div className="grid-cols-2-mobile-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3>Neue Jobs</h3>
            <Link href="/dev/jobs" style={{ fontSize: 11, color: 'var(--text)', fontWeight: 600 }}>Alle →</Link>
          </div>
          {availableJobs.length === 0 ? <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '16px 0', textAlign: 'center', margin: 0 }}>Aktuell keine offenen Jobs</p> : availableJobs.slice(0,3).map(j => (
            <div key={j.id} style={{ padding: '9px 0', borderBottom: '1px solid var(--surface-2)' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{j.title}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>{new Date(j.created_at).toLocaleDateString('de')}</p>
            </div>
          ))}
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3>Meine Tasks</h3>
            <Link href="/dev/tasks" style={{ fontSize: 11, color: 'var(--text)', fontWeight: 600 }}>Alle →</Link>
          </div>
          {myTasks.length === 0 ? <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '16px 0', textAlign: 'center', margin: 0 }}>Noch keine Tasks zugewiesen</p> : myTasks.slice(0,3).map(t => (
            <div key={t.id} style={{ padding: '9px 0', borderBottom: '1px solid var(--surface-2)' }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', margin: 0 }}>{t.title}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>{t.projects?.title}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
