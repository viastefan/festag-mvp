'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { devDisplayName, getStoredDevSession, type DevSession } from '@/lib/dev-session'
import { ArrowRight, CheckCircle, GitBranch, Lightning, WarningCircle } from '@phosphor-icons/react'

type Task = {
  id: string
  title: string
  status?: string | null
  priority?: string | null
  project_id?: string | null
  updated_at?: string | null
  projects?: { title?: string | null; status?: string | null; color?: string | null } | null
}

type Project = {
  id: string
  title: string
  status?: string | null
  description?: string | null
  color?: string | null
  assigned_dev?: string | null
}

function normalizeStatus(status?: string | null) {
  const value = String(status || 'todo').toLowerCase()
  if (['done', 'completed', 'delivered'].includes(value)) return 'done'
  if (['ready_review', 'ready_for_review', 'review', 'in_review'].includes(value)) return 'review'
  if (['blocked', 'waiting', 'needs_decision'].includes(value)) return 'blocked'
  if (['doing', 'active', 'in_progress'].includes(value)) return 'active'
  return 'open'
}

function statusLabel(status?: string | null) {
  const value = normalizeStatus(status)
  if (value === 'done') return 'Erledigt'
  if (value === 'review') return 'Bereit zur Prüfung'
  if (value === 'blocked') return 'Blockiert'
  if (value === 'active') return 'In Entwicklung'
  return 'Geplant'
}

function priorityLabel(priority?: string | null) {
  if (priority === 'critical') return 'Kritisch'
  if (priority === 'high') return 'Hoch'
  if (priority === 'low') return 'Niedrig'
  return 'Mittel'
}

function dateLabel(value?: string | null) {
  if (!value) return 'Noch kein Update'
  try {
    return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short' }).format(new Date(value))
  } catch {
    return 'Noch kein Update'
  }
}

export default function DevMissionControlPage() {
  const [session, setSession] = useState<DevSession | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  async function load() {
    const dev = getStoredDevSession()
    if (!dev) return
    setSession(dev)

    const [{ data: taskRows }, { data: projectRows }] = await Promise.all([
      (supabase as any)
        .from('tasks')
        .select('id,title,status,priority,project_id,updated_at,projects(title,status,color)')
        .eq('assigned_to', dev.user_id)
        .order('updated_at', { ascending: false })
        .limit(12),
      (supabase as any)
        .from('projects')
        .select('id,title,status,description,color,assigned_dev')
        .or(`assigned_dev.eq.${dev.user_id},status.eq.intake,status.eq.planning`)
        .order('created_at', { ascending: false })
        .limit(8),
    ])

    setTasks((taskRows as Task[]) ?? [])
    setProjects((projectRows as Project[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const metrics = useMemo(() => {
    const active = tasks.filter((task) => normalizeStatus(task.status) === 'active').length
    const review = tasks.filter((task) => normalizeStatus(task.status) === 'review').length
    const blocked = tasks.filter((task) => normalizeStatus(task.status) === 'blocked').length
    const done = tasks.filter((task) => normalizeStatus(task.status) === 'done').length
    return { active, review, blocked, done }
  }, [tasks])

  const focusTasks = tasks.filter((task) => normalizeStatus(task.status) !== 'done').slice(0, 6)
  const availableProjects = projects.filter((project) => !project.assigned_dev || project.assigned_dev === session?.user_id).slice(0, 4)

  async function acceptProject(projectId: string) {
    if (!session) return
    await supabase.from('projects').update({ assigned_dev: session.user_id, status: 'active' }).eq('id', projectId)
    await supabase.from('messages').insert({
      project_id: projectId,
      sender_id: session.user_id,
      message: 'Ein Developer hat die Umsetzung übernommen. Tagro übersetzt technische Fortschritte ab jetzt als verständliche Updates.',
      is_ai: true,
    }).catch(() => {})
    load()
  }

  return (
    <div className="dev-page">
      <header className="dev-page-header">
        <div>
          <p className="dev-eyebrow">Developer Workspace</p>
          <h1>Guten Tag, {devDisplayName(session)}.</h1>
          <p className="meta">{tasks.length} technische Tasks · {metrics.review} bereit zur Prüfung · Client Board verbunden</p>
        </div>
        <Link href="/dev/jobs" className="dev-primary-btn" style={{ display:'inline-flex', alignItems:'center', gap:8, textDecoration:'none' }}>
          Execution Board <ArrowRight size={15} />
        </Link>
      </header>

      <section className="dev-kpi-grid">
        <div className="dev-kpi dev-surface"><strong>{metrics.active}</strong><span>In Entwicklung</span></div>
        <div className="dev-kpi dev-surface"><strong>{metrics.review}</strong><span>Bereit zur Prüfung</span></div>
        <div className="dev-kpi dev-surface"><strong>{metrics.blocked}</strong><span>Blocker</span></div>
        <div className="dev-kpi dev-surface"><strong>{metrics.done}</strong><span>Erledigt</span></div>
      </section>

      <section className="dev-flow dev-surface">
        <div>
          <p className="dev-section-title">Client Connection</p>
          <h2>Dev-Arbeit bleibt technisch. Client-Updates bleiben verständlich.</h2>
          <p>Wenn du Fortschritt meldest, übersetzt Tagro deine Notiz in ein klares Client-Update und spiegelt es in Nachrichten, Projektstatus und später in Projektbriefings.</p>
        </div>
        <div className="flow-steps" aria-label="Festag Dev Client Connection">
          <span>Workspace Task</span>
          <ArrowRight size={14} />
          <span>Team Execution</span>
          <ArrowRight size={14} />
          <span>Tagro Update</span>
          <ArrowRight size={14} />
          <span>Client Board</span>
        </div>
      </section>

      <div className="dev-two-col">
        <section>
          <div className="dev-section-head">
            <p className="dev-section-title">Heute relevant</p>
            <Link href="/dev/tasks">Alle Tasks</Link>
          </div>

          <div className="dev-list">
            {loading ? (
              <p className="empty">Tasks werden geladen…</p>
            ) : focusTasks.length === 0 ? (
              <p className="empty">Keine offenen Developer Tasks. Sobald Tagro oder ein Lead etwas zuweist, erscheint es hier.</p>
            ) : focusTasks.map((task) => (
              <Link href="/dev/tasks" key={task.id} className="dev-row dev-task-row">
                <span className={`status-dot ${normalizeStatus(task.status)}`} />
                <div>
                  <strong>{task.title}</strong>
                  <small>{task.projects?.title || 'Kein Projekt'} · {dateLabel(task.updated_at)}</small>
                </div>
                <span className="dev-chip">{statusLabel(task.status)}</span>
                <span className="priority">{priorityLabel(task.priority)}</span>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div className="dev-section-head">
            <p className="dev-section-title">Projektzugriff</p>
            <Link href="/dev/jobs">Jobs öffnen</Link>
          </div>

          <div className="dev-list">
            {availableProjects.length === 0 ? (
              <p className="empty">Keine offenen Projekte im aktuellen Zugriff.</p>
            ) : availableProjects.map((project) => (
              <div className="dev-row dev-project-row" key={project.id}>
                <span className="project-color" style={{ background: project.color || '#22c55e' }} />
                <div>
                  <strong>{project.title}</strong>
                  <small>{project.description || 'Client-Projekt · bereit für strukturierte Umsetzung'}</small>
                </div>
                {project.assigned_dev === session?.user_id ? (
                  <span className="dev-chip"><CheckCircle size={13} /> Zugewiesen</span>
                ) : (
                  <button className="dev-secondary-btn" onClick={() => acceptProject(project.id)}>Übernehmen</button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      <style jsx>{`
        .dev-flow { padding:20px 22px; margin-bottom:30px; display:grid; grid-template-columns:minmax(0, 1fr) auto; gap:22px; align-items:center; }
        .dev-flow h2 { margin:0; font-size:21px; letter-spacing:-.035em; }
        .dev-flow p:not(.dev-section-title) { margin:8px 0 0; color:var(--text-muted); font-size:14px; line-height:1.55; max-width:700px; }
        .flow-steps { display:flex; align-items:center; gap:8px; color:var(--text-muted); font-size:11px; font-weight:750; white-space:nowrap; }
        .flow-steps span { min-height:26px; display:inline-flex; align-items:center; border:1px solid var(--border); border-radius:999px; padding:0 9px; background:var(--surface-2); color:var(--text-secondary); }
        .dev-two-col { display:grid; grid-template-columns:minmax(0, 1.05fr) minmax(320px, .95fr); gap:28px; }
        .dev-section-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
        .dev-section-head a { color:var(--text-muted); text-decoration:none; font-size:12px; font-weight:750; }
        .dev-list { display:flex; flex-direction:column; gap:6px; }
        .dev-task-row, .dev-project-row { grid-template-columns:14px minmax(0, 1fr) auto auto; text-decoration:none; color:var(--text); }
        .dev-project-row { grid-template-columns:14px minmax(0, 1fr) auto; }
        .dev-row strong { display:block; font-size:13.5px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
        .dev-row small { display:block; margin-top:3px; color:var(--text-muted); font-size:11.5px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
        .status-dot, .project-color { width:8px; height:8px; border-radius:50%; background:var(--text-muted); }
        .status-dot.active { background:#22c55e; }
        .status-dot.review { background:#f59e0b; }
        .status-dot.blocked { background:#ef4444; }
        .status-dot.done { background:#64748b; }
        .priority { color:var(--text-muted); font-size:12px; font-weight:700; }
        .empty { color:var(--text-muted); font-size:13px; line-height:1.55; padding:20px 2px; }
        @media (max-width: 1050px) { .dev-flow, .dev-two-col { grid-template-columns:1fr; } .flow-steps { flex-wrap:wrap; } }
      `}</style>
    </div>
  )
}
