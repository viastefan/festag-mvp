'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowsClockwise,
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
import PortalPageHeader from '@/components/portal/PortalPageHeader'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import TeamSubNav from '@/components/teams/TeamSubNav'
import TeamProjectCardRow from '@/components/teams/TeamProjectCardRow'
import TeamTaskCardRow from '@/components/teams/TeamTaskCardRow'
import TeamReportCardRow from '@/components/teams/TeamReportCardRow'
import { DECISION_CSS } from '@/components/decisions/decisions-styles'
import { ACTIVITY_CSS } from '@/components/activity/activity-styles'
import { TEAMS_CSS } from '@/components/teams/teams-styles'
import {
  clientStatusLabelDe,
  clientViewBucket,
  resolveClientVisibleStatus,
} from '@/lib/tasks/client-view'

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
  client_visible_status?: string | null
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
  const bucket = clientViewBucket(resolveClientVisibleStatus(task))
  if (bucket === 'decision') return 'open'
  return bucket
}

function statusLabel(task: TaskRow) {
  return clientStatusLabelDe(resolveClientVisibleStatus(task))
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
  const [navOpen, setNavOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    let { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      // Hydration race — this route is middleware-gated, so retry once
      // before bouncing to /login (avoids the flash the user reported).
      await new Promise((r) => setTimeout(r, 400))
      session = (await supabase.auth.getSession()).data.session
    }
    if (!session) {
      window.location.href = '/login'
      return
    }

    const [{ data: projectData }, taskApiRes, inviteRes, reportRes] = await Promise.all([
      (supabase as any).from('projects').select('id,title,color,status,user_id,updated_at,created_at').order('updated_at', { ascending: false }),
      fetch('/api/client/tasks').then(r => r.json()).catch(() => ({ tasks: [] })),
      (supabase as any).from('team_invites').select('id,email,role,invited_name,status,created_at').eq('status', 'pending').order('created_at', { ascending: false }).limit(50),
      (supabase as any).from('notifications').select('id,title,body,kind,type,project_id,created_at').order('created_at', { ascending: false }).limit(80),
    ])

    // The role lives in `role_on_project` (not `role`) — reading the wrong
    // column silently dropped every developer from the client-side Team view,
    // so projects always looked like "Entwickler fehlt" even after a dev joined.
    let assignmentData: AssignmentRow[] = []
    const assignmentsWithRole = await (supabase as any)
      .from('project_assignments')
      .select('project_id,user_id,role:role_on_project,active')
      .eq('active', true)
    if (assignmentsWithRole.error) {
      const assignmentsPlain = await (supabase as any).from('project_assignments').select('project_id,user_id,active').eq('active', true)
      assignmentData = ((assignmentsPlain.data as AssignmentRow[] | null) ?? [])
    } else {
      assignmentData = ((assignmentsWithRole.data as AssignmentRow[] | null) ?? [])
    }

    const nextProjects = (projectData as ProjectRow[] | null) ?? []
    const nextTasks = (taskApiRes.tasks as TaskRow[] | null) ?? []
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

  const pageMeta = useMemo(() => {
    if (mode === 'projects') {
      return {
        title: 'Projekte',
        lead: 'Alle Projekte mit Owner, Team und offenen Aufgaben im Überblick.',
        subnav: 'projects' as const,
        searchPlaceholder: 'Projekt suchen…',
      }
    }
    if (mode === 'tasks') {
      return {
        title: 'Aufgaben',
        lead: 'Aufgaben im Team-Kontext — wer arbeitet woran, getrennt von persönlichen Tasks.',
        subnav: 'tasks' as const,
        searchPlaceholder: 'Aufgabe suchen…',
      }
    }
    return {
      title: 'Berichte',
      lead: 'Schriftliche Team-Updates und operative Berichte aus dem Workspace.',
      subnav: 'reports' as const,
      searchPlaceholder: 'Bericht suchen…',
    }
  }, [mode])

  return (
    <div className="dec-os">
      <style>{DECISION_CSS}</style>
      <style>{ACTIVITY_CSS}</style>
      <style>{TEAMS_CSS}</style>

      <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="dec-m-shell">
        <div className="dec-static-top">
          <PortalPageHeader
            title={pageMeta.title}
            lead={pageMeta.lead}
            onMenu={() => setNavOpen(true)}
            mobileMenuItems={[
              { id: 'refresh', label: 'Aktualisieren', onClick: () => void load() },
              { id: 'invite', label: 'Mitglied einladen', onClick: () => setInviteOpen(true) },
            ]}
            actions={(
              <>
                <button
                  type="button"
                  className="dec-head-tool"
                  title="Mitglied einladen"
                  aria-label="Mitglied einladen"
                  onClick={() => setInviteOpen(true)}
                >
                  <Plus size={15} weight="bold" />
                </button>
                <button type="button" className="dec-head-tool" onClick={() => void load()} aria-label="Aktualisieren">
                  <ArrowsClockwise size={15} />
                </button>
              </>
            )}
          />

          <TeamSubNav active={pageMeta.subnav} />

          <div className="team-toolbar dec-dt">
            <label className="team-search">
              <MagnifyingGlass size={15} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={pageMeta.searchPlaceholder}
              />
            </label>
            {mode === 'tasks' && (
              <div className="act-filters">
                {STATUS_FILTERS.map(filter => (
                  <button
                    key={filter.id}
                    type="button"
                    className={`act-filter${taskFilter === filter.id ? ' on' : ''}`}
                    onClick={() => setTaskFilter(filter.id)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="dec-scroll-body">
          {mode === 'projects' && (
            loading ? (
              <p className="dec-empty">Lade Team-Projekte…</p>
            ) : filteredProjects.length === 0 ? (
              <EmptyState icon={FolderSimple} title="Keine Team-Projekte" />
            ) : filteredProjects.map((item, i) => {
              const owner = item.owner ? profilesById.get(item.owner) : null
              const teamLabel = item.developers.length === 0
                ? 'keine Developer'
                : item.developers.map(id => nameOf(profilesById.get(id))).slice(0, 3).join(', ')
              return (
                <TeamProjectCardRow
                  key={item.project.id}
                  project={item.project}
                  ownerName={owner ? nameOf(owner) : '— nicht zugewiesen —'}
                  teamLabel={teamLabel}
                  openCount={item.open}
                  coverage={item.coverage}
                  blocked={item.blocked}
                  isLast={i === filteredProjects.length - 1}
                />
              )
            })
          )}

          {mode === 'tasks' && (
            loading ? (
              <p className="dec-empty">Lade Team-Aufgaben…</p>
            ) : filteredTasks.length === 0 ? (
              <EmptyState icon={ListChecks} title="Keine Team-Tasks" />
            ) : filteredTasks.map((task, i) => {
              const project = task.project_id ? projectsById.get(task.project_id) : null
              const assignee = task.assigned_to ? profilesById.get(task.assigned_to) : null
              return (
                <TeamTaskCardRow
                  key={task.id}
                  task={task}
                  projectTitle={project?.title || '—'}
                  projectColor={project?.color}
                  assigneeName={assignee ? nameOf(assignee) : '— nicht zugewiesen —'}
                  statusLabel={statusLabel(task)}
                  updatedLabel={dateLabel(task.updated_at || task.created_at)}
                  isLast={i === filteredTasks.length - 1}
                />
              )
            })
          )}

          {mode === 'reports' && (
            loading ? (
              <p className="dec-empty">Lade Berichte…</p>
            ) : filteredReports.length === 0 ? (
              <EmptyState icon={NotePencil} title="Noch keine Team-Statusberichte" />
            ) : filteredReports.map((report, i) => {
              const project = report.project_id ? projectsById.get(report.project_id) : null
              return (
                <TeamReportCardRow
                  key={report.id}
                  projectTitle={project?.title || 'Team'}
                  title={report.title || 'Statusbericht'}
                  body={report.body || 'Kein Text hinterlegt.'}
                  dateLabel={dateLabel(report.created_at)}
                  isLast={i === filteredReports.length - 1}
                />
              )
            })
          )}
        </div>
      </div>

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
    </div>
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
