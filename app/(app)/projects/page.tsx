'use client'

/**
 * /projects — Projektübersicht im Festag-Tasks-Stil.
 *
 * Drei Werkzeuge, alle funktional:
 *   • Filter-Pills (Alle / Aktiv / Planung / Abgeschlossen) mit Live-Counts
 *   • Gruppieren nach Status (Funnel) — collapsible Sektionen wie /tasks
 *   • Sortieren (Sliders) — zuletzt aktualisiert / Fortschritt / Name
 *
 * Ruhig nach festag_design_rules: Aeonik Medium, 1.2% letter-spacing,
 * keine farbigen Buttons, dezente Borders, Notion-Listenfeel statt
 * Tabellen-Karneval.
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import NewProjectModal from '@/components/NewProjectModal'
import { FunnelSimple, SlidersHorizontal, Plus, CaretRight } from '@phosphor-icons/react'

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
  priority?: string | null
  updated_at?: string | null
}

const DONE_STATES = new Set(['done', 'completed', 'erledigt'])
const ACTIVE_STATES = new Set(['doing', 'active', 'in_progress', 'review'])

// status group → label + dot colour
const STATUS_GROUPS: { id: string; label: string; match: (s: string) => boolean; dot: string }[] = [
  { id: 'active',   label: 'Aktiv',         match: s => s === 'active' || s === 'testing', dot: '#22c55e' },
  { id: 'planning', label: 'In Planung',    match: s => s === 'planning' || s === 'intake', dot: '#f59e0b' },
  { id: 'done',     label: 'Abgeschlossen', match: s => s === 'done' || s === 'completed', dot: '#64748b' },
]

const STATUS_LABEL: Record<string, string> = {
  intake: 'Intake', planning: 'Planung', active: 'In Arbeit',
  testing: 'Testing', done: 'Erledigt', completed: 'Erledigt',
}

type FilterId = 'all' | 'active' | 'planning' | 'done'
type SortId = 'recent' | 'progress' | 'name'

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all',      label: 'Alle' },
  { id: 'active',   label: 'Aktiv' },
  { id: 'planning', label: 'Planung' },
  { id: 'done',     label: 'Abgeschlossen' },
]
const SORTS: { id: SortId; label: string }[] = [
  { id: 'recent',   label: 'Zuletzt aktualisiert' },
  { id: 'progress', label: 'Fortschritt' },
  { id: 'name',     label: 'Name' },
]

function normalizeStatus(status?: string | null) {
  const value = (status || 'intake').toLowerCase()
  if (DONE_STATES.has(value)) return 'done'
  if (ACTIVE_STATES.has(value)) return 'active'
  return 'open'
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
  if (status === 'done' || status === 'completed') return 100
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
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewProject, setShowNewProject] = useState(false)
  const [filter, setFilter] = useState<FilterId>('all')
  const [sort, setSort] = useState<SortId>('recent')
  const [grouped, setGrouped] = useState(true)
  const [sortOpen, setSortOpen] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])

  async function loadProjects() {
    const { data: session } = await supabase.auth.getSession()
    if (!session.session) { window.location.href = '/login'; return }
    const [{ data: projectData }, { data: taskData }] = await Promise.all([
      (supabase as any).from('projects').select('*').order('created_at', { ascending: false }),
      (supabase as any).from('tasks').select('id,project_id,status,priority,updated_at'),
    ])
    setProjects((projectData as ProjectRow[]) ?? [])
    setTasks((taskData as TaskRow[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadProjects()
    const channel = supabase
      .channel('client-projects-overview')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => loadProjects())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => loadProjects())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (searchParams.get('new') === '1') setShowNewProject(true)
  }, [searchParams])

  // Close sort menu on outside click
  useEffect(() => {
    if (!sortOpen) return
    function onDown(e: MouseEvent) {
      if (!(e.target as HTMLElement)?.closest?.('.pj-tool-wrap')) setSortOpen(false)
    }
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') setSortOpen(false) }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onEsc)
    return () => { window.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onEsc) }
  }, [sortOpen])

  // counts per filter
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

  // group → list, in STATUS_GROUPS order
  const groups = useMemo(() => {
    return STATUS_GROUPS.map(g => ({
      ...g,
      items: visible.filter(p => statusGroupOf(p) === g.id),
    })).filter(g => g.items.length > 0)
  }, [visible])

  function toggleGroup(id: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="pj-os">
      <style>{`
        .pj-os {
          width:100%; height:100%; min-height:0;
          color:var(--text);
          display:flex; flex-direction:column; overflow:hidden;
          padding:24px 0 0;
          letter-spacing:.012em;
        }
        .pj-static { flex:0 0 auto; padding:0 clamp(20px,3vw,40px); }
        .pj-scroll { flex:1 1 auto; min-height:0; overflow-y:auto; overflow-x:hidden; padding:0 clamp(20px,3vw,40px) 96px; }

        .pj-top {
          display:flex; align-items:center; justify-content:space-between;
          min-height:40px;
        }
        .pj-title { margin:0; font-size:20px; font-weight:500; letter-spacing:-.012em; }
        .pj-plus {
          width:30px; height:30px; border:1px solid var(--border); border-radius:8px;
          background:transparent; color:var(--text-muted);
          display:flex; align-items:center; justify-content:center; cursor:pointer;
          transition:background .12s ease, color .12s ease;
        }
        .pj-plus:hover { background:var(--surface-2); color:var(--text); }

        .pj-toolbar {
          display:flex; align-items:center; justify-content:space-between;
          gap:10px; padding:14px 0 12px; flex-wrap:wrap;
        }
        .pj-filters { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
        .pj-filter {
          display:inline-flex; align-items:center; gap:6px;
          height:28px; padding:0 11px; border-radius:999px;
          border:1px solid var(--border); background:transparent;
          color:var(--text-muted); font:inherit; font-size:11.5px; font-weight:500;
          cursor:pointer; transition:background .12s ease, color .12s ease;
        }
        .pj-filter:hover { color:var(--text); }
        .pj-filter.on { background:var(--surface-2); color:var(--text); }
        .pj-filter .count {
          display:inline-flex; align-items:center; justify-content:center;
          min-width:16px; height:15px; padding:0 4px; border-radius:999px;
          background:color-mix(in srgb, var(--surface-2) 60%, transparent);
          color:var(--text-muted); font-size:10px;
        }
        .pj-tools { display:flex; align-items:center; gap:6px; }
        .pj-tool-wrap { position:relative; }
        .pj-tool {
          width:32px; height:32px; border:0; border-radius:999px;
          background:var(--surface); color:var(--text-muted);
          display:flex; align-items:center; justify-content:center; cursor:pointer;
          box-shadow:0 1px 2px rgba(15,23,42,.08), 0 7px 18px rgba(15,23,42,.07);
          transition:transform .12s ease, color .12s ease;
        }
        .pj-tool:hover, .pj-tool.on { color:var(--text); transform:translateY(-1px); }
        [data-theme="dark"] .pj-tool, [data-theme="classic-dark"] .pj-tool {
          background:color-mix(in srgb, var(--surface) 92%, #fff 8%);
          box-shadow:0 1px 2px rgba(0,0,0,.28), 0 8px 20px rgba(0,0,0,.2);
        }
        .pj-menu {
          position:absolute; top:calc(100% + 6px); right:0; min-width:210px;
          padding:5px; border-radius:12px; z-index:40;
          background:color-mix(in srgb, var(--surface) 96%, transparent);
          backdrop-filter:blur(18px) saturate(150%);
          box-shadow:0 16px 38px rgba(15,23,42,.12), 0 0 0 1px rgba(15,23,42,.06);
          animation:pjIn .16s cubic-bezier(.16,1,.3,1) both;
        }
        [data-theme="dark"] .pj-menu, [data-theme="classic-dark"] .pj-menu {
          background:color-mix(in srgb, #14181f 94%, transparent);
          box-shadow:0 18px 42px rgba(0,0,0,.34), 0 0 0 1px rgba(255,255,255,.05);
        }
        @keyframes pjIn { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:none; } }
        .pj-menu button {
          width:100%; min-height:32px; padding:6px 9px;
          border:0; border-radius:8px; background:transparent;
          color:var(--text); font:inherit; font-size:12.5px;
          display:flex; align-items:center; justify-content:space-between; gap:9px;
          cursor:pointer; text-align:left;
        }
        .pj-menu button:hover { background:var(--surface-2); }
        .pj-menu button .check { color:var(--accent); font-size:11px; }

        /* group header */
        .pj-group { margin-top:6px; }
        .pj-group-head {
          width:100%; display:flex; align-items:center; gap:9px;
          min-height:34px; padding:0 8px; border:0; background:transparent;
          color:var(--text-secondary); font:inherit; font-size:12px; font-weight:500;
          cursor:pointer; border-radius:8px; text-align:left;
        }
        .pj-group-head:hover { background:color-mix(in srgb, var(--surface-2) 55%, transparent); }
        .pj-group-dot { width:7px; height:7px; border-radius:999px; flex:0 0 auto; }
        .pj-group-count { color:var(--text-muted); font-size:11px; }
        .pj-group-caret {
          margin-left:auto; color:var(--text-muted);
          transition:transform .18s cubic-bezier(.16,1,.3,1);
        }
        .pj-group.collapsed .pj-group-caret { transform:rotate(-90deg); }
        .pj-group-body {
          display:grid; grid-template-rows:1fr;
          transition:grid-template-rows .24s cubic-bezier(.16,1,.3,1);
        }
        .pj-group.collapsed .pj-group-body { grid-template-rows:0fr; }
        .pj-group-body-inner { min-height:0; overflow:hidden; }

        /* list head + row */
        .pj-head {
          display:grid;
          grid-template-columns:14px minmax(0,1.7fr) 150px 132px 90px 14px;
          gap:14px; align-items:center;
          padding:8px 10px 6px;
          color:var(--text-muted); font-size:10px; font-weight:400;
          letter-spacing:.1em; text-transform:uppercase;
        }
        .pj-row {
          display:grid;
          grid-template-columns:14px minmax(0,1.7fr) 150px 132px 90px 14px;
          gap:14px; align-items:center;
          min-height:50px; padding:8px 10px;
          border-radius:8px;
          color:var(--text-secondary); font-size:12.5px;
          text-decoration:none;
          transition:background .12s ease;
        }
        .pj-row:hover { background:color-mix(in srgb, var(--surface-2) 60%, transparent); }
        .pj-color { width:11px; height:11px; border-radius:4px; border:1.5px solid var(--pj-c, var(--border-strong)); flex:0 0 auto; }
        .pj-name { min-width:0; }
        .pj-name strong {
          display:block; color:var(--text); font-size:13px; font-weight:500;
          overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        }
        .pj-name small {
          display:block; margin-top:2px; color:var(--text-muted); font-size:11px;
          overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        }
        .pj-health { display:inline-flex; align-items:center; gap:6px; min-width:0; }
        .pj-health-dot { width:6px; height:6px; border-radius:999px; flex:0 0 auto; }
        .pj-health.calm .pj-health-dot { background:#22c55e; }
        .pj-health.warn .pj-health-dot { background:#ef4444; }
        .pj-health.done .pj-health-dot { background:#64748b; }
        .pj-health span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .pj-progress { display:flex; align-items:center; gap:8px; }
        .pj-progress-bar {
          flex:1; height:3px; border-radius:999px;
          background:color-mix(in srgb, var(--surface-2) 70%, transparent); overflow:hidden;
        }
        .pj-progress-bar span { display:block; height:100%; background:color-mix(in srgb, var(--text-secondary) 55%, transparent); }
        .pj-progress small { color:var(--text-muted); font-size:11px; min-width:30px; text-align:right; }
        .pj-date { color:var(--text-muted); font-size:11.5px; }
        .pj-caret { color:var(--text-muted); }

        .pj-empty {
          min-height:300px; display:flex; align-items:center; justify-content:center;
          text-align:center; color:var(--text-muted);
        }
        .pj-empty strong { display:block; color:var(--text); margin-bottom:5px; font-size:13.5px; font-weight:500; }
        .pj-empty p { margin:0; font-size:12.5px; max-width:340px; }

        @media (max-width:820px) {
          .pj-head { display:none; }
          .pj-row { grid-template-columns:14px minmax(0,1fr) 14px; }
          .pj-row > .pj-health, .pj-row > .pj-progress, .pj-row > .pj-date { display:none; }
        }
      `}</style>

      <div className="pj-static">
        <div className="pj-top">
          <h1 className="pj-title">Projekte</h1>
          <button className="pj-plus" type="button" onClick={() => setShowNewProject(true)} aria-label="Neues Projekt">
            <Plus size={16} />
          </button>
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
                <span className="count">{counts[f.id]}</span>
              </button>
            ))}
          </div>
          <div className="pj-tools">
            <button
              className={`pj-tool${grouped ? ' on' : ''}`}
              type="button"
              aria-label="Nach Status gruppieren"
              aria-pressed={grouped}
              onClick={() => setGrouped(g => !g)}
            >
              <FunnelSimple size={15} />
            </button>
            <div className="pj-tool-wrap">
              <button
                className={`pj-tool${sortOpen ? ' on' : ''}`}
                type="button"
                aria-label="Sortieren"
                aria-expanded={sortOpen}
                onClick={() => setSortOpen(v => !v)}
              >
                <SlidersHorizontal size={15} />
              </button>
              {sortOpen && (
                <div className="pj-menu" role="menu">
                  {SORTS.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={sort === s.id}
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
          <div className="pj-empty">
            <div>
              <strong>Projekte werden geladen</strong>
              <p>Tagro synchronisiert deinen Workspace.</p>
            </div>
          </div>
        ) : visible.length === 0 ? (
          <div className="pj-empty">
            <div>
              <strong>{filter === 'all' ? 'Noch kein Projekt' : 'Keine Projekte in dieser Sicht'}</strong>
              <p>{filter === 'all'
                ? 'Erstelle ein Projekt, damit Tagro Roadmap und Aufgaben vorbereiten kann.'
                : 'Wechsle den Filter, um andere Projekte zu sehen.'}</p>
            </div>
          </div>
        ) : grouped ? (
          groups.map(g => {
            const isCollapsed = collapsed.has(g.id)
            return (
              <section className={`pj-group${isCollapsed ? ' collapsed' : ''}`} key={g.id}>
                <button className="pj-group-head" type="button" onClick={() => toggleGroup(g.id)} aria-expanded={!isCollapsed}>
                  <span className="pj-group-dot" style={{ background: g.dot }} />
                  {g.label}
                  <span className="pj-group-count">{g.items.length}</span>
                  <CaretRight className="pj-group-caret" size={13} />
                </button>
                <div className="pj-group-body">
                  <div className="pj-group-body-inner">
                    <ProjectList projects={g.items} tasks={tasks} withHead />
                  </div>
                </div>
              </section>
            )
          })
        ) : (
          <ProjectList projects={visible} tasks={tasks} withHead />
        )}
      </div>

      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreated={(id) => { setShowNewProject(false); window.location.href = `/project/${id}` }}
        />
      )}
    </div>
  )
}

function ProjectList({ projects, tasks, withHead }: { projects: ProjectRow[]; tasks: TaskRow[]; withHead?: boolean }) {
  return (
    <div>
      {withHead && (
        <div className="pj-head">
          <span />
          <span>Projekt</span>
          <span>Health</span>
          <span>Fortschritt</span>
          <span>Update</span>
          <span />
        </div>
      )}
      {projects.map(project => {
        const related = tasks.filter(t => t.project_id === project.id)
        const progress = projectProgress(project, related)
        const health = projectHealth(project, related)
        return (
          <Link key={project.id} href={`/project/${project.id}`} className="pj-row">
            <span className="pj-color" style={{ ['--pj-c' as string]: project.color || 'var(--border-strong)' }} />
            <span className="pj-name">
              <strong>{project.title}</strong>
              <small>{statusLabel(project)} · {related.length} {related.length === 1 ? 'Aufgabe' : 'Aufgaben'}</small>
            </span>
            <span className={`pj-health ${health.tone}`}>
              <span className="pj-health-dot" />
              <span>{health.label}</span>
            </span>
            <span className="pj-progress">
              <span className="pj-progress-bar"><span style={{ width: `${progress}%` }} /></span>
              <small>{progress}%</small>
            </span>
            <span className="pj-date">{dateLabel(project.updated_at || project.created_at)}</span>
            <CaretRight className="pj-caret" size={13} />
          </Link>
        )
      })}
    </div>
  )
}
