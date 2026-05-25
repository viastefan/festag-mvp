'use client'

/**
 * /teams — Festag team & responsibility control surface.
 *
 * Six tabs (Overview, Mitglieder, Projekte, Verantwortlichkeiten,
 * Aktivität, Einladungen), a Tagro Team Intelligence card, member
 * drawer and invite drawer. Built to match the rest of Festag in
 * density, language and component shape.
 *
 * Data sources (existing — no migration):
 *   • profiles                — full directory + workspace role
 *   • team_members            — workspace links (owner → member)
 *   • project_assignments     — per-project execution roles
 *   • projects                — project context + colour + status
 *   • tasks                   — open / blocked / review counts
 *   • team_invites            — pending invitations
 *   • notifications           — activity timeline source
 *
 * No surveillance language anywhere — Tagro speaks in operational
 * visibility terms (workload, responsibility, gaps).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowRight, ArrowsClockwise, ChatCircleDots, CheckCircle, MagnifyingGlass,
  PaperPlaneTilt, Sparkle, UserPlus, UsersThree, X,
} from '@phosphor-icons/react'
import { autoAvatarColor, avatarInitials, avatarTextColor } from '@/lib/avatar'

/* ─────────────────────────────────────────────────────────────
 * Types + constants
 * ─────────────────────────────────────────────────────────── */

type Profile = {
  id: string
  full_name: string | null
  first_name: string | null
  email: string | null
  avatar_url: string | null
  avatar_color: string | null
  role: string | null
  position: string | null
  approval_status?: string | null
  created_at?: string | null
  last_seen_at?: string | null
}

type Task = {
  id: string
  title: string
  status: string | null
  dev_status: string | null
  priority: string | null
  project_id: string | null
  assigned_to: string | null
  updated_at: string | null
  created_at: string | null
}

type ProjectLite = {
  id: string
  title: string
  color: string | null
  status: string | null
  user_id?: string | null
}

type Invite = {
  id: string
  email: string
  role: string | null
  invited_name: string | null
  status: string | null
  created_at: string
}

type ActivityRow = {
  id: string
  kind: string | null
  title: string | null
  body: string | null
  project_id: string | null
  created_at: string
}

type WorkloadState = 'idle' | 'light' | 'balanced' | 'high' | 'overloaded'

type MemberRow = {
  profile: Profile
  isYou: boolean
  projects: ProjectLite[]
  activeTasks: number
  blockedTasks: number
  reviewTasks: number
  doneTasks: number
  lastUpdate: string | null
  workload: WorkloadState
  tagroNote: string
}

const ROLE_LABEL: Record<string, string> = {
  owner:          'Owner',
  admin:          'Admin',
  project_owner:  'Project Owner',
  developer:      'Entwickler:in',
  dev:            'Entwickler:in',
  designer:       'Designer:in',
  reviewer:       'Reviewer',
  qa:             'QA',
  marketing:      'Marketing',
  client:         'Client',
  client_admin:   'Kunden-Admin',
  collaborator:   'Mitarbeitende:r',
  external:       'External Partner',
  finance:        'Finance',
  viewer:         'Viewer',
  support:        'Support',
}

const WORKLOAD_LABEL: Record<WorkloadState, string> = {
  idle:       'Keine Tasks',
  light:      'Leicht',
  balanced:   'Balanciert',
  high:       'Hoch',
  overloaded: 'Überlastet',
}
const WORKLOAD_TONE: Record<WorkloadState, 'muted' | 'good' | 'amber' | 'red'> = {
  idle: 'muted', light: 'good', balanced: 'good', high: 'amber', overloaded: 'red',
}

type TabId = 'overview' | 'members' | 'projects' | 'responsibilities' | 'activity' | 'invites'
const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'overview',         label: 'Overview' },
  { id: 'members',          label: 'Mitglieder' },
  { id: 'projects',         label: 'Projekte' },
  { id: 'responsibilities', label: 'Verantwortlichkeiten' },
  { id: 'activity',         label: 'Aktivität' },
  { id: 'invites',          label: 'Einladungen' },
]

/* ─────────────────────────────────────────────────────────────
 * Helpers
 * ─────────────────────────────────────────────────────────── */

function displayName(p: Profile): string {
  return p.full_name?.trim() || p.first_name?.trim() || p.email?.split('@')[0] || 'Teammitglied'
}
function roleLabel(role?: string | null): string {
  if (!role) return 'Mitglied'
  return ROLE_LABEL[role] ?? role
}
function fmtTimeAgo(iso?: string | null): string {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  const m = Math.floor((Date.now() - t) / 60000)
  if (m < 1) return 'gerade eben'
  if (m < 60) return `vor ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `vor ${h} Std`
  const d = Math.floor(h / 24)
  if (d < 7) return `vor ${d} Tag${d === 1 ? '' : 'en'}`
  return new Date(iso).toLocaleDateString('de-DE')
}
function taskOpen(t: Task) {
  const s = String(t.dev_status || t.status || '').toLowerCase()
  return !['done', 'completed', 'cancelled', 'approved_by_owner'].includes(s)
}
function taskBlocked(t: Task) {
  const s = String(t.dev_status || t.status || '').toLowerCase()
  return ['blocked', 'waiting'].includes(s)
}
function taskReview(t: Task) {
  const s = String(t.dev_status || t.status || '').toLowerCase()
  return ['review', 'in_review', 'ready_review', 'ready_for_review', 'finished_by_dev', 'needs_review', 'verified_by_tagro'].includes(s)
}
function taskDone(t: Task) {
  const s = String(t.dev_status || t.status || '').toLowerCase()
  return ['done', 'completed', 'approved_by_owner'].includes(s)
}
function workloadOf(active: number, blocked: number): WorkloadState {
  if (active === 0) return 'idle'
  if (active >= 9 || blocked >= 3) return 'overloaded'
  if (active >= 5) return 'high'
  if (active >= 2) return 'balanced'
  return 'light'
}

/* ─────────────────────────────────────────────────────────────
 * Page
 * ─────────────────────────────────────────────────────────── */

export default function TeamsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [me, setMe] = useState<Profile | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [members, setMembers] = useState<MemberRow[]>([])
  const [projects, setProjects] = useState<ProjectLite[]>([])
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [activity, setActivity] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [openMemberId, setOpenMemberId] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { window.location.href = '/login'; return }
    const uid = session.user.id

    const [profSelf, tmRows, projectsRes, assignsRes, invitesRes] = await Promise.all([
      (supabase as any).from('profiles')
        .select('id,full_name,first_name,email,avatar_url,avatar_color,role,position,approval_status,created_at,last_seen_at')
        .eq('id', uid).maybeSingle(),
      (supabase as any).from('team_members').select('member_id').eq('owner_id', uid),
      (supabase as any).from('projects').select('id,title,color,status,user_id').order('updated_at', { ascending: false }),
      (supabase as any).from('project_assignments').select('project_id,user_id,active').eq('active', true),
      (supabase as any).from('team_invites')
        .select('id,email,role,invited_name,status,created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(50),
    ])

    const myProf = (profSelf.data as Profile | null) ?? null
    setMe(myProf)
    setProjects(((projectsRes.data as ProjectLite[] | null) ?? []))
    setInvites(((invitesRes.data as Invite[] | null) ?? []))

    const memberIds = new Set<string>()
    if (myProf?.id) memberIds.add(myProf.id)
    for (const r of (tmRows.data as any[]) ?? []) if (r?.member_id) memberIds.add(r.member_id)
    for (const a of (assignsRes.data as any[]) ?? []) if (a?.user_id) memberIds.add(a.user_id)

    const idsArr = Array.from(memberIds)
    if (idsArr.length === 0) { setMembers([]); setAllTasks([]); setActivity([]); setLoading(false); return }

    const [profsRes, tasksRes, notifRes] = await Promise.all([
      (supabase as any).from('profiles')
        .select('id,full_name,first_name,email,avatar_url,avatar_color,role,position,approval_status,created_at,last_seen_at')
        .in('id', idsArr),
      (supabase as any).from('tasks')
        .select('id,title,status,dev_status,priority,project_id,assigned_to,updated_at,created_at')
        .in('assigned_to', idsArr)
        .order('updated_at', { ascending: false })
        .limit(800),
      (supabase as any).from('notifications')
        .select('id,kind,type,title,body,project_id,created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(80),
    ])
    const tasks = (tasksRes.data as Task[] | null) ?? []
    setAllTasks(tasks)
    setActivity(((notifRes.data as any[]) ?? []).map(n => ({
      id: n.id, kind: n.kind ?? n.type ?? null, title: n.title, body: n.body, project_id: n.project_id, created_at: n.created_at,
    })))

    const assignmentMap = new Map<string, Set<string>>()
    for (const a of (assignsRes.data as any[]) ?? []) {
      if (!a?.user_id || !a?.project_id) continue
      if (!assignmentMap.has(a.user_id)) assignmentMap.set(a.user_id, new Set())
      assignmentMap.get(a.user_id)!.add(a.project_id)
    }
    const projById = new Map<string, ProjectLite>()
    for (const p of (projectsRes.data as ProjectLite[] | null) ?? []) projById.set(p.id, p)

    const tasksByMember = new Map<string, Task[]>()
    for (const t of tasks) {
      if (!t.assigned_to) continue
      if (!tasksByMember.has(t.assigned_to)) tasksByMember.set(t.assigned_to, [])
      tasksByMember.get(t.assigned_to)!.push(t)
    }

    const rows: MemberRow[] = ((profsRes.data as Profile[] | null) ?? []).map(p => {
      const myTasks = tasksByMember.get(p.id) ?? []
      const active  = myTasks.filter(taskOpen).length
      const blocked = myTasks.filter(taskBlocked).length
      const review  = myTasks.filter(taskReview).length
      const done    = myTasks.filter(taskDone).length
      let last: string | null = null
      for (const t of myTasks) if (t.updated_at && (!last || t.updated_at > last)) last = t.updated_at
      const projIds = assignmentMap.get(p.id) ?? new Set()
      const memberProjects: ProjectLite[] = []
      for (const pid of projIds) {
        const proj = projById.get(pid)
        if (proj) memberProjects.push(proj)
      }
      const workload = workloadOf(active, blocked)
      const note = (() => {
        const parts: string[] = []
        if (blocked > 0) parts.push(`${blocked} blockiert`)
        if (review > 0)  parts.push(`${review} in Prüfung`)
        if (active > 0 && parts.length === 0) parts.push(`${active} aktiv`)
        if (parts.length === 0 && done > 0) parts.push('Keine offenen Tasks')
        if (parts.length === 0) parts.push('Noch keine Tasks zugewiesen')
        return parts.join(' · ')
      })()
      return {
        profile: p,
        isYou: p.id === myProf?.id,
        projects: memberProjects,
        activeTasks: active,
        blockedTasks: blocked,
        reviewTasks: review,
        doneTasks: done,
        lastUpdate: last,
        workload,
        tagroNote: note,
      }
    }).sort((a, b) => {
      if (a.isYou && !b.isYou) return -1
      if (!a.isYou && b.isYou) return 1
      const wOrder = ['overloaded', 'high', 'balanced', 'light', 'idle']
      const w = wOrder.indexOf(a.workload) - wOrder.indexOf(b.workload)
      if (w !== 0) return w
      return displayName(a.profile).localeCompare(displayName(b.profile), 'de')
    })

    setMembers(rows)
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  // ─── Derived ─────────────────────────────────────────────────
  const activeProjects = useMemo(() => projects.filter(p => {
    const s = (p.status || '').toLowerCase()
    return s !== 'done' && s !== 'archived'
  }), [projects])

  const projectTeams = useMemo(() => {
    return activeProjects.map(p => {
      const team = members.filter(m => m.projects.some(mp => mp.id === p.id))
      const owner = team.find(m => ['admin', 'project_owner', 'owner'].includes(m.profile.role ?? ''))
      const devs  = team.filter(m => ['dev', 'developer'].includes(m.profile.role ?? ''))
      const projectTasks = allTasks.filter(t => t.project_id === p.id)
      const open    = projectTasks.filter(taskOpen).length
      const blocked = projectTasks.filter(taskBlocked).length
      const coverage: { tone: 'good' | 'amber' | 'red'; label: string } = (() => {
        if (!owner)            return { tone: 'amber', label: 'Owner fehlt' }
        if (devs.length === 0) return { tone: 'amber', label: 'Entwickler fehlen' }
        if (blocked > 0)       return { tone: 'red',   label: `${blocked} Blocker` }
        return { tone: 'good', label: 'Vollständig' }
      })()
      return { project: p, team, owner, devs, openTasks: open, blockedTasks: blocked, coverage }
    })
  }, [activeProjects, members, allTasks])

  const responsibilityGaps = useMemo(() => {
    const gaps: Array<{ severity: 'high' | 'medium' | 'low'; title: string; meta: string; href?: string }> = []
    const unassigned = allTasks.filter(t => !t.assigned_to && taskOpen(t))
    if (unassigned.length > 0) {
      gaps.push({
        severity: unassigned.length > 5 ? 'high' : 'medium',
        title: `${unassigned.length} Tasks ohne Verantwortlichen`,
        meta: 'Tagro empfiehlt: Owner zuweisen, damit nichts liegen bleibt.',
        href: '/tasks',
      })
    }
    for (const t of projectTeams) {
      if (!t.owner) gaps.push({
        severity: 'high',
        title: `Projekt „${t.project.title}" hat keinen Owner`,
        meta: 'Project Owner ist zuständig für Freigaben und Qualität.',
        href: `/project/${t.project.id}`,
      })
      if (t.devs.length === 0 && t.openTasks > 0) gaps.push({
        severity: 'medium',
        title: `„${t.project.title}" hat ${t.openTasks} offene Tasks aber keinen Entwickler`,
        meta: 'Entwickler einladen oder zuweisen.',
        href: `/dev/projects`,
      })
    }
    for (const m of members) {
      if (m.workload === 'overloaded') gaps.push({
        severity: 'medium',
        title: `${displayName(m.profile)} ist überlastet (${m.activeTasks} aktive Tasks)`,
        meta: 'Verteile Tasks auf andere Mitwirkende oder verschiebe Prioritäten.',
      })
    }
    if (invites.length > 0) gaps.push({
      severity: 'low',
      title: `${invites.length} ausstehende Einladung${invites.length === 1 ? '' : 'en'}`,
      meta: 'Erinnere die eingeladenen Personen oder revoke die Einladung.',
    })
    return gaps
  }, [allTasks, projectTeams, members, invites])

  const teamSummary = useMemo(() => {
    const parts: string[] = []
    parts.push(`${members.length} Mitglied${members.length === 1 ? '' : 'er'}`)
    parts.push(`${activeProjects.length} aktive Projekt${activeProjects.length === 1 ? '' : 'e'}`)
    const open = allTasks.filter(taskOpen).length
    if (open > 0) parts.push(`${open} offene Tasks`)
    const reviews = allTasks.filter(taskReview).length
    if (reviews > 0) parts.push(`${reviews} in Prüfung`)
    if (invites.length > 0) parts.push(`${invites.length} Einladungen`)
    return parts.join(' · ')
  }, [members, activeProjects, allTasks, invites])

  const tagroSentence = useMemo(() => {
    if (members.length <= 1) return 'Tagro wartet auf das erste echte Projektteam. Lade Entwickler, Project Owner oder Kunden ein, damit Aufgaben, Kommunikation und Freigaben sauber verbunden werden.'
    if (responsibilityGaps.length === 0) return 'Alle Rollen sind besetzt, keine kritischen Lücken erkannt. Tagro hält das Team-Briefing bereit, sobald nötig.'
    const top = responsibilityGaps[0]
    const more = responsibilityGaps.length - 1
    return `${top.title}.` + (more > 0 ? ` Tagro sieht ${more} weitere offene Punkte.` : ' Sonst sieht Tagro nichts Kritisches.')
  }, [members, responsibilityGaps])

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase()
    return members.filter(m => {
      if (roleFilter !== 'all' && (m.profile.role || 'member') !== roleFilter) return false
      if (!q) return true
      return (
        displayName(m.profile).toLowerCase().includes(q) ||
        (m.profile.email || '').toLowerCase().includes(q)
      )
    })
  }, [members, search, roleFilter])

  const memberOpen = openMemberId ? members.find(m => m.profile.id === openMemberId) ?? null : null

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className="team-page">
      <header className="tm-head">
        <div>
          <p className="tm-eyebrow">Workspace · Team</p>
          <h1>Team</h1>
          <p className="tm-sub">Verwalte Mitglieder, Rollen und Verantwortlichkeiten in deinem Workspace.</p>
          {!loading && <p className="tm-summary">{teamSummary}</p>}
        </div>
        <div className="tm-head-actions">
          <button type="button" className="tm-ghost" onClick={load} disabled={loading}>
            <ArrowsClockwise size={12} className={loading ? 'tm-spin' : ''} />
            {loading ? 'Lade…' : 'Aktualisieren'}
          </button>
          <Link href="/ai?prompt=team" className="tm-ghost">
            <Sparkle size={12} /> Tagro fragen
          </Link>
          <button type="button" className="tm-primary" onClick={() => setInviteOpen(true)}>
            <UserPlus size={13} weight="bold" /> Mitglied einladen
          </button>
        </div>
      </header>

      <section className="tm-intel">
        <span className="tm-intel-mark"><Sparkle size={13} weight="fill" /></span>
        <div className="tm-intel-text">
          <p className="tm-intel-label">Tagro Team Intelligence</p>
          <p className="tm-intel-line">{tagroSentence}</p>
        </div>
      </section>

      <nav className="tm-tabs" role="tablist">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            className={`tm-tab${activeTab === t.id ? ' on' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
            {t.id === 'invites' && invites.length > 0 && <span className="tm-tab-count">{invites.length}</span>}
          </button>
        ))}
      </nav>

      <main className="tm-main">

        {activeTab === 'overview' && (
          <div className="tm-overview">
            <div className="tm-metrics">
              <MetricCard label="Mitglieder"      value={members.length} />
              <MetricCard label="Aktive Projekte" value={activeProjects.length} />
              <MetricCard label="Offene Tasks"    value={allTasks.filter(taskOpen).length} />
              <MetricCard label="In Prüfung"      value={allTasks.filter(taskReview).length} />
              <MetricCard label="Blocker"         value={allTasks.filter(taskBlocked).length} tone={allTasks.filter(taskBlocked).length > 0 ? 'red' : 'muted'} />
              <MetricCard label="Einladungen"     value={invites.length} />
            </div>

            <section className="tm-section">
              <header className="tm-section-head">
                <h2>Aktive Projektteams</h2>
                <span className="tm-section-meta">{projectTeams.length}</span>
              </header>
              {projectTeams.length === 0 ? (
                <p className="tm-empty-line">Noch kein aktives Projektteam. Lege ein Projekt an, dann erscheint es hier.</p>
              ) : (
                <div className="tm-grid">
                  {projectTeams.slice(0, 6).map(t => (
                    <Link key={t.project.id} href={`/project/${t.project.id}`} className="tm-project-card">
                      <div className="tm-project-head">
                        <span className="tm-project-dot" style={{ background: t.project.color || 'var(--text-muted)' }} />
                        <span className="tm-project-title">{t.project.title}</span>
                      </div>
                      <p className="tm-project-meta">
                        {t.owner ? `Owner: ${displayName(t.owner.profile)}` : 'Owner fehlt'} · {t.devs.length} Entw. · {t.openTasks} offen
                      </p>
                      <div className="tm-coverage-row">
                        <span className={`tm-pill tone-${t.coverage.tone}`}>{t.coverage.label}</span>
                        <ArrowRight size={11} className="tm-go" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="tm-section">
              <header className="tm-section-head">
                <h2>Verantwortungs-Lücken</h2>
                <span className="tm-section-meta">{responsibilityGaps.length}</span>
              </header>
              {responsibilityGaps.length === 0 ? (
                <p className="tm-empty-line">Keine offenen Verantwortungs-Lücken.</p>
              ) : (
                <div className="tm-list">
                  {responsibilityGaps.slice(0, 6).map((g, i) => <ResponsibilityRow key={i} gap={g} />)}
                </div>
              )}
            </section>

            <section className="tm-section">
              <header className="tm-section-head">
                <h2>Letzte Team-Aktivität</h2>
              </header>
              {activity.length === 0 ? (
                <p className="tm-empty-line">Team-Aktivität erscheint hier — Task-Zuweisungen, Freigaben, Briefings, neue Einladungen.</p>
              ) : (
                <div className="tm-list">
                  {activity.slice(0, 8).map(a => (
                    <ActivityRowView key={a.id} row={a} projectsById={new Map(projects.map(p => [p.id, p]))} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="tm-members">
            <div className="tm-toolbar">
              <label className="tm-search">
                <MagnifyingGlass size={13} />
                <input
                  type="text"
                  placeholder="Mitglied suchen…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </label>
              <select
                className="tm-select"
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                aria-label="Rolle filtern"
              >
                <option value="all">Alle Rollen</option>
                {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            <section className="tm-table">
              <div className="tm-table-head">
                <span>Mitglied</span>
                <span>Rolle</span>
                <span>Projekte</span>
                <span>Tasks</span>
                <span>Workload</span>
                <span>Letzte Aktivität</span>
              </div>

              {loading && filteredMembers.length === 0 ? (
                <p className="tm-empty">Lade Team…</p>
              ) : filteredMembers.length === 0 ? (
                <EmptyState
                  title="Baue dein erstes Projektteam auf."
                  body="Lade Entwickler, Projektverantwortliche oder Kunden ein, damit Festag Aufgaben, Kommunikation und Freigaben sauber verbinden kann."
                  cta="Mitglied einladen"
                  onCta={() => setInviteOpen(true)}
                />
              ) : filteredMembers.map(m => (
                <button
                  key={m.profile.id}
                  className="tm-row"
                  type="button"
                  onClick={() => setOpenMemberId(m.profile.id)}
                  id={`member-${m.profile.id}`}
                >
                  <span className="tm-row-member">
                    <Avatar profile={m.profile} />
                    <span className="tm-row-name">
                      <strong>
                        {displayName(m.profile)}
                        {m.isYou && <span className="tm-badge-you">Du</span>}
                      </strong>
                      <small>{m.profile.email || '—'}</small>
                    </span>
                  </span>
                  <span className="tm-row-role">{roleLabel(m.profile.role)}</span>
                  <span className="tm-row-projects">
                    {m.projects.length === 0
                      ? <span className="tm-cell-empty">—</span>
                      : m.projects.slice(0, 2).map(p => (
                          <span key={p.id} className="tm-proj-tag">
                            <span className="tm-proj-dot" style={{ background: p.color || 'var(--text-muted)' }} />
                            {p.title}
                          </span>
                        ))
                    }
                    {m.projects.length > 2 && <span className="tm-proj-more">+{m.projects.length - 2}</span>}
                  </span>
                  <span className="tm-row-tasks">
                    {m.activeTasks === 0 ? <span className="tm-cell-empty">—</span> : `${m.activeTasks} aktiv`}
                  </span>
                  <span className="tm-row-workload">
                    <span className={`tm-pill tone-${WORKLOAD_TONE[m.workload]}`}>{WORKLOAD_LABEL[m.workload]}</span>
                  </span>
                  <span className="tm-row-update">{fmtTimeAgo(m.lastUpdate)}</span>
                </button>
              ))}
            </section>
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="tm-projects">
            {projectTeams.length === 0 ? (
              <EmptyState
                title="Noch keine Projektteams."
                body="Lege ein Projekt an, dann erscheint hier die Team-Zuordnung mit Owner, Entwicklern und Coverage-Status."
                cta="Neues Projekt"
                href="/projects?new=1"
              />
            ) : (
              <div className="tm-grid tm-grid-wide">
                {projectTeams.map(t => (
                  <article key={t.project.id} className="tm-project-card big">
                    <header className="tm-project-card-head">
                      <span className="tm-project-dot" style={{ background: t.project.color || 'var(--text-muted)' }} />
                      <div className="tm-project-title-block">
                        <h3>{t.project.title}</h3>
                        <p>{(t.project.status || 'intake')} · {t.openTasks} offen · {t.blockedTasks} Blocker</p>
                      </div>
                      <span className={`tm-pill tone-${t.coverage.tone}`}>{t.coverage.label}</span>
                    </header>
                    <div className="tm-project-team">
                      {t.owner ? (
                        <div className="tm-team-line">
                          <span className="tm-team-label">Owner</span>
                          <span className="tm-team-value"><Avatar profile={t.owner.profile} size={20} />{displayName(t.owner.profile)}</span>
                        </div>
                      ) : (
                        <div className="tm-team-line missing">
                          <span className="tm-team-label">Owner</span>
                          <span className="tm-team-value">— nicht zugewiesen —</span>
                        </div>
                      )}
                      <div className="tm-team-line">
                        <span className="tm-team-label">Entwickler</span>
                        <span className="tm-team-value">
                          {t.devs.length === 0
                            ? <span className="tm-team-missing">keine zugewiesen</span>
                            : (
                              <span className="tm-avatar-stack">
                                {t.devs.slice(0, 4).map(d => <Avatar key={d.profile.id} profile={d.profile} size={20} />)}
                                {t.devs.length > 4 && <span className="tm-avatar-more">+{t.devs.length - 4}</span>}
                              </span>
                            )
                          }
                        </span>
                      </div>
                    </div>
                    <footer className="tm-project-card-foot">
                      <Link href={`/project/${t.project.id}`}>Projekt öffnen <ArrowRight size={11} /></Link>
                      <Link href={`/ai?project=${t.project.id}&mode=developer`}>Team schreiben <ChatCircleDots size={11} /></Link>
                    </footer>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'responsibilities' && (
          <div className="tm-resp">
            <section className="tm-section">
              <header className="tm-section-head">
                <h2>Offene Verantwortungen</h2>
                <span className="tm-section-meta">{responsibilityGaps.length}</span>
              </header>
              {responsibilityGaps.length === 0 ? (
                <p className="tm-empty-line">Keine offenen Verantwortungs-Lücken. Tagro hat alle Rollen-Pflichten im Blick.</p>
              ) : (
                <div className="tm-list">
                  {responsibilityGaps.map((g, i) => <ResponsibilityRow key={i} gap={g} />)}
                </div>
              )}
            </section>

            <section className="tm-section">
              <header className="tm-section-head">
                <h2>Rollen-Verantwortungen</h2>
              </header>
              <div className="tm-grid tm-grid-3">
                <RoleCard title="Project Owner" items={[
                  'Verantwortet Liefer-Qualität',
                  'Gibt Meilensteine frei',
                  'Bestätigt Scope-Änderungen',
                  'Eskalations-Anker',
                ]} />
                <RoleCard title="Entwickler" items={[
                  'Führt zugewiesene Tasks aus',
                  'Aktualisiert Fortschritt',
                  'Meldet Blocker',
                  'Verlinkt Arbeit mit Tasks',
                ]} />
                <RoleCard title="Client" items={[
                  'Gibt Entscheidungen frei',
                  'Stellt Inhalte bereit',
                  'Bestätigt Milestone-Gates',
                  'Gibt Feedback',
                ]} />
                <RoleCard title="Reviewer / QA" items={[
                  'Prüft fertige Tasks',
                  'Genehmigt Audio-Briefings',
                  'Markiert Qualitätsfragen',
                ]} />
                <RoleCard title="Tagro" items={[
                  'Erkennt Verantwortungs-Lücken',
                  'Erstellt Tasks aus Berichten',
                  'Fasst Briefings zusammen',
                  'Schlägt nächste Schritte vor',
                ]} />
                <RoleCard title="Viewer" items={[
                  'Sieht freigegebene Berichte',
                  'Keine Bearbeitung',
                  'Keine Einladungs-Rechte',
                ]} />
              </div>
            </section>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="tm-activity">
            {activity.length === 0 ? (
              <EmptyState
                title="Team-Aktivität erscheint hier."
                body="Task-Zuweisungen, Freigaben, Nachrichten und Briefing-Events werden in dieser Timeline angezeigt."
              />
            ) : (
              <div className="tm-list">
                {activity.map(a => (
                  <ActivityRowView key={a.id} row={a} projectsById={new Map(projects.map(p => [p.id, p]))} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'invites' && (
          <div className="tm-invites">
            <section className="tm-section">
              <header className="tm-section-head">
                <h2>Ausstehende Einladungen</h2>
                <span className="tm-section-meta">{invites.length}</span>
              </header>
              {invites.length === 0 ? (
                <EmptyState
                  title="Keine ausstehenden Einladungen."
                  body="Eingeladene Personen erscheinen hier, bis sie den Link öffnen und beitreten."
                  cta="Mitglied einladen"
                  onCta={() => setInviteOpen(true)}
                />
              ) : (
                <div className="tm-list">
                  {invites.map(inv => (
                    <div key={inv.id} className="tm-invite-row">
                      <span className="tm-invite-icon"><PaperPlaneTilt size={14} /></span>
                      <div className="tm-invite-main">
                        <strong>{inv.invited_name || inv.email}</strong>
                        <small>{inv.email} · {roleLabel(inv.role)} · gesendet {fmtTimeAgo(inv.created_at)}</small>
                      </div>
                      <span className="tm-pill tone-amber">Ausstehend</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
            <p className="tm-note">
              Einladungen werden per E-Mail versendet. Eingeladene Personen öffnen den Link und treten direkt dem Workspace bei.
            </p>
          </div>
        )}

      </main>

      {memberOpen && (
        <MemberDrawer
          member={memberOpen}
          allTasks={allTasks.filter(t => t.assigned_to === memberOpen.profile.id)}
          projectsById={new Map(projects.map(p => [p.id, p]))}
          onClose={() => setOpenMemberId(null)}
        />
      )}

      {inviteOpen && (
        <InviteDrawer
          onClose={() => setInviteOpen(false)}
          onSent={() => { setInviteOpen(false); load() }}
          projects={projects}
        />
      )}

      <style jsx>{CSS}</style>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
 * Sub-components
 * ─────────────────────────────────────────────────────────── */

function Avatar({ profile, size = 28 }: { profile: Profile; size?: number }) {
  const name = displayName(profile)
  const color = profile.avatar_color || autoAvatarColor(profile.id)
  if (profile.avatar_url) return <img className="tm-avatar img" src={profile.avatar_url} alt="" style={{ width: size, height: size }} />
  return (
    <span
      className="tm-avatar txt"
      style={{ width: size, height: size, background: color, color: avatarTextColor(color), fontSize: Math.round(size * 0.36) }}
    >
      {avatarInitials(name)}
    </span>
  )
}

function MetricCard({ label, value, tone = 'default' }: { label: string; value: number | string; tone?: 'default' | 'red' | 'muted' }) {
  return (
    <div className={`tm-metric tone-${tone}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function ResponsibilityRow({ gap }: { gap: { severity: 'high' | 'medium' | 'low'; title: string; meta: string; href?: string } }) {
  const Wrap: any = gap.href ? Link : 'div'
  const wrapProps: any = gap.href ? { href: gap.href } : {}
  return (
    <Wrap className={`tm-list-row severity-${gap.severity}`} {...wrapProps}>
      <span className="tm-list-dot" />
      <span className="tm-list-main">
        <strong>{gap.title}</strong>
        <small>{gap.meta}</small>
      </span>
      {gap.href && <ArrowRight size={11} className="tm-go" />}
    </Wrap>
  )
}

function ActivityRowView({ row, projectsById }: { row: ActivityRow; projectsById: Map<string, ProjectLite> }) {
  const proj = row.project_id ? projectsById.get(row.project_id) : null
  return (
    <div className="tm-list-row activity">
      <span className="tm-list-dot" />
      <span className="tm-list-main">
        <strong>{row.title || row.kind || 'Update'}</strong>
        <small>
          {proj && <><span className="tm-proj-dot inline" style={{ background: proj.color || 'var(--text-muted)' }} />{proj.title} · </>}
          {row.body ? row.body.slice(0, 140) : '—'}
        </small>
      </span>
      <span className="tm-list-meta">{fmtTimeAgo(row.created_at)}</span>
    </div>
  )
}

function RoleCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="tm-role-card">
      <h3>{title}</h3>
      <ul>
        {items.map(it => <li key={it}>{it}</li>)}
      </ul>
    </div>
  )
}

function EmptyState({ title, body, cta, href, onCta }: { title: string; body: string; cta?: string; href?: string; onCta?: () => void }) {
  return (
    <div className="tm-empty-card">
      <UsersThree size={20} />
      <p><strong>{title}</strong></p>
      <p className="tm-empty-body">{body}</p>
      {cta && (href
        ? <Link href={href} className="tm-cta">{cta}</Link>
        : <button type="button" className="tm-cta" onClick={onCta}>{cta}</button>)}
    </div>
  )
}

/* ─── Member Drawer ────────────────────────────────────────── */

function MemberDrawer({
  member, allTasks, projectsById, onClose,
}: {
  member: MemberRow
  allTasks: Task[]
  projectsById: Map<string, ProjectLite>
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const name = displayName(member.profile)
  const active = allTasks.filter(taskOpen)
  const review = allTasks.filter(taskReview)
  const blocked = allTasks.filter(taskBlocked)

  return (
    <div className="md-overlay" role="dialog" aria-modal="true">
      <div className="md-backdrop" onClick={onClose} />
      <aside className="md-panel">
        <header className="md-head">
          <div className="md-identity">
            <Avatar profile={member.profile} size={42} />
            <div>
              <h2>{name}{member.isYou && <small className="md-you"> · du</small>}</h2>
              <p>{roleLabel(member.profile.role)} · {member.profile.email}</p>
            </div>
          </div>
          <button type="button" className="md-icon-btn" onClick={onClose} aria-label="Schließen"><X size={16} /></button>
        </header>

        <div className="md-body">
          <div className="md-status-row">
            <span className={`tm-pill tone-${WORKLOAD_TONE[member.workload]}`}>{WORKLOAD_LABEL[member.workload]}</span>
            <span className="md-meta">Zuletzt aktiv {fmtTimeAgo(member.lastUpdate)}</span>
          </div>

          <section className="md-block tagro">
            <header><Sparkle size={11} weight="fill" /> <span>Tagro Einschätzung</span></header>
            <p>{member.tagroNote}</p>
          </section>

          <section className="md-block">
            <header><span>Aktuelle Projekte</span></header>
            {member.projects.length === 0 ? (
              <p className="md-empty">Noch keinem Projekt zugewiesen.</p>
            ) : (
              <div className="md-list">
                {member.projects.map(p => (
                  <Link key={p.id} href={`/project/${p.id}`} className="md-list-row">
                    <span className="tm-proj-dot" style={{ background: p.color || 'var(--text-muted)' }} />
                    <span>{p.title}</span>
                    <ArrowRight size={11} />
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="md-block">
            <header><span>Aktive Tasks</span><small>{active.length}</small></header>
            {active.length === 0 ? (
              <p className="md-empty">Keine offenen Tasks.</p>
            ) : (
              <div className="md-list">
                {active.slice(0, 6).map(t => (
                  <Link key={t.id} href={`/tasks?id=${t.id}`} className="md-list-row">
                    <span className="tm-list-dot" />
                    <span>{t.title}</span>
                    <small>{projectsById.get(t.project_id || '')?.title ?? ''}</small>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {review.length > 0 && (
            <section className="md-block">
              <header><span>In Prüfung</span><small>{review.length}</small></header>
              <div className="md-list">
                {review.slice(0, 4).map(t => (
                  <Link key={t.id} href={`/tasks?id=${t.id}`} className="md-list-row">
                    <span className="tm-list-dot" /><span>{t.title}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {blocked.length > 0 && (
            <section className="md-block alert">
              <header><span>Blockiert</span><small>{blocked.length}</small></header>
              <div className="md-list">
                {blocked.slice(0, 4).map(t => (
                  <Link key={t.id} href={`/tasks?id=${t.id}`} className="md-list-row">
                    <span className="tm-list-dot" /><span>{t.title}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="md-actions">
            <Link href={`/ai?member=${member.profile.id}`} className="md-primary">
              <Sparkle size={12} /> Tagro über {name.split(' ')[0]} fragen
            </Link>
            <Link href={`/messages?to=${member.profile.id}`} className="md-secondary">
              <ChatCircleDots size={12} /> Nachricht senden
            </Link>
          </section>
        </div>
      </aside>

      <style jsx>{DRAWER_CSS}</style>
    </div>
  )
}

/* ─── Invite Drawer ────────────────────────────────────────── */

function InviteDrawer({
  onClose, onSent, projects,
}: {
  onClose: () => void
  onSent: () => void
  projects: ProjectLite[]
}) {
  const supabase = useMemo(() => createClient(), [])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('collaborator')
  const [name, setName] = useState('')
  const [projectId, setProjectId] = useState<string>('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function send() {
    setError('')
    const trimmed = email.trim().toLowerCase()
    if (!trimmed.includes('@')) { setError('Bitte eine gültige E-Mail-Adresse eingeben.'); return }
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
      if (!res.ok) { setError('Einladung konnte nicht gesendet werden.'); return }
      setSent(true)
      setTimeout(onSent, 1100)
    } catch {
      setError('Netzwerkfehler. Versuche es bitte erneut.')
    } finally {
      setSending(false)
    }
  }

  const roleNeedsProject = ['developer', 'designer', 'reviewer', 'client'].includes(role)

  return (
    <div className="md-overlay" role="dialog" aria-modal="true">
      <div className="md-backdrop" onClick={onClose} />
      <aside className="md-panel">
        <header className="md-head">
          <div className="md-identity">
            <span className="tm-invite-icon"><UserPlus size={18} /></span>
            <div>
              <h2>Mitglied einladen</h2>
              <p>E-Mail-Link erstellen und versenden.</p>
            </div>
          </div>
          <button type="button" className="md-icon-btn" onClick={onClose} aria-label="Schließen"><X size={16} /></button>
        </header>

        <div className="md-body">
          <label className="md-field">
            <span>E-Mail</span>
            <input type="email" autoFocus value={email} onChange={e => setEmail(e.target.value)} placeholder="person@firma.de" />
          </label>
          <label className="md-field">
            <span>Name (optional)</span>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Max Schneider" />
          </label>
          <label className="md-field">
            <span>Rolle</span>
            <select value={role} onChange={e => setRole(e.target.value)}>
              <option value="collaborator">Mitarbeitende:r</option>
              <option value="project_owner">Project Owner</option>
              <option value="developer">Entwickler:in</option>
              <option value="designer">Designer:in</option>
              <option value="reviewer">Reviewer / QA</option>
              <option value="marketing">Marketing</option>
              <option value="client">Client</option>
              <option value="external">External Partner</option>
              <option value="viewer">Viewer</option>
            </select>
            <small className="md-field-hint">
              {role === 'project_owner' && 'Bestätigt Meilensteine, verantwortet Liefer-Qualität.'}
              {role === 'developer'     && 'Bekommt eigene Tasks zugewiesen und sieht den Projekt-Status.'}
              {role === 'designer'      && 'Liefert Assets und Design-Reviews.'}
              {role === 'reviewer'      && 'Prüft fertige Tasks vor Freigabe.'}
              {role === 'client'        && 'Sieht freigegebene Projekt-Berichte und gibt Entscheidungen frei.'}
              {role === 'viewer'        && 'Read-only — keine Bearbeitung.'}
              {!['project_owner','developer','designer','reviewer','client','viewer'].includes(role) && 'Allgemeines Workspace-Mitglied.'}
            </small>
          </label>

          {roleNeedsProject && projects.length > 0 && (
            <label className="md-field">
              <span>Projekt (optional)</span>
              <select value={projectId} onChange={e => setProjectId(e.target.value)}>
                <option value="">Kein Projekt zuweisen</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </label>
          )}

          {error && <p className="md-error">{error}</p>}

          <p className="md-note">
            Einladungen werden per E-Mail versendet. Eingeladene öffnen den Link und sind direkt im Workspace.
          </p>
        </div>

        <footer className="md-foot">
          <button type="button" className="md-secondary" onClick={onClose}>Abbrechen</button>
          <button type="button" className="md-primary" onClick={send} disabled={sending || sent}>
            {sent ? <><CheckCircle size={13} /> Gesendet</> : sending ? 'Sende…' : <><PaperPlaneTilt size={13} /> Einladung senden</>}
          </button>
        </footer>
      </aside>

      <style jsx>{DRAWER_CSS}</style>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
 * Styles
 * ─────────────────────────────────────────────────────────── */

const CSS = `
  .team-page { padding: 26px 28px 64px; max-width: 1320px; margin: 0 auto; }
  @media (max-width: 768px) { .team-page { padding: 18px 16px calc(96px + env(safe-area-inset-bottom, 0px)); } }

  .tm-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 14px; flex-wrap: wrap; }
  .tm-eyebrow { margin: 0 0 4px; font-size: 10.5px; font-weight: 500; letter-spacing: .14em; text-transform: uppercase; color: var(--text-muted); }
  h1 { margin: 0; font-size: 22px; font-weight: 500; letter-spacing: -.01em; color: var(--text); }
  .tm-sub { margin: 4px 0 0; font-size: 13px; color: var(--text-muted); font-weight: 500; max-width: 60ch; line-height: 1.5; }
  .tm-summary { margin: 6px 0 0; font-size: 11.5px; color: var(--text-muted); font-weight: 500; letter-spacing: .015em; }

  .tm-head-actions { display: flex; gap: 6px; flex-shrink: 0; flex-wrap: wrap; }
  .tm-ghost, .tm-primary {
    display: inline-flex; align-items: center; gap: 6px;
    height: 32px; padding: 0 14px; border-radius: 999px;
    font: inherit; font-size: 12px; font-weight: 500; letter-spacing: .015em;
    cursor: pointer; text-decoration: none;
    transition: opacity .12s, background .12s, color .12s, border-color .12s, transform .12s;
  }
  .tm-ghost {
    background: transparent; color: var(--text-secondary);
    border: 1px solid color-mix(in srgb, var(--border) 65%, transparent);
  }
  .tm-ghost:hover:not(:disabled) { background: color-mix(in srgb, var(--surface-2) 60%, transparent); color: var(--text); }
  .tm-ghost:disabled { opacity: .5; cursor: not-allowed; }
  .tm-primary { background: var(--btn-prim); color: var(--btn-prim-text); border: 0; }
  .tm-primary:hover { opacity: .92; }
  .tm-primary:active { transform: scale(.97); }
  .tm-spin { animation: tmSpin 1s linear infinite; }
  @keyframes tmSpin { to { transform: rotate(360deg); } }

  .tm-intel {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 14px 16px;
    border: 1px solid color-mix(in srgb, var(--btn-prim) 22%, var(--border));
    border-radius: 14px;
    background: color-mix(in srgb, var(--btn-prim) 6%, transparent);
    margin: 12px 0 16px;
  }
  .tm-intel-mark {
    width: 28px; height: 28px; border-radius: 50%;
    display: inline-flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--btn-prim) 14%, transparent);
    color: var(--text); flex-shrink: 0;
  }
  .tm-intel-label { margin: 0; font-size: 10.5px; font-weight: 500; letter-spacing: .14em; text-transform: uppercase; color: var(--text-muted); }
  .tm-intel-line { margin: 3px 0 0; font-size: 13px; color: var(--text); font-weight: 500; line-height: 1.5; letter-spacing: .015em; }

  .tm-tabs { display: flex; gap: 4px; padding: 4px; border-radius: 999px; background: color-mix(in srgb, var(--surface-2) 45%, transparent); margin-bottom: 16px; overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .tm-tabs::-webkit-scrollbar { display: none; }
  .tm-tab {
    height: 28px; padding: 0 14px; border: 0;
    border-radius: 999px; background: transparent;
    color: var(--text-muted); font: inherit; font-size: 12px; font-weight: 500; letter-spacing: .015em;
    cursor: pointer; transition: background .12s, color .12s;
    white-space: nowrap; flex-shrink: 0;
    display: inline-flex; align-items: center; gap: 6px;
  }
  .tm-tab:hover { color: var(--text); }
  .tm-tab.on { background: var(--card); color: var(--text); box-shadow: 0 1px 2px color-mix(in srgb, var(--text) 8%, transparent); }
  .tm-tab-count {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 18px; height: 18px; padding: 0 6px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--btn-prim) 18%, transparent);
    color: var(--btn-prim);
    font-size: 9.5px; font-weight: 500;
  }

  .tm-main { min-height: 100px; }

  .tm-metrics { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; margin-bottom: 22px; }
  @media (max-width: 980px) { .tm-metrics { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  @media (max-width: 560px) { .tm-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  .tm-metric {
    display: flex; flex-direction: column; gap: 2px;
    padding: 11px 14px;
    border: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
    border-radius: 12px;
    background: var(--card);
  }
  .tm-metric strong {
    font-size: 18px; font-weight: 500; letter-spacing: -.01em;
    color: var(--text); line-height: 1.1;
  }
  .tm-metric span {
    font-size: 10.5px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase;
    color: var(--text-muted);
  }
  .tm-metric.tone-red strong { color: #d44b4b; }

  .tm-section { margin-bottom: 22px; }
  .tm-section-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 10px; }
  .tm-section-head h2 { margin: 0; font-size: 14px; font-weight: 500; letter-spacing: -.005em; color: var(--text); }
  .tm-section-meta { font-size: 11px; color: var(--text-muted); font-weight: 500; }
  .tm-empty-line { margin: 0; padding: 14px; border-radius: 12px; background: color-mix(in srgb, var(--surface-2) 35%, transparent); color: var(--text-muted); font-size: 12.5px; font-weight: 500; }

  .tm-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
  .tm-grid.tm-grid-wide { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .tm-grid.tm-grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  @media (max-width: 880px) {
    .tm-grid, .tm-grid.tm-grid-wide, .tm-grid.tm-grid-3 { grid-template-columns: 1fr; }
  }

  .tm-project-card {
    display: flex; flex-direction: column; gap: 6px;
    padding: 14px;
    border: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
    border-radius: 14px;
    background: var(--card);
    color: var(--text); text-decoration: none;
    transition: background .12s, border-color .12s, transform .12s;
  }
  .tm-project-card:hover { background: color-mix(in srgb, var(--surface-2) 35%, var(--card)); border-color: var(--border); transform: translateY(-1px); }
  .tm-project-head { display: flex; align-items: center; gap: 8px; }
  .tm-project-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .tm-project-dot.inline { width: 6px; height: 6px; display: inline-block; margin-right: 5px; }
  .tm-project-title { font-size: 13.5px; font-weight: 500; color: var(--text); letter-spacing: -.005em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tm-project-meta { margin: 0; font-size: 11.5px; color: var(--text-muted); font-weight: 500; letter-spacing: .012em; }
  .tm-coverage-row { display: flex; justify-content: space-between; align-items: center; margin-top: 4px; }
  .tm-go { color: var(--text-muted); }

  .tm-project-card.big { padding: 16px; }
  .tm-project-card-head { display: grid; grid-template-columns: 10px 1fr auto; gap: 10px; align-items: center; }
  .tm-project-title-block h3 { margin: 0; font-size: 14px; font-weight: 500; letter-spacing: -.005em; color: var(--text); }
  .tm-project-title-block p { margin: 2px 0 0; font-size: 11.5px; color: var(--text-muted); font-weight: 500; }
  .tm-project-team { margin: 10px 0 8px; display: flex; flex-direction: column; gap: 6px; }
  .tm-team-line { display: grid; grid-template-columns: 90px 1fr; gap: 8px; align-items: center; font-size: 12px; }
  .tm-team-label { font-size: 10.5px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; color: var(--text-muted); }
  .tm-team-value { color: var(--text); display: inline-flex; align-items: center; gap: 6px; font-weight: 500; }
  .tm-team-missing { color: var(--text-muted); font-style: italic; }
  .tm-team-line.missing .tm-team-value { color: var(--text-muted); }
  .tm-avatar-stack { display: inline-flex; align-items: center; }
  .tm-avatar-stack > .tm-avatar:not(:first-child) { margin-left: -6px; box-shadow: 0 0 0 2px var(--card); }
  .tm-avatar-more { margin-left: 6px; font-size: 11px; color: var(--text-muted); }
  .tm-project-card-foot { display: flex; gap: 8px; padding-top: 10px; border-top: 1px solid color-mix(in srgb, var(--border) 50%, transparent); }
  .tm-project-card-foot a {
    flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 4px;
    height: 30px; border-radius: 999px;
    background: color-mix(in srgb, var(--surface-2) 55%, transparent);
    color: var(--text-secondary);
    font-size: 11.5px; font-weight: 500; letter-spacing: .012em;
    text-decoration: none; transition: background .12s, color .12s;
  }
  .tm-project-card-foot a:hover { background: color-mix(in srgb, var(--surface-2) 80%, transparent); color: var(--text); }

  .tm-list { display: flex; flex-direction: column; gap: 6px; }
  .tm-list-row {
    display: grid; grid-template-columns: 10px 1fr auto;
    gap: 10px; align-items: center;
    padding: 10px 14px;
    border: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
    border-radius: 12px;
    background: var(--card);
    text-decoration: none; color: var(--text);
  }
  .tm-list-row.activity { background: color-mix(in srgb, var(--card) 80%, transparent); }
  .tm-list-row:hover { background: color-mix(in srgb, var(--surface-2) 35%, var(--card)); }
  .tm-list-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--text-muted); }
  .tm-list-row.severity-high .tm-list-dot { background: #d44b4b; }
  .tm-list-row.severity-medium .tm-list-dot { background: #d4882b; }
  .tm-list-row.severity-low .tm-list-dot { background: var(--text-muted); }
  .tm-list-main { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
  .tm-list-main strong { font-size: 13px; font-weight: 500; letter-spacing: -.005em; color: var(--text); overflow: hidden; text-overflow: ellipsis; }
  .tm-list-main small { font-size: 11.5px; color: var(--text-muted); font-weight: 500; letter-spacing: .012em; display: block; }
  .tm-list-meta { font-size: 11px; color: var(--text-muted); font-weight: 500; }

  .tm-pill {
    display: inline-flex; align-items: center;
    height: 22px; padding: 0 10px; border-radius: 999px;
    font-size: 10.5px; font-weight: 500; letter-spacing: .04em; text-transform: uppercase;
    background: color-mix(in srgb, var(--surface-2) 70%, transparent);
    color: var(--text-secondary);
  }
  .tm-pill.tone-good   { color: #22a06b; background: color-mix(in srgb, #22a06b 10%, transparent); }
  .tm-pill.tone-amber  { color: #d4882b; background: color-mix(in srgb, #d4882b 12%, transparent); }
  .tm-pill.tone-red    { color: #d44b4b; background: color-mix(in srgb, #d44b4b 12%, transparent); }
  .tm-pill.tone-muted  { color: var(--text-muted); }

  .tm-toolbar { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
  .tm-search {
    display: inline-flex; align-items: center; gap: 8px;
    height: 34px; padding: 0 12px;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--border) 65%, transparent);
    background: color-mix(in srgb, var(--surface-2) 30%, transparent);
    flex: 1; min-width: 220px;
  }
  .tm-search svg { color: var(--text-muted); }
  .tm-search input {
    background: transparent; border: 0; outline: 0;
    color: var(--text); font: inherit; font-size: 12.5px; font-weight: 500; letter-spacing: .012em;
    width: 100%;
  }
  .tm-search input::placeholder { color: var(--text-muted); opacity: .7; }
  .tm-select {
    height: 34px; padding: 0 12px;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--border) 65%, transparent);
    background: color-mix(in srgb, var(--surface-2) 30%, transparent);
    color: var(--text); font: inherit; font-size: 12px; font-weight: 500;
    outline: 0; cursor: pointer;
  }

  .tm-table { border: 1px solid var(--border); border-radius: 14px; background: var(--card); overflow: hidden; }
  .tm-table-head, .tm-row {
    display: grid;
    grid-template-columns: minmax(220px, 1.6fr) 140px minmax(140px, 1.3fr) 90px 130px 130px;
    gap: 12px; align-items: center;
    padding: 11px 18px;
  }
  .tm-table-head { font-size: 11px; font-weight: 500; letter-spacing: .08em; text-transform: uppercase; color: var(--text-muted); border-bottom: 1px solid var(--border); background: color-mix(in srgb, var(--surface-2) 30%, transparent); }
  .tm-row {
    width: 100%; border: 0; background: transparent;
    color: var(--text); font: inherit; text-align: left; cursor: pointer;
    border-bottom: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
    transition: background .12s;
  }
  .tm-row:last-child { border-bottom: 0; }
  .tm-row:hover { background: color-mix(in srgb, var(--surface-2) 35%, transparent); }
  .tm-row-member { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .tm-row-name { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
  .tm-row-name strong { font-size: 13px; font-weight: 500; letter-spacing: -.005em; color: var(--text); display: flex; align-items: center; gap: 7px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tm-row-name small { font-size: 11.5px; color: var(--text-muted); font-weight: 500; letter-spacing: .012em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tm-badge-you {
    display: inline-flex; align-items: center;
    height: 16px; padding: 0 6px; border-radius: 999px;
    background: color-mix(in srgb, var(--btn-prim) 14%, transparent);
    border: 1px solid color-mix(in srgb, var(--btn-prim) 26%, transparent);
    color: var(--btn-prim);
    font-size: 9.5px; font-weight: 500; letter-spacing: .08em; text-transform: uppercase;
  }
  .tm-row-role { font-size: 12.5px; color: var(--text-secondary); font-weight: 500; letter-spacing: .015em; }
  .tm-row-projects { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; }
  .tm-proj-tag {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 9px; border-radius: 999px;
    background: color-mix(in srgb, var(--surface-2) 55%, transparent);
    border: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
    font-size: 11px; font-weight: 500; color: var(--text-secondary);
    max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .tm-proj-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .tm-proj-more { font-size: 11px; color: var(--text-muted); font-weight: 500; }
  .tm-row-tasks { font-size: 12.5px; color: var(--text); font-weight: 500; }
  .tm-row-update { font-size: 11.5px; color: var(--text-muted); font-weight: 500; }
  .tm-cell-empty { color: var(--text-muted); opacity: .55; font-size: 12px; }
  .tm-empty { padding: 36px; text-align: center; color: var(--text-muted); font-size: 13px; }

  @media (max-width: 980px) {
    .tm-table-head { display: none; }
    .tm-row {
      grid-template-columns: 1fr;
      gap: 6px;
      padding: 14px 16px;
    }
    .tm-row > span:not(.tm-row-member) { font-size: 11.5px; }
  }

  .tm-avatar {
    border-radius: 50%;
    display: inline-flex; align-items: center; justify-content: center;
    object-fit: cover; flex-shrink: 0;
    font-weight: 500; letter-spacing: .01em;
  }
  .tm-avatar.txt { color: #fff; }

  .tm-role-card {
    padding: 14px;
    border: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
    border-radius: 14px;
    background: var(--card);
  }
  .tm-role-card h3 { margin: 0 0 8px; font-size: 13px; font-weight: 500; letter-spacing: -.005em; color: var(--text); }
  .tm-role-card ul { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 3px; }
  .tm-role-card li { font-size: 12px; line-height: 1.5; color: var(--text-muted); font-weight: 500; letter-spacing: .012em; }

  .tm-invite-icon {
    width: 32px; height: 32px; border-radius: 10px;
    display: inline-flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--btn-prim) 14%, transparent);
    color: var(--btn-prim); flex-shrink: 0;
  }
  .tm-invite-row {
    display: grid; grid-template-columns: 32px 1fr auto;
    gap: 12px; align-items: center;
    padding: 12px 14px;
    border: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
    border-radius: 12px;
    background: var(--card);
  }
  .tm-invite-main { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
  .tm-invite-main strong { font-size: 13px; font-weight: 500; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tm-invite-main small { font-size: 11px; color: var(--text-muted); font-weight: 500; letter-spacing: .012em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tm-note { margin: 14px 0 0; padding: 12px 14px; border-radius: 12px; background: color-mix(in srgb, var(--surface-2) 30%, transparent); color: var(--text-muted); font-size: 12px; font-weight: 500; line-height: 1.5; letter-spacing: .012em; }

  .tm-empty-card {
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    padding: 36px 22px;
    border: 1px dashed color-mix(in srgb, var(--border) 60%, transparent);
    border-radius: 16px;
    background: color-mix(in srgb, var(--card) 60%, transparent);
    text-align: center;
  }
  .tm-empty-card svg { color: var(--text-muted); }
  .tm-empty-card p { margin: 0; font-size: 13px; font-weight: 500; color: var(--text); }
  .tm-empty-card strong { color: var(--text); }
  .tm-empty-body { color: var(--text-muted); max-width: 360px; line-height: 1.55; }
  .tm-cta {
    display: inline-flex; align-items: center; gap: 6px;
    height: 32px; padding: 0 14px; border-radius: 999px;
    background: var(--btn-prim); color: var(--btn-prim-text); border: 0;
    text-decoration: none; font: inherit; font-size: 12px; font-weight: 500; letter-spacing: .015em;
    cursor: pointer; margin-top: 4px;
  }
  .tm-cta:hover { opacity: .92; }
`

const DRAWER_CSS = `
  .md-overlay { position: fixed; inset: 0; z-index: 1300; display: flex; justify-content: flex-end; font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif); }
  .md-backdrop { flex: 1; background: rgba(8,10,14,.42); backdrop-filter: blur(4px); cursor: pointer; }
  .md-panel {
    width: min(540px, 100vw); height: 100%;
    background: var(--bg); color: var(--text);
    border-left: 1px solid var(--border);
    display: flex; flex-direction: column;
    box-shadow: -24px 0 64px -20px rgba(0,0,0,.45);
    animation: mdIn .22s cubic-bezier(.16,1,.3,1) both;
  }
  @media (max-width: 640px) { .md-panel { width: 100vw; } }
  @keyframes mdIn { from { transform: translateX(20px); opacity: 0; } to { transform: none; opacity: 1; } }

  .md-head {
    display: flex; justify-content: space-between; align-items: flex-start;
    padding: 18px 22px 12px;
    border-bottom: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
  }
  .md-identity { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .md-identity h2 { margin: 0; font-size: 17px; font-weight: 500; letter-spacing: -.005em; color: var(--text); }
  .md-identity p { margin: 1px 0 0; font-size: 12.5px; color: var(--text-muted); font-weight: 500; letter-spacing: .015em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .md-you { color: var(--text-muted); font-weight: 500; }
  .md-icon-btn {
    width: 30px; height: 30px; border: 0; background: transparent;
    color: var(--text-muted); border-radius: 8px; cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center;
    transition: background .12s, color .12s;
  }
  .md-icon-btn:hover { background: color-mix(in srgb, var(--surface-2) 65%, transparent); color: var(--text); }

  .md-body { padding: 18px 22px 32px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 18px; }
  .md-status-row { display: flex; justify-content: space-between; align-items: center; }
  .md-meta { font-size: 11.5px; color: var(--text-muted); font-weight: 500; }

  .md-block { display: flex; flex-direction: column; gap: 8px; }
  .md-block header {
    display: flex; align-items: center; gap: 6px;
    font-size: 10.5px; font-weight: 500; letter-spacing: .14em; text-transform: uppercase; color: var(--text-muted);
  }
  .md-block header small { margin-left: auto; font-size: 11px; color: var(--text-muted); text-transform: none; letter-spacing: .04em; }
  .md-block.tagro { padding: 14px 16px; border-radius: 14px; background: color-mix(in srgb, var(--btn-prim) 6%, transparent); border: 1px solid color-mix(in srgb, var(--btn-prim) 22%, var(--border)); }
  .md-block.tagro p { margin: 0; font-size: 13px; line-height: 1.55; color: var(--text); font-weight: 500; letter-spacing: .015em; }
  .md-block.alert header { color: #d4882b; }
  .md-empty { margin: 0; font-size: 12.5px; color: var(--text-muted); font-weight: 500; }

  .md-list { display: flex; flex-direction: column; gap: 4px; }
  .md-list-row {
    display: grid; grid-template-columns: 8px 1fr auto;
    gap: 10px; align-items: center;
    padding: 8px 12px; border-radius: 10px;
    background: var(--card); border: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
    color: var(--text); text-decoration: none;
    font-size: 12.5px; font-weight: 500; letter-spacing: .012em;
    transition: background .12s;
  }
  .md-list-row:hover { background: color-mix(in srgb, var(--surface-2) 55%, transparent); }
  .md-list-row > span:first-child { width: 6px; height: 6px; border-radius: 50%; background: var(--text-muted); }
  .md-list-row > .tm-proj-dot { width: 8px; height: 8px; }
  .md-list-row small { font-size: 11px; color: var(--text-muted); font-weight: 500; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .md-actions { display: flex; gap: 8px; padding-top: 14px; border-top: 1px solid color-mix(in srgb, var(--border) 50%, transparent); flex-wrap: wrap; }
  .md-primary, .md-secondary {
    display: inline-flex; align-items: center; gap: 6px;
    height: 36px; padding: 0 14px; border-radius: 999px;
    text-decoration: none;
    font: inherit; font-size: 12px; font-weight: 500; letter-spacing: .015em;
    cursor: pointer; transition: opacity .12s, background .12s, color .12s, border-color .12s;
  }
  .md-primary { background: var(--btn-prim); color: var(--btn-prim-text); border: 0; flex: 1; justify-content: center; }
  .md-primary:hover:not(:disabled) { opacity: .92; }
  .md-primary:disabled { opacity: .4; cursor: not-allowed; }
  .md-secondary { background: transparent; color: var(--text-secondary); border: 1px solid color-mix(in srgb, var(--border) 65%, transparent); }
  .md-secondary:hover { background: color-mix(in srgb, var(--surface-2) 55%, transparent); color: var(--text); }

  .md-field { display: flex; flex-direction: column; gap: 4px; }
  .md-field span:first-child { font-size: 10.5px; font-weight: 500; letter-spacing: .14em; text-transform: uppercase; color: var(--text-muted); }
  .md-field input, .md-field select {
    height: 36px; padding: 0 12px;
    background: color-mix(in srgb, var(--surface) 65%, var(--card));
    border: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
    border-radius: 10px;
    color: var(--text); font: inherit; font-size: 13px; font-weight: 500; letter-spacing: .012em;
    outline: 0; transition: border-color .12s, box-shadow .12s;
  }
  .md-field input:focus, .md-field select:focus {
    border-color: color-mix(in srgb, var(--text) 30%, var(--border));
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--text) 5%, transparent);
  }
  .md-field-hint { font-size: 11px; color: var(--text-muted); font-weight: 500; letter-spacing: .012em; margin-top: 2px; }
  .md-error { margin: 0; padding: 8px 12px; background: color-mix(in srgb, #ef4444 10%, transparent); color: #ef4444; border-radius: 10px; font-size: 12px; font-weight: 500; }
  .md-note { margin: 8px 0 0; padding: 10px 12px; background: color-mix(in srgb, var(--surface-2) 35%, transparent); border-radius: 10px; color: var(--text-muted); font-size: 11.5px; font-weight: 500; line-height: 1.5; }
  .md-foot { display: flex; justify-content: flex-end; gap: 8px; padding: 14px 22px; border-top: 1px solid color-mix(in srgb, var(--border) 50%, transparent); background: color-mix(in srgb, var(--surface) 30%, var(--bg)); }
`
