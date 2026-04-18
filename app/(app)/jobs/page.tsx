'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Job = {
  id: string
  project_id: string
  status: string
  budget: number | null
  skills: string[] | null
  created_at: string
  project_title?: string
  project_desc?: string
  project_timeline?: string
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [myJobs, setMyJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const [userRole, setUserRole] = useState('')
  const [tab, setTab] = useState<'open'|'mine'>('open')
  const [accepting, setAccepting] = useState<string|null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      setUserId(data.session.user.id)
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', data.session.user.id).single()
      setUserRole(prof?.role ?? 'client')
      if (prof?.role !== 'dev' && prof?.role !== 'admin') {
        window.location.href = '/dashboard'; return
      }
      loadJobs()
    })
  }, [])

  async function loadJobs() {
    setLoading(true)
    const { data: allJobs } = await supabase.from('job_listings').select('*').order('created_at', { ascending: false })
    if (allJobs) {
      // enrich with project data
      const enriched = await Promise.all(allJobs.map(async (j) => {
        const { data: p } = await supabase.from('projects').select('title, description, timeline').eq('id', j.project_id).single()
        return { ...j, project_title: p?.title, project_desc: p?.description, project_timeline: p?.timeline }
      }))
      setJobs(enriched.filter(j => j.status === 'open'))
      setMyJobs(enriched.filter(j => j.accepted_by === userId))
    }
    setLoading(false)
  }

  async function acceptJob(job: Job) {
    setAccepting(job.id)
    await supabase.from('job_listings').update({
      status: 'taken', accepted_by: userId, accepted_at: new Date().toISOString()
    }).eq('id', job.id)
    // Assign user to project
    await supabase.from('project_members').insert({ project_id: job.project_id, user_id: userId, role: 'dev' })
    // Notify client
    const { data: proj } = await supabase.from('projects').select('user_id, title').eq('id', job.project_id).single()
    if (proj) {
      await supabase.from('notifications').insert({
        user_id: proj.user_id,
        type: 'dev_assigned',
        title: 'Entwickler zugewiesen',
        message: `Ein Festag Entwicklerteam hat dein Projekt "${proj.title}" übernommen.`,
        link: `/project/${job.project_id}`
      })
      // AI system message
      await supabase.from('messages').insert({
        project_id: job.project_id,
        sender_id: userId,
        message: `Ein Festag Entwicklerteam hat dein Projekt übernommen. Entwicklung startet.`,
        is_ai: true
      })
    }
    setAccepting(null)
    loadJobs()
  }

  const current = tab === 'open' ? jobs : myJobs

  return (
    <div className="animate-fade-up">
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.12em', marginBottom: 4 }}>
          FESTAG DEV · JOB MARKETPLACE
        </p>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.4px', marginBottom: 4 }}>Verfügbare Projekte</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Verdiene als Festag-zertifizierter Entwickler · Rolle: <strong style={{ color: 'var(--text-primary)' }}>{userRole}</strong>
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {[
          { key: 'open', label: `Offen (${jobs.length})` },
          { key: 'mine', label: `Meine (${myJobs.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)} style={{
            padding: '9px 18px', border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: 13, fontWeight: tab === t.key ? 600 : 400,
            color: tab === t.key ? 'var(--accent)' : 'var(--text-muted)',
            borderBottom: `2px solid ${tab === t.key ? 'var(--accent)' : 'transparent'}`,
            marginBottom: -1, fontFamily: 'inherit',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Lädt…</p>
      ) : current.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px dashed var(--border2)', borderRadius: 12, padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>◎</div>
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
            {tab === 'open' ? 'Aktuell keine offenen Projekte' : 'Du hast noch keine Projekte übernommen'}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {tab === 'open' ? 'System benachrichtigt dich bei neuen Projekten' : 'Schau im "Offen" Tab nach verfügbaren Projekten'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {current.map(job => (
            <div key={job.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', transition: 'all 0.15s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600 }}>{job.project_title ?? 'Projekt'}</h3>
                    <span style={{ fontSize: 10, fontWeight: 700, color: job.status === 'open' ? '#065F46' : '#6B7280', background: job.status === 'open' ? '#D1FAE5' : '#F3F4F6', padding: '2px 7px', borderRadius: 5, letterSpacing: '0.06em' }}>
                      {job.status === 'open' ? 'OFFEN' : 'VERGEBEN'}
                    </span>
                  </div>
                  {job.project_desc && <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.5 }}>{job.project_desc}</p>}
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                    <span>⏱ {job.project_timeline || '4-6 Wochen'}</span>
                    {job.budget && <span>💰 €{Number(job.budget).toLocaleString('de')}</span>}
                    <span>📅 {new Date(job.created_at).toLocaleDateString('de')}</span>
                  </div>
                </div>
                {tab === 'open' && (
                  <button onClick={() => acceptJob(job)} disabled={accepting === job.id} style={{
                    padding: '8px 18px', background: accepting === job.id ? 'var(--surface2)' : 'var(--accent)',
                    color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', whiteSpace: 'nowrap' as const, fontFamily: 'inherit',
                  }}>
                    {accepting === job.id ? 'Übernehme…' : 'Projekt übernehmen →'}
                  </button>
                )}
                {tab === 'mine' && (
                  <a href={`/project/${job.project_id}`} style={{ padding: '8px 16px', background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                    Öffnen →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
