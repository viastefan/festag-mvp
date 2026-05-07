'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Cube,
  FunnelSimple,
  SlidersHorizontal,
  Columns,
  Plus,
} from '@phosphor-icons/react'

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

const STATUS_LABEL: Record<string, string> = {
  intake: 'Intake',
  planning: 'Planung',
  active: 'In Arbeit',
  testing: 'Testing',
  done: 'Erledigt',
  completed: 'Erledigt',
}

function normalizeStatus(status?: string | null) {
  const value = (status || 'intake').toLowerCase()
  if (DONE_STATES.has(value)) return 'done'
  if (ACTIVE_STATES.has(value)) return 'active'
  return 'open'
}

function projectProgress(project: ProjectRow, tasks: TaskRow[]) {
  const related = tasks.filter((task) => task.project_id === project.id)
  if (related.length > 0) {
    const done = related.filter((task) => normalizeStatus(task.status) === 'done').length
    return Math.round((done / related.length) * 100)
  }

  const status = (project.status || '').toLowerCase()
  if (status === 'done' || status === 'completed') return 100
  if (status === 'testing') return 84
  if (status === 'active') return 58
  if (status === 'planning') return 28
  return 10
}

function projectHealth(project: ProjectRow, tasks: TaskRow[]) {
  const related = tasks.filter((task) => task.project_id === project.id)
  const blocked = related.some((task) => (task.status || '').toLowerCase() === 'blocked')
  if (blocked) return 'Blocker prüfen'
  const progress = projectProgress(project, related)
  if (progress >= 100) return 'Delivery abgeschlossen'
  if (progress > 0) return 'Tagro Fortschritt aktiv'
  return 'Noch keine Updates'
}

function projectPriority(project: ProjectRow, tasks: TaskRow[]) {
  const related = tasks.filter((task) => task.project_id === project.id)
  if (related.some((task) => task.priority === 'critical')) return 'Kritisch'
  if (related.some((task) => task.priority === 'high')) return 'Hoch'
  if ((project.status || '').toLowerCase() === 'active') return 'Mittel'
  return '---'
}

function statusLabel(project: ProjectRow) {
  const raw = (project.status || 'intake').toLowerCase()
  return STATUS_LABEL[raw] || project.status || 'Intake'
}

function targetDate(project: ProjectRow) {
  const value = project.updated_at || project.created_at
  if (!value) return '---'
  try {
    return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short' }).format(new Date(value))
  } catch {
    return '---'
  }
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  async function loadProjects() {
    setLoading(true)
    const { data: session } = await supabase.auth.getSession()
    if (!session.session) {
      window.location.href = '/login'
      return
    }

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

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const activeProject = useMemo(() => {
    const order: Record<string, number> = { active: 0, testing: 1, planning: 2, intake: 3, done: 4, completed: 4 }
    return [...projects].sort((a, b) => (order[(a.status || '').toLowerCase()] ?? 9) - (order[(b.status || '').toLowerCase()] ?? 9))[0] || null
  }, [projects])

  return (
    <div className="projects-os">
      <style>{`
        .projects-os {
          width:100%;
          min-height:100%;
          color:var(--text);
        }
        .projects-top {
          display:flex;
          align-items:center;
          justify-content:space-between;
          min-height:48px;
          border-bottom:1px solid var(--border);
          padding:0 4px 0 0;
        }
        .projects-title {
          margin:0;
          font-size:15px;
          font-weight:650;
          letter-spacing:0;
        }
        .projects-plus {
          width:28px;
          height:28px;
          border:0;
          border-radius:7px;
          background:transparent;
          color:var(--text-muted);
          display:flex;
          align-items:center;
          justify-content:center;
          cursor:pointer;
        }
        .projects-plus:hover { background:var(--surface-2); color:var(--text); }
        .projects-toolbar {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          padding:12px 0 14px;
        }
        .projects-filter {
          height:30px;
          padding:0 11px;
          border:1px solid var(--border);
          border-radius:999px;
          background:var(--surface-2);
          color:var(--text);
          font:inherit;
          font-size:12.5px;
          font-weight:650;
          white-space:nowrap;
        }
        .projects-tools {
          display:flex;
          align-items:center;
          gap:8px;
        }
        .projects-tool {
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
        .projects-table {
          width:100%;
          overflow:hidden;
        }
        .projects-head,
        .projects-row {
          display:grid;
          grid-template-columns:minmax(340px,1.8fr) minmax(170px,.9fr) 100px 100px 120px 80px 110px;
          align-items:center;
          gap:18px;
        }
        .projects-head {
          min-height:34px;
          padding:0 10px;
          color:var(--text-muted);
          font-size:12.5px;
          font-weight:650;
          border-bottom:1px solid var(--border);
        }
        .projects-row {
          min-height:52px;
          padding:0 10px;
          border-bottom:1px solid color-mix(in srgb, var(--border) 74%, transparent);
          color:var(--text-secondary);
          font-size:12.5px;
          text-decoration:none;
        }
        .projects-row:hover {
          background:var(--surface-2);
          color:var(--text);
        }
        .projects-name {
          display:flex;
          align-items:center;
          gap:10px;
          min-width:0;
          color:var(--text);
          font-size:13px;
          font-weight:650;
        }
        .projects-color {
          width:12px;
          height:12px;
          border-radius:4px;
          border:2px solid var(--project-color, var(--border-strong));
          flex:0 0 auto;
        }
        .projects-name span:last-child {
          min-width:0;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        }
        .projects-health {
          display:flex;
          align-items:center;
          gap:8px;
          min-width:0;
          color:var(--text-muted);
          font-weight:600;
        }
        .projects-health i {
          width:14px;
          height:14px;
          border:1.5px dashed var(--border-strong);
          border-radius:999px;
          flex:0 0 auto;
        }
        .projects-lead {
          width:24px;
          height:24px;
          border-radius:999px;
          background:var(--surface-2);
          border:1px solid var(--border);
          display:flex;
          align-items:center;
          justify-content:center;
          color:var(--text-muted);
          font-size:11px;
          font-weight:750;
        }
        .projects-status {
          display:flex;
          align-items:center;
          gap:7px;
          color:var(--text-muted);
          font-weight:650;
        }
        .projects-status i {
          width:12px;
          height:12px;
          border-radius:999px;
          border:2px dotted #f59e0b;
          flex:0 0 auto;
        }
        .projects-empty {
          min-height:360px;
          display:flex;
          align-items:center;
          justify-content:center;
          text-align:center;
          color:var(--text-muted);
          border-bottom:1px solid var(--border);
        }
        .projects-empty strong {
          display:block;
          color:var(--text);
          margin-bottom:4px;
          font-size:13px;
        }
        @media (max-width: 980px) {
          .projects-head,
          .projects-row {
            grid-template-columns:minmax(220px,1fr) 120px 84px 90px;
          }
          .projects-head > :nth-child(n+5),
          .projects-row > :nth-child(n+5) {
            display:none;
          }
        }
      `}</style>

      <div className="projects-top">
        <h1 className="projects-title">Projekte</h1>
        <Link className="projects-plus" href="/onboarding" aria-label="Neues Projekt erstellen">
          <Plus size={18} weight="regular" />
        </Link>
      </div>

      <div className="projects-toolbar">
        <button className="projects-filter" type="button">Alle Projekte</button>
        <div className="projects-tools" aria-hidden="true">
          <span className="projects-tool"><FunnelSimple size={16} /></span>
          <span className="projects-tool"><SlidersHorizontal size={16} /></span>
          <span className="projects-tool"><Columns size={16} /></span>
        </div>
      </div>

      <div className="projects-table">
        <div className="projects-head">
          <span>Name</span>
          <span>Health</span>
          <span>Priority</span>
          <span>Lead</span>
          <span>Target date</span>
          <span>Issues</span>
          <span>Status</span>
        </div>

        {loading ? (
          <div className="projects-empty">
            <div>
              <strong>Projekte werden geladen</strong>
              <span>Tagro synchronisiert deinen Workspace-Kontext.</span>
            </div>
          </div>
        ) : projects.length === 0 ? (
          <div className="projects-empty">
            <div>
              <strong>Noch kein Projekt</strong>
              <span>Erstelle ein Projekt, damit Tagro Roadmap und Aufgaben vorbereiten kann.</span>
            </div>
          </div>
        ) : projects.map((project) => {
          const related = tasks.filter((task) => task.project_id === project.id)
          const progress = projectProgress(project, related)
          const isActive = activeProject?.id === project.id
          return (
            <Link key={project.id} href={`/project/${project.id}`} className="projects-row">
              <div className="projects-name">
                <span className="projects-color" style={{ ['--project-color' as string]: project.color || 'var(--border-strong)' }} />
                <Cube size={15} weight={isActive ? 'bold' : 'regular'} color="var(--text-muted)" />
                <span>{project.title}</span>
              </div>
              <div className="projects-health">
                <i />
                <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{projectHealth(project, related)}</span>
              </div>
              <div>{projectPriority(project, related)}</div>
              <div><span className="projects-lead">TG</span></div>
              <div>{targetDate(project)}</div>
              <div>{related.length}</div>
              <div className="projects-status">
                <i />
                <span>{progress}%</span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
