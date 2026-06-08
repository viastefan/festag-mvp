'use client'

/**
 * /projects — Projektübersicht im Festag-Tasks-Stil.
 *
 * Bewusst dieselbe Sprache wie /tasks: kleiner Titel, Filter-Pills mit
 * Count-Zusammenfassung, zwei runde Werkzeuge (Filter · Sortierung),
 * eine Tabelle mit Spaltenkopf und nach Status gruppierten, einklapp-
 * baren Sektionen. Keine Tabellen-Linien, ruhige Hover-Flächen.
 */

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import NewProjectModal from '@/components/NewProjectModal'
import { FunnelSimple, SlidersHorizontal, Stack, Plus, Sparkle } from '@phosphor-icons/react'
import { openTagro } from '@/components/TagroOverlay'
import EmptyState from '@/components/EmptyState'
import MobilePageHeader from '@/components/MobilePageHeader'

type ProjectRow = {
  id: string
  title: string
  description?: string | null
  status?: string | null
  color?: string | null
  created_at?: string | null
  updated_at?: string | null
}
type TaskRow = {
  id: string
  project_id?: string | null
  status?: string | null
  updated_at?: string | null
}
type DevProfile = {
  id: string
  full_name: string | null
  avatar_url: string | null
  github_avatar_url: string | null
  github_username: string | null
  email: string | null
}

function devInitials(d: DevProfile): string {
  return (d.full_name || d.github_username || d.email || '·')
    .replace(/^@/, '')
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase())
    .join('') || '·'
}
function devLabel(d: DevProfile): string {
  return d.full_name || (d.github_username ? `@${d.github_username}` : null) || d.email || 'Developer'
}

const DONE_STATES = new Set(['done', 'completed', 'erledigt', 'delivered'])
const ACTIVE_STATES = new Set(['doing', 'active', 'in_progress', 'review'])

// status group → label + dot colour (mirrors the Tasks project dots)
const STATUS_GROUPS: { id: string; label: string; match: (s: string) => boolean; dot: string }[] = [
  { id: 'active',   label: 'Aktiv',         match: s => s === 'active' || s === 'testing',  dot: '#22c55e' },
  { id: 'planning', label: 'In Planung',    match: s => s === 'planning' || s === 'intake', dot: '#f59e0b' },
  { id: 'done',     label: 'Abgeschlossen', match: s => s === 'done' || s === 'completed',  dot: '#94a3b8' },
]

const STATUS_LABEL: Record<string, string> = {
  intake: 'Intake', planning: 'Planung', active: 'In Arbeit',
  testing: 'Testing', done: 'Abgeschlossen', completed: 'Abgeschlossen',
}

type FilterId = 'all' | 'active' | 'planning' | 'done'
type SortId = 'recent' | 'progress' | 'name'

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all',      label: 'Alle Projekte' },
  { id: 'active',   label: 'Aktiv' },
  { id: 'planning', label: 'Planung' },
  { id: 'done',     label: 'Abgeschlossen' },
]
const SORTS: { id: SortId; label: string }[] = [
  { id: 'recent',   label: 'Letztes Update' },
  { id: 'progress', label: 'Fortschritt' },
  { id: 'name',     label: 'Name' },
]

function normalizeStatus(status?: string | null) {
  const value = (status || 'intake').toLowerCase()
  if (DONE_STATES.has(value)) return 'done'
  if (ACTIVE_STATES.has(value)) return 'active'
  return 'open'
}

// Projects created within the last 2 hours get a quiet "Neu" badge.
// The label automatically falls off after that — no manual clean-up.
const FRESH_WINDOW_MS = 2 * 60 * 60 * 1000
function isFreshProject(createdAt: string | null | undefined): boolean {
  if (!createdAt) return false
  const t = new Date(createdAt).getTime()
  if (Number.isNaN(t)) return false
  return Date.now() - t < FRESH_WINDOW_MS
}
function statusGroupOf(project: ProjectRow): string {
  const raw = (project.status || 'intake').toLowerCase()
  return STATUS_GROUPS.find(g => g.match(raw))?.id ?? 'planning'
}
function projectProgress(project: ProjectRow, tasks: TaskRow[]) {
  const related = tasks.filter(t => t.project_id === project.id)
  if (related.length > 0) {
    const done = related.filter(t => normalizeStatus(t.status) === 'done').length
    return Math.round((done / related.length) * 100)
  }
  const status = (project.status || '').toLowerCase()
  if (DONE_STATES.has(status)) return 100
  if (status === 'testing') return 84
  if (status === 'active') return 58
  if (status === 'planning') return 28
  return 10
}
function projectHealth(project: ProjectRow, tasks: TaskRow[]): { label: string; tone: 'calm' | 'warn' | 'done' } {
  const related = tasks.filter(t => t.project_id === project.id)
  if (related.some(t => (t.status || '').toLowerCase() === 'blocked')) return { label: 'Blocker prüfen', tone: 'warn' }
  const progress = projectProgress(project, related)
  if (progress >= 100) return { label: 'Abgeschlossen', tone: 'done' }
  if (progress > 0) return { label: 'Auf Kurs', tone: 'calm' }
  return { label: 'Noch keine Updates', tone: 'calm' }
}
function statusLabel(project: ProjectRow) {
  const raw = (project.status || 'intake').toLowerCase()
  return STATUS_LABEL[raw] || project.status || 'Intake'
}
function dateLabel(value?: string | null) {
  if (!value) return '—'
  try { return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short' }).format(new Date(value)) }
  catch { return '—' }
}

export default function ProjectsPage() {
  // useSearchParams() forces this route to defer; wrapping in <Suspense>
  // keeps Next 14 from misclassifying the page as fully static, which
  // would otherwise prerender with null searchParams and crash on hydrate.
  return (
    <Suspense fallback={<div style={{ padding:48, color:'var(--text-muted)' }}>Projekte werden geladen…</div>}>
      <ProjectsPageInner />
    </Suspense>
  )
}

function ProjectsPageInner() {
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [tasks, setTasks] = useState<TaskRow[]>([])
  // Responsible developer(s) per project — independent of which workspace the
  // project lives in (read from project_assignments, RLS-gated).
  const [devsByProject, setDevsByProject] = useState<Record<string, DevProfile[]>>({})
  const [loading, setLoading] = useState(true)
  const [showNewProject, setShowNewProject] = useState(false)
  const [filter, setFilter] = useState<FilterId>('all')
  const [sort, setSort] = useState<SortId>('recent')
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])

  async function loadProjects() {
    const { data: session } = await supabase.auth.getSession()
    if (!session.session) { window.location.href = '/login'; return }
    const [{ data: projectData }, { data: taskData }] = await Promise.all([
      (supabase as any).from('projects').select('*').order('created_at', { ascending: false }),
      (supabase as any).from('tasks').select('id,project_id,status,updated_at'),
    ])
    const projs = (projectData as ProjectRow[]) ?? []
    // Mit genau einem Projekt gibt es nichts auszuwählen — direkt ins Projekt.
    // (Ausnahme: der „Neues Projekt"-Flow ist über ?new=1 geöffnet.)
    if (projs.length === 1 && searchParams?.get('new') !== '1') {
      window.location.href = `/project/${projs[0].id}`
      return
    }
    setProjects(projs)
    setTasks((taskData as TaskRow[]) ?? [])
    setLoading(false)
    loadDevs(projs.map(p => p.id))
  }

  // Batched: one assignments query + one profiles query for all projects on
  // screen, then group by project. Avoids per-row fetches/subscriptions.
  async function loadDevs(projectIds: string[]) {
    if (!projectIds.length) { setDevsByProject({}); return }
    const { data: assigns } = await (supabase as any)
      .from('project_assignments')
      .select('project_id,user_id,created_at')
      .in('project_id', projectIds)
      .eq('active', true)
      .order('created_at', { ascending: true })
    const rows = (assigns ?? []) as { project_id: string; user_id: string }[]
    const userIds = Array.from(new Set(rows.map(r => r.user_id))).filter(Boolean)
    if (!userIds.length) { setDevsByProject({}); return }
    const { data: profiles } = await (supabase as any)
      .from('profiles')
      .select('id,full_name,avatar_url,github_avatar_url,github_username,email')
      .in('id', userIds)
    const byId = new Map<string, DevProfile>(((profiles ?? []) as DevProfile[]).map(p => [p.id, p]))
    const map: Record<string, DevProfile[]> = {}
    for (const r of rows) {
      const prof = byId.get(r.user_id)
      if (!prof) continue
      ;(map[r.project_id] ||= []).push(prof)
    }
    setDevsByProject(map)
  }

  useEffect(() => {
    loadProjects()
    const channel = supabase
      .channel('client-projects-overview')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => loadProjects())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => loadProjects())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_assignments' }, () => loadProjects())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (searchParams?.get('new') === '1') setShowNewProject(true)
  }, [searchParams])

  // Close menus on outside click / Escape
  useEffect(() => {
    if (!filterOpen && !sortOpen) return
    function onDown(e: MouseEvent) {
      if (!(e.target as HTMLElement)?.closest?.('.pj-tool-wrap')) { setFilterOpen(false); setSortOpen(false) }
    }
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') { setFilterOpen(false); setSortOpen(false) } }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onEsc)
    return () => { window.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onEsc) }
  }, [filterOpen, sortOpen])

  const counts = useMemo(() => {
    const c: Record<FilterId, number> = { all: projects.length, active: 0, planning: 0, done: 0 }
    for (const p of projects) {
      const g = statusGroupOf(p)
      if (g === 'active') c.active++
      else if (g === 'planning') c.planning++
      else if (g === 'done') c.done++
    }
    return c
  }, [projects])

  const visible = useMemo(() => {
    let list = projects
    if (filter !== 'all') list = list.filter(p => statusGroupOf(p) === filter)
    const score = (p: ProjectRow) => {
      if (sort === 'progress') return projectProgress(p, tasks)
      if (sort === 'name') return 0
      return new Date(p.updated_at || p.created_at || 0).getTime()
    }
    return [...list].sort((a, b) => {
      if (sort === 'name') return a.title.localeCompare(b.title)
      return score(b) - score(a)
    })
  }, [projects, tasks, filter, sort])

  const groups = useMemo(() => (
    STATUS_GROUPS
      .map(g => ({ ...g, items: visible.filter(p => statusGroupOf(p) === g.id) }))
      .filter(g => g.items.length > 0)
  ), [visible])

  function toggleGroup(id: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const summary = `${counts.all} Projekt${counts.all === 1 ? '' : 'e'} · ${counts.active} aktiv · ${counts.planning} Planung · ${counts.done} abgeschlossen`

  return (
    <div className="pj-os">
      <style>{`
        .pj-os {
          --pj-soft:#4E5567;
          width:100%; height:100%; min-height:0;
          color:var(--text);
          padding:20px 0 0;
          display:flex; flex-direction:column; overflow:hidden;
          letter-spacing:.012em;
        }
        [data-theme="dark"] .pj-os,
        [data-theme="classic-dark"] .pj-os,
        [data-theme="read"] .pj-os { --pj-soft:var(--text-secondary); }

        .pj-static { flex:0 0 auto; position:relative; z-index:8; }
        .pj-scroll {
          flex:1 1 auto; min-height:0; overflow-y:auto; overflow-x:hidden;
          padding:0 18px 76px; overscroll-behavior:contain;
        }

        /* top row */
        .pj-top {
          display:flex; align-items:center; justify-content:space-between;
          min-height:34px;
          border-bottom:1px solid color-mix(in srgb, var(--border) 60%, transparent);
          padding:0 18px 12px;
        }
        .pj-title { margin:0; font-size:14.5px; font-weight:500; letter-spacing:0; }
        .pj-create {
          height:30px; padding:0 9px 0 12px;
          border:1px solid transparent; border-radius:32px;
          background:transparent; color:var(--pj-soft);
          display:flex; align-items:center; gap:8px;
          font:inherit; font-size:12px; font-weight:500; cursor:pointer;
        }
        .pj-create:hover { background:var(--surface-2); color:var(--text); }
        .pj-create-plus { font-size:15px; line-height:1; transform:translateY(-.5px); }

        /* toolbar */
        .pj-toolbar {
          display:flex; align-items:center; justify-content:space-between;
          gap:10px; padding:14px 18px 12px;
        }
        .pj-filters { display:flex; align-items:center; gap:6px; min-width:0; flex-wrap:wrap; }
        .pj-filter {
          height:27px; padding:0 9px;
          border:1px solid var(--border); border-radius:999px;
          background:transparent; color:var(--pj-soft);
          font:inherit; font-size:11.5px; font-weight:500;
          white-space:nowrap; cursor:pointer; letter-spacing:.02em;
          transition:background .12s ease, color .12s ease;
        }
        .pj-filter:hover { color:var(--text); }
        .pj-filter.on { background:var(--surface-2); color:var(--text); }
        .pj-count-summary {
          color:var(--pj-soft); font-size:11.5px; font-weight:500;
          padding-left:4px; letter-spacing:.02em; white-space:nowrap;
        }
        .pj-tools { display:flex; align-items:center; gap:8px; flex-shrink:0; }
        .pj-tool-wrap { position:relative; }
        .pj-tool {
          width:34px; height:34px; border:0; border-radius:999px;
          background:#fff; color:var(--pj-soft);
          display:flex; align-items:center; justify-content:center; cursor:pointer;
          box-shadow:0 1px 2px rgba(15,23,42,.08), 0 2px 6px rgba(15,23,42,.05);
          transition:color .12s ease, box-shadow .12s ease, transform .12s ease;
        }
        .pj-tool:hover, .pj-tool.on {
          color:var(--text); transform:translateY(-1px);
          box-shadow:0 1px 2px rgba(15,23,42,.10), 0 3px 9px rgba(15,23,42,.07);
        }
        [data-theme="dark"] .pj-tool, [data-theme="classic-dark"] .pj-tool {
          background:color-mix(in srgb, var(--surface) 92%, #fff 8%);
          box-shadow:0 1px 2px rgba(0,0,0,.28), 0 2px 7px rgba(0,0,0,.16);
        }
        .pj-menu {
          position:absolute; top:38px; right:0; width:198px; z-index:20;
          border:0; border-radius:8px; padding:6px;
          background:var(--surface);
          box-shadow:0 18px 44px rgba(0,0,0,.16);
          animation:pjIn .16s cubic-bezier(.16,1,.3,1) both;
        }
        [data-theme="dark"] .pj-menu, [data-theme="classic-dark"] .pj-menu {
          background:color-mix(in srgb, var(--surface) 96%, #fff 4%);
          box-shadow:0 18px 44px rgba(0,0,0,.4);
        }
        @keyframes pjIn { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:none; } }
        .pj-menu button {
          width:100%; height:30px; border:0; border-radius:8px;
          display:flex; align-items:center; justify-content:space-between; padding:0 9px;
          background:transparent; color:var(--pj-soft);
          font:inherit; font-size:12px; font-weight:500; cursor:pointer;
        }
        .pj-menu button:hover, .pj-menu button.on { background:var(--surface-2); color:var(--text); }
        .pj-menu button .check { color:var(--accent, #22c55e); font-size:11px; }

        /* table */
        .pj-table { width:100%; }
        .pj-head, .pj-row {
          display:grid;
          grid-template-columns:42px minmax(180px,1.7fr) minmax(120px,.95fr) 128px 76px 72px 56px;
          align-items:center; gap:8px;
          padding:0 12px 0 0; box-sizing:border-box;
        }
        .pj-head {
          position:sticky; top:0; z-index:5; min-height:36px;
          background:var(--surface);
          color:var(--pj-soft); font-size:11px; font-weight:500;
          letter-spacing:.02em;
        }
        .pj-head > *, .pj-row > * { min-width:0; }
        .pj-head .ctr { text-align:center; }

        /* group section */
        .pj-section { margin:5px 0 8px; animation:pjGroupIn .22s cubic-bezier(.16,1,.3,1) both; }
        @keyframes pjGroupIn { from { opacity:0; transform:translateY(7px); } to { opacity:1; transform:none; } }
        .pj-group-row {
          width:100%; min-height:40px;
          display:grid;
          grid-template-columns:42px minmax(180px,1.7fr) minmax(120px,.95fr) 128px 76px 72px 56px;
          align-items:center; gap:8px;
          padding:0 12px 0 0; box-sizing:border-box;
          border:0; border-radius:8px; background:transparent;
          color:var(--pj-soft); font:inherit; text-align:left; cursor:pointer;
          transition:background .12s ease;
        }
        .pj-group-row:hover { background:color-mix(in srgb, var(--surface-2) 60%, transparent); }
        .pj-group-dot {
          width:12px; height:12px; border-radius:999px;
          border:2px solid var(--g-dot, var(--pj-soft));
          background:transparent; justify-self:center;
        }
        .pj-group-title {
          display:flex; align-items:center; gap:9px; min-width:0;
          grid-column:2 / 4;
          color:var(--text); font-size:12.5px; font-weight:500;
        }
        .pj-group-count { color:var(--pj-soft); font-size:11.5px; font-weight:500; }
        .pj-group-chevron {
          grid-column:6; justify-self:center; color:var(--pj-soft);
          transform:rotate(90deg);
          transition:transform .2s cubic-bezier(.16,1,.3,1);
        }
        .pj-section.collapsed .pj-group-chevron { transform:rotate(0deg); }
        .pj-section-body {
          display:grid; grid-template-rows:1fr; overflow:hidden;
          transition:grid-template-rows .26s cubic-bezier(.16,1,.3,1);
        }
        .pj-section.collapsed .pj-section-body { grid-template-rows:0fr; }
        .pj-section-body-inner { min-height:0; overflow:hidden; padding-top:4px; }

        /* project row */
        .pj-row {
          min-height:52px; border-radius:8px;
          color:var(--pj-soft); font-size:12px;
          text-decoration:none; cursor:pointer;
          background:transparent; transition:background .12s ease;
        }
        .pj-row { position:relative; }
        .pj-row:hover { background:color-mix(in srgb, var(--surface-2) 60%, transparent); }
        .pj-accent {
          width:3px; height:22px; border-radius:2px;
          background:var(--pj-c, color-mix(in srgb, var(--border-strong) 70%, transparent));
          justify-self:center;
          opacity:.85;
        }
        .pj-row:hover .pj-accent { opacity:1; height:26px; transition:height .15s ease, opacity .15s ease; }
        .pj-name { min-width:0; }
        .pj-name-row { display:flex; align-items:center; gap:8px; min-width:0; }
        .pj-name strong {
          display:block; color:var(--text); font-size:12.5px; font-weight:500;
          overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        }
        .pj-new {
          display:inline-flex; align-items:center;
          height:16px; padding:0 7px;
          border-radius:999px;
          background:color-mix(in srgb, var(--btn-prim) 12%, transparent);
          border:1px solid color-mix(in srgb, var(--btn-prim) 26%, transparent);
          color:var(--btn-prim);
          font-size:9.5px; font-weight:500; letter-spacing:.08em; text-transform:uppercase;
          flex-shrink:0;
        }
        [data-theme="dark"] .pj-new, [data-theme="classic-dark"] .pj-new { color:#A0AAC2; }
        .pj-name small {
          display:block; margin-top:2px; color:var(--pj-soft); font-size:11.5px;
          overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        }
        .pj-health {
          display:inline-flex; align-items:center; gap:7px; min-width:0;
          color:var(--pj-soft); font-size:12px;
        }
        .pj-health-dot { width:7px; height:7px; border-radius:999px; flex:0 0 auto; }
        .pj-health.calm .pj-health-dot { background:#22c55e; }
        .pj-health.warn .pj-health-dot { background:#ef4444; }
        .pj-health.done .pj-health-dot { background:#94a3b8; }
        .pj-health.warn { color:var(--text); }
        .pj-health span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .pj-progress { display:flex; align-items:center; gap:8px; color:var(--pj-soft); font-size:12px; }
        .pj-progress-bar {
          flex:1; height:3px; border-radius:999px;
          background:color-mix(in srgb, var(--surface-2) 70%, transparent); overflow:hidden;
        }
        .pj-progress-bar span { display:block; height:100%; background:color-mix(in srgb, var(--pj-soft) 55%, transparent); }
        .pj-progress small { color:var(--pj-soft); font-size:11px; min-width:30px; text-align:right; }
        .pj-tasks { color:var(--pj-soft); font-size:12px; }
        .pj-date { color:var(--pj-soft); font-size:11.5px; }

        /* Responsible-dev avatar(s) — who is building this, regardless of workspace. */
        .pj-dev { display:flex; align-items:center; justify-self:start; }
        .pj-dev-empty { color:var(--pj-soft); opacity:.5; font-size:12px; }
        .pj-dev-stack { display:inline-flex; }
        .pj-dev-av {
          width:24px; height:24px; border-radius:50%;
          border:1.5px solid var(--surface);
          background:var(--surface-2); overflow:hidden;
          display:inline-flex; align-items:center; justify-content:center;
          margin-left:-7px; color:var(--text-secondary);
          font-size:9.5px; font-weight:500; letter-spacing:.015em;
        }
        .pj-dev-av:first-child { margin-left:0; }
        .pj-dev-av img { width:100%; height:100%; object-fit:cover; display:block; }
        .pj-dev-more { background:var(--card); color:var(--pj-soft); font-size:9px; }

        .pj-empty {
          padding:60px 12px; text-align:center; color:var(--pj-soft);
          font-size:12.5px; font-weight:500;
        }
        .pj-empty strong { display:block; color:var(--text); margin-bottom:6px; font-size:14px; }
        .pj-empty p { margin:0 auto; font-size:12.5px; max-width:340px; line-height:1.5; }

        @media (max-width:900px) {
          .pj-head, .pj-row, .pj-group-row {
            grid-template-columns:34px minmax(0,1.7fr) minmax(96px,1fr) 62px 56px;
            gap:8px;
          }
          .pj-head .col-progress, .pj-head .col-tasks,
          .pj-row > .pj-progress, .pj-row > .pj-tasks { display:none; }
          .pj-group-chevron { grid-column:4; }
          .pj-group-row .pj-date { display:none; }
        }
        @media (max-width:760px) {
          .pj-os { padding:14px 4px 0; }
          .pj-toolbar { padding-left:8px; padding-right:8px; }
          .pj-scroll { padding:0 8px 96px; }
          .pj-toolbar { flex-wrap:wrap; gap:8px; }
          .pj-count-summary { flex-basis:100%; padding-left:0; }
        }
        /* Mobile uses MobilePageHeader above; hide desktop title row. */
        @media (max-width: 768px) {
          .pj-top { display: none !important; }
        }
        @media (max-width:560px) {
          .pj-head, .pj-row, .pj-group-row {
            grid-template-columns:24px minmax(0,1fr) 50px;
            gap:9px;
          }
          .pj-head .col-status, .pj-row > .pj-health,
          .pj-head .col-dev, .pj-row > .pj-dev { display:none; }
          .pj-group-title { grid-column:2 / 3; }
          .pj-group-chevron { grid-column:3; }
          .pj-count-summary { display:none; }
          .pj-filter { font-size:11px; }
          .pj-row { min-height:56px; }
        }
      `}</style>

      <div className="pj-static">
        <MobilePageHeader
          title="Projekte"
          primaryIcon={Plus}
          primaryLabel="Neues Projekt"
          onPrimary={() => setShowNewProject(true)}
          menuItems={[
            { id: 'tagro', label: 'Mit Tagro erstellen', onClick: () => openTagro({ contextType: 'project', title: 'Neues Projekt mit Tagro' }) },
          ]}
        />
        <div className="pj-top">
          <h1 className="pj-title">Projekte</h1>
          <div style={{ display:'inline-flex', gap:8, alignItems:'center' }}>
            <button
              type="button"
              onClick={() => openTagro({ contextType: 'project', title: 'Neues Projekt mit Tagro' })}
              style={{
                display:'inline-flex', alignItems:'center', gap:7,
                height:32, padding:'0 13px', borderRadius:999, border:0,
                background:'#5B647D', color:'#FFF',
                font:'inherit', fontSize:13, fontWeight:500, cursor:'pointer',
              }}
            >
              <Sparkle size={13} /> Mit Tagro erstellen
            </button>
            <button className="pj-create" type="button" onClick={() => setShowNewProject(true)}>
              Manuell anlegen
              <span className="pj-create-plus" aria-hidden="true">+</span>
            </button>
          </div>
        </div>

        <div className="pj-toolbar">
          <div className="pj-filters" role="tablist" aria-label="Projektfilter">
            {FILTERS.map(f => (
              <button
                key={f.id}
                type="button"
                className={`pj-filter${filter === f.id ? ' on' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
            <span className="pj-count-summary">{summary}</span>
          </div>
          <div className="pj-tools">
            <div className="pj-tool-wrap">
              <button
                className={`pj-tool${filterOpen ? ' on' : ''}`}
                type="button"
                aria-label="Projekte filtern"
                aria-expanded={filterOpen}
                onClick={() => { setFilterOpen(v => !v); setSortOpen(false) }}
              >
                <FunnelSimple size={15} />
              </button>
              {filterOpen && (
                <div className="pj-menu" role="menu">
                  {FILTERS.map(f => (
                    <button
                      key={f.id}
                      type="button"
                      className={filter === f.id ? 'on' : ''}
                      onClick={() => { setFilter(f.id); setFilterOpen(false) }}
                    >
                      <span>{f.label}</span>
                      {filter === f.id ? <span className="check">✓</span> : null}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="pj-tool-wrap">
              <button
                className={`pj-tool${sortOpen ? ' on' : ''}`}
                type="button"
                aria-label="Projekte sortieren"
                aria-expanded={sortOpen}
                onClick={() => { setSortOpen(v => !v); setFilterOpen(false) }}
              >
                <SlidersHorizontal size={15} />
              </button>
              {sortOpen && (
                <div className="pj-menu" role="menu">
                  {SORTS.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      className={sort === s.id ? 'on' : ''}
                      onClick={() => { setSort(s.id); setSortOpen(false) }}
                    >
                      <span>{s.label}</span>
                      {sort === s.id ? <span className="check">✓</span> : null}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="pj-scroll">
        {loading ? (
          <div className="pj-empty">Projekte werden geladen…</div>
        ) : visible.length === 0 ? (
          filter === 'all' ? (
            <EmptyState
              icon={Stack}
              kicker="Projekte"
              title="Noch kein Projekt"
              description="Erstelle ein Projekt, damit Tagro Roadmap und Aufgaben vorbereiten kann."
              actions={[
                { label: 'Projekt anlegen', icon: Plus, primary: true, onClick: () => setShowNewProject(true) },
              ]}
            />
          ) : (
            <EmptyState
              icon={Stack}
              kicker="Projekte"
              title="Keine Projekte in dieser Sicht"
              description="Wechsle den Filter, um andere Projekte zu sehen."
            />
          )
        ) : (
          <div className="pj-table">
            <div className="pj-head">
              <span className="ctr" />
              <span className="col-name">Projekt</span>
              <span className="col-status">Status</span>
              <span className="col-progress">Fortschritt</span>
              <span className="col-tasks">Aufgaben</span>
              <span className="col-update">Update</span>
              <span className="col-dev">Dev</span>
            </div>

            {/* Flat list — the top filter pills (Alle / Aktiv / Planung /
                Abgeschlossen) already group by status, so an extra in-row
                section header would only repeat what the filter says. */}
            {visible.map(project => {
              const related = tasks.filter(t => t.project_id === project.id)
              const progress = projectProgress(project, related)
              const health = projectHealth(project, related)
              return (
                <Link key={project.id} href={`/project/${project.id}`} className="pj-row">
                  <span
                    className="pj-accent"
                    style={{ ['--pj-c' as string]: project.color || 'var(--border-strong)' }}
                    aria-hidden
                  />
                  <span className="pj-name">
                    <span className="pj-name-row">
                      <strong>{project.title}</strong>
                      {project.created_at && isFreshProject(project.created_at) && (
                        <span className="pj-new">Neu</span>
                      )}
                    </span>
                    <small>{related.length} {related.length === 1 ? 'Aufgabe' : 'Aufgaben'}</small>
                  </span>
                  <span className={`pj-health ${health.tone}`}>
                    <span className="pj-health-dot" />
                    <span>{health.label}</span>
                  </span>
                  <span className="pj-progress">
                    <span className="pj-progress-bar"><span style={{ width: `${progress}%` }} /></span>
                    <small>{progress}%</small>
                  </span>
                  <span className="pj-tasks">{related.length}</span>
                  <span className="pj-date">{dateLabel(project.updated_at || project.created_at)}</span>
                  <span className="pj-dev">
                    {(() => {
                      const devs = devsByProject[project.id] || []
                      if (devs.length === 0) return <span className="pj-dev-empty" title="Noch kein Dev zugewiesen">—</span>
                      const shown = devs.slice(0, 3)
                      const overflow = devs.length - shown.length
                      return (
                        <span className="pj-dev-stack">
                          {shown.map((d, i) => {
                            const src = d.avatar_url || d.github_avatar_url
                            return (
                              <span key={d.id} className="pj-dev-av" style={{ zIndex: shown.length - i }} title={devLabel(d)}>
                                {src ? <img src={src} alt="" /> : <span>{devInitials(d)}</span>}
                              </span>
                            )
                          })}
                          {overflow > 0 && <span className="pj-dev-av pj-dev-more">+{overflow}</span>}
                        </span>
                      )
                    })()}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreated={() => { setShowNewProject(false); loadProjects() }}
        />
      )}
    </div>
  )
}
