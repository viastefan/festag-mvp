'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type AccessMode = 'pool' | 'closed' | 'company'

function Ico({ d, size = 16, sw = 1.7, c = 'currentColor' }: { d: string; size?: number; sw?: number; c?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={d}/>
    </svg>
  )
}

const fmtMin = (m: number) => m === 0 ? '—' : m >= 60 ? `${Math.floor(m/60)}h ${m%60}min` : `${m}min`

export default function DevHome() {
  const [profile,       setProfile]       = useState<any>(null)
  const [devInfo,       setDevInfo]       = useState<any>(null)
  const [accessMode,    setAccessMode]    = useState<AccessMode>('pool')
  const [stats,         setStats]         = useState({ active:0, completed:0, pending:0, jobs:0, todayMin:0, weekMin:0 })
  const [newJobs,       setNewJobs]       = useState<any[]>([])
  const [myProjects,    setMyProjects]    = useState<any[]>([])
  const [myTasks,       setMyTasks]       = useState<any[]>([])
  const [collaborators, setCollaborators] = useState<any[]>([])

  useEffect(() => {
    const session = localStorage.getItem('festag_dev_session')
    let info: any = session ? JSON.parse(session) : null
    const sb = createClient()
    sb.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user.id ?? info?.user_id
      if (!uid) { window.location.href = '/login'; return }
      info = info ?? { user_id: uid, user_email: data.session?.user.email }
      setDevInfo(info)

      const { data: p } = await sb.from('profiles').select('*').eq('id', uid).single()
      const prof = p as any
      setProfile(prof)
      const mode: AccessMode = prof?.access_mode === 'closed' ? 'closed'
        : prof?.access_mode === 'company' ? 'company' : 'pool'
      setAccessMode(mode)
      loadData(uid, mode)
    })
  }, [])

  async function loadData(userId: string, mode: AccessMode) {
    const sb = createClient()
    const dayStart  = new Date(); dayStart.setHours(0,0,0,0)
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7)
    const safe = async (p: Promise<any>) => { try { return await p } catch { return { data: null } } }

    const projectQuery = mode === 'pool'
      ? sb.from('projects').select('*').in('status', ['planning','intake']).is('assigned_dev', null).order('created_at', { ascending: false }).limit(8)
      : sb.from('project_members').select('project_id, projects(*)').eq('user_id', userId)

    const [tasksRes, timeRes, projsRes, tmRes] = await Promise.all([
      safe(sb.from('tasks').select('*, projects(title, status, user_id)').eq('assigned_to', userId).limit(15)),
      safe(sb.from('time_entries').select('seconds, started_at, project_id').eq('user_id', userId).gte('started_at', weekStart.toISOString())),
      safe(projectQuery),
      safe(sb.from('team_members').select('id, member_id').eq('owner_id', userId).limit(8)),
    ])

    const tasks   = (tasksRes.data as any[]) ?? []
    const times   = (timeRes.data as any[]) ?? []
    const projsRaw = (projsRes.data as any[]) ?? []
    const tmRows  = (tmRes.data as any[]) ?? []

    const memberIds = tmRows.map(t => t.member_id).filter(Boolean)
    let collabs: any[] = []
    if (memberIds.length > 0) {
      const { data: mps } = await safe(sb.from('profiles').select('id,first_name,full_name,avatar_url,role').in('id', memberIds))
      const map = new Map(((mps as any[]) ?? []).map(p => [p.id, p]))
      collabs = tmRows.map(t => ({ id: t.id, profile: map.get(t.member_id) ?? null })).filter(t => t.profile)
    }

    setMyTasks(tasks)
    if (mode === 'pool') {
      setNewJobs(projsRaw)
      const projIds = Array.from(new Set(tasks.map(t => t.project_id)))
      if (projIds.length > 0) {
        const { data: mine } = await sb.from('projects').select('*').in('id', projIds)
        setMyProjects((mine as any[]) ?? [])
      }
    } else {
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
    await sb.from('messages').insert({ project_id: projectId, sender_id: devInfo.user_id, message: 'Developer übernimmt. Umsetzung beginnt jetzt.', is_ai: true }).catch(() => {})
    setNewJobs(j => j.filter(x => x.id !== projectId))
    setStats(s => ({ ...s, jobs: s.jobs - 1 }))
  }

  const name = profile?.first_name ?? devInfo?.user_email?.split('@')[0] ?? 'Developer'
  const h = new Date().getHours()
  const greeting = h < 12 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend'
  const modeLabel: Record<AccessMode, string> = { pool: 'Festag Pool', closed: 'Exklusiv', company: 'Agentur' }

  const activeTasks  = myTasks.filter(t => t.status === 'doing')
  const pendingTasks = myTasks.filter(t => t.status === 'todo')

  return (
    <div className="animate-fade-up" style={{ padding:'32px 28px 100px', maxWidth:1100, margin:'0 auto' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;} }
        @keyframes pulse  { 0%,100%{opacity:1;}50%{opacity:.5;} }
        .job-row { display:flex; align-items:flex-start; gap:16px; padding:16px 0; border-bottom:1px solid var(--border); transition:background .1s; }
        .job-row:last-child { border-bottom: none; }
        .task-row { display:flex; align-items:center; gap:12px; padding:12px 0; border-bottom:1px solid var(--border); text-decoration:none; color:inherit; transition:opacity .1s; }
        .task-row:last-child { border-bottom: none; }
        .task-row:hover { opacity:.75; }
        .stat-box { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:18px 20px; }
        .collab-chip { display:flex; align-items:center; gap:8px; padding:6px 12px 6px 6px; background:var(--surface); border:1px solid var(--border); border-radius:24px; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom:40 }}>
        <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:10 }}>
          <span style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.1em' }}>DEVELOPER</span>
          <span style={{ color:'var(--border-strong)', fontSize:11 }}>·</span>
          <span style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.08em' }}>{modeLabel[accessMode].toUpperCase()}</span>
          <span style={{ display:'inline-flex', alignItems:'center', gap:4, marginLeft:6, padding:'2px 8px', background:'rgba(52,199,89,.1)', border:'1px solid rgba(52,199,89,.25)', borderRadius:20 }}>
            <span style={{ width:5, height:5, borderRadius:'50%', background:'var(--green)', animation:'pulse 2s infinite' }}/>
            <span style={{ fontSize:10, fontWeight:700, color:'var(--green)', letterSpacing:'.06em' }}>ONLINE</span>
          </span>
        </div>

        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
          <div>
            <h1 style={{ fontSize:36, fontWeight:700, letterSpacing:'-.8px', margin:'0 0 6px', lineHeight:1.1 }}>
              {greeting},<br/>{name.charAt(0).toUpperCase() + name.slice(1)}.
            </h1>
            <p style={{ fontSize:14, color:'var(--text-secondary)', margin:0, fontWeight:400 }}>
              {accessMode === 'pool'
                ? `${stats.jobs} offene Jobs · ${stats.active} Tasks in Arbeit`
                : accessMode === 'closed'
                ? 'Exklusiver Client-Zugang aktiv'
                : `${myProjects.length} Kunden-Projekte aktiv`}
            </p>
          </div>

          {/* Avatar */}
          <div style={{ width:52, height:52, borderRadius:16, background:'var(--surface-2)', border:'1px solid var(--border)', overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:700, color:'var(--text)' }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
              : name.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))', gap:8, marginBottom:32 }}>
        {[
          { label:'In Arbeit',  value: stats.active,          highlight: stats.active > 0 },
          { label:'Offen',      value: stats.pending },
          { label:'Erledigt',   value: stats.completed },
          ...(accessMode === 'pool' ? [{ label:'Neue Jobs', value: stats.jobs, highlight: stats.jobs > 0 }] : []),
          { label:'Heute',      value: fmtMin(stats.todayMin) },
          { label:'Diese Woche',value: fmtMin(stats.weekMin) },
        ].map((s, i) => (
          <div key={i} className="stat-box" style={{ animation:`fadeUp .3s ${i*.05}s both` }}>
            <p style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.08em', margin:'0 0 8px' }}>{s.label.toUpperCase()}</p>
            <p style={{ fontSize:26, fontWeight:700, color:(s as any).highlight ? 'var(--text)' : 'var(--text)', margin:0, letterSpacing:'-.5px', lineHeight:1 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Two-column layout ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:16, alignItems:'start' }}>

        {/* Left column */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Pool: Available Jobs */}
          {accessMode === 'pool' && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:16 }}>
                <div>
                  <h2 style={{ margin:'0 0 2px', fontSize:20, fontWeight:700, letterSpacing:'-.4px' }}>Verfügbare Aufträge</h2>
                  <p style={{ margin:0, fontSize:12.5, color:'var(--text-muted)' }}>Projekte die auf einen Developer warten</p>
                </div>
                <Link href="/dev/jobs" style={{ fontSize:12.5, fontWeight:600, color:'var(--text)', textDecoration:'none', opacity:.7 }}>Alle ansehen →</Link>
              </div>

              <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:'0 20px' }}>
                {newJobs.length === 0 ? (
                  <div style={{ padding:'40px 0', textAlign:'center', opacity:.5 }}>
                    <p style={{ fontSize:14, fontWeight:600, color:'var(--text)', margin:'0 0 4px' }}>Keine offenen Jobs</p>
                    <p style={{ fontSize:12.5, color:'var(--text-muted)', margin:0 }}>Tagro AI sucht aktiv nach passenden Aufträgen.</p>
                  </div>
                ) : (
                  newJobs.slice(0, 5).map((j, idx) => (
                    <div key={j.id} className="job-row" style={{ animation:`fadeUp .25s ${idx*.06}s both` }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                          <p style={{ fontSize:14.5, fontWeight:700, color:'var(--text)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{j.title}</p>
                          {j.complexity && (
                            <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:4, background:'var(--surface-2)', color:'var(--text-secondary)', flexShrink:0, textTransform:'uppercase', letterSpacing:'.06em' }}>{j.complexity}</span>
                          )}
                        </div>
                        {j.description && (
                          <p style={{ fontSize:12.5, color:'var(--text-secondary)', margin:'0 0 6px', lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                            {j.description}
                          </p>
                        )}
                        <p style={{ fontSize:11, color:'var(--text-muted)', margin:0 }}>
                          {j.timeline && <>{j.timeline} · </>}
                          {new Date(j.created_at).toLocaleDateString('de', { day:'numeric', month:'short' })}
                        </p>
                      </div>
                      <button onClick={() => acceptJob(j.id)}
                        style={{ padding:'8px 16px', background:'var(--btn-prim)', color:'var(--btn-prim-text)', border:'none', borderRadius:10, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', flexShrink:0, whiteSpace:'nowrap' }}>
                        Annehmen
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* My projects (non-pool) */}
          {myProjects.length > 0 && (
            <div>
              <h2 style={{ margin:'0 0 14px', fontSize:20, fontWeight:700, letterSpacing:'-.4px' }}>
                {accessMode === 'company' ? 'Kunden-Projekte' : 'Meine Projekte'}
              </h2>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:8 }}>
                {myProjects.slice(0, 6).map(p => (
                  <Link key={p.id} href={`/project/${p.id}`}
                    style={{ display:'block', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:'14px 16px', textDecoration:'none', color:'inherit', transition:'border-color .12s' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                      <p style={{ fontSize:13.5, fontWeight:700, color:'var(--text)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, paddingRight:8 }}>{p.title}</p>
                      <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:4, background: p.status==='active'?'rgba(52,199,89,.1)':'var(--surface-2)', color: p.status==='active'?'var(--green)':'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', flexShrink:0 }}>{p.status}</span>
                    </div>
                    <p style={{ fontSize:11.5, color:'var(--text-muted)', margin:0 }}>Projekt ansehen →</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Active tasks */}
          {activeTasks.length > 0 && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:14 }}>
                <h2 style={{ margin:0, fontSize:20, fontWeight:700, letterSpacing:'-.4px' }}>In Arbeit</h2>
                <Link href="/dev/tasks" style={{ fontSize:12.5, fontWeight:600, color:'var(--text)', textDecoration:'none', opacity:.7 }}>Alle Tasks →</Link>
              </div>
              <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:'0 20px' }}>
                {activeTasks.slice(0, 5).map((t, i) => (
                  <Link key={t.id} href={`/project/${t.project_id}`} className="task-row" style={{ animation:`fadeUp .25s ${i*.05}s both` }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--green)', flexShrink:0 }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:13.5, fontWeight:600, color:'var(--text)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</p>
                      {t.projects?.title && <p style={{ fontSize:11, color:'var(--text-muted)', margin:'2px 0 0' }}>{t.projects.title}</p>}
                    </div>
                    <span style={{ fontSize:9.5, fontWeight:700, padding:'2px 7px', borderRadius:4, background:'rgba(245,158,11,.1)', color:'var(--amber-dark)', letterSpacing:'.06em', textTransform:'uppercase', flexShrink:0 }}>
                      AKTIV
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Pending tasks */}
          {pendingTasks.length > 0 && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:14 }}>
                <h2 style={{ margin:0, fontSize:20, fontWeight:700, letterSpacing:'-.4px' }}>Offene Tasks</h2>
                <Link href="/dev/tasks" style={{ fontSize:12.5, fontWeight:600, color:'var(--text)', textDecoration:'none', opacity:.7 }}>Alle →</Link>
              </div>
              <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:'0 20px' }}>
                {pendingTasks.slice(0, 5).map((t, i) => (
                  <Link key={t.id} href={`/project/${t.project_id}`} className="task-row" style={{ animation:`fadeUp .25s ${i*.05}s both` }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', border:'1.5px solid var(--border-strong)', flexShrink:0 }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:13.5, fontWeight:500, color:'var(--text)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</p>
                      {t.projects?.title && <p style={{ fontSize:11, color:'var(--text-muted)', margin:'2px 0 0' }}>{t.projects.title}</p>}
                    </div>
                    <span style={{ fontSize:9.5, fontWeight:700, padding:'2px 7px', borderRadius:4, background:'var(--surface-2)', color:'var(--text-muted)', letterSpacing:'.06em', textTransform:'uppercase', flexShrink:0 }}>
                      TODO
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {myTasks.length === 0 && newJobs.length === 0 && myProjects.length === 0 && (
            <div style={{ padding:'60px 20px', textAlign:'center', border:'1px dashed var(--border)', borderRadius:16 }}>
              <p style={{ fontSize:16, fontWeight:700, color:'var(--text)', margin:'0 0 6px' }}>Noch keine Aktivität</p>
              <p style={{ fontSize:13.5, color:'var(--text-muted)', margin:'0 0 20px' }}>Nimm deinen ersten Auftrag an oder warte auf eine Zuweisung.</p>
              <Link href="/dev/jobs" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'10px 20px', background:'var(--btn-prim)', color:'var(--btn-prim-text)', borderRadius:12, fontSize:13, fontWeight:700, textDecoration:'none' }}>
                Jobs ansehen →
              </Link>
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

          {/* Time tracking */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:'18px 20px' }}>
            <p style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.1em', margin:'0 0 14px' }}>ZEITERFASSUNG</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
              <div>
                <p style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600, margin:'0 0 4px' }}>Heute</p>
                <p style={{ fontSize:22, fontWeight:700, color:'var(--text)', margin:0, letterSpacing:'-.4px' }}>{fmtMin(stats.todayMin)}</p>
              </div>
              <div>
                <p style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600, margin:'0 0 4px' }}>Woche</p>
                <p style={{ fontSize:22, fontWeight:700, color:'var(--text)', margin:0, letterSpacing:'-.4px' }}>{fmtMin(stats.weekMin)}</p>
              </div>
            </div>
            <Link href="/dev/time" style={{ display:'block', padding:'9px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:10, fontSize:12.5, fontWeight:700, color:'var(--text)', textAlign:'center', textDecoration:'none' }}>
              Zeit erfassen →
            </Link>
          </div>

          {/* Quick links */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:'18px 20px' }}>
            <p style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.1em', margin:'0 0 12px' }}>QUICK ACCESS</p>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              {[
                { href:'/dev/jobs',     label:'Job Board',       desc:'Aufträge ansehen' },
                { href:'/dev/tasks',    label:'Meine Tasks',     desc:'Task-Übersicht' },
                { href:'/dev/projects', label:'Meine Projekte',  desc:'Alle Projekte' },
                { href:'/messages',     label:'Nachrichten',     desc:'Chats & Updates' },
                { href:'/settings',     label:'Einstellungen',   desc:'Skills & Profil' },
              ].map(l => (
                <Link key={l.href} href={l.href}
                  style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 10px', borderRadius:10, textDecoration:'none', color:'inherit', transition:'background .1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div>
                    <p style={{ fontSize:13, fontWeight:600, color:'var(--text)', margin:0 }}>{l.label}</p>
                    <p style={{ fontSize:11, color:'var(--text-muted)', margin:0 }}>{l.desc}</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                </Link>
              ))}
            </div>
          </div>

          {/* Team / Collaborators */}
          {collaborators.length > 0 && (
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:'18px 20px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <p style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.1em', margin:0 }}>TEAM</p>
                <Link href="/teams" style={{ fontSize:11.5, fontWeight:600, color:'var(--text)', textDecoration:'none', opacity:.7 }}>→</Link>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {collaborators.slice(0, 4).map(c => {
                  const p = c.profile
                  const init = (p?.first_name ?? p?.full_name ?? '?').charAt(0).toUpperCase()
                  return (
                    <div key={c.id} className="collab-chip">
                      <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--surface-2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, overflow:'hidden', border:'1px solid var(--border)', flexShrink:0 }}>
                        {p?.avatar_url ? <img src={p.avatar_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : init}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:12.5, fontWeight:600, color:'var(--text)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {p?.first_name ?? p?.full_name ?? 'Mitglied'}
                        </p>
                        <p style={{ fontSize:10, color:'var(--text-muted)', margin:0, textTransform:'capitalize' }}>{p?.role ?? 'dev'}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Mode info */}
          <div style={{ padding:'14px 16px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:14 }}>
            <p style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.1em', margin:'0 0 4px' }}>ZUGRIFFSMODUS</p>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', margin:'0 0 4px' }}>{modeLabel[accessMode]}</p>
            <p style={{ fontSize:11.5, color:'var(--text-secondary)', margin:0, lineHeight:1.5 }}>
              {accessMode === 'pool'
                ? 'Öffentlicher Festag Job Pool — du siehst alle offenen Aufträge.'
                : accessMode === 'closed'
                ? 'Exklusiver Zugang — nur dein Client sichtbar.'
                : 'Agentur-Modus — du verwaltest deine eigenen Clients.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
