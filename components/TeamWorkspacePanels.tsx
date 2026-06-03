'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowRight,
  Check,
  EnvelopeSimple,
  FolderSimple,
  ListChecks,
  MagnifyingGlass,
  NotePencil,
  Plus,
  UserPlus,
  X,
} from '@phosphor-icons/react'
import EmptyState from '@/components/EmptyState'

type TeamPanelMode = 'projects' | 'tasks' | 'reports'

type Profile = {
  id: string
  full_name: string | null
  first_name: string | null
  email: string | null
  role?: string | null
}

type ProjectRow = {
  id: string
  title: string
  color?: string | null
  status?: string | null
  user_id?: string | null
  updated_at?: string | null
  created_at?: string | null
}

type TaskRow = {
  id: string
  title: string
  status?: string | null
  dev_status?: string | null
  client_status?: string | null
  priority?: string | null
  project_id?: string | null
  assigned_to?: string | null
  updated_at?: string | null
  created_at?: string | null
}

type AssignmentRow = {
  project_id: string | null
  user_id: string | null
  role?: string | null
}

type InviteRow = {
  id: string
  email: string
  role?: string | null
  invited_name?: string | null
  status?: string | null
  created_at?: string | null
}

type ReportRow = {
  id: string
  title: string | null
  body: string | null
  kind: string | null
  project_id: string | null
  created_at: string | null
}

const TASK_DONE = new Set(['done', 'completed', 'erledigt', 'approved', 'approved_by_owner'])
const TASK_ACTIVE = new Set(['active', 'doing', 'in_progress', 'development', 'in_development'])
const TASK_REVIEW = new Set(['review', 'ready_for_review', 'in_review', 'verified', 'approved', 'finished_by_dev'])
const TASK_WAITING = new Set(['blocked', 'waiting', 'needs_decision', 'client_decision', 'waiting_for_client'])

const STATUS_FILTERS = [
  { id: 'all', label: 'Alle' },
  { id: 'open', label: 'Offen' },
  { id: 'active', label: 'In Arbeit' },
  { id: 'review', label: 'Prüfung' },
  { id: 'done', label: 'Erledigt' },
] as const

type TaskFilter = typeof STATUS_FILTERS[number]['id']

function nameOf(profile?: Profile | null) {
  if (!profile) return '—'
  return profile.full_name?.trim() || profile.first_name?.trim() || profile.email?.split('@')[0] || 'Teammitglied'
}

function roleLabel(role?: string | null) {
  if (!role) return 'Mitglied'
  if (role === 'project_owner' || role === 'owner') return 'Project Owner'
  if (role === 'developer' || role === 'dev') return 'Entwickler'
  if (role === 'designer') return 'Designer'
  if (role === 'reviewer') return 'Reviewer'
  if (role === 'client') return 'Client'
  return role
}

function taskStatus(task: TaskRow): TaskFilter {
  const raw = String(task.client_status || task.dev_status || task.status || 'open').toLowerCase()
  if (TASK_DONE.has(raw)) return 'done'
  if (TASK_REVIEW.has(raw)) return 'review'
  if (TASK_ACTIVE.has(raw)) return 'active'
  if (TASK_WAITING.has(raw)) return 'open'
  return 'open'
}

function statusLabel(task: TaskRow) {
  const state = taskStatus(task)
  if (state === 'done') return 'Erledigt'
  if (state === 'review') return 'In Prüfung'
  if (state === 'active') return 'In Arbeit'
  return 'Offen'
}

function dateLabel(value?: string | null) {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short' }).format(new Date(value))
  } catch {
    return '—'
  }
}

function projectTone(project: ProjectRow, tasks: TaskRow[]) {
  const related = tasks.filter(t => t.project_id === project.id)
  const open = related.filter(t => taskStatus(t) !== 'done').length
  const review = related.filter(t => taskStatus(t) === 'review').length
  const blocked = related.filter(t => {
    const raw = String(t.client_status || t.dev_status || t.status || '').toLowerCase()
    return TASK_WAITING.has(raw)
  }).length
  return { open, review, blocked }
}

export default function TeamWorkspacePanel({ mode }: { mode: TeamPanelMode }) {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [invites, setInvites] = useState<InviteRow[]>([])
  const [reports, setReports] = useState<ReportRow[]>([])
  const [query, setQuery] = useState('')
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all')
  const [inviteOpen, setInviteOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      window.location.href = '/login'
      return
    }

    const [{ data: projectData }, { data: taskData }, inviteRes, reportRes] = await Promise.all([
      (supabase as any).from('projects').select('id,title,color,status,user_id,updated_at,created_at').order('updated_at', { ascending: false }),
      (supabase as any).from('tasks').select('id,title,status,dev_status,client_status,priority,project_id,assigned_to,updated_at,created_at').order('updated_at', { ascending: false }).limit(700),
      (supabase as any).from('team_invites').select('id,email,role,invited_name,status,created_at').eq('status', 'pending').order('created_at', { ascending: false }).limit(50),
      (supabase as any).from('notifications').select('id,title,body,kind,type,project_id,created_at').order('created_at', { ascending: false }).limit(80),
    ])

    let assignmentData: AssignmentRow[] = []
    const assignmentsWithRole = await (supabase as any).from('project_assignments').select('project_id,user_id,role,active').eq('active', true)
    if (assignmentsWithRole.error) {
      const assignmentsPlain = await (supabase as any).from('project_assignments').select('project_id,user_id,active').eq('active', true)
      assignmentData = ((assignmentsPlain.data as AssignmentRow[] | null) ?? [])
    } else {
      assignmentData = ((assignmentsWithRole.data as AssignmentRow[] | null) ?? [])
    }

    const nextProjects = (projectData as ProjectRow[] | null) ?? []
    const nextTasks = (taskData as TaskRow[] | null) ?? []
    const profileIds = new Set<string>()
    profileIds.add(session.user.id)
    nextProjects.forEach(p => { if (p.user_id) profileIds.add(p.user_id) })
    nextTasks.forEach(t => { if (t.assigned_to) profileIds.add(t.assigned_to) })
    assignmentData.forEach(a => { if (a.user_id) profileIds.add(a.user_id) })

    let nextProfiles: Profile[] = []
    if (profileIds.size > 0) {
      const { data } = await (supabase as any)
        .from('profiles')
        .select('id,full_name,first_name,email,role')
        .in('id', Array.from(profileIds))
      nextProfiles = (data as Profile[] | null) ?? []
    }

    setProjects(nextProjects)
    setTasks(nextTasks)
    setAssignments(assignmentData)
    setProfiles(nextProfiles)
    setInvites((inviteRes.data as InviteRow[] | null) ?? [])
    setReports(((reportRes.data as any[] | null) ?? []).map(row => ({
      id: row.id,
      title: row.title ?? null,
      body: row.body ?? null,
      kind: row.kind ?? row.type ?? null,
      project_id: row.project_id ?? null,
      created_at: row.created_at ?? null,
    })))
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const profilesById = useMemo(() => new Map(profiles.map(p => [p.id, p])), [profiles])
  const projectsById = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects])

  const teamProjects = useMemo(() => {
    return projects.map(project => {
      const projectAssignments = assignments.filter(a => a.project_id === project.id)
      const owner =
        projectAssignments.find(a => ['owner', 'project_owner', 'admin'].includes(String(a.role || '').toLowerCase()))?.user_id ||
        project.user_id ||
        null
      const developers = projectAssignments
        .filter(a => ['developer', 'dev', 'designer', 'reviewer'].includes(String(a.role || '').toLowerCase()))
        .map(a => a.user_id)
        .filter(Boolean) as string[]
      const stats = projectTone(project, tasks)
      const coverage = !owner ? 'Owner fehlt' : developers.length === 0 && stats.open > 0 ? 'Entwickler fehlt' : stats.blocked > 0 ? `${stats.blocked} Blocker` : 'Besetzt'
      return { project, owner, developers, ...stats, coverage }
    })
  }, [projects, assignments, tasks])

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return teamProjects
    return teamProjects.filter(item => item.project.title.toLowerCase().includes(q))
  }, [teamProjects, query])

  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase()
    return tasks.filter(task => {
      if (taskFilter !== 'all' && taskStatus(task) !== taskFilter) return false
      if (!q) return true
      const project = task.project_id ? projectsById.get(task.project_id) : null
      return `${task.title} ${project?.title ?? ''}`.toLowerCase().includes(q)
    })
  }, [tasks, taskFilter, query, projectsById])

  const filteredReports = useMemo(() => {
    const q = query.trim().toLowerCase()
    const reportLike = reports.filter(r => /report|briefing|status|update|summary|bericht/i.test(`${r.kind ?? ''} ${r.title ?? ''} ${r.body ?? ''}`))
    if (!q) return reportLike
    return reportLike.filter(r => `${r.title ?? ''} ${r.body ?? ''} ${projectsById.get(r.project_id || '')?.title ?? ''}`.toLowerCase().includes(q))
  }, [reports, query, projectsById])

  const title = mode === 'projects' ? 'Team Projekte' : mode === 'tasks' ? 'Team Tasks' : 'Team Statusberichte'
  const subtitle = mode === 'projects'
    ? 'Alle Team-Projekte mit Ownern, Zuständigkeiten und offenen Aufgaben.'
    : mode === 'tasks'
      ? 'Alle Aufgaben im Team-Kontext, getrennt von deinen persönlichen Tasks.'
      : 'Schriftliche Team-Berichte und operative Updates aus dem Workspace.'

  return (
    <div className="tw-page">
      <header className="tw-head">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <button type="button" className="tw-plus" onClick={() => setInviteOpen(true)} aria-label="Teammitglied einladen" title="Teammitglied einladen">
          <Plus size={18} weight="regular" />
        </button>
      </header>

      <div className="tw-toolbar">
        <label className="tw-search">
          <MagnifyingGlass size={15} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={mode === 'projects' ? 'Projekt suchen…' : mode === 'tasks' ? 'Task suchen…' : 'Bericht suchen…'}
          />
        </label>
        {mode === 'tasks' && (
          <div className="tw-filter" aria-label="Task-Status filtern">
            {STATUS_FILTERS.map(filter => (
              <button key={filter.id} type="button" className={taskFilter === filter.id ? 'on' : ''} onClick={() => setTaskFilter(filter.id)}>
                {filter.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <main className="tw-body">
        {mode === 'projects' && (
          <section className="tw-table projects">
            <div className="tw-table-head">
              <span>Projekt</span>
              <span>Owner</span>
              <span>Team</span>
              <span>Tasks</span>
              <span>Status</span>
              <span />
            </div>
            {loading ? <LoadingRows /> : filteredProjects.length === 0 ? (
              <EmptyState icon={FolderSimple} title="Keine Team-Projekte" />
            ) : filteredProjects.map(item => {
              const owner = item.owner ? profilesById.get(item.owner) : null
              return (
                <Link key={item.project.id} href={`/project/${item.project.id}`} className="tw-row">
                  <span className="tw-project-cell">
                    <i style={{ borderColor: item.project.color || '#94a3b8' }} />
                    <span>
                      <strong>{item.project.title}</strong>
                      <small>{item.project.status || 'intake'} · {item.blocked} Blocker</small>
                    </span>
                  </span>
                  <span>{owner ? nameOf(owner) : '— nicht zugewiesen —'}</span>
                  <span>{item.developers.length === 0 ? 'keine' : item.developers.map(id => nameOf(profilesById.get(id))).slice(0, 2).join(', ')}</span>
                  <span>{item.open} offen</span>
                  <span><em className="tw-muted-pill">{item.coverage}</em></span>
                  <span className="tw-arrow"><ArrowRight size={14} /></span>
                </Link>
              )
            })}
          </section>
        )}

        {mode === 'tasks' && (
          <section className="tw-table tasks">
            <div className="tw-table-head">
              <span>Task</span>
              <span>Projekt</span>
              <span>Verantwortlich</span>
              <span>Status</span>
              <span>Update</span>
              <span />
            </div>
            {loading ? <LoadingRows /> : filteredTasks.length === 0 ? (
              <EmptyState icon={ListChecks} title="Keine Team-Tasks" />
            ) : filteredTasks.map(task => {
              const project = task.project_id ? projectsById.get(task.project_id) : null
              const assignee = task.assigned_to ? profilesById.get(task.assigned_to) : null
              return (
                <Link key={task.id} href={`/tasks/${task.id}`} className="tw-row">
                  <span className="tw-project-cell">
                    <i style={{ borderColor: project?.color || '#94a3b8' }} />
                    <span>
                      <strong>{task.title}</strong>
                      <small>{task.priority || 'Keine Priorität'}</small>
                    </span>
                  </span>
                  <span>{project?.title || '—'}</span>
                  <span>{assignee ? nameOf(assignee) : '— nicht zugewiesen —'}</span>
                  <span><em className="tw-muted-pill">{statusLabel(task)}</em></span>
                  <span>{dateLabel(task.updated_at || task.created_at)}</span>
                  <span className="tw-arrow"><ArrowRight size={14} /></span>
                </Link>
              )
            })}
          </section>
        )}

        {mode === 'reports' && (
          loading ? (
            <section className="tw-reports"><LoadingRows /></section>
          ) : filteredReports.length === 0 ? (
            <EmptyState icon={NotePencil} title="Noch keine Team-Statusberichte" />
          ) : (
            <section className="tw-reports">
              {filteredReports.map(report => {
                const project = report.project_id ? projectsById.get(report.project_id) : null
                return (
                  <article key={report.id} className="tw-report">
                    <span>{project?.title || 'Team'}</span>
                    <h2>{report.title || 'Statusbericht'}</h2>
                    <p>{report.body || 'Kein Text hinterlegt.'}</p>
                    <small>{dateLabel(report.created_at)}</small>
                  </article>
                )
              })}
            </section>
          )
        )}
      </main>

      {inviteOpen && (
        <TeamInviteModal
          projects={projects}
          onClose={() => setInviteOpen(false)}
          onSent={() => {
            setInviteOpen(false)
            load()
          }}
        />
      )}

      <style jsx global>{`
        .tw-page {
          width:100%;
          height:100%;
          min-height:0;
          display:flex;
          flex-direction:column;
          overflow:hidden;
          padding:0;
          color:var(--text);
          background:transparent;
          font-family:var(--font-aeonik, 'Aeonik', Inter, sans-serif);
        }
        .tw-head {
          height:82px;
          flex:0 0 auto;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:20px;
          padding:0 28px;
          border-bottom:1px solid var(--border);
        }
        .tw-head h1 {
          margin:0;
          font-size:18px;
          line-height:1.2;
          font-weight:650;
          letter-spacing:-.02em;
        }
        .tw-head p {
          margin:6px 0 0;
          color:var(--text-secondary);
          font-size:13px;
          font-weight:500;
          letter-spacing:.008em;
        }
        .tw-plus {
          width:38px;
          height:38px;
          border-radius:999px;
          border:1px solid var(--border);
          color:var(--text);
          background:var(--surface);
          display:inline-flex;
          align-items:center;
          justify-content:center;
          cursor:pointer;
          box-shadow:0 10px 24px rgba(15,23,42,.05);
          transition:background .14s ease, transform .14s ease, border-color .14s ease;
        }
        .tw-plus:hover {
          background:var(--surface-2);
          border-color:color-mix(in srgb, var(--text) 14%, var(--border));
          transform:translateY(-1px);
        }
        .tw-toolbar {
          flex:0 0 auto;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:18px;
          padding:18px 28px 14px;
        }
        .tw-search {
          width:min(420px, 100%);
          height:38px;
          display:flex;
          align-items:center;
          gap:9px;
          padding:0 13px;
          border-radius:999px;
          background:var(--surface);
          border:1px solid var(--border);
          color:var(--text-muted);
        }
        .tw-search input {
          width:100%;
          border:0;
          outline:0;
          background:transparent;
          color:var(--text);
          font:inherit;
          font-size:13px;
          font-weight:500;
        }
        .tw-filter {
          display:flex;
          gap:6px;
          padding:4px;
          border-radius:999px;
          background:color-mix(in srgb, var(--surface-2) 72%, transparent);
        }
        .tw-filter button {
          border:0;
          background:transparent;
          height:30px;
          padding:0 12px;
          border-radius:999px;
          color:var(--text-secondary);
          font:inherit;
          font-size:12px;
          font-weight:650;
          cursor:pointer;
        }
        .tw-filter button:hover,
        .tw-filter button.on {
          color:var(--text);
          background:var(--surface);
          box-shadow:0 6px 16px rgba(15,23,42,.05);
        }
        .tw-body {
          flex:1 1 auto;
          min-height:0;
          overflow:auto;
          padding:0 28px 72px;
        }
        .tw-table {
          width:100%;
          min-width:860px;
        }
        .tw-table-head,
        .tw-row {
          display:grid;
          align-items:center;
          column-gap:18px;
          min-height:58px;
        }
        .tw-table.projects .tw-table-head,
        .tw-table.projects .tw-row {
          grid-template-columns:minmax(260px, 1.6fr) minmax(160px, .9fr) minmax(180px, 1fr) 90px 130px 28px;
        }
        .tw-table.tasks .tw-table-head,
        .tw-table.tasks .tw-row {
          grid-template-columns:minmax(280px, 1.6fr) minmax(180px, 1fr) minmax(160px, .9fr) 120px 90px 28px;
        }
        .tw-table-head {
          min-height:44px;
          color:var(--text-secondary);
          font-size:11px;
          text-transform:uppercase;
          letter-spacing:.035em;
          font-weight:750;
        }
        .tw-row {
          text-decoration:none;
          color:var(--text);
          border-radius:0;
          border-top:1px solid color-mix(in srgb, var(--border) 60%, transparent);
          font-size:13px;
          font-weight:560;
          transition:background .12s ease;
        }
        .tw-row:hover {
          background:color-mix(in srgb, var(--surface-2) 58%, transparent);
        }
        .tw-row span {
          min-width:0;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        }
        .tw-project-cell {
          display:flex;
          align-items:center;
          gap:13px;
        }
        .tw-project-cell i {
          width:10px;
          height:10px;
          border-radius:999px;
          border:2px solid #94a3b8;
          box-sizing:border-box;
          flex:0 0 auto;
        }
        .tw-project-cell strong {
          display:block;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
          font-weight:650;
        }
        .tw-project-cell small {
          display:block;
          margin-top:2px;
          color:var(--text-secondary);
          font-size:12px;
          font-weight:560;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        }
        .tw-muted-pill {
          display:inline-flex;
          max-width:100%;
          align-items:center;
          justify-content:center;
          min-height:24px;
          padding:0 12px;
          border-radius:999px;
          background:color-mix(in srgb, var(--surface-2) 78%, transparent);
          color:var(--text-secondary);
          font-style:normal;
          font-size:11px;
          font-weight:750;
          letter-spacing:.02em;
        }
        .tw-arrow {
          display:flex;
          justify-content:flex-end;
          color:var(--text-secondary);
        }
        .tw-reports {
          display:grid;
          grid-template-columns:repeat(3, minmax(0, 1fr));
          gap:14px;
        }
        .tw-report {
          min-height:176px;
          border-radius:18px;
          background:var(--surface);
          border:1px solid var(--border);
          padding:18px;
        }
        .tw-report span,
        .tw-report small {
          color:var(--text-secondary);
          font-size:11px;
          font-weight:750;
          letter-spacing:.04em;
          text-transform:uppercase;
        }
        .tw-report h2 {
          margin:14px 0 8px;
          font-size:17px;
          letter-spacing:-.02em;
        }
        .tw-report p {
          margin:0 0 18px;
          color:var(--text-secondary);
          font-size:13px;
          line-height:1.55;
          font-weight:520;
        }
        .tw-empty {
          min-height:280px;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          text-align:center;
          color:var(--text-secondary);
        }
        .tw-empty h2 {
          margin:0;
          color:var(--text);
          font-size:18px;
          letter-spacing:-.015em;
        }
        .tw-empty p {
          max-width:430px;
          margin:8px auto 0;
          font-size:13px;
          line-height:1.6;
          font-weight:520;
        }
        .tw-skeleton {
          height:62px;
          border-top:1px solid color-mix(in srgb, var(--border) 60%, transparent);
          background:linear-gradient(90deg, transparent, color-mix(in srgb, var(--surface-2) 58%, transparent), transparent);
          background-size:200% 100%;
          animation:tw-shimmer 1.2s linear infinite;
        }
        @keyframes tw-shimmer { from { background-position:200% 0; } to { background-position:-200% 0; } }
        @media(max-width:980px) {
          .tw-head { padding:0 18px; height:auto; min-height:78px; }
          .tw-toolbar { padding:14px 18px; flex-direction:column; align-items:stretch; }
          .tw-body { padding:0 18px 96px; }
          .tw-table { min-width:0; display:flex; flex-direction:column; gap:10px; }
          .tw-table-head { display:none; }
          .tw-row {
            display:flex;
            flex-direction:column;
            align-items:flex-start;
            gap:7px;
            min-height:0;
            padding:14px;
            border:1px solid var(--border);
            border-radius:16px;
            background:var(--surface);
          }
          .tw-arrow { display:none; }
          .tw-reports { grid-template-columns:1fr; }
        }
      `}</style>
    </div>
  )
}

function LoadingRows() {
  return (
    <>
      <div className="tw-skeleton" />
      <div className="tw-skeleton" />
      <div className="tw-skeleton" />
      <div className="tw-skeleton" />
    </>
  )
}

function TeamInviteModal({
  projects,
  onClose,
  onSent,
}: {
  projects: ProjectRow[]
  onClose: () => void
  onSent: () => void
}) {
  const supabase = useMemo(() => createClient(), [])
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('collaborator')
  const [projectId, setProjectId] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function submit() {
    const trimmed = email.trim().toLowerCase()
    setError('')
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
      setError('Bitte eine gültige E-Mail-Adresse eingeben.')
      return
    }
    setSending(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const res = await fetch('/api/invites/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmed,
          role,
          name: name.trim() || undefined,
          projectId: projectId || undefined,
          fromUserId: user?.id ?? null,
          fromUserEmail: user?.email ?? null,
          accessMode: 'team',
        }),
      })
      if (!res.ok) {
        setError('Einladung konnte nicht gesendet werden.')
        return
      }
      setSent(true)
      window.setTimeout(onSent, 900)
    } catch {
      setError('Netzwerkfehler. Bitte noch einmal versuchen.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="ti-layer" role="dialog" aria-modal="true" aria-label="Teammitglied einladen">
      <button type="button" className="ti-backdrop" aria-label="Schließen" onClick={onClose} />
      <section className="ti-panel">
        <header className="ti-head">
          <span className="ti-icon"><UserPlus size={18} /></span>
          <div>
            <h2>{sent ? 'Einladung gesendet' : 'Teammitglied einladen'}</h2>
            <p>{sent ? 'Die Person erhält den Link per E-Mail.' : 'Einladungslink erstellen und versenden.'}</p>
          </div>
          <button type="button" className="ti-close" onClick={onClose} aria-label="Schließen"><X size={15} /></button>
        </header>

        {sent ? (
          <div className="ti-success">
            <Check size={18} />
            <p>Einladung wurde vorbereitet.</p>
          </div>
        ) : (
          <div className="ti-body">
            <label>
              <span>E-Mail</span>
              <input type="email" autoFocus value={email} onChange={e => setEmail(e.target.value)} placeholder="person@firma.de" />
            </label>
            <label>
              <span>Name optional</span>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Max Schneider" />
            </label>
            <label>
              <span>Rolle</span>
              <select value={role} onChange={e => setRole(e.target.value)}>
                <option value="collaborator">Mitarbeitende:r</option>
                <option value="project_owner">Project Owner</option>
                <option value="developer">Entwickler:in</option>
                <option value="designer">Designer:in</option>
                <option value="reviewer">Reviewer</option>
                <option value="client">Client</option>
              </select>
            </label>
            <label>
              <span>Projekt optional</span>
              <select value={projectId} onChange={e => setProjectId(e.target.value)}>
                <option value="">Workspace allgemein</option>
                {projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}
              </select>
            </label>
            {error && <p className="ti-error">{error}</p>}
          </div>
        )}

        {!sent && (
          <footer className="ti-foot">
            <button type="button" onClick={onClose} disabled={sending}>Abbrechen</button>
            <button type="button" onClick={submit} disabled={sending || !email.trim()}>
              <EnvelopeSimple size={13} />
              {sending ? 'Wird gesendet…' : 'Einladung senden'}
            </button>
          </footer>
        )}
      </section>

      <style jsx>{`
        .ti-layer {
          position:fixed;
          inset:0;
          z-index:90;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:24px;
        }
        .ti-backdrop {
          position:absolute;
          inset:0;
          border:0;
          background:rgba(15,23,42,.18);
          cursor:default;
        }
        [data-theme="dark"] .ti-backdrop,
        [data-theme="classic-dark"] .ti-backdrop,
        [data-theme="read"] .ti-backdrop { background:rgba(0,0,0,.42); }
        .ti-panel {
          position:relative;
          width:min(520px, 100%);
          border-radius:24px;
          background:var(--surface);
          border:1px solid var(--border);
          box-shadow:0 28px 90px rgba(15,23,42,.18);
          overflow:hidden;
          color:var(--text);
          font-family:var(--font-aeonik, 'Aeonik', Inter, sans-serif);
        }
        .ti-head {
          display:flex;
          align-items:center;
          gap:14px;
          padding:22px 22px 18px;
        }
        .ti-icon {
          width:38px;
          height:38px;
          border-radius:14px;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          background:var(--surface-2);
          color:var(--text-secondary);
          flex:0 0 auto;
        }
        .ti-head h2 {
          margin:0;
          font-size:20px;
          letter-spacing:-.025em;
        }
        .ti-head p {
          margin:4px 0 0;
          color:var(--text-secondary);
          font-size:13px;
          font-weight:520;
        }
        .ti-close {
          margin-left:auto;
          width:32px;
          height:32px;
          border:0;
          border-radius:10px;
          background:transparent;
          color:var(--text-secondary);
          cursor:pointer;
        }
        .ti-close:hover { background:var(--surface-2); color:var(--text); }
        .ti-body {
          display:grid;
          gap:12px;
          padding:0 22px 18px;
        }
        .ti-body label {
          display:grid;
          gap:6px;
          color:var(--text-secondary);
          font-size:11px;
          font-weight:760;
          letter-spacing:.035em;
          text-transform:uppercase;
        }
        .ti-body input,
        .ti-body select {
          width:100%;
          height:42px;
          border-radius:13px;
          border:1px solid var(--border);
          background:var(--surface);
          color:var(--text);
          padding:0 12px;
          font:inherit;
          font-size:14px;
          font-weight:540;
          outline:none;
        }
        .ti-body input:focus,
        .ti-body select:focus {
          border-color:color-mix(in srgb, var(--text) 22%, var(--border));
          box-shadow:0 0 0 3px color-mix(in srgb, var(--text) 7%, transparent);
        }
        .ti-error {
          margin:0;
          color:var(--red, #b42318);
          font-size:13px;
          font-weight:560;
        }
        .ti-foot {
          display:flex;
          justify-content:flex-end;
          gap:8px;
          padding:16px 22px 22px;
          border-top:1px solid var(--border);
        }
        .ti-foot button {
          height:38px;
          border-radius:999px;
          border:1px solid var(--border);
          background:var(--surface);
          color:var(--text);
          padding:0 15px;
          font:inherit;
          font-size:13px;
          font-weight:660;
          cursor:pointer;
          display:inline-flex;
          align-items:center;
          gap:7px;
        }
        .ti-foot button:hover:not(:disabled) { background:var(--surface-2); }
        .ti-foot button:disabled { opacity:.45; cursor:not-allowed; }
        .ti-success {
          padding:26px 22px 34px;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:10px;
          color:var(--text-secondary);
          font-weight:620;
        }
      `}</style>
    </div>
  )
}
