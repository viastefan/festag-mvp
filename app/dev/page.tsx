'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

/**
 * Devler Dashboard — multi-view based on dev's access_mode:
 *   - 'pool'    (default Festag dev): sees public unassigned projects + their own assigned ones
 *   - 'closed'  (outsourced/external dev invited by client): only their client's projects
 *   - 'company' (agency owner): all their invited clients' projects
 *
 * Plus: profile banner, today's time, team collaborators, AI insights.
 */

type AccessMode = 'pool' | 'closed' | 'company'

export default function DevHome() {
  const [devInfo, setDevInfo] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [accessMode, setAccessMode] = useState<AccessMode>('pool')
  const [stats, setStats] = useState({ active: 0, completed: 0, pending: 0, jobs: 0, todayMin: 0, weekMin: 0 })
  const [newJobs, setNewJobs] = useState<any[]>([])
  const [myProjects, setMyProjects] = useState<any[]>([])
  const [myTasks, setMyTasks] = useState<any[]>([])
  const [collaborators, setCollaborators] = useState<any[]>([])
  const [tickerIdx, setTickerIdx] = useState(0)

  const TICKER_ITEMS = [
    'System läuft stabil — alle Services aktiv',
    'Tagro AI plant · Du baust · System verbindet',
    'Festag Production Engine v2.0',
    'Time-Tracking aktiv',
  ]

  useEffect(() => {
    const session = localStorage.getItem('festag_dev_session')
    let info: any = null
    if (session) info = JSON.parse(session)

    const sb = createClient()
    sb.auth.getSession().then(async ({ data }) => {
      // Prefer Supabase session if exists, else fall back to localStorage dev session
      const uid = data.session?.user.id ?? info?.user_id
      if (!uid) { window.location.href = '/login'; return }
      info = info ?? { user_id: uid, user_email: data.session?.user.email }
      setDevInfo(info)

      // Load profile (incl. access_mode + skills)
      const { data: p } = await sb.from('profiles').select('*').eq('id', uid).single()
      const prof = p as any
      setProfile(prof)
      const mode: AccessMode = prof?.access_mode === 'closed' ? 'closed'
        : prof?.access_mode === 'company' ? 'company'
        : 'pool'
      setAccessMode(mode)

      loadData(uid, mode)
    })

    const iv = setInterval(() => setTickerIdx(i => (i + 1) % TICKER_ITEMS.length), 3500)
    return () => clearInterval(iv)
  }, [])

  async function loadData(userId: string, mode: AccessMode) {
    const sb = createClient()

    // Time today + week
    const dayStart = new Date(); dayStart.setHours(0,0,0,0)
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7)

    // Defensive parallel queries — each wrapped to never throw
    const safe = async (p: Promise<any>) => { try { return await p } catch (e) { return { data: null, error: e } } }

    const projectQuery = mode === 'pool'
      ? sb.from('projects').select('*').in('status', ['planning','intake']).is('assigned_dev', null).order('created_at', { ascending: false }).limit(8)
      : sb.from('project_members').select('project_id, projects(*)').eq('user_id', userId)

    const [tasksRes, timeRes, projsRes, tmRes] = await Promise.all([
      safe(sb.from('tasks').select('*, projects(title, status, user_id)').eq('assigned_to', userId).limit(15)),
      safe(sb.from('time_entries').select('seconds, started_at, project_id').eq('user_id', userId).gte('started_at', weekStart.toISOString())),
      safe(projectQuery),
      safe(sb.from('team_members').select('id, member_id').eq('owner_id', userId).limit(8)),
    ])
    const tasks = (tasksRes.data as any[]) ?? []
    const times = (timeRes.data as any[]) ?? []
    const projsRaw = (projsRes.data as any[]) ?? []
    const tmRows = (tmRes.data as any[]) ?? []

    // Resolve member profiles in second query (no FK alias dependency)
    const memberIds = tmRows.map(t => t.member_id).filter(Boolean)
    let collabs: any[] = []
    if (memberIds.length > 0) {
      const { data: memberProfiles } = await safe(sb.from('profiles').select('id,first_name,full_name,avatar_url,role').in('id', memberIds))
      const map = new Map(((memberProfiles as any[]) ?? []).map(p => [p.id, p]))
      collabs = tmRows.map(t => ({ id: t.id, profiles: map.get(t.member_id) ?? null })).filter(t => t.profiles)
    }

    setMyTasks(tasks)
    if (mode === 'pool') {
      setNewJobs(projsRaw)
      // myProjects from tasks join
      const projIds = Array.from(new Set(tasks.map(t => t.project_id)))
      if (projIds.length > 0) {
        const { data: mine } = await sb.from('projects').select('*').in('id', projIds)
        setMyProjects((mine as any[]) ?? [])
      }
    } else {
      // Both closed and company show membership projects as my projects
      setMyProjects(projsRaw.map(r => r.projects).filter(Boolean))
      setNewJobs([])
    }

    setCollaborators(collabs)

    const todaySec = times.filter(t => new Date(t.started_at) >= dayStart).reduce((s, t) => s + (t.seconds ?? 0), 0)
    const weekSec  = times.reduce((s, t) => s + (t.seconds ?? 0), 0)

    setStats({
      active:    tasks.filter(t => t.status === 'doing').length,
      completed: tasks.filter(t => t.status === 'done').length,
      pending:   tasks.filter(t => t.status === 'todo').length,
      jobs:      mode === 'pool' ? projsRaw.length : 0,
      todayMin:  Math.round(todaySec / 60),
      weekMin:   Math.round(weekSec / 60),
    })
  }

  async function acceptJob(projectId: string) {
    if (!devInfo) return
    const sb = createClient()
    await sb.from('project_members').upsert({ project_id: projectId, user_id: devInfo.user_id, role: 'dev' })
    await sb.from('projects').update({ status: 'active', assigned_dev: devInfo.user_id }).eq('id', projectId)
    await sb.from('messages').insert({
      project_id: projectId, sender_id: devInfo.user_id,
      message: 'Ein Festag Developer hat dein Projekt übernommen. Die Umsetzung beginnt jetzt.',
      is_ai: true,
    }).catch(() => {})
    setNewJobs(j => j.filter(x => x.id !== projectId))
    setStats(s => ({ ...s, jobs: s.jobs - 1 }))
  }

  const name = profile?.first_name ?? devInfo?.user_email?.split('@')[0] ?? 'Developer'
  const h = new Date().getHours()
  const greeting = h < 12 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend'

  const MODE_LABEL: Record<AccessMode, string> = {
    pool: 'Festag Pool',
    closed: 'Geschlossenes System',
    company: 'Agentur-Modus',
  }
  const MODE_DESC: Record<AccessMode, string> = {
    pool: 'Du siehst alle öffentlichen Festag-Aufträge und kannst sie übernehmen.',
    closed: 'Du arbeitest exklusiv für eine Firma — du siehst nur deren Projekte.',
    company: 'Du verwaltest deine eigenen Clients in Festag Teams.',
  }
  const MODE_COLOR: Record<AccessMode, string> = {
    pool: 'var(--text)',
    closed: 'var(--green)',
    company: 'var(--amber)',
  }
  const fmtMin = (m: number) => m >= 60 ? `${Math.floor(m/60)}h ${m%60}m` : `${m}m`

  return (
    <div className="animate-fade-up" style={{ padding:'20px 24px 80px', maxWidth:1280, margin:'0 auto' }}>
      <style>{`
        @keyframes ticker { 0% { opacity: 0; transform: translateY(6px); } 10%,90% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-6px); } }
        .ticker-text { animation: ticker 3.5s ease; }
        .job-card { transition: all 0.15s ease; }
        .job-card:hover { border-color: var(--border-strong); transform: translateY(-1px); }
        @keyframes newBadge { 0%,100% { background: var(--green-bg); } 50% { background: rgba(16,185,129,0.2); } }
        .new-badge { animation: newBadge 2s infinite; }
      `}</style>

      {/* Profile banner with mode chip */}
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:24, flexWrap:'wrap' }}>
        <div style={{ width:54, height:54, borderRadius:14, background: profile?.avatar_url ? 'transparent' : `linear-gradient(135deg, ${MODE_COLOR[accessMode]}, ${MODE_COLOR[accessMode]}AA)`, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:800, overflow:'hidden', flexShrink:0, border:'2px solid var(--border)' }}>
          {profile?.avatar_url ? <img src={profile.avatar_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : name.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex:1, minWidth:200 }}>
          <p style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.1em', margin:'0 0 2px' }}>FESTAG · DEVELOPER</p>
          <h1 style={{ marginBottom: 4 }}>{greeting}, {name.charAt(0).toUpperCase() + name.slice(1)}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap:'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--green-dark)' }}>Verfügbar</span>
            </span>
            <span style={{ color: 'var(--border-strong)' }}>·</span>
            <span className="ticker-text" key={tickerIdx} style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {TICKER_ITEMS[tickerIdx]}
            </span>
          </div>
        </div>
        <div style={{ padding:'8px 14px', background:`${MODE_COLOR[accessMode]}15`, border:`1px solid ${MODE_COLOR[accessMode]}40`, borderRadius:11, flexShrink:0 }}>
          <p style={{ fontSize:10, fontWeight:800, color:MODE_COLOR[accessMode], letterSpacing:'.07em', margin:'0 0 1px' }}>ZUGRIFFSMODUS</p>
          <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', margin:0 }}>{MODE_LABEL[accessMode]}</p>
        </div>
      </div>

      {/* Mode info banner */}
      <div style={{ padding:'10px 14px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:11, marginBottom:18, display:'flex', alignItems:'center', gap:10, fontSize:12.5, color:'var(--text-secondary)' }}>
        <span style={{ width:6, height:6, borderRadius:'50%', background:MODE_COLOR[accessMode], flexShrink:0 }}/>
        {MODE_DESC[accessMode]}
      </div>

      {/* Stats — 6 KPIs */}
      <div className="animate-fade-up-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: 10, marginBottom: 22 }}>
        {[
          { label: 'IN ARBEIT',  value: stats.active, color: 'var(--green-dark)', bg: 'var(--green-bg)' },
          { label: 'OFFEN',      value: stats.pending },
          { label: 'ERLEDIGT',   value: stats.completed },
          ...(accessMode === 'pool' ? [{ label: 'NEUE JOBS', value: stats.jobs, color: 'var(--amber-dark)', bg: 'var(--amber-bg)' }] : []),
          { label: 'HEUTE',      value: fmtMin(stats.todayMin), color: 'var(--text)' },
          { label: 'WOCHE',      value: fmtMin(stats.weekMin) },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg ?? 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '14px 16px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 6 }}>{s.label}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: (s as any).color ?? 'var(--text)', lineHeight: 1, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Pool: New jobs (only this mode) */}
      {accessMode === 'pool' && (
        <div className="animate-fade-up-2" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ margin: 0 }}>Neue Projekte</h3>
              {newJobs.length > 0 && (
                <span className="new-badge" style={{ fontSize: 10, fontWeight: 700, color: 'var(--green-dark)', padding: '2px 8px', borderRadius: 10, border: '1px solid var(--green-border)' }}>
                  {newJobs.length} OFFEN
                </span>
              )}
            </div>
            <Link href="/dev/jobs" style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>Alle Jobs →</Link>
          </div>

          {newJobs.length === 0 ? (
            <div style={{ background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: 'var(--r-lg)', padding: '32px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>Keine offenen Jobs</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Tagro AI sucht aktiv nach passenden Aufträgen für dich.</p>
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
                  <button onClick={() => acceptJob(j.id)} className="tap-scale" style={{ padding: '9px 16px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: 'var(--r-sm)', fontSize: 12, fontWeight: 600, cursor: 'pointer', minHeight: 36, flexShrink: 0, transition: 'opacity 0.2s' }}>
                    Annehmen
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* My projects (closed + company show this prominently) */}
      {myProjects.length > 0 && (
        <div className="animate-fade-up-2" style={{ marginBottom:20 }}>
          <h3 style={{ marginBottom:10 }}>{accessMode === 'company' ? 'Deine Kunden-Projekte' : 'Meine Projekte'}</h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:10 }}>
            {myProjects.slice(0,6).map(p => (
              <Link key={p.id} href={`/project/${p.id}`} className="job-card" style={{ display:'block', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:'14px 16px', textDecoration:'none', color:'inherit' }}>
                <p style={{ fontSize:13.5, fontWeight:700, color:'var(--text)', margin:'0 0 4px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.title}</p>
                <p style={{ fontSize:11, color:'var(--text-muted)', margin:0, textTransform:'capitalize' }}>{p.status}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Collaborators (your team) */}
      {collaborators.length > 0 && (
        <div className="animate-fade-up-3" style={{ marginBottom:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <h3 style={{ margin:0 }}>Team Collaborators</h3>
            <Link href="/dev/team" style={{ fontSize:12, color:'var(--text)', fontWeight:600 }}>Verwalten →</Link>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {collaborators.map(c => {
              const p = (c as any).profiles
              const init = (p?.first_name ?? p?.full_name ?? '?').charAt(0).toUpperCase()
              return (
                <div key={c.id} title={p?.full_name ?? p?.first_name} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 12px 7px 7px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:24 }}>
                  <div style={{ width:26, height:26, borderRadius:'50%', background:'var(--surface-2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, overflow:'hidden' }}>
                    {p?.avatar_url ? <img src={p.avatar_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : init}
                  </div>
                  <span style={{ fontSize:12.5, fontWeight:600, color:'var(--text)' }}>{p?.first_name ?? p?.full_name ?? 'Member'}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* My active tasks */}
      {myTasks.length > 0 && (
        <div className="animate-fade-up-3">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3>Meine Tasks</h3>
            <Link href="/dev/tasks" style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>Alle →</Link>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
            {myTasks.slice(0, 5).map((t, i) => (
              <Link key={t.id} href={`/project/${t.project_id}`} style={{ padding: '12px 18px', borderBottom: i < Math.min(myTasks.length, 5) - 1 ? '1px solid var(--border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration:'none', color:'inherit' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', margin: 0 }}>{t.title}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>{t.projects?.title}</p>
                </div>
                <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: t.status === 'done' ? 'var(--green-bg)' : t.status === 'doing' ? 'var(--amber-bg)' : 'var(--surface-2)', color: t.status === 'done' ? 'var(--green-dark)' : t.status === 'doing' ? 'var(--amber-dark)' : 'var(--text-muted)' }}>
                  {t.status.toUpperCase()}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
