'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DevJobsPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'available'|'taken'|'all'>('available')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      setUserId(data.session.user.id)
      const { data: projs } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
      setJobs(projs ?? []); setLoading(false)
    })
  }, [])

  async function acceptJob(projectId: string) {
    const supabase = createClient()
    await supabase.from('project_members').upsert({ project_id: projectId, user_id: userId, role: 'dev' })
    await supabase.from('projects').update({ status: 'active' }).eq('id', projectId)
    await supabase.from('messages').insert({ project_id: projectId, sender_id: userId, message: 'Ein Festag Developer hat dein Projekt übernommen. Die Umsetzung beginnt jetzt.', is_ai: true })
    setJobs(jobs.map(j => j.id === projectId ? { ...j, status: 'active' } : j))
  }

  const avail = jobs.filter(j => j.status === 'planning' || j.status === 'intake')
  const taken = jobs.filter(j => j.status === 'active' || j.status === 'testing')
  const shown = filter === 'available' ? avail : filter === 'taken' ? taken : jobs

  return (
    <div className="animate-fade-up">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ marginBottom: 4 }}>Jobs</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Alle verfügbaren Projekte im System</p>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[
          { k: 'available', l: `Verfügbar (${avail.length})` },
          { k: 'taken',     l: `In Arbeit (${taken.length})` },
          { k: 'all',       l: 'Alle' },
        ].map(t => (
          <button key={t.k} onClick={() => setFilter(t.k as any)} className="tap-scale" style={{ padding: '7px 14px', border: '1px solid var(--border)', background: filter === t.k ? 'var(--text)' : 'var(--surface)', color: filter === t.k ? '#fff' : 'var(--text-muted)', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{t.l}</button>
        ))}
      </div>
      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {shown.map(j => {
            const isAvail = j.status === 'planning' || j.status === 'intake'
            return (
              <div key={j.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{j.title}</p>
                    <span style={{ padding: '2px 7px', borderRadius: 5, fontSize: 10, fontWeight: 600, color: isAvail ? '#D97706' : 'var(--green-dark)', background: isAvail ? 'var(--amber-bg)' : 'var(--green-bg)' }}>
                      {isAvail ? 'OFFEN' : j.status.toUpperCase()}
                    </span>
                  </div>
                  {j.description && <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 6px' }}>{j.description}</p>}
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                    {j.complexity && <span>Komplexität: <strong style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{j.complexity}</strong> · </span>}
                    {j.timeline && <span>Laufzeit: <strong style={{ color: 'var(--text-secondary)' }}>{j.timeline}</strong> · </span>}
                    {new Date(j.created_at).toLocaleDateString('de')}
                  </p>
                </div>
                {isAvail && (
                  <button onClick={() => acceptJob(j.id)} className="tap-scale" style={{ padding: '9px 16px', background: 'var(--green-dark)', color: '#fff', border: 'none', borderRadius: 'var(--r-sm)', fontSize: 12, fontWeight: 600, cursor: 'pointer', minHeight: 38, flexShrink: 0 }}>
                    Job annehmen
                  </button>
                )}
              </div>
            )
          })}
          {shown.length === 0 && <div style={{ background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: 'var(--r-lg)', padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Keine Jobs in dieser Ansicht</div>}
        </div>
      )}
    </div>
  )
}
