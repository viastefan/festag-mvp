'use client'

/**
 * Client Dashboard — Festag „Statusabfrage".
 *
 * Designziele (verbindlich):
 *   • Aeonik Medium (500) durchgehend, kein Bold, kein Regular.
 *   • Keine Trennlinien zwischen Sektionen, keine Primary-Buttons.
 *   • Identische Top/Side-Insets wie der Dev-Shell; Header sitzt knapp
 *     unter der Workspace-Kante.
 *   • Werkzeuge (Glocke, Filter, Sort, Voice-Briefing) als runde 34px
 *     Floating-Buttons im Tasks-Stil.
 *   • Sprache: „Statusabfrage" ersetzt „Briefing" im sichtbaren Text.
 *   • Kein „Workspace wird vorbereitet" Splash — direkter Skeleton-Render.
 */

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import NewProjectModal from '@/components/NewProjectModal'
import NewTaskModal from '@/components/NewTaskModal'
import AudioBriefingButton from '@/components/AudioBriefingButton'
import ObserverWelcomeModal from '@/components/ObserverWelcomeModal'
import NotificationsBell from '@/components/NotificationsBell'
import { FunnelSimple, SlidersHorizontal } from '@phosphor-icons/react'

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

type FocusFilter = 'all' | 'blockers' | 'decisions' | 'active'
type FocusSort   = 'priority' | 'project' | 'recent'

const FOCUS_FILTERS: Array<{ id: FocusFilter; label: string }> = [
  { id: 'all',        label: 'Alles' },
  { id: 'blockers',   label: 'Nur Blocker' },
  { id: 'decisions',  label: 'Nur Entscheidungen' },
  { id: 'active',     label: 'Nur aktiv' },
]
const FOCUS_SORTS: Array<{ id: FocusSort; label: string }> = [
  { id: 'priority',   label: 'Priorität zuerst' },
  { id: 'project',    label: 'Nach Projekt' },
  { id: 'recent',     label: 'Zuletzt aktualisiert' },
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
  const [firstName, setFirstName] = useState('')
  const [loading,   setLoading]   = useState(true)
  const [report,    setReport]    = useState('')
  const [genReport, setGenReport] = useState(false)
  const [showNewProject, setShowNewProject] = useState(false)
  const [showNewTask,    setShowNewTask]    = useState(false)
  const [focusFilter, setFocusFilter] = useState<FocusFilter>('all')
  const [focusSort,   setFocusSort]   = useState<FocusSort>('priority')
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen,   setSortOpen]   = useState(false)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      const uid = data.session.user.id
      const { data: p } = await supabase.from('profiles').select('first_name,full_name').eq('id', uid).single()
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
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Close popover menus on outside click + escape
  useEffect(() => {
    if (!filterOpen && !sortOpen) return
    function onDown(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest?.('.ed-tool-wrap')) { setFilterOpen(false); setSortOpen(false) }
    }
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') { setFilterOpen(false); setSortOpen(false) } }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onEsc)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onEsc)
    }
  }, [filterOpen, sortOpen])

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

  const phase       = main ? (PHASE[main.status] ?? PHASE.intake) : null
  const done        = tasks.filter(t => t.status==='done').length
  const activeTasks = tasks.filter(t => t.status!=='done')
  const completePct = tasks.length ? Math.round(done/tasks.length*100) : 0

  // ── KPI bar values ────────────────────────────────────────────
  const activeProjects = projects.filter(p => p.status === 'active' || p.status === 'testing' || p.status === 'planning')
  const decisionsOpen  = allTasks.filter(t => t.status === 'waiting').length
  const blockersOpen   = allTasks.filter(t => t.status === 'blocked').length
  const nextMilestone  = main
    ? milestones
        .filter(m => m.project_id === main.id && !m.paid_at && m.status !== 'completed' && m.status !== 'paid')
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))[0]
    : null
  const milestoneDue = nextMilestone?.due_date ? new Date(nextMilestone.due_date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }) : null

  const person = displayName || 'dort'
  const urgentLine = blockersOpen > 0
    ? `${blockersOpen === 1 ? 'Ein Blocker beeinflusst' : `${blockersOpen} Blocker beeinflussen`} den Zeitplan.`
    : decisionsOpen > 0
      ? `${decisionsOpen === 1 ? 'Eine Entscheidung wartet' : `${decisionsOpen} Entscheidungen warten`} auf dich.`
      : activeProjects.length > 0
        ? 'Heute braucht ein Projekt deine Aufmerksamkeit.'
        : 'Heute ist nichts dringend.'
  const executiveSummary = blockersOpen > 0
    ? `${blockersOpen === 1 ? 'Ein Blocker wurde' : `${blockersOpen} Blocker wurden`} erkannt. Tagro priorisiert die nächsten Schritte und hält Entscheidungen, Risiken und Zustellungen in der Übersicht.`
    : decisionsOpen > 0
      ? `${decisionsOpen === 1 ? 'Eine offene Entscheidung wartet' : `${decisionsOpen} offene Entscheidungen warten`} auf Freigabe. Sobald sie geklärt ${decisionsOpen === 1 ? 'ist' : 'sind'}, aktualisiert Tagro Projektstatus, Risiken und nächste Schritte.`
      : main
        ? `${main.title} ist aktuell in ${phase?.label ?? 'Bearbeitung'}. ${activeTasks.length === 0 ? 'Keine offenen Tasks' : `${activeTasks.length} offene Tasks`} und ${blockersOpen === 0 ? 'keine akuten Blocker' : `${blockersOpen} Blocker`} liegen vor.`
        : 'Kein aktives Projekt, keine offene Entscheidung, keine Blocker. Sobald die erste Statusabfrage vorliegt, fasst Tagro Fortschritt, Risiken und nächste Schritte hier zusammen.'

  const projectStatusValue = activeProjects.length === 0 ? 'ruhig' : `${activeProjects.length} aktiv`
  const projectStatusSub = activeProjects.length === 0
    ? 'kein aktives Projekt'
    : main ? `${main.title}${phase ? ` · ${phase.label}` : ''}` : 'Projektstatus wird geprüft'
  const decisionValue = decisionsOpen === 0 ? 'keine' : String(decisionsOpen)
  const decisionSub = decisionsOpen === 0 ? 'nichts wartet auf dich' : 'wartet auf Freigabe'
  const blockerValue = blockersOpen === 0 ? 'keine' : String(blockersOpen)
  const blockerSub = blockersOpen === 0 ? 'keine akute Verzögerung' : 'Zeitplan prüfen'
  const milestoneValue = nextMilestone ? nextMilestone.title : '—'
  const milestoneSub = nextMilestone
    ? milestoneDue ? `fällig ${milestoneDue}` : 'noch ohne Datum'
    : 'noch nicht geplant'
  const nextTitle = main ? 'Heutige Statusabfrage prüfen' : 'Erste Statusabfrage aufnehmen'
  const nextCopy = main
    ? `Tagro fasst den Stand von ${main.title} in Fortschritt, Risiken und nächste Schritte zusammen. So bleibt die Projektlage jeden Tag ruhig sichtbar.`
    : 'Sprich kurz darüber, was der Kunde will. Tagro hört zu, gliedert das Gespräch in Status, Risiken und nächste Schritte und legt die Projektstruktur an.'

  // ── Today's Focus — filterable + sortable ─────────────────────
  type FocusItem = { tone: 'crit' | 'warn' | 'ok' | 'neutral'; tag: string; text: string; sub?: string; href: string; sortKey: number; updatedAt: string }
  const priorityScore: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 }
  function buildFocusItems(): FocusItem[] {
    const out: FocusItem[] = []
    allTasks.forEach(t => {
      const proj = projects.find(p => p.id === t.project_id)
      const updatedAt = t.updated_at || ''
      const subTitle = proj?.title
      if (t.status === 'blocked') {
        out.push({ tone: 'crit', tag: 'Blocker', text: t.title, sub: subTitle, href: proj ? `/project/${proj.id}` : '/tasks', sortKey: 100, updatedAt })
      } else if (t.status === 'waiting') {
        out.push({ tone: 'warn', tag: 'Entscheidung', text: t.title, sub: subTitle, href: proj ? `/project/${proj.id}` : '/tasks', sortKey: 80, updatedAt })
      } else if (t.status === 'doing') {
        out.push({ tone: 'ok',   tag: 'Aktiv', text: t.title, sub: subTitle, href: proj ? `/project/${proj.id}` : '/tasks', sortKey: priorityScore[t.priority ?? 'medium'] ?? 2, updatedAt })
      } else if (t.status === 'todo') {
        out.push({ tone: 'neutral', tag: 'Offen', text: t.title, sub: subTitle, href: proj ? `/project/${proj.id}` : '/tasks', sortKey: (priorityScore[t.priority ?? 'medium'] ?? 2) - 0.5, updatedAt })
      }
    })
    return out
  }
  const focusAll = buildFocusItems()
  const focusFiltered = focusAll.filter(it => {
    if (focusFilter === 'blockers')  return it.tag === 'Blocker'
    if (focusFilter === 'decisions') return it.tag === 'Entscheidung'
    if (focusFilter === 'active')    return it.tag === 'Aktiv' || it.tag === 'Offen'
    return true
  })
  const focusSorted = [...focusFiltered].sort((a, b) => {
    if (focusSort === 'project') return String(a.sub || '').localeCompare(String(b.sub || ''))
    if (focusSort === 'recent')  return String(b.updatedAt).localeCompare(String(a.updatedAt))
    return b.sortKey - a.sortKey
  })
  const focusItems = focusSorted.slice(0, 6)

  const latestActivity = activity[0]
  const latestActivityLabel = latestActivity ? timeAgo(latestActivity.created_at) : '—'
  const latestActivityText = latestActivity?.message || 'Noch keine Aktivität'
  const briefingStatus = report ? 'bereit' : main ? 'offen' : 'wartet'
  const deliveryStatus = nextMilestone ? 'Meilenstein offen' : 'keine offenen Zustellungen'

  return (
    <div className="page-content dashboard-os dash-editorial" style={{ maxWidth: undefined }}>
      <style>{`
        @keyframes dashFade { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        .dash-editorial {
          min-height:100%;
          background:transparent;
          color:var(--text);
          padding:8px clamp(20px, 2.4vw, 32px) 56px;
          overflow:hidden;
          --ed-muted: #5A6478;
          --ed-secondary: #4E5567;
        }
        [data-theme="dark"] .dash-editorial,
        [data-theme="classic-dark"] .dash-editorial {
          --ed-muted: #8D98A6;
          --ed-secondary: #B7BDC8;
        }
        .dash-editorial * { font-weight: 500 !important; }

        /* ── Top toolbar (right-aligned floating tools) ────────── */
        .ed-top {
          display:flex; justify-content:flex-end; align-items:center;
          gap:8px; min-height:38px; padding:0 0 14px;
          animation:dashFade .24s cubic-bezier(.16,1,.3,1) both;
        }
        .ed-tool-wrap { position: relative; }
        .ed-tool {
          width:34px; height:34px;
          border:0; border-radius:999px;
          background:#fff;
          color:var(--ed-secondary);
          display:inline-flex; align-items:center; justify-content:center;
          cursor:pointer;
          box-shadow:0 1px 2px rgba(15,23,42,.08), 0 7px 18px rgba(15,23,42,.08);
          transition: background .12s ease, color .12s ease, box-shadow .12s ease, transform .12s ease;
        }
        .ed-tool:hover, .ed-tool.on {
          color:var(--text);
          box-shadow:0 1px 2px rgba(15,23,42,.10), 0 9px 22px rgba(15,23,42,.11);
          transform:translateY(-1px);
        }
        [data-theme="dark"] .ed-tool, [data-theme="classic-dark"] .ed-tool {
          background: color-mix(in srgb, var(--surface) 92%, #fff 8%);
          color: var(--ed-secondary);
          box-shadow:0 1px 2px rgba(0,0,0,.28), 0 8px 20px rgba(0,0,0,.20);
        }
        [data-theme="dark"] .ed-tool:hover,
        [data-theme="dark"] .ed-tool.on,
        [data-theme="classic-dark"] .ed-tool:hover,
        [data-theme="classic-dark"] .ed-tool.on {
          color: var(--text);
          box-shadow:0 1px 2px rgba(0,0,0,.34), 0 10px 24px rgba(0,0,0,.26);
        }
        /* Notification bell sits in the same 34px slot */
        .ed-top :global(.nb-trigger) {
          width:34px; height:34px;
          background:#fff;
          color:var(--ed-secondary);
          border-radius:999px;
          box-shadow:0 1px 2px rgba(15,23,42,.08), 0 7px 18px rgba(15,23,42,.08);
        }
        .ed-top :global(.nb-trigger:hover) {
          color: var(--text); background:#fff;
          box-shadow:0 1px 2px rgba(15,23,42,.10), 0 9px 22px rgba(15,23,42,.11);
          transform:translateY(-1px);
        }
        [data-theme="dark"] .ed-top :global(.nb-trigger),
        [data-theme="classic-dark"] .ed-top :global(.nb-trigger) {
          background: color-mix(in srgb, var(--surface) 92%, #fff 8%);
          box-shadow:0 1px 2px rgba(0,0,0,.28), 0 8px 20px rgba(0,0,0,.20);
        }
        [data-theme="dark"] .ed-top :global(.nb-trigger:hover),
        [data-theme="classic-dark"] .ed-top :global(.nb-trigger:hover) {
          box-shadow:0 1px 2px rgba(0,0,0,.34), 0 10px 24px rgba(0,0,0,.26);
        }

        /* Audio briefing button → pill in the same row ─────────── */
        .dash-editorial .audio-briefing-button {
          height:34px;
          padding:0 14px 0 12px;
          border-radius:999px;
          border:0;
          background:#fff;
          color:var(--ed-secondary);
          font-size:12.5px;
          letter-spacing:.005em;
          display:inline-flex; align-items:center; gap:7px;
          box-shadow:0 1px 2px rgba(15,23,42,.08), 0 7px 18px rgba(15,23,42,.08);
          transition: background .12s ease, color .12s ease, box-shadow .12s ease, transform .12s ease;
        }
        .dash-editorial .audio-briefing-button:hover {
          color: var(--text);
          box-shadow:0 1px 2px rgba(15,23,42,.10), 0 9px 22px rgba(15,23,42,.11);
          transform:translateY(-1px);
        }
        [data-theme="dark"] .dash-editorial .audio-briefing-button,
        [data-theme="classic-dark"] .dash-editorial .audio-briefing-button {
          background: color-mix(in srgb, var(--surface) 92%, #fff 8%);
          box-shadow:0 1px 2px rgba(0,0,0,.28), 0 8px 20px rgba(0,0,0,.20);
        }
        [data-theme="dark"] .dash-editorial .audio-briefing-button:hover,
        [data-theme="classic-dark"] .dash-editorial .audio-briefing-button:hover {
          box-shadow:0 1px 2px rgba(0,0,0,.34), 0 10px 24px rgba(0,0,0,.26);
        }

        /* Dropdown menu shared by Filter + Sort ─────────────────── */
        .ed-menu {
          position:absolute; top:calc(100% + 6px); right:0;
          min-width:220px;
          padding:5px;
          border-radius:12px;
          background: color-mix(in srgb, var(--surface) 95%, transparent);
          backdrop-filter: blur(18px) saturate(150%);
          -webkit-backdrop-filter: blur(18px) saturate(150%);
          box-shadow: 0 16px 38px rgba(15,23,42,.12), 0 1px 0 rgba(255,255,255,.32) inset, 0 0 0 1px rgba(15,23,42,.06);
          z-index: 70;
          animation: dashFade .16s cubic-bezier(.16,1,.3,1) both;
        }
        [data-theme="dark"] .ed-menu, [data-theme="classic-dark"] .ed-menu {
          background: color-mix(in srgb, #14181f 92%, rgba(18,22,30,.7));
          box-shadow: 0 18px 42px rgba(0,0,0,.34), 0 0 0 1px rgba(255,255,255,.04);
        }
        .ed-menu button {
          width:100%; min-height:34px; padding:6px 10px;
          background:transparent; border:0; border-radius:8px;
          font: inherit; font-size:12.5px;
          color: var(--text);
          display:flex; align-items:center; justify-content:space-between; gap:9px;
          cursor:pointer; text-align:left;
        }
        .ed-menu button:hover { background: color-mix(in srgb, var(--surface-2) 75%, transparent); }
        .ed-menu button.on { background: color-mix(in srgb, var(--surface-2) 90%, transparent); }
        .ed-menu .check { color: var(--accent); font-size: 11px; }

        /* ── Hero ─────────────────────────────────────────────── */
        .ed-hero {
          max-width:760px;
          padding: 2px 0 28px;
          animation:dashFade .3s .04s cubic-bezier(.16,1,.3,1) both;
        }
        .ed-title {
          margin:0;
          color:var(--text);
          font-size:clamp(24px, 2.4vw, 30px);
          line-height:1.12;
          letter-spacing:-.018em;
        }
        .ed-status-line {
          margin:6px 0 0;
          color:var(--ed-secondary);
          font-size:clamp(18px, 1.8vw, 22px);
          line-height:1.25;
          letter-spacing:-.01em;
        }
        .ed-summary {
          margin:18px 0 0;
          max-width:620px;
          color:var(--ed-secondary);
          font-size:14px;
          line-height:1.6;
        }

        /* ── Focus list (no borders, calm) ───────────────────── */
        .ed-focus {
          padding: 16px 0 28px;
          animation:dashFade .3s .06s cubic-bezier(.16,1,.3,1) both;
        }
        .ed-focus-head {
          display:flex; align-items:baseline; justify-content:space-between;
          margin:0 0 8px;
        }
        .ed-focus-title {
          margin:0;
          color:var(--text);
          font-size:13px;
          letter-spacing:-.002em;
        }
        .ed-focus-meta {
          color:var(--ed-muted);
          font-size:11px;
          letter-spacing:.04em;
        }
        .ed-focus-list { display:flex; flex-direction:column; gap:2px; }
        .ed-focus-row {
          display:grid;
          grid-template-columns:74px 6px minmax(0, 1fr) auto;
          gap:12px; align-items:center;
          padding:9px 10px; border-radius:9px;
          text-decoration:none; color:inherit;
          transition: background .12s ease;
        }
        .ed-focus-row:hover { background: color-mix(in srgb, var(--surface-2) 55%, transparent); }
        .ed-focus-tag {
          display:inline-flex; align-items:center; justify-content:center;
          height:20px; padding:0 9px; border-radius:5px;
          font-size:10.5px; letter-spacing:.06em; text-transform:uppercase;
          flex-shrink:0;
        }
        .ed-focus-tag.crit    { background: color-mix(in srgb, var(--red,    #d14343) 16%, transparent); color: var(--red, #c0362e); }
        .ed-focus-tag.warn    { background: color-mix(in srgb, var(--amber,  #b98700) 18%, transparent); color: var(--amber-dark, #8a6500); }
        .ed-focus-tag.ok      { background: color-mix(in srgb, var(--green,  #34c759) 14%, transparent); color: var(--green-dark, #28a745); }
        .ed-focus-tag.neutral { background: color-mix(in srgb, var(--ed-secondary) 12%, transparent); color: var(--ed-secondary); }
        .ed-focus-dot {
          width:6px; height:6px; border-radius:999px;
          background:var(--ed-muted); flex-shrink:0;
        }
        .ed-focus-text {
          min-width:0; color:var(--text); font-size:13.5px;
          line-height:1.35;
          overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        }
        .ed-focus-sub {
          color:var(--ed-muted); font-size:11.5px;
          flex-shrink:0; letter-spacing:.005em;
        }
        .ed-focus-empty {
          padding:14px 10px; color:var(--ed-muted); font-size:13px;
        }

        /* ── KPI strip (no top border anymore) ───────────────── */
        .ed-status-row {
          display:grid;
          grid-template-columns:repeat(4, minmax(0, 1fr));
          gap:24px;
          padding: 10px 4px 32px;
          animation:dashFade .3s .08s cubic-bezier(.16,1,.3,1) both;
        }
        .ed-status-label {
          margin:0 0 10px;
          color:var(--ed-muted);
          font-size:10.5px;
          letter-spacing:.16em;
          text-transform:uppercase;
        }
        .ed-status-value {
          margin:0 0 4px;
          color:var(--text);
          font-size:15px;
          line-height:1.25;
          letter-spacing:-.003em;
        }
        .ed-status-sub {
          margin:0;
          color:var(--ed-muted);
          font-size:12px;
          line-height:1.4;
        }

        /* ── Next + Rail ──────────────────────────────────────── */
        .ed-next {
          display:grid;
          grid-template-columns:minmax(0, 1fr) minmax(220px, 360px);
          gap:clamp(40px, 5vw, 80px);
          padding: 8px 0 40px;
          animation:dashFade .3s .12s cubic-bezier(.16,1,.3,1) both;
        }
        .ed-section-label {
          margin:0 0 18px;
          color:var(--ed-muted);
          font-size:10.5px;
          letter-spacing:.16em;
          text-transform:uppercase;
        }
        .ed-next h2 {
          margin:0;
          color:var(--text);
          font-size:clamp(22px, 2.2vw, 28px);
          line-height:1.15;
          letter-spacing:-.022em;
        }
        .ed-next-copy {
          max-width:640px;
          margin:14px 0 22px;
          color:var(--ed-secondary);
          font-size:14px;
          line-height:1.6;
        }
        .ed-cta-row { display:flex; flex-wrap:wrap; gap:8px; }
        .ed-button {
          height:32px; padding:0 14px;
          display:inline-flex; align-items:center; gap:7px;
          border-radius:999px;
          border:1px solid color-mix(in srgb, var(--border) 80%, transparent);
          background:transparent;
          color:var(--ed-secondary);
          font:inherit;
          font-size:12.5px;
          text-decoration:none;
          cursor:pointer;
          transition: background .12s ease, color .12s ease, border-color .12s ease;
        }
        .ed-button:hover {
          color:var(--text);
          background: color-mix(in srgb, var(--surface-2) 60%, transparent);
        }

        .ed-rail {
          display:flex; flex-direction:column; gap:14px;
          padding:14px 16px 16px;
          border-radius:14px;
          background: color-mix(in srgb, var(--surface-2) 35%, transparent);
          align-self:start;
        }
        .ed-rail-head {
          display:flex; justify-content:space-between; align-items:center;
          color:var(--text); font-size:12.5px;
          letter-spacing:-.002em;
          padding-bottom:8px;
        }
        .ed-rail-head-meta {
          color:var(--ed-muted); font-size:10.5px;
          letter-spacing:.14em; text-transform:uppercase;
        }
        .ed-rail-item {
          display:grid;
          grid-template-columns:minmax(0, .9fr) minmax(0, 1fr);
          gap:12px; align-items:baseline;
        }
        .ed-rail-label {
          margin:0 0 4px;
          color:var(--ed-muted);
          font-size:10.5px;
          letter-spacing:.12em;
          text-transform:uppercase;
        }
        .ed-rail-main {
          margin:0; color:var(--text);
          font-size:13.5px; line-height:1.4;
        }
        .ed-rail-sub {
          margin:0; color:var(--ed-muted);
          font-size:12px; line-height:1.4;
          text-align:right;
        }

        /* ── Active project (no border) ───────────────────────── */
        .ed-project { padding: 24px 0 24px; }
        .ed-project-head {
          display:flex; justify-content:space-between; align-items:flex-end;
          gap:20px; margin-bottom:18px;
        }
        .ed-project-title {
          margin:0; color:var(--text);
          font-size:20px; line-height:1.2; letter-spacing:-.02em;
        }
        .ed-progress {
          height:3px; width:100%;
          background: color-mix(in srgb, var(--surface-2) 60%, transparent);
          border-radius:999px; overflow:hidden;
        }
        .ed-progress span {
          display:block; height:100%;
          width:var(--progress);
          background: color-mix(in srgb, var(--ed-secondary) 60%, transparent);
        }
        .ed-project-row {
          display:grid;
          grid-template-columns:repeat(4, minmax(0,1fr));
          gap:24px;
          margin-top:18px;
        }

        @media (max-width:960px) {
          .ed-status-row { grid-template-columns:repeat(2, minmax(0,1fr)); gap:22px; }
          .ed-next { grid-template-columns:1fr; gap:22px; }
        }
        @media (max-width:760px) {
          .dash-editorial { padding:6px 14px 88px; }
          .ed-top { gap:6px; padding-bottom:10px; }
          .ed-title { font-size:21px; }
          .ed-status-line { font-size:17.5px; }
          .ed-summary { font-size:13.5px; margin-top:14px; }
          .ed-status-row { grid-template-columns:1fr 1fr; gap:18px; padding:14px 0 22px; }
          .ed-next { padding:18px 0 28px; }
          .ed-rail-item { grid-template-columns:1fr; gap:4px; }
          .ed-rail-sub { text-align:left; }
          .ed-project-row { grid-template-columns:1fr 1fr; gap:18px; }
          .ed-focus-row { grid-template-columns: 70px 6px minmax(0,1fr); }
          .ed-focus-sub { display:none; }
          .dash-editorial .audio-briefing-button { padding: 0 12px; }
          .dash-editorial .audio-briefing-button span { display: inline; }
        }
      `}</style>

      {/* Top toolbar — Bell · Filter · Sort · Statusabfrage anhören */}
      <div className="ed-top" aria-label="Werkzeuge">
        <NotificationsBell variant="header" />
        <div className="ed-tool-wrap">
          <button
            className={`ed-tool${filterOpen ? ' on' : ''}`}
            type="button"
            aria-label="Fokus filtern"
            aria-expanded={filterOpen}
            onClick={() => { setFilterOpen(v => !v); setSortOpen(false) }}
          >
            <FunnelSimple size={15} />
          </button>
          {filterOpen && (
            <div className="ed-menu" role="menu">
              {FOCUS_FILTERS.map(f => (
                <button
                  key={f.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={focusFilter === f.id}
                  className={focusFilter === f.id ? 'on' : ''}
                  onClick={() => { setFocusFilter(f.id); setFilterOpen(false) }}
                >
                  <span>{f.label}</span>
                  {focusFilter === f.id ? <span className="check">✓</span> : null}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="ed-tool-wrap">
          <button
            className={`ed-tool${sortOpen ? ' on' : ''}`}
            type="button"
            aria-label="Fokus sortieren"
            aria-expanded={sortOpen}
            onClick={() => { setSortOpen(v => !v); setFilterOpen(false) }}
          >
            <SlidersHorizontal size={15} />
          </button>
          {sortOpen && (
            <div className="ed-menu" role="menu">
              {FOCUS_SORTS.map(s => (
                <button
                  key={s.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={focusSort === s.id}
                  className={focusSort === s.id ? 'on' : ''}
                  onClick={() => { setFocusSort(s.id); setSortOpen(false) }}
                >
                  <span>{s.label}</span>
                  {focusSort === s.id ? <span className="check">✓</span> : null}
                </button>
              ))}
            </div>
          )}
        </div>
        <AudioBriefingButton
          type="dashboard_briefing"
          label="Statusabfrage anhören"
          projectTitle={main?.title}
          report={report || executiveSummary}
          projectStatus={main ? PHASE[main.status]?.label : undefined}
          progress={completePct}
          blockerCount={blockersOpen}
          decisionCount={decisionsOpen}
          nextSteps={[main ? `${main.title} prüfen` : 'erste Statusabfrage aufnehmen']}
        />
      </div>

      <section className="ed-hero" aria-label="Tägliche Statusabfrage">
        <h1 className="ed-title">{greeting}{person ? `, ${person}` : ''}.</h1>
        <p className="ed-status-line">{loading ? 'Tagro verdichtet die Lage…' : urgentLine}</p>
        <p className="ed-summary">{loading ? '' : executiveSummary}</p>
      </section>

      <section className="ed-focus" aria-label="Heute im Fokus">
        <div className="ed-focus-head">
          <p className="ed-focus-title">Heute im Fokus</p>
          <span className="ed-focus-meta">
            {focusItems.length === 0 ? 'nichts dringend' : `${focusItems.length} ${focusItems.length === 1 ? 'Eintrag' : 'Einträge'}`}
            {focusFilter !== 'all' && ` · ${FOCUS_FILTERS.find(f => f.id === focusFilter)?.label.toLowerCase()}`}
          </span>
        </div>
        {focusItems.length === 0 ? (
          <p className="ed-focus-empty">
            {focusFilter === 'all'
              ? 'Keine Blocker, keine offenen Entscheidungen. Tagro hält die Lage ruhig.'
              : 'Keine Einträge in dieser Sicht. Wechsle den Filter, um mehr zu sehen.'}
          </p>
        ) : (
          <div className="ed-focus-list">
            {focusItems.map((it, i) => (
              <Link key={`${it.tag}-${i}-${it.text}`} href={it.href} className="ed-focus-row">
                <span className={`ed-focus-tag ${it.tone}`}>{it.tag}</span>
                <span className="ed-focus-dot" />
                <span className="ed-focus-text">{it.text}</span>
                {it.sub && <span className="ed-focus-sub">{it.sub}</span>}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="ed-status-row" aria-label="Lage">
        {[
          ['Projektstatus',  projectStatusValue, projectStatusSub],
          ['Entscheidungen', decisionValue,      decisionSub],
          ['Blocker',        blockerValue,       blockerSub],
          ['Meilenstein',    milestoneValue,     milestoneSub],
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
            <Link href={main ? `/reports?project=${main.id}` : '/voice-reports'} className="ed-button">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l10-6.5-10-6.5Z"/></svg>
              Statusabfrage aufnehmen
            </Link>
            <button onClick={() => setShowNewProject(true)} className="ed-button" type="button">Manuell anlegen</button>
            <Link href="/reports" className="ed-button">Vorlage wählen</Link>
          </div>
        </div>

        <aside className="ed-rail" aria-label="Live status">
          <header className="ed-rail-head">
            <span>Live status</span>
            <span className="ed-rail-head-meta">live</span>
          </header>
          {[
            ['Letzte Aktivität',  latestActivityLabel, latestActivityText],
            ['Posteingang',       inboxUnread === 0 ? 'leer' : `${inboxUnread} ungelesen`, lastInboxAt ? timeAgo(lastInboxAt) : '0 ungelesen'],
            ['Tagro',             'bereit', 'v2.4.1'],
            ['Statusabfrage',     briefingStatus, report ? 'heute aktualisiert' : 'noch nicht generiert'],
            ['Zustellungen',      deliveryStatus, nextMilestone ? 'Freigabe offen' : 'ruhig'],
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
              ['Phase',       phase?.label ?? 'Intake', 'aktueller Projektstatus'],
              ['Risiken',     blockersOpen === 0 ? 'keine' : String(blockersOpen), blockerSub],
              ['Audio',       report ? 'bereit' : 'offen', 'Statusabfrage kann erzeugt werden'],
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
      <ObserverWelcomeModal />
    </div>
  )
}
