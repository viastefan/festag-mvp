'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  CheckCircle,
  Circle,
  Cube,
  FunnelSimple,
  SlidersHorizontal,
  X,
} from '@phosphor-icons/react'

type TaskView = 'all' | 'open' | 'active' | 'done'

type TaskRow = {
  id: string
  title: string
  status: string | null
  priority?: string | null
  project_id?: string | null
  assigned_to?: string | null
  owner?: string | null
  developer_name?: string | null
  updated_at?: string | null
  created_at?: string | null
}

type ProjectRow = {
  id: string
  title: string
  color?: string | null
}

const VIEWS: { id: TaskView; label: string }[] = [
  { id: 'all', label: 'Alle Aufgaben' },
  { id: 'open', label: 'Offen' },
  { id: 'active', label: 'In Arbeit' },
  { id: 'done', label: 'Erledigt' },
]

const DONE_STATES = new Set(['done', 'completed', 'erledigt'])
const ACTIVE_STATES = new Set(['doing', 'active', 'in_progress', 'review'])

function normalizeStatus(status?: string | null) {
  const value = (status || 'todo').toLowerCase()
  if (DONE_STATES.has(value)) return 'done'
  if (ACTIVE_STATES.has(value)) return 'active'
  return 'open'
}

function statusLabel(status?: string | null) {
  const normalized = normalizeStatus(status)
  if (normalized === 'done') return 'Erledigt'
  if (normalized === 'active') return 'Aktiv'
  return 'Offen'
}

function progressFor(status?: string | null) {
  const normalized = normalizeStatus(status)
  if (normalized === 'done') return 100
  if (normalized === 'active') return 55
  return 0
}

function healthLabel(task: TaskRow) {
  if (normalizeStatus(task.status) === 'done') return 'Vom Developer erledigt'
  if (normalizeStatus(task.status) === 'active') return 'In Umsetzung'
  return 'Wartet auf Start'
}

function priorityLabel(priority?: string | null) {
  if (!priority) return '---'
  if (priority === 'critical') return 'Kritisch'
  if (priority === 'high') return 'Hoch'
  if (priority === 'medium') return 'Mittel'
  if (priority === 'low') return 'Niedrig'
  return priority
}

function dateLabel(value?: string | null) {
  if (!value) return '---'
  try {
    return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short' }).format(new Date(value))
  } catch {
    return '---'
  }
}

export default function TasksPage() {
  const [view, setView] = useState<TaskView>('all')
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])

  const supabase = createClient()

  async function loadTasks() {
    setLoading(true)
    const [{ data: taskData }, { data: projectData }] = await Promise.all([
      (supabase as any).from('tasks').select('*').order('created_at', { ascending: false }).limit(80),
      (supabase as any).from('projects').select('id,title,color'),
    ])
    setTasks((taskData as TaskRow[]) ?? [])
    setProjects((projectData as ProjectRow[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadTasks()

    const channel = supabase
      .channel('client-tasks-overview')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        loadTasks()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const projectById = useMemo(() => {
    return new Map(projects.map((project) => [project.id, project]))
  }, [projects])

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (view === 'all') return true
      return normalizeStatus(task.status) === view
    })
  }, [tasks, view])

  const doneCount = tasks.filter((task) => normalizeStatus(task.status) === 'done').length
  const activeCount = tasks.filter((task) => normalizeStatus(task.status) === 'active').length
  const openCount = tasks.filter((task) => normalizeStatus(task.status) === 'open').length
  const selectedTasks = tasks.filter((task) => selectedTaskIds.includes(task.id))

  function toggleTaskSelection(id: string) {
    setSelectedTaskIds((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ))
  }

  function explainSelectedTask() {
    const task = selectedTasks[0]
    if (!task) return
    window.dispatchEvent(new CustomEvent('open-copilot'))
    window.dispatchEvent(new CustomEvent('tagro-compose', {
      detail: {
        prompt: `Erkläre mir diese Aufgabe aus dem Workspace-Kontext und sage mir, warum Tagro sie jetzt eingeplant hat: "${task.title}".`,
      },
    }))
  }

  async function markSelectedDone() {
    if (selectedTaskIds.length === 0) return
    const now = new Date().toISOString()
    setTasks((current) => current.map((task) => (
      selectedTaskIds.includes(task.id) ? { ...task, status: 'done', updated_at: now } : task
    )))
    await Promise.all(selectedTaskIds.map((id) => (
      (supabase as any).from('tasks').update({ status: 'done', updated_at: now }).eq('id', id)
    )))
    setSelectedTaskIds([])
  }

  return (
    <div className="task-os">
      <style>{`
        .task-os {
          width:100%;
          min-height:100%;
          color:var(--text);
        }
        .task-top {
          display:flex;
          align-items:center;
          justify-content:space-between;
          min-height:48px;
          border-bottom:1px solid var(--border);
          padding:0 4px 0 0;
        }
        .task-title {
          margin:0;
          font-size:15px;
          font-weight:650;
          letter-spacing:0;
        }
        .task-plus {
          width:28px;
          height:28px;
          border:0;
          background:transparent;
          color:var(--text-muted);
          cursor:pointer;
          border-radius:7px;
          font:inherit;
          font-size:20px;
          line-height:1;
        }
        .task-plus:hover { background:var(--surface-2); color:var(--text); }
        .task-toolbar {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          padding:12px 0 14px;
        }
        .task-filters {
          display:flex;
          align-items:center;
          gap:6px;
          min-width:0;
          overflow:auto;
        }
        .task-filter {
          height:30px;
          padding:0 10px;
          border:1px solid var(--border);
          border-radius:999px;
          background:transparent;
          color:var(--text-secondary);
          font:inherit;
          font-size:12.5px;
          font-weight:650;
          white-space:nowrap;
          cursor:pointer;
        }
        .task-filter.on {
          background:var(--surface-2);
          color:var(--text);
          border-color:var(--border);
        }
        .task-tools {
          display:flex;
          align-items:center;
          gap:8px;
          flex-shrink:0;
        }
        .task-tool {
          width:32px;
          height:32px;
          border:1px solid var(--border);
          border-radius:999px;
          background:var(--surface);
          color:var(--text-muted);
          display:flex;
          align-items:center;
          justify-content:center;
        }
        .task-table {
          width:100%;
          overflow:hidden;
        }
        .task-head,
        .task-row {
          display:grid;
          grid-template-columns:minmax(320px,1.6fr) minmax(150px,.95fr) 92px 110px 120px 72px 116px;
          align-items:center;
          gap:16px;
        }
        .task-head {
          min-height:34px;
          padding:0 10px;
          color:var(--text-muted);
          font-size:12.5px;
          font-weight:650;
          border-bottom:1px solid var(--border);
        }
        .task-row {
          min-height:52px;
          padding:0 10px;
          border-bottom:1px solid color-mix(in srgb, var(--border) 74%, transparent);
          color:var(--text-secondary);
          font-size:12.5px;
        }
        .task-row:hover {
          background:color-mix(in srgb, var(--surface-2) 58%, transparent);
        }
        .task-row.selected {
          background:rgba(99,102,241,.13);
        }
        [data-theme="dark"] .task-row.selected {
          background:rgba(99,102,241,.20);
        }
        .task-name {
          display:flex;
          align-items:center;
          gap:10px;
          min-width:0;
        }
        .task-check {
          width:16px;
          height:16px;
          border:1px solid var(--border-strong);
          border-radius:4px;
          flex-shrink:0;
          background:transparent;
          color:#fff;
          padding:0;
          display:flex;
          align-items:center;
          justify-content:center;
          cursor:pointer;
        }
        .task-check.selected {
          background:#676be8;
          border-color:#676be8;
        }
        .task-project-icon {
          width:20px;
          height:20px;
          display:flex;
          align-items:center;
          justify-content:center;
          color:var(--text-muted);
          flex-shrink:0;
        }
        .task-name-text {
          min-width:0;
        }
        .task-name-text strong {
          display:block;
          color:var(--text);
          font-size:13px;
          font-weight:650;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        }
        .task-name-text span {
          display:block;
          margin-top:2px;
          color:var(--text-muted);
          font-size:11.5px;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        }
        .task-health {
          display:flex;
          align-items:center;
          gap:7px;
          min-width:0;
          color:var(--text-muted);
          font-weight:600;
        }
        .task-health.done { color:var(--green); }
        .task-health.active { color:var(--amber); }
        .task-progress {
          display:flex;
          align-items:center;
          gap:8px;
          justify-content:flex-start;
          color:var(--text-secondary);
          font-weight:650;
        }
        .task-progress-dot {
          width:11px;
          height:11px;
          border-radius:50%;
          border:2px dotted var(--amber);
        }
        .task-progress-dot.done {
          border-style:solid;
          border-color:var(--green);
          background:var(--green);
        }
        .task-lead-avatar {
          width:22px;
          height:22px;
          border-radius:50%;
          display:flex;
          align-items:center;
          justify-content:center;
          background:var(--surface-2);
          border:1px solid var(--border);
          color:var(--text-secondary);
          font-size:10px;
          font-weight:800;
          flex-shrink:0;
        }
        .task-selection-bar {
          position:fixed;
          left:50%;
          bottom:28px;
          transform:translateX(-50%);
          z-index:120;
          display:flex;
          align-items:center;
          gap:8px;
          padding:8px;
          border-radius:999px;
          background:color-mix(in srgb, var(--surface) 86%, transparent);
          border:1px solid var(--border);
          box-shadow:0 18px 44px rgba(0,0,0,.18);
          backdrop-filter:blur(20px) saturate(160%);
          -webkit-backdrop-filter:blur(20px) saturate(160%);
          animation:taskActionUp .16s cubic-bezier(.16,1,.3,1) both;
        }
        @keyframes taskActionUp {
          from { opacity:0; transform:translateX(-50%) translateY(8px) scale(.98); }
          to { opacity:1; transform:translateX(-50%) translateY(0) scale(1); }
        }
        .task-selection-bar button,
        .task-selection-count {
          height:32px;
          border-radius:999px;
          border:1px solid var(--border);
          background:var(--surface-2);
          color:var(--text);
          font:inherit;
          font-size:12px;
          font-weight:700;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:0 12px;
          white-space:nowrap;
        }
        .task-selection-bar button {
          cursor:pointer;
        }
        .task-selection-bar button:hover {
          background:var(--nav-on);
        }
        .task-selection-close {
          width:32px;
          padding:0 !important;
          color:var(--text-muted) !important;
        }
        .task-selection-sep {
          width:1px;
          height:24px;
          background:var(--border);
        }
        .task-empty {
          padding:52px 12px;
          text-align:center;
          color:var(--text-muted);
          border-bottom:1px solid var(--border);
        }
        @media(max-width:1100px) {
          .task-table { overflow:auto; }
          .task-head,
          .task-row { min-width:1050px; }
        }
      `}</style>

      <div className="task-top">
        <h1 className="task-title">Aufgaben</h1>
        <button className="task-plus" type="button" aria-label="Neue Aufgabe">+</button>
      </div>

      <div className="task-toolbar">
        <div className="task-filters" role="tablist" aria-label="Aufgabenfilter">
          {VIEWS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`task-filter${view === item.id ? ' on' : ''}`}
              onClick={() => setView(item.id)}
            >
              {item.label}
            </button>
          ))}
          <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 650, paddingLeft: 4 }}>
            {openCount} offen · {activeCount} aktiv · {doneCount} erledigt
          </span>
        </div>
        <div className="task-tools" aria-hidden="true">
          <span className="task-tool"><FunnelSimple size={15} /></span>
          <span className="task-tool"><SlidersHorizontal size={15} /></span>
        </div>
      </div>

      <div className="task-table">
        <div className="task-head">
          <span>Name</span>
          <span>Developer Update</span>
          <span>Priority</span>
          <span>Lead</span>
          <span>Update date</span>
          <span>Issues</span>
          <span>Status</span>
        </div>

        {loading ? (
          <div className="task-empty">Lade Aufgaben…</div>
        ) : visibleTasks.length === 0 ? (
          <div className="task-empty">Keine Aufgaben in dieser Ansicht.</div>
        ) : visibleTasks.map((task) => {
          const project = task.project_id ? projectById.get(task.project_id) : null
          const normalized = normalizeStatus(task.status)
          const progress = progressFor(task.status)
          const lead = task.developer_name || task.owner || task.assigned_to || 'Developer'
          const selected = selectedTaskIds.includes(task.id)

          return (
            <div key={task.id} className={`task-row${selected ? ' selected' : ''}`}>
              <div className="task-name">
                <button
                  className={`task-check${selected ? ' selected' : ''}`}
                  type="button"
                  aria-label={`${task.title} auswählen`}
                  aria-pressed={selected}
                  onClick={() => toggleTaskSelection(task.id)}
                >
                  {selected ? <CheckCircle size={12} weight="bold" /> : null}
                </button>
                <span className="task-project-icon"><Cube size={16} weight="regular" /></span>
                <span className="task-name-text">
                  <strong>{task.title}</strong>
                  <span>{project?.title || 'Kein Projekt zugeordnet'}</span>
                </span>
              </div>

              <div className={`task-health ${normalized}`}>
                {normalized === 'done' ? <CheckCircle size={16} weight="fill" /> : <Circle size={16} weight="regular" />}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {healthLabel(task)}
                </span>
              </div>

              <div>{priorityLabel(task.priority)}</div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                <span className="task-lead-avatar">{lead.charAt(0).toUpperCase()}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead}</span>
              </div>

              <div>{dateLabel(task.updated_at || task.created_at)}</div>
              <div>0</div>

              <div className="task-progress">
                <span className={`task-progress-dot${normalized === 'done' ? ' done' : ''}`} />
                <span>{normalized === 'done' ? '100%' : `${progress}%`}</span>
              </div>
            </div>
          )
        })}
      </div>

      {selectedTaskIds.length > 0 && (
        <div className="task-selection-bar" role="toolbar" aria-label="Ausgewählte Aufgaben Aktionen">
          <span className="task-selection-count">{selectedTaskIds.length} selected</span>
          <button className="task-selection-close" type="button" aria-label="Auswahl aufheben" onClick={() => setSelectedTaskIds([])}>
            <X size={13} weight="bold" />
          </button>
          <span className="task-selection-sep" />
          <button type="button" onClick={explainSelectedTask}>Tagro erklären</button>
          <button type="button" onClick={markSelectedDone}>Als erledigt markieren</button>
        </div>
      )}
    </div>
  )
}
