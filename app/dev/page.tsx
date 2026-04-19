'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function DevHome() {
  const [devInfo, setDevInfo] = useState<any>(null)
  const [stats, setStats] = useState({ active: 0, completed: 0, pending: 0, jobs: 0 })
  const [newJobs, setNewJobs] = useState<any[]>([])
  const [myTasks, setMyTasks] = useState<any[]>([])
  const [aiInsights, setAiInsights] = useState<string[]>([])
  const [tickerIdx, setTickerIdx] = useState(0)

  const TICKER_ITEMS = [
    'System läuft stabil — alle Services aktiv',
    'Neue Projekte warten auf Developer',
    'Festag Production Engine v2.0',
    'AI plant · Ihr baut · System verbindet',
  ]

  useEffect(() => {
    const session = localStorage.getItem('festag_dev_session')
    if (!session) return
    const info = JSON.parse(session)
    setDevInfo(info)
    loadData(info.user_id)
    const iv = setInterval(() => setTickerIdx(i => (i + 1) % TICKER_ITEMS.length), 3500)
    return () => clearInterval(iv)
  }, [])

  async function loadData(userId: string) {
    const supabase = createClient()
    const [{ data: projs }, { data: tasks }] = await Promise.all([
      supabase.from('projects').select('*').in('status', ['planning', 'intake']).order('created_at', { ascending: false }),
      supabase.from('tasks').select('*, projects(title)').eq('assigned_to', userId).limit(10),
    ])
    setNewJobs(projs ?? [])
    setMyTasks(tasks ?? [])
    setStats({
      active: tasks?.filter(t => t.status === 'doing').length ?? 0,
      completed: tasks?.filter(t => t.status === 'done').length ?? 0,
      pending: tasks?.filter(t => t.status === 'todo').length ?? 0,
      jobs: projs?.length ?? 0,
    })
    // AI insights from recent projects
    if (projs && projs.length > 0) {
      setAiInsights([
        `${projs.length} neue Projekte bereit zur Übernahme`,
        'Festag System: alle Pipelines aktiv',
        'Tages-Performance: optimal',
      ])
    }
  }

  async function acceptJob(projectId: string) {
    if (!devInfo) return
    const supabase = createClient()
    await supabase.from('project_members').upsert({ project_id: projectId, user_id: devInfo.user_id, role: 'dev' })
    await supabase.from('projects').update({ status: 'active' }).eq('id', projectId)
    await supabase.from('messages').insert({
      project_id: projectId, sender_id: devInfo.user_id,
      message: 'Ein Festag Developer hat dein Projekt übernommen. Die Umsetzung beginnt jetzt.',
      is_ai: true,
    })
    setNewJobs(j => j.filter(x => x.id !== projectId))
    setStats(s => ({ ...s, jobs: s.jobs - 1 }))
  }

  const name = devInfo?.user_email?.split('@')[0] ?? 'Developer'
  const h = new Date().getHours()
  const greeting = h < 12 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend'

  return (
    <div className="animate-fade-up">
      <style>{`
        @keyframes ticker { 0% { opacity: 0; transform: translateY(6px); } 10%,90% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-6px); } }
        .ticker-text { animation: ticker 3.5s ease; }
        .job-card { transition: all 0.15s ease; }
        .job-card:hover { border-color: var(--border-strong); transform: translateY(-1px); }
        @keyframes newBadge { 0%,100% { background: var(--green-bg); } 50% { background: rgba(16,185,129,0.2); } }
        .new-badge { animation: newBadge 2s infinite; }
      `}</style>

      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 4 }}>FESTAG · DEVELOPER</p>
        <h1 style={{ marginBottom: 6 }}>{greeting}, {name.charAt(0).toUpperCase() + name.slice(1)}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--green-dark)' }}>Verfügbar</span>
          </span>
          <span style={{ color: 'var(--border-strong)' }}>·</span>
          {/* Animated ticker */}
          <span className="ticker-text" key={tickerIdx} style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {TICKER_ITEMS[tickerIdx]}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-cols-4 animate-fade-up-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'IN ARBEIT', value: stats.active, color: 'var(--green-dark)', bg: 'var(--green-bg)' },
          { label: 'OFFEN', value: stats.pending },
          { label: 'ERLEDIGT', value: stats.completed },
          { label: 'NEUE JOBS', value: stats.jobs, color: '#D97706', bg: 'var(--amber-bg)' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg ?? 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '14px 16px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 6 }}>{s.label}</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: s.color ?? 'var(--text)', lineHeight: 1, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* NEWSFEED — New Jobs */}
      <div className="animate-fade-up-2" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3 style={{ margin: 0 }}>Neue Projekte</h3>
            {newJobs.length > 0 && (
              <span className="new-badge" style={{ fontSize: 10, fontWeight: 700, color: 'var(--green-dark)', padding: '2px 8px', borderRadius: 10, border: '1px solid var(--green-border)' }}>
                {newJobs.length} NEU
              </span>
            )}
          </div>
          <Link href="/dev/jobs" style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>Alle Jobs →</Link>
        </div>

        {newJobs.length === 0 ? (
          <div style={{ background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: 'var(--r-lg)', padding: '32px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>Keine offenen Jobs</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Alle Projekte sind vergeben. Schau später wieder rein.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {newJobs.slice(0, 4).map((j, idx) => (
              <div key={j.id} className="job-card" style={{
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)',
                padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'flex-start',
                animation: `fadeUp 0.3s ${idx * 0.05}s both`,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{j.title}</p>
                    <span className="new-badge" style={{ fontSize: 9, fontWeight: 700, color: 'var(--green-dark)', padding: '2px 7px', borderRadius: 5, border: '1px solid var(--green-border)', flexShrink: 0 }}>OFFEN</span>
                  </div>
                  {j.description && <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 6px', lineHeight: 1.4 }}>{(j.description as string).slice(0, 100)}</p>}
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                    {j.complexity && <span>Komplexität: <strong style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{j.complexity}</strong> · </span>}
                    {j.timeline && <span>{j.timeline} · </span>}
                    {new Date(j.created_at).toLocaleDateString('de')}
                  </p>
                </div>
                <button onClick={() => acceptJob(j.id)} className="tap-scale" style={{ padding: '9px 16px', background: 'var(--text)', color: '#fff', border: 'none', borderRadius: 'var(--r-sm)', fontSize: 12, fontWeight: 600, cursor: 'pointer', minHeight: 36, flexShrink: 0, transition: 'opacity 0.2s' }}>
                  Annehmen
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My active tasks */}
      {myTasks.length > 0 && (
        <div className="animate-fade-up-3">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3>Meine Tasks</h3>
            <Link href="/dev/tasks" style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>Alle →</Link>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
            {myTasks.slice(0, 4).map((t, i) => (
              <div key={t.id} style={{ padding: '12px 18px', borderBottom: i < Math.min(myTasks.length, 4) - 1 ? '1px solid var(--border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', margin: 0 }}>{t.title}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>{t.projects?.title}</p>
                </div>
                <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: t.status === 'done' ? 'var(--green-bg)' : t.status === 'doing' ? 'var(--amber-bg)' : 'var(--surface-2)', color: t.status === 'done' ? 'var(--green-dark)' : t.status === 'doing' ? '#D97706' : 'var(--text-muted)' }}>
                  {t.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
