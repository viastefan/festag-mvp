'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import LoadingScreen from '@/components/LoadingScreen'
import NewProjectModal from '@/components/NewProjectModal'
import NewTaskModal from '@/components/NewTaskModal'
import AudioBriefingButton from '@/components/AudioBriefingButton'

type Project   = { id: string; title: string; description: string | null; status: string; created_at: string; color: string | null }
type Task      = { id: string; title: string; status: string; priority?: string; project_id: string; updated_at?: string }
type Activity  = { id: string; type: string; message: string; created_at: string; project_id?: string }
type Milestone = { id: string; project_id: string; title: string; amount: number | null; currency: string | null; status: string | null; due_date: string | null; paid_at: string | null; order_index: number | null }

const PHASE: Record<string, { label: string; pct: number }> = {
  intake:   { label: 'Intake',        pct: 10  },
  planning: { label: 'Planung',       pct: 28  },
  active:   { label: 'In Arbeit',     pct: 62  },
  testing:  { label: 'Testing',       pct: 85  },
  done:     { label: 'Abgeschlossen', pct: 100 },
}

const MILESTONES = [
  { label: 'Kickoff',   pct: 10  },
  { label: 'Design',    pct: 28  },
  { label: 'MVP',       pct: 62  },
  { label: 'Testing',   pct: 85  },
  { label: 'Delivery',  pct: 100 },
]

export default function DashboardPage() {
  const [projects,  setProjects]  = useState<Project[]>([])
  const [main,      setMain]      = useState<Project|null>(null)
  const [tasks,     setTasks]     = useState<Task[]>([])
  const [allTasks,  setAllTasks]  = useState<Task[]>([])
  const [activity,  setActivity]  = useState<Activity[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [wsMode, setWsMode] = useState<'delivery' | 'team' | 'agency'>('delivery')
  const [teamSize, setTeamSize] = useState<number>(1)
  const [firstName, setFirstName] = useState('')
  const [loading,   setLoading]   = useState(true)
  const [report,    setReport]    = useState('')
  const [genReport, setGenReport] = useState(false)
  const [showNewProject, setShowNewProject] = useState(false)
  const [showNewTask,    setShowNewTask]    = useState(false)
  const [showLoader, setShowLoader] = useState(() =>
    typeof window !== 'undefined' && !sessionStorage.getItem('festag_dash_loaded')
  )
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      const uid = data.session.user.id
      const { data: p } = await supabase.from('profiles').select('first_name,full_name,role').eq('id', uid).single()
      if (p) setFirstName((p as any).first_name ?? (p as any).full_name?.split(' ')[0] ?? '')

      const { data: projs } = await supabase.from('projects').select('*').order('created_at', { ascending:false })
      if (projs?.length) {
        setProjects(projs)
        const prio: Record<string,number> = { active:0, testing:1, planning:2, intake:3, done:4 }
        const m = [...(projs as any[])].sort((a,b) => (prio[a.status]??9)-(prio[b.status]??9))[0]
        setMain(m)
        const [{ data: t }, { data: at }, { data: ms }] = await Promise.all([
          supabase.from('tasks').select('*').eq('project_id', m.id),
          supabase.from('tasks').select('*').in('project_id', (projs as any[]).map(pr => pr.id)),
          supabase.from('milestones').select('id,project_id,title,amount,currency,status,due_date,paid_at,order_index').in('project_id', (projs as any[]).map(pr => pr.id)).order('order_index', { ascending: true }),
        ])
        setTasks(t ?? [])
        setAllTasks(at ?? [])
        setMilestones((ms as Milestone[] | null) ?? [])
      }
      const { data: feed } = await supabase.from('activity_feed').select('*').order('created_at',{ascending:false}).limit(8)
      setActivity(feed ?? [])

      // Workspace mode + team size drive Mission-Control framing.
      try {
        const { data: ws } = await supabase
          .from('workspaces').select('id,mode')
          .eq('primary_owner_id', uid).eq('is_personal', true).maybeSingle()
        const m = (ws as any)?.mode
        if (m === 'team' || m === 'agency' || m === 'delivery') setWsMode(m)
        const wid = (ws as any)?.id
        if (wid) {
          const { count } = await supabase.from('workspace_members').select('user_id', { count: 'exact', head: true }).eq('workspace_id', wid)
          if (typeof count === 'number') setTeamSize(count)
        }
      } catch {}

      setLoading(false)
    })
  }, [])

  async function generateReport() {
    if (!main || genReport) return
    setGenReport(true); setReport('')
    const done = tasks.filter(t => t.status==='done').length
    const pct  = tasks.length ? Math.round(done/tasks.length*100) : 0
    try {
      const res = await fetch('/api/ai/chat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          system:'Du bist Tagro. Erstelle einen kurzen Statusbericht auf Deutsch. 3-4 Sätze. Klar und direkt. Keine Emojis.',
          max_tokens:280,
          messages:[{ role:'user', content:`Projekt: "${main.title}". Phase: ${PHASE[main.status]?.label}. Fortschritt: ${pct}%. ${done} von ${tasks.length} Tasks erledigt.` }],
        }),
      })
      const d = await res.json()
      setReport(d.content?.[0]?.text ?? '')
    } catch {}
    setGenReport(false)
  }

  const h = new Date().getHours()
  const greeting = h < 12 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend'
  const displayName = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : ''

  function timeAgo(dateStr: string) {
    const d = Date.now() - new Date(dateStr).getTime()
    if (d < 60000)    return 'Gerade'
    if (d < 3600000)  return `vor ${Math.floor(d/60000)} Min`
    if (d < 86400000) return `vor ${Math.floor(d/3600000)} Std`
    return `vor ${Math.floor(d/86400000)}d`
  }

  if (showLoader) return <LoadingScreen onDone={() => { sessionStorage.setItem('festag_dash_loaded','1'); setShowLoader(false) }}/>
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh', color:'var(--text-muted)', fontWeight:700 }}>
      Workspace wird vorbereitet.
    </div>
  )

  const phase       = main ? (PHASE[main.status] ?? PHASE.intake) : null
  const done        = tasks.filter(t => t.status==='done').length
  const inProgress  = tasks.filter(t => t.status==='doing').length
  const todo        = tasks.filter(t => t.status==='todo').length
  const activeTasks = tasks.filter(t => t.status!=='done')
  const completePct = tasks.length ? Math.round(done/tasks.length*100) : 0
  const phaseIdx    = main ? ['intake','planning','active','testing','done'].indexOf(main.status) : -1
  const projColor   = main?.color || null  // never fallback to green

  // ── KPI bar values ────────────────────────────────────────────
  const activeProjects = projects.filter(p => p.status === 'active' || p.status === 'testing' || p.status === 'planning')
  const decisionsOpen  = allTasks.filter(t => t.status === 'waiting').length
  const blockersOpen   = allTasks.filter(t => t.status === 'blocked').length
  const nextMilestone  = main
    ? milestones
        .filter(m => m.project_id === main.id && !m.paid_at && m.status !== 'completed' && m.status !== 'paid')
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))[0]
    : null
  const milestoneAmount = nextMilestone?.amount != null
    ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: nextMilestone.currency || 'EUR', maximumFractionDigits: 0 }).format(Number(nextMilestone.amount))
    : null
  const milestoneDue = nextMilestone?.due_date ? new Date(nextMilestone.due_date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }) : null

  // ── Project segmentation ──────────────────────────────────────
  function segmentOf(p: Project): 'active' | 'waiting' | 'draft' | 'archived' {
    const taskList = allTasks.filter(t => t.project_id === p.id)
    if (p.status === 'done')                                         return 'archived'
    if (taskList.some(t => t.status === 'waiting'))                  return 'waiting'
    if ((p.status === 'intake' || p.status === 'planning') && taskList.length === 0) return 'draft'
    return 'active'
  }
  const segActive   = projects.filter(p => segmentOf(p) === 'active')
  const segWaiting  = projects.filter(p => segmentOf(p) === 'waiting')
  const segDraft    = projects.filter(p => segmentOf(p) === 'draft')
  const segArchived = projects.filter(p => segmentOf(p) === 'archived')

  return (
    <div className="page-content dashboard-os" style={{ maxWidth: undefined }}>
      <style>{`
        @keyframes spin { to{transform:rotate(360deg);} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;} }
        .dashboard-os {
          --dash-ease:cubic-bezier(.16,1,.3,1);
          --dash-hairline:color-mix(in srgb, var(--border) 42%, transparent);
          --dash-muted:color-mix(in srgb, var(--text-muted) 82%, transparent);
          color:var(--text);
          padding-top:clamp(24px, 2.4vw, 36px);
          padding-bottom:72px;
        }
        .dash-hero {
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:28px;
          margin-bottom:58px;
          animation:fadeUp .32s var(--dash-ease) both;
        }
        .dash-hero--compact { margin-bottom: 22px; align-items: flex-start; }
        .dash-title {
          margin:0;
          font-size:clamp(34px, 4.2vw, 56px);
          line-height:.98;
          font-weight:740;
          letter-spacing:0;
          color:var(--text);
        }
        .dash-title--compact { font-size: clamp(22px, 2.4vw, 28px); line-height: 1.15; letter-spacing: -.01em; font-weight: 600; }
        .kpi-row {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 44px;
          animation: fadeUp .34s var(--dash-ease) both;
        }
        .kpi-card {
          display: flex; flex-direction: column; gap: 4px;
          padding: 14px 16px;
          border: 1px solid var(--dash-hairline);
          border-radius: 12px;
          background: color-mix(in srgb, var(--surface) 60%, transparent);
          min-width: 0;
        }
        .kpi-label {
          font-size: 11px; font-weight: 600; letter-spacing: 0.02em;
          color: var(--text-muted); text-transform: uppercase;
        }
        .kpi-value {
          font-size: 22px; font-weight: 600; letter-spacing: -0.01em;
          color: var(--text); line-height: 1.1;
        }
        .kpi-sub {
          font-size: 11.5px; color: var(--text-muted);
          line-height: 1.4;
          overflow: hidden; text-overflow: ellipsis;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        }
        @media (max-width: 880px) {
          .kpi-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        .dash-meta {
          margin:12px 0 0;
          font-size:14px;
          color:var(--text-muted);
          font-weight:520;
          letter-spacing:-.01em;
        }
        .dash-actions { display:flex; align-items:center; gap:10px; flex-shrink:0; padding-top:2px; }
        .dash-button {
          height:36px;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:7px;
          padding:0 15px;
          border-radius:11px;
          border:1px solid color-mix(in srgb, var(--border) 54%, transparent);
          background:color-mix(in srgb, var(--surface) 64%, transparent);
          color:var(--text);
          font:inherit;
          font-size:12.5px;
          font-weight:690;
          letter-spacing:-.01em;
          cursor:pointer;
          text-decoration:none;
          box-shadow:0 14px 34px rgba(0,0,0,.035);
          transition:transform .24s var(--dash-ease), background .24s var(--dash-ease), border-color .24s var(--dash-ease), box-shadow .24s var(--dash-ease), opacity .24s var(--dash-ease);
        }
        .dash-button:hover {
          transform:translateY(-1px);
          background:color-mix(in srgb, var(--surface-2) 34%, var(--surface));
          border-color:color-mix(in srgb, var(--border-strong) 46%, transparent);
          box-shadow:0 20px 46px rgba(0,0,0,.055);
        }
        .dash-button.primary {
          background:var(--btn-prim);
          color:var(--btn-prim-text);
          border-color:transparent;
          box-shadow:0 18px 44px rgba(0,0,0,.11);
        }
        .dash-layout {
          display:grid;
          grid-template-columns:minmax(0, 1fr) 286px;
          gap:56px;
          align-items:start;
        }
        .dash-section {
          margin-bottom:56px;
          animation:fadeUp .34s var(--dash-ease) both;
        }
        .dash-section-head {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:16px;
          margin-bottom:16px;
        }
        .dash-label {
          margin:0;
          color:var(--dash-muted);
          font-size:12px;
          font-weight:680;
          letter-spacing:.01em;
          text-transform:none;
        }
        .dash-soft-action {
          background:transparent;
          border:0;
          padding:0;
          color:var(--text-muted);
          font:inherit;
          font-size:12px;
          font-weight:660;
          cursor:pointer;
          display:inline-flex;
          align-items:center;
          gap:5px;
          transition:color .18s var(--dash-ease), opacity .18s var(--dash-ease);
        }
        .dash-soft-action:hover { color:var(--text); }
        /* ── Heutiges Projektbriefing — primary anchor card ─────── */
        .dash-briefing-section { margin-bottom: 32px; }
        .dash-today-briefing {
          padding: 22px 24px;
          border-radius: 16px;
          background: linear-gradient(135deg, var(--card), color-mix(in srgb, var(--surface-2) 50%, var(--card)));
          border: 1px solid var(--border);
          display: flex; flex-direction: column; gap: 14px;
        }
        .dash-today-head {
          display: flex; justify-content: space-between; align-items: baseline;
          flex-wrap: wrap; gap: 6px;
        }
        .dash-today-kicker {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 12px; font-weight: 660; letter-spacing: 0.02em;
          color: var(--text-secondary); text-transform: uppercase;
        }
        .dash-today-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #25C47A; box-shadow: 0 0 0 3px rgba(37, 196, 122, .14);
        }
        .dash-today-meta { font-size: 12.5px; color: var(--text-muted); }
        .dash-today-text {
          margin: 0; font-size: 15px; line-height: 1.55; color: var(--text);
          letter-spacing: -.005em; max-width: 720px;
        }
        .dash-today-actions {
          display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px;
        }
        @media (max-width: 720px) {
          .dash-today-briefing { padding: 18px 16px; }
          .dash-today-text { font-size: 14px; }
        }

        .dash-current {
          border-radius:24px;
          overflow:hidden;
          background:
            linear-gradient(135deg, color-mix(in srgb, var(--surface) 58%, transparent), transparent 72%),
            color-mix(in srgb, var(--surface) 36%, transparent);
          border:1px solid color-mix(in srgb, var(--border) 34%, transparent);
          box-shadow:0 24px 70px rgba(0,0,0,.045);
          backdrop-filter:blur(18px) saturate(145%);
          -webkit-backdrop-filter:blur(18px) saturate(145%);
        }
        .dash-current-top { display:flex; align-items:flex-start; gap:16px; padding:22px 24px 18px; }
        .dash-current-actions { display:flex; align-items:center; gap:7px; flex-shrink:0; }
        .dash-chip {
          display:inline-flex;
          align-items:center;
          height:22px;
          padding:0 8px;
          border-radius:999px;
          background:color-mix(in srgb, var(--surface-2) 48%, transparent);
          color:var(--text-muted);
          font-size:10.5px;
          font-weight:680;
          letter-spacing:.01em;
        }
        .dash-current-progress {
          padding:16px 24px 20px;
          background:linear-gradient(180deg, transparent, color-mix(in srgb, var(--surface-2) 18%, transparent));
        }
        .dash-current-milestone {
          padding: 14px 24px 18px;
          display: flex; flex-direction: column; gap: 7px;
          border-top: 1px solid var(--dash-hairline);
        }
        .dash-current-milestone .ml-row {
          display: flex; align-items: baseline; justify-content: space-between;
          gap: 12px;
        }
        .dash-current-milestone .ml-label {
          font-size: 11.5px; font-weight: 500; color: var(--text-muted);
          letter-spacing: 0.01em;
        }
        .dash-current-milestone .ml-value {
          font-size: 12.5px; font-weight: 500; color: var(--text);
          letter-spacing: -0.005em; text-align: right;
        }
        .dash-current-milestone .ml-payment { color: var(--text-secondary); }
        .dash-segment { margin-bottom: 14px; }
        .dash-segment-label {
          margin: 12px 0 4px;
          font-size: 11px; font-weight: 600;
          letter-spacing: 0.02em; text-transform: uppercase;
          color: var(--text-muted);
          display: inline-flex; align-items: center; gap: 6px;
        }
        .dash-segment-count {
          font-size: 10.5px; font-weight: 500;
          color: var(--text-muted); opacity: .72;
          padding: 0 5px; border-radius: 999px;
          background: color-mix(in srgb, var(--surface-2) 40%, transparent);
        }
        .dash-row {
          display:flex;
          align-items:center;
          gap:0;
          min-height:50px;
          margin:5px -16px;
          padding-left:4px;
          padding-right:4px;
          border-radius:15px;
          background:transparent;
          transition:background .28s var(--dash-ease), transform .28s var(--dash-ease), box-shadow .28s var(--dash-ease), opacity .28s var(--dash-ease);
        }
        .dash-row:hover {
          background:color-mix(in srgb, var(--surface-2) 22%, transparent);
          transform:translateY(-1px) scale(1.002);
          box-shadow:0 18px 44px rgba(0,0,0,.035);
          backdrop-filter:blur(12px);
          -webkit-backdrop-filter:blur(12px);
        }
        .dash-col-name { flex:1; min-width:0; padding:12px 18px; }
        .dash-col-stat { padding:12px 14px; font-size:12px; color:var(--text-muted); font-weight:540; white-space:nowrap; }
        .dash-col-bar { padding:12px 14px; width:132px; }
        .dash-progress-track {
          height:2px;
          background:color-mix(in srgb, var(--surface-2) 34%, transparent);
          border-radius:99px;
          overflow:hidden;
          opacity:.55;
          transition:opacity .26s var(--dash-ease), background .26s var(--dash-ease);
        }
        .dash-row:hover .dash-progress-track { opacity:1; background:color-mix(in srgb, var(--surface-2) 54%, transparent); }
        .dash-progress-fill { height:100%; border-radius:99px; opacity:.78; transition:width .7s var(--dash-ease), opacity .26s var(--dash-ease); }
        .dash-row:hover .dash-progress-fill { opacity:1; }
        .task-row {
          display:flex;
          align-items:center;
          gap:11px;
          min-height:42px;
          padding:0 18px;
          margin:4px -16px;
          border-radius:14px;
          transition:background .24s var(--dash-ease), transform .24s var(--dash-ease), box-shadow .24s var(--dash-ease);
        }
        .task-row:hover {
          background:color-mix(in srgb, var(--surface-2) 20%, transparent);
          transform:translateY(-1px) scale(1.001);
          box-shadow:0 14px 34px rgba(0,0,0,.026);
        }
        .dash-report {
          padding:2px 0 0;
          max-width:760px;
        }
        .dash-report-text {
          margin:0;
          color:var(--text-secondary);
          font-size:14px;
          line-height:1.85;
          letter-spacing:-.015em;
          white-space:pre-wrap;
        }
        .dash-report-empty {
          margin:0;
          color:var(--text-muted);
          font-size:13px;
          line-height:1.7;
          font-style:italic;
        }
        .cp-card {
          padding: 14px 16px;
          border: 1px solid var(--dash-hairline);
          border-radius: 12px;
          background: color-mix(in srgb, var(--surface) 60%, transparent);
        }
        .cp-card .dash-label { margin-bottom: 10px; }
        .cp-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
        .cp-list li { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--text); }
        .cp-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .cp-headline { margin: 0 0 2px; font-size: 13.5px; font-weight: 600; color: var(--text); letter-spacing: -0.005em; line-height: 1.3; }
        .cp-sub { margin: 0; font-size: 12px; color: var(--text-muted); line-height: 1.45; }
        .cp-divider { height: 1px; background: var(--dash-hairline); margin: 10px 0; }
        .dash-side-rail {
          display:flex;
          flex-direction:column;
          gap:12px;
          animation:fadeUp .34s .08s var(--dash-ease) both;
          position:sticky;
          top:30px;
        }
        .stat-grid { display:grid; grid-template-columns:1fr 1fr; gap:18px 20px; }
        .stat-item { display:flex; flex-direction:column; gap:4px; }
        .stat-value { font-size:24px; font-weight:680; color:var(--text); letter-spacing:-.055em; line-height:1; }
        .stat-caption { font-size:10.5px; font-weight:670; color:var(--text-muted); letter-spacing:.045em; text-transform:uppercase; }
        .stat-sub { font-size:11px; color:var(--text-muted); font-weight:520; }
        .quick-link {
          display:flex;
          align-items:center;
          justify-content:space-between;
          min-height:34px;
          margin:2px -9px;
          padding:0 9px;
          border-radius:11px;
          text-decoration:none;
          color:var(--text-secondary);
          font-size:13px;
          font-weight:560;
          transition:background .2s var(--dash-ease), color .2s var(--dash-ease), transform .2s var(--dash-ease);
        }
        .quick-link:hover {
          color:var(--text);
          background:color-mix(in srgb, var(--surface-2) 18%, transparent);
          transform:translateX(1px);
        }
        .activity-row {
          display:flex;
          gap:10px;
          padding:8px 0;
          color:var(--text-muted);
        }
        @media (max-width: 1120px) {
          .dash-layout { grid-template-columns:1fr; gap:32px; }
          .dash-side-rail { position:static; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:26px; }
        }
        @media (max-width: 760px) {
          .dashboard-os { padding-bottom:120px; }
          .dash-hero--compact { flex-direction:column; align-items:flex-start; gap:14px; margin-bottom:18px; }
          .dash-title--compact { font-size:22px; }
          .dash-meta { font-size:13px; }
          .dash-hero { flex-direction:column; margin-bottom:36px; }
          .dash-title { font-size:30px; }
          .dash-actions { width:100%; flex-wrap:wrap; gap:8px; }
          .dash-actions .dash-button { flex:1 1 calc(50% - 4px); justify-content:center; min-height:40px; }

          /* KPI bar */
          .kpi-row { grid-template-columns:repeat(2, minmax(0,1fr)); gap:8px; }
          .kpi-card { padding:12px 13px; }
          .kpi-value { font-size:20px; }
          .kpi-sub { font-size:11px; }

          /* Heutiges Projektbriefing */
          .dash-briefing-section { margin-bottom:20px; }
          .dash-today-briefing { padding:16px 16px; gap:12px; }
          .dash-today-head { flex-direction:column; align-items:flex-start; gap:4px; }
          .dash-today-text { font-size:14px; line-height:1.5; }
          .dash-today-actions { gap:6px; }
          .dash-today-actions .dash-button { flex:1 1 calc(50% - 3px); justify-content:center; min-height:38px; font-size:12px; }

          /* Active project card */
          .dash-current-top { flex-direction:column; gap:12px; padding:16px 16px 12px; }
          .dash-current-progress { padding:12px 16px 14px; }
          .dash-current-milestone { padding:12px 16px 14px; }
          .dash-current-milestone .ml-row { flex-direction:column; gap:2px; align-items:flex-start; }
          .dash-current-milestone .ml-value { text-align:left; }
          .dash-current-actions { width:100%; flex-wrap:wrap; }
          .dash-current-actions .dash-button { flex:1 1 calc(50% - 4px); justify-content:center; min-height:38px; }

          /* Project segments */
          .dash-segment-label { font-size:10.5px; }
          .dash-col-stat:nth-of-type(2),
          .dash-col-bar { display:none; }

          /* Right rail collapses into stacked cards */
          .dash-side-rail { display:flex; flex-direction:column; gap:10px; }
          .cp-card { padding:12px 14px; }

          /* Larger touch targets across the whole shell */
          .dash-button { min-height:36px; }
        }
        @media (max-width: 420px) {
          .kpi-row { grid-template-columns:1fr; }
          .dash-actions .dash-button,
          .dash-today-actions .dash-button,
          .dash-current-actions .dash-button { flex:1 1 100%; }
        }
      `}</style>

      {/* ── Today header + KPI bar ── */}
      <div className="dash-hero dash-hero--compact">
        <div>
          <h1 className="dash-title dash-title--compact">Heute wichtig</h1>
          <p className="dash-meta">
            {displayName ? `${greeting}, ${displayName}. ` : ''}
            Tagro fasst Fortschritt, Risiken, Entscheidungen und nächste Schritte für dich zusammen.
          </p>
        </div>
        <div className="dash-actions">
          <AudioBriefingButton
            type="dashboard_briefing"
            label="Briefing anhören"
            projectTitle={main?.title}
            report={report || `${projects.length} Projekte, ${allTasks.length} Tasks. Aktueller Fokus: ${main?.title ?? 'kein aktives Projekt'}.`}
            projectStatus={main ? PHASE[main.status]?.label : undefined}
            progress={completePct}
            blockerCount={blockersOpen}
            decisionCount={decisionsOpen}
            nextSteps={[main ? `${main.title} prüfen` : 'erstes Projekt erstellen']}
          />
          <button onClick={() => setShowNewProject(true)} className="dash-button">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            Neues Projekt
          </button>
        </div>
      </div>

      <div className="kpi-row" aria-label="Heute wichtig">
        {/* KPI 1 — Projekt-/Kundenüberblick je nach Modus */}
        {wsMode === 'agency' ? (
          <div className="kpi-card">
            <span className="kpi-label">Kunden</span>
            <span className="kpi-value">{projects.length}</span>
            <span className="kpi-sub">
              {projects.length === 0 ? 'noch keine Kundenprojekte' : `${activeProjects.length} aktiv · ${projects.length - activeProjects.length} ruhend`}
            </span>
          </div>
        ) : (
          <div className="kpi-card">
            <span className="kpi-label">Projektstatus</span>
            <span className="kpi-value">{activeProjects.length}</span>
            <span className="kpi-sub">
              {activeProjects.length === 0
                ? 'kein aktives Projekt'
                : activeProjects.length === 1
                  ? `${activeProjects[0].title}${main && PHASE[main.status] ? ` · ${PHASE[main.status].label}` : ''}`
                  : `${activeProjects.length} laufen`}
            </span>
          </div>
        )}

        {/* KPI 2 — Entscheidungen bleiben in allen Modi konstant */}
        <div className="kpi-card">
          <span className="kpi-label">Entscheidungen</span>
          <span className="kpi-value" style={{ color: decisionsOpen > 0 ? '#0369A1' : undefined }}>{decisionsOpen}</span>
          <span className="kpi-sub">
            {decisionsOpen === 0 ? 'nichts wartet auf dich' : decisionsOpen === 1 ? 'wartet auf deine Freigabe' : 'warten auf deine Freigabe'}
          </span>
        </div>

        {/* KPI 3 — Blocker bleiben in allen Modi konstant */}
        <div className="kpi-card">
          <span className="kpi-label">Blocker</span>
          <span className="kpi-value" style={{ color: blockersOpen > 0 ? '#D97706' : undefined }}>{blockersOpen}</span>
          <span className="kpi-sub">
            {blockersOpen === 0 ? 'keine akute Verzögerung' : blockersOpen === 1 ? 'kritischer Blocker' : 'kritische Blocker'}
          </span>
        </div>

        {/* KPI 4 — pro Modus unterschiedlich */}
        {wsMode === 'team' ? (
          <div className="kpi-card">
            <span className="kpi-label">Workspace Health</span>
            <span className="kpi-value">{teamSize}</span>
            <span className="kpi-sub">
              {teamSize <= 1
                ? `Solo · ${activeProjects.length} aktive Projekte`
                : `${teamSize} Mitglied${teamSize === 1 ? '' : 'er'} · ${activeProjects.length} aktive Projekte`}
            </span>
          </div>
        ) : wsMode === 'agency' ? (
          <div className="kpi-card">
            <span className="kpi-label">Aktive Projekte</span>
            <span className="kpi-value">{activeProjects.length}</span>
            <span className="kpi-sub">
              {activeProjects.length === 0 ? 'kein laufendes Projekt' : `über ${projects.length} Kunden`}
            </span>
          </div>
        ) : (
          <div className="kpi-card">
            <span className="kpi-label">Nächster Meilenstein</span>
            <span className="kpi-value">{milestoneAmount ?? '—'}</span>
            <span className="kpi-sub">
              {nextMilestone
                ? `${nextMilestone.title}${milestoneDue ? ` · ${milestoneDue}` : ''}`
                : main
                  ? 'noch kein offener Meilenstein'
                  : 'keine Zahlung anstehend'}
            </span>
          </div>
        )}
      </div>

      {/* ── Empty ── */}
      {!main && (
        <div style={{ padding:'92px 0', textAlign:'center', animation:'fadeUp .34s var(--dash-ease) both' }}>
          <p style={{ fontSize:14, fontWeight:600, color:'var(--text)', margin:'0 0 6px' }}>Noch kein Projekt</p>
          <p style={{ fontSize:12.5, color:'var(--text-muted)', maxWidth:320, margin:'0 auto 24px', lineHeight:1.6 }}>
            Erstelle dein erstes Projekt und lass Tagro die Struktur automatisch aufbauen.
          </p>
          <button onClick={() => setShowNewProject(true)} className="dash-button primary">
            Projekt erstellen
          </button>
        </div>
      )}

      {main && phase && (
        <div className="dash-layout">

          {/* ══ LEFT ══ */}
          <div>

            {/* ── Heutiges Projektbriefing — primärer Anker ── */}
            <div className="dash-section dash-briefing-section" style={{ animationDelay:'.03s' }}>
              <article className="dash-today-briefing">
                <div className="dash-today-head">
                  <span className="dash-today-kicker">
                    <span className="dash-today-dot" />
                    Heutiges Projektbriefing
                  </span>
                  <span className="dash-today-meta">
                    {main ? `${main.title}` : 'Kein aktives Projekt'}
                  </span>
                </div>
                <p className="dash-today-text">
                  {report
                    ? report
                    : main
                      ? `Tagro hat den aktuellen Stand zu "${main.title}" noch nicht analysiert. Klick auf "Briefing aktualisieren", damit Tagro Fortschritt, Risiken und Entscheidungen zusammenfasst.`
                      : 'Sobald dein erstes Projekt startet, fasst Tagro hier den heutigen Stand zusammen — was wichtig ist, ohne Datenflut.'}
                </p>
                <div className="dash-today-actions">
                  {main && (
                    <Link href={`/reports?project=${main.id}`} className="dash-button primary" style={{ height:34 }}>
                      Briefing öffnen
                    </Link>
                  )}
                  {main && (
                    <Link href="/voice-reports" className="dash-button" style={{ height:34 }}>
                      Audio anhören
                    </Link>
                  )}
                  <button onClick={generateReport} disabled={genReport || !main} className="dash-button" style={{ height:34 }}>
                    {genReport ? 'Tagro analysiert…' : report ? 'Briefing aktualisieren' : 'Tagro generieren'}
                  </button>
                  {main && (
                    <Link href={`/reports?project=${main.id}#zustellung`} className="dash-button" style={{ height:34, opacity:.78 }}>
                      Zustellung konfigurieren
                    </Link>
                  )}
                </div>
              </article>
            </div>

            {/* ── Active project card ── */}
            <div className="dash-section" style={{ animationDelay:'.05s' }}>
              <p className="dash-label">Aktuelles Projekt</p>
              <div className="dash-current">
                {/* Top row */}
                <div className="dash-current-top">
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                      <span style={{ width:7, height:7, borderRadius:'50%', border:`2px solid ${projColor || 'var(--border-strong)'}`, background:'transparent', flexShrink:0, boxSizing:'border-box' }}/>
                      <Link href={`/project/${main.id}`} style={{ textDecoration:'none' }}>
                        <h2 style={{ fontSize:15, fontWeight:600, letterSpacing:'-.2px', margin:0, color:'var(--text)' }}>{main.title}</h2>
                      </Link>
                      <span className="dash-chip">
                        {phase.label}
                      </span>
                    </div>
                    {main.description && (
                      <p style={{ margin:0, fontSize:12.5, color:'var(--text-secondary)', lineHeight:1.55, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                        {main.description}
                      </p>
                    )}
                  </div>
                  <div className="dash-current-actions">
                    <Link href={`/reports?project=${main.id}`} className="dash-button primary" style={{ height:32, padding:'0 14px' }}>
                      Briefing öffnen
                    </Link>
                    <Link href={`/reports?project=${main.id}#audio`} className="dash-button" style={{ height:32, padding:'0 12px' }}>
                      Audio
                    </Link>
                    <Link href={`/project/${main.id}`} className="dash-button" style={{ height:32, padding:'0 12px' }}>
                      Tasks
                    </Link>
                    <Link href={`/project/${main.id}?tab=assets`} className="dash-button" style={{ height:32, padding:'0 12px' }}>
                      Assets
                    </Link>
                    {decisionsOpen > 0 && (
                      <Link href="/tasks?status=waiting" className="dash-button" style={{ height:32, padding:'0 12px', borderColor:'rgba(3,105,161,0.4)', color:'#0369A1' }}>
                        Entscheidung ({decisionsOpen})
                      </Link>
                    )}
                  </div>
                </div>

                {/* Progress strip */}
                <div className="dash-current-progress">
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                    <div style={{ display:'flex', gap:16 }}>
                      {([
                        { label:'Offen',    val:todo      },
                        { label:'Aktiv',    val:inProgress},
                        { label:'Erledigt', val:done      },
                      ] as const).map(s => (
                        <span key={s.label} style={{ fontSize:12, color:'var(--text-muted)', fontWeight:500 }}>
                          <span style={{ color:'var(--text)', fontWeight:600 }}>{s.val}</span> {s.label}
                        </span>
                      ))}
                    </div>
                    <span style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)' }}>{completePct}%</span>
                  </div>
                  {/* Milestone progress */}
                  <div style={{ position:'relative', height:2, background:'color-mix(in srgb, var(--surface-2) 42%, transparent)', borderRadius:3, marginBottom:9 }}>
                    <div style={{ height:'100%', width:`${phase.pct}%`, background: projColor || 'var(--text-secondary)', opacity:.76, borderRadius:3, transition:'width 1s cubic-bezier(.16,1,.3,1)' }}/>
                    {MILESTONES.map(ms => (
                      <div key={ms.label} style={{ position:'absolute', top:'50%', left:`${ms.pct}%`, transform:'translate(-50%,-50%)', width:6, height:6, borderRadius:'50%', background: phase.pct>=ms.pct ? (projColor||'var(--text-secondary)') : 'var(--card)', border:`1.5px solid ${phase.pct>=ms.pct?(projColor||'var(--text-secondary)'):'var(--border-strong)'}`, boxSizing:'border-box' }}/>
                    ))}
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    {MILESTONES.map((ms, i) => (
                      <span key={ms.label} style={{ fontSize:9.5, color: phase.pct>=ms.pct?'var(--text-secondary)':'var(--text-muted)', fontWeight: phaseIdx===i?600:400 }}>{ms.label}</span>
                    ))}
                  </div>
                </div>

                {/* Payment confidence — calm, never aggressive */}
                <div className="dash-current-milestone">
                  <div className="ml-row">
                    <span className="ml-label">Nächster Meilenstein</span>
                    <span className="ml-value">
                      {nextMilestone
                        ? `${nextMilestone.title}${milestoneDue ? ` · ${milestoneDue}` : ''}`
                        : 'Keiner geplant'}
                    </span>
                  </div>
                  <div className="ml-row">
                    <span className="ml-label">Zahlung</span>
                    <span className="ml-value ml-payment">
                      {milestoneAmount
                        ? `${milestoneAmount} · fällig bei Meilenstein-Freigabe`
                        : 'Keine offene Zahlung'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Projects, segmented ── */}
            {projects.length > 0 && (() => {
              const renderRow = (proj: Project) => {
                const ph  = PHASE[proj.status] ?? PHASE.intake
                const pt  = allTasks.filter(t => t.project_id === proj.id)
                const pd  = pt.filter(t => t.status === 'done').length
                const pct = pt.length ? Math.round(pd/pt.length*100) : 0
                const col = proj.color || null
                return (
                  <Link key={proj.id} href={`/project/${proj.id}`} style={{ textDecoration:'none', color:'inherit', display:'block' }}>
                    <div className="dash-row" style={{ cursor:'pointer' }}>
                      <div className="dash-col-name">
                        <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
                          <span style={{ width:6, height:6, borderRadius:'50%', border:`2px solid ${col || 'var(--border-strong)'}`, background:'transparent', flexShrink:0, boxSizing:'border-box' }}/>
                          <span style={{ fontSize:13, fontWeight:500, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{proj.title}</span>
                        </div>
                      </div>
                      <div className="dash-col-stat">{ph.label}</div>
                      <div className="dash-col-stat">{pt.length} Tasks</div>
                      <div className="dash-col-bar">
                        <div className="dash-progress-track">
                          <div className="dash-progress-fill" style={{ width:`${pct}%`, background: col || 'var(--text-muted)' }}/>
                        </div>
                      </div>
                      <div className="dash-col-stat" style={{ width:38, textAlign:'right' }}>{pct}%</div>
                    </div>
                  </Link>
                )
              }
              const renderSegment = (label: string, rows: Project[], muted = false) => rows.length === 0 ? null : (
                <div key={label} className="dash-segment" style={muted ? { opacity: .72 } : undefined}>
                  <p className="dash-segment-label">{label} <span className="dash-segment-count">{rows.length}</span></p>
                  <div>{rows.map(renderRow)}</div>
                </div>
              )
              return (
                <div className="dash-section" style={{ animationDelay:'.1s' }}>
                  <div className="dash-section-head">
                    <p className="dash-label">Projekte</p>
                    <button onClick={() => setShowNewProject(true)} className="dash-soft-action">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                      Neu
                    </button>
                  </div>
                  {renderSegment('Aktiv', segActive)}
                  {renderSegment('Wartet auf Entscheidung', segWaiting)}
                  {renderSegment('Entwürfe', segDraft, true)}
                  {renderSegment('Archiviert', segArchived, true)}
                </div>
              )
            })()}

            {/* ── Active tasks ── */}
            {activeTasks.length > 0 && (
              <div className="dash-section" style={{ animationDelay:'.15s' }}>
                <div className="dash-section-head">
                  <p className="dash-label">Aktive Tasks</p>
                  <Link href={`/project/${main.id}`} className="dash-soft-action" style={{ textDecoration:'none' }}>Alle →</Link>
                </div>
                {activeTasks.slice(0, 8).map((t, i, arr) => (
                  <div key={t.id} className="task-row">
                    <span style={{ width:6, height:6, borderRadius:'50%', background:'transparent', border:`1.5px solid ${t.status==='doing'?(projColor||'var(--text-secondary)'):'var(--border-strong)'}`, flexShrink:0, boxSizing:'border-box' }}/>
                    <span style={{ flex:1, fontSize:12.5, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</span>
                    <span style={{ fontSize:11, color:'var(--text-muted)', flexShrink:0 }}>
                      {t.status==='doing' ? 'Aktiv' : 'Offen'}
                      {t.priority === 'critical' ? ' · Kritisch' : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Tagro-Statusbericht ist jetzt in der "Heutiges Projektbriefing"-Card oben. */}

          </div>{/* end LEFT */}

          {/* ══ RIGHT — Tagro Control Panel ══ */}
          <div className="dash-side-rail">

            {/* Heute wichtig */}
            <div className="cp-card">
              <p className="dash-label">Heute wichtig</p>
              <ul className="cp-list">
                <li>
                  <span className="cp-dot" style={{ background: decisionsOpen > 0 ? '#0369A1' : 'var(--border-strong)' }} />
                  <span>{decisionsOpen === 0 ? 'Keine offene Entscheidung' : `${decisionsOpen} Entscheidung${decisionsOpen === 1 ? '' : 'en'} offen`}</span>
                </li>
                <li>
                  <span className="cp-dot" style={{ background: blockersOpen > 0 ? '#D97706' : 'var(--border-strong)' }} />
                  <span>{blockersOpen === 0 ? 'Keine kritischen Blocker' : `${blockersOpen} kritischer Blocker`}</span>
                </li>
                <li>
                  <span className="cp-dot" style={{ background: 'var(--border-strong)' }} />
                  <span>{activeProjects.length === 0 ? 'Kein aktives Projekt' : `${activeProjects.length} Projekt${activeProjects.length === 1 ? '' : 'e'} aktiv`}</span>
                </li>
              </ul>
            </div>

            {/* Nächster Meilenstein */}
            <div className="cp-card">
              <p className="dash-label">Nächster Meilenstein</p>
              {nextMilestone ? (
                <>
                  <p className="cp-headline">{nextMilestone.title}</p>
                  <p className="cp-sub">{milestoneDue ? `ETA ${milestoneDue}` : 'kein Datum gesetzt'}</p>
                  <div className="cp-divider" />
                  <p className="cp-sub" style={{ marginBottom: 2 }}>
                    {milestoneAmount ? `${milestoneAmount} fällig bei Freigabe` : 'Keine offene Zahlung'}
                  </p>
                  <p className="cp-sub" style={{ color: 'var(--text-muted)', opacity: .7 }}>
                    Noch nicht fällig — Payment Confidence.
                  </p>
                </>
              ) : (
                <p className="cp-sub">Keine offene Zahlung. Nächste Zahlung erst nach Freigabe.</p>
              )}
            </div>

            {/* Briefing */}
            <div className="cp-card">
              <p className="dash-label">Briefing</p>
              <p className="cp-headline">
                {main ? main.title : 'Kein Projekt'}
              </p>
              <p className="cp-sub">
                {report ? 'Heutiges Briefing bereit' : 'Noch nicht generiert'}
              </p>
              <div className="cp-divider" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                {main && (
                  <Link href={`/reports?project=${main.id}`} className="quick-link">
                    Briefing öffnen
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M9 6l6 6-6 6"/></svg>
                  </Link>
                )}
                <Link href="/messages" className="quick-link">
                  Posteingang
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M9 6l6 6-6 6"/></svg>
                </Link>
              </div>
            </div>

            {/* Recent activity — kept but de-emphasised */}
            {activity.length > 0 && (
              <div className="cp-card">
                <p className="dash-label">Aktivität</p>
                <div>
                  {activity.slice(0, 5).map((a) => (
                    <div key={a.id} className="activity-row">
                      <span style={{ width:5, height:5, borderRadius:'50%', border:'1.5px solid var(--border-strong)', background:'transparent', flexShrink:0, marginTop:6, boxSizing:'border-box' }}/>
                      <p style={{ fontSize:11.5, color:'var(--text-muted)', margin:0, flex:1, lineHeight:1.45, overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{a.message}</p>
                      <span style={{ fontSize:10.5, color:'var(--text-muted)', flexShrink:0, marginTop:1 }}>{timeAgo(a.created_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>{/* end RIGHT */}
        </div>
      )}

      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreated={(id) => { setShowNewProject(false); window.location.href = `/project/${id}` }}
        />
      )}
      {showNewTask && main && (
        <NewTaskModal
          onClose={() => setShowNewTask(false)}
          onCreated={() => { setShowNewTask(false); window.location.reload() }}
          defaultProjectId={main.id}
          source="manual"
        />
      )}
    </div>
  )
}
