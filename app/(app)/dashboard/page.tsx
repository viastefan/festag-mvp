'use client'

import { useEffect, useState, type CSSProperties } from 'react'
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
  const [inboxUnread, setInboxUnread] = useState(0)
  const [lastInboxAt, setLastInboxAt] = useState<string | null>(null)
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
      try {
        const [{ count }, { data: inboxRows }] = await Promise.all([
          supabase.from('inbox_items').select('id', { count: 'exact', head: true }).eq('user_id', uid).is('read_at', null),
          supabase.from('inbox_items').select('created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(1),
        ])
        setInboxUnread(count ?? 0)
        setLastInboxAt((inboxRows as Array<{ created_at: string }> | null)?.[0]?.created_at ?? null)
      } catch {}

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

  const todayMeta = new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'short' }).replace('.', '.').toUpperCase()
  const person = displayName || 'Stefan'
  const urgentLine = blockersOpen > 0
    ? `${blockersOpen === 1 ? 'Ein Blocker beeinflusst' : `${blockersOpen} Blocker beeinflussen`} den Zeitplan.`
    : decisionsOpen > 0
      ? `${decisionsOpen === 1 ? 'Eine Entscheidung wartet' : `${decisionsOpen} Entscheidungen warten`} auf dich.`
      : activeProjects.length > 0
        ? 'Heute benötigt ein Projekt Aufmerksamkeit.'
        : 'Heute ist nichts dringend.'
  const executiveSummary = blockersOpen > 0
    ? `${blockersOpen === 1 ? 'Ein Blocker wurde' : `${blockersOpen} Blocker wurden`} erkannt. Tagro priorisiert die nächsten Schritte und hält Entscheidungen, Risiken und Zustellungen in der Übersicht.`
    : decisionsOpen > 0
      ? `${decisionsOpen === 1 ? 'Eine offene Entscheidung wartet' : `${decisionsOpen} offene Entscheidungen warten`} auf Freigabe. Sobald sie geklärt ${decisionsOpen === 1 ? 'ist' : 'sind'}, aktualisiert Tagro Projektstatus, Risiken und nächste Schritte.`
      : main
        ? `${main.title} ist aktuell in ${phase?.label ?? 'Bearbeitung'}. ${activeTasks.length === 0 ? 'Keine offenen Tasks' : `${activeTasks.length} offene Tasks`} und ${blockersOpen === 0 ? 'keine akuten Blocker' : `${blockersOpen} Blocker`} liegen vor.`
        : 'Kein aktives Projekt, keine offene Entscheidung, keine Blocker. Tagro wartet auf ein erstes Briefing - sobald es vorliegt, fasst es Fortschritt, Risiken und nächste Schritte hier zusammen.'
  const projectStatusValue = activeProjects.length === 0 ? 'ruhig' : `${activeProjects.length} aktiv`
  const projectStatusSub = activeProjects.length === 0
    ? 'kein aktives Projekt'
    : main
      ? `${main.title}${phase ? ` · ${phase.label}` : ''}`
      : 'Projektstatus wird geprüft'
  const decisionValue = decisionsOpen === 0 ? 'keine' : String(decisionsOpen)
  const decisionSub = decisionsOpen === 0 ? 'nichts wartet auf dich' : 'wartet auf Freigabe'
  const blockerValue = blockersOpen === 0 ? 'keine' : String(blockersOpen)
  const blockerSub = blockersOpen === 0 ? 'keine akute Verzögerung' : 'Zeitplan prüfen'
  const milestoneValue = nextMilestone ? nextMilestone.title : '—'
  const milestoneSub = nextMilestone
    ? milestoneDue ? `fällig ${milestoneDue}` : 'noch ohne Datum'
    : 'noch nicht geplant'
  const nextTitle = main ? 'Heutiges Briefing prüfen' : 'Erstes Briefing aufnehmen'
  const nextCopy = main
    ? `Tagro kann den Stand von ${main.title} in Fortschritt, Risiken und nächste Schritte verdichten. So bleibt die Projektlage jeden Tag ruhig sichtbar.`
    : 'Sprich kurz darüber, was der Kunde will. Tagro hört zu, gliedert das Gespräch in Status, Risiken und nächste Schritte - und legt die Projektstruktur an.'
  const latestActivity = activity[0]
  const latestActivityLabel = latestActivity ? timeAgo(latestActivity.created_at) : '—'
  const latestActivityText = latestActivity?.message || 'Noch keine Aktivität'
  const briefingStatus = report ? 'bereit' : main ? 'offen' : 'wartet'
  const deliveryStatus = nextMilestone ? 'Meilenstein offen' : 'keine offenen Zustellungen'

  return (
    <div className="page-content dashboard-os dash-editorial" style={{ maxWidth: undefined }}>
      <style>{`
        @keyframes dashFade { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        .dash-editorial {
          min-height:100%;
          background:transparent;
          color:var(--text);
          padding:clamp(28px, 3.4vw, 44px) clamp(28px, 4vw, 56px) 0;
          overflow:hidden;
        }
        .ed-top {
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:24px;
          min-height:42px;
          padding-bottom:24px;
          border-bottom:1px solid var(--border);
          animation:dashFade .28s cubic-bezier(.16,1,.3,1) both;
        }
        .ed-meta {
          margin:0;
          color:var(--text-muted);
          font-size:11px;
          line-height:1;
          font-weight:600;
          letter-spacing:.18em;
          text-transform:uppercase;
          font-family:var(--font-aeonik,'Aeonik',Inter,sans-serif);
        }
        .ed-actions {
          display:flex;
          align-items:center;
          gap:8px;
          flex-shrink:0;
        }
        .ed-button {
          height:32px;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:7px;
          padding:0 13px;
          border-radius:999px;
          border:1px solid var(--border);
          background:transparent;
          color:var(--text-secondary);
          font:inherit;
          font-size:12.5px;
          font-weight:600;
          letter-spacing:.005em;
          text-decoration:none;
          transition:background .12s ease, color .12s ease, border-color .12s ease;
        }
        .ed-button:hover { color:var(--text); background:var(--hover); border-color:var(--border-strong); }
        .ed-button.primary {
          background:var(--accent);
          color:var(--accent-text);
          border-color:transparent;
        }
        .ed-button.primary:hover {
          background:color-mix(in srgb, var(--accent) 88%, #000);
          color:var(--accent-text);
        }
        .dash-editorial .audio-briefing-button {
          height:32px;
          padding:0 13px;
          border-radius:999px;
          border:1px solid var(--border);
          background:transparent;
          color:var(--text-secondary);
          font-size:12.5px;
          font-weight:600;
        }
        .dash-editorial .audio-briefing-button:hover {
          color:var(--text);
          background:var(--hover);
          border-color:var(--border-strong);
        }
        .ed-hero {
          max-width:760px;
          padding:clamp(36px, 4.5vw, 60px) 0 clamp(28px, 3.4vw, 44px);
          animation:dashFade .34s .04s cubic-bezier(.16,1,.3,1) both;
        }
        .ed-signal {
          display:inline-flex;
          align-items:center;
          gap:8px;
          margin-bottom:24px;
          padding:5px 11px;
          border-radius:999px;
          border:1px solid var(--border);
          color:var(--text-muted);
          font-size:10.5px;
          font-weight:600;
          letter-spacing:.14em;
          text-transform:uppercase;
        }
        .ed-dot {
          width:6px;
          height:6px;
          border-radius:999px;
          background:var(--green);
          box-shadow:0 0 0 3px color-mix(in srgb, var(--green) 18%, transparent);
        }
        .ed-title {
          margin:0;
          color:var(--text);
          font-size:clamp(26px, 2.8vw, 34px);
          line-height:1.08;
          font-weight:700;
          letter-spacing:-.022em;
        }
        .ed-status-line {
          margin:6px 0 0;
          color:var(--text-secondary);
          font-size:clamp(20px, 2.2vw, 26px);
          line-height:1.2;
          font-weight:500;
          letter-spacing:-.014em;
        }
        .ed-summary {
          margin:22px 0 0;
          max-width:640px;
          color:var(--text-secondary);
          font-size:14px;
          line-height:1.65;
          letter-spacing:.003em;
        }
        .ed-status-row {
          display:grid;
          grid-template-columns:repeat(4, minmax(0, 1fr));
          gap:28px;
          padding:24px 0 32px;
          border-top:1px solid var(--border);
          animation:dashFade .34s .08s cubic-bezier(.16,1,.3,1) both;
        }
        .ed-status-label {
          margin:0 0 12px;
          color:var(--text-muted);
          font-size:10.5px;
          font-weight:600;
          letter-spacing:.16em;
          text-transform:uppercase;
        }
        .ed-status-value {
          margin:0 0 4px;
          color:var(--text);
          font-size:15px;
          line-height:1.25;
          font-weight:600;
          letter-spacing:-.003em;
        }
        .ed-status-sub {
          margin:0;
          color:var(--text-muted);
          font-size:12px;
          line-height:1.4;
        }
        .ed-next {
          display:grid;
          grid-template-columns:minmax(0, 1fr) minmax(220px, 360px);
          gap:clamp(48px, 6vw, 96px);
          padding:44px 0 52px;
          border-top:1px solid var(--border);
          animation:dashFade .34s .12s cubic-bezier(.16,1,.3,1) both;
        }
        .ed-section-label {
          margin:0 0 22px;
          color:var(--text-muted);
          font-size:10.5px;
          font-weight:600;
          letter-spacing:.16em;
          text-transform:uppercase;
        }
        .ed-next h2 {
          margin:0;
          color:var(--text);
          font-size:clamp(26px, 2.7vw, 34px);
          line-height:1.1;
          font-weight:700;
          letter-spacing:-.034em;
        }
        .ed-next-copy {
          max-width:720px;
          margin:16px 0 26px;
          color:var(--text-secondary);
          font-size:14.5px;
          line-height:1.68;
        }
        .ed-cta-row {
          display:flex;
          flex-wrap:wrap;
          gap:8px;
        }
        .ed-rail {
          display:flex;
          flex-direction:column;
          gap:14px;
          padding:14px 16px 16px;
          border:1px solid var(--border);
          border-radius:14px;
          background:color-mix(in srgb, var(--card) 70%, transparent);
          align-self:start;
        }
        .ed-rail-head {
          display:flex;
          justify-content:space-between;
          align-items:center;
          color:var(--text);
          font-size:12.5px;
          font-weight:700;
          letter-spacing:-.003em;
          padding-bottom:12px;
          border-bottom:1px solid var(--border);
        }
        .ed-rail-head-meta {
          color:var(--text-muted);
          font-size:10.5px;
          font-weight:600;
          letter-spacing:.14em;
          text-transform:uppercase;
        }
        .ed-rail-item {
          display:grid;
          grid-template-columns:minmax(0, .9fr) minmax(0, 1fr);
          gap:12px;
          align-items:baseline;
          padding-bottom:14px;
          border-bottom:1px solid var(--border);
        }
        .ed-rail-item:last-child { border-bottom:0; padding-bottom:0; }
        .ed-rail-label {
          margin:0 0 4px;
          color:var(--text-muted);
          font-size:10.5px;
          font-weight:600;
          letter-spacing:.12em;
          text-transform:uppercase;
        }
        .ed-rail-main {
          margin:0;
          color:var(--text);
          font-size:13.5px;
          font-weight:500;
          line-height:1.4;
        }
        .ed-rail-sub {
          margin:0;
          color:var(--text-muted);
          font-size:12px;
          line-height:1.4;
          text-align:right;
        }
        .ed-project {
          padding:32px 0 56px;
          border-top:1px solid var(--border);
        }
        .ed-project-head {
          display:flex;
          justify-content:space-between;
          align-items:flex-end;
          gap:20px;
          margin-bottom:24px;
        }
        .ed-project-title {
          margin:0;
          color:var(--text);
          font-size:22px;
          line-height:1.2;
          font-weight:700;
          letter-spacing:-.028em;
        }
        .ed-progress {
          height:3px;
          width:100%;
          background:var(--border);
          border-radius:999px;
          overflow:hidden;
        }
        .ed-progress span {
          display:block;
          height:100%;
          width:var(--progress);
          background:var(--accent);
          opacity:.85;
        }
        .ed-project-row {
          display:grid;
          grid-template-columns:repeat(4, minmax(0,1fr));
          gap:24px;
          margin-top:22px;
        }
        @media (max-width:960px) {
          .ed-status-row { grid-template-columns:repeat(2, minmax(0,1fr)); gap:26px; }
          .ed-next { grid-template-columns:1fr; gap:22px; }
        }
        @media (max-width:760px) {
          .dash-editorial { padding:22px 16px 96px; }
          .ed-top { flex-direction:column; align-items:flex-start; padding-bottom:18px; }
          .ed-actions { width:100%; flex-wrap:wrap; }
          .ed-button { flex:0 0 auto; }
          .ed-hero { padding:28px 0 22px; }
          .ed-title { font-size:22px; }
          .ed-status-line { font-size:19px; }
          .ed-summary { font-size:13.5px; margin-top:16px; }
          .ed-status-row { grid-template-columns:1fr 1fr; gap:18px; padding:18px 0 24px; }
          .ed-next { padding:26px 0 32px; }
          .ed-rail-item { grid-template-columns:1fr; gap:4px; }
          .ed-rail-sub { text-align:left; }
          .ed-project-row { grid-template-columns:1fr 1fr; gap:18px; }
        }
      `}</style>

      <div className="ed-top">
        <p className="ed-meta">HEUTE · {todayMeta}</p>
        <div className="ed-actions">
          <AudioBriefingButton
            type="dashboard_briefing"
            label="Briefing anhören"
            projectTitle={main?.title}
            report={report || executiveSummary}
            projectStatus={main ? PHASE[main.status]?.label : undefined}
            progress={completePct}
            blockerCount={blockersOpen}
            decisionCount={decisionsOpen}
            nextSteps={[main ? `${main.title} prüfen` : 'erstes Briefing aufnehmen']}
          />
          <button onClick={() => setShowNewProject(true)} className="ed-button primary" type="button">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            Neues Projekt
          </button>
        </div>
      </div>

      <section className="ed-hero" aria-label="Tägliches Briefing">
        <div className="ed-signal"><span className="ed-dot" /> Heute</div>
        <h1 className="ed-title">{greeting}, {person}.</h1>
        <p className="ed-status-line">{urgentLine}</p>
        <p className="ed-summary">{executiveSummary}</p>
      </section>

      <section className="ed-status-row" aria-label="Lage">
        {[
          ['Projektstatus', projectStatusValue, projectStatusSub],
          ['Entscheidungen', decisionValue, decisionSub],
          ['Blocker', blockerValue, blockerSub],
          ['Meilenstein', milestoneValue, milestoneSub],
        ].map(([label, value, sub]) => (
          <div key={label}>
            <p className="ed-status-label">{label}</p>
            <p className="ed-status-value">{value}</p>
            <p className="ed-status-sub">{sub}</p>
          </div>
        ))}
      </section>

      <section className="ed-next" aria-label="Als nächstes">
        <div>
          <p className="ed-section-label">Als nächstes</p>
          <h2>{nextTitle}</h2>
          <p className="ed-next-copy">{nextCopy}</p>
          <div className="ed-cta-row">
            <Link href={main ? `/reports?project=${main.id}` : '/voice-reports'} className="ed-button primary">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l10-6.5-10-6.5Z"/></svg>
              Briefing aufnehmen
            </Link>
            <button onClick={() => setShowNewProject(true)} className="ed-button" type="button">Manuell anlegen</button>
            <Link href="/reports" className="ed-button">Vorlage wählen</Link>
          </div>
        </div>

        <aside className="ed-rail" aria-label="Monitoring">
          <header className="ed-rail-head">
            <span>Monitoring</span>
            <span className="ed-rail-head-meta">live</span>
          </header>
          {[
            ['Letzte Aktivität', latestActivityLabel, latestActivityText],
            ['Posteingang', inboxUnread === 0 ? 'leer' : `${inboxUnread} ungelesen`, lastInboxAt ? timeAgo(lastInboxAt) : '0 ungelesen'],
            ['Tagro', 'bereit', 'v2.4.1'],
            ['Briefing Status', briefingStatus, report ? 'heute aktualisiert' : 'noch nicht generiert'],
            ['Zustellungen', deliveryStatus, nextMilestone ? 'Freigabe offen' : 'ruhig'],
          ].map(([label, mainText, sub]) => (
            <div className="ed-rail-item" key={label}>
              <div>
                <p className="ed-rail-label">{label}</p>
                <p className="ed-rail-main">{mainText}</p>
              </div>
              <p className="ed-rail-sub">{sub}</p>
            </div>
          ))}
        </aside>
      </section>

      {main && (
        <section className="ed-project" aria-label="Aktives Projekt">
          <div className="ed-project-head">
            <div>
              <p className="ed-section-label">Aktives Projekt</p>
              <h2 className="ed-project-title">{main.title}</h2>
            </div>
            <Link href={`/project/${main.id}`} className="ed-button">Projekt öffnen</Link>
          </div>
          <div className="ed-progress" style={{ '--progress': `${completePct}%` } as CSSProperties}><span /></div>
          <div className="ed-project-row">
            {[
              ['Fortschritt', `${completePct}%`, `${done} von ${tasks.length} Tasks erledigt`],
              ['Phase', phase?.label ?? 'Intake', 'aktueller Projektstatus'],
              ['Risiken', blockersOpen === 0 ? 'keine' : String(blockersOpen), blockerSub],
              ['Audio', report ? 'bereit' : 'offen', 'Briefing kann erzeugt werden'],
            ].map(([label, value, sub]) => (
              <div key={label}>
                <p className="ed-status-label">{label}</p>
                <p className="ed-status-value">{value}</p>
                <p className="ed-status-sub">{sub}</p>
              </div>
            ))}
          </div>
        </section>
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
