'use client'

/**
 * Festag OS — Workspace Overview (with workspace).
 * Answers in ~5 seconds: what is happening today?
 */

import Link from 'next/link'
import { ArrowRight, Headphones, FileText } from '@phosphor-icons/react'
import OverviewPendingInvites from '@/components/app-shell/OverviewPendingInvites'
import { openNewProject } from '@/lib/new-project-open'

export type OverviewPayload = {
  workspace: { id: string; name: string }
  summary: {
    activeProjects: number
    pendingDecisions: number
    teamMembers: number
    nextMilestone: string | null
    calmLine: string
  }
  briefing: {
    projectTitle: string
    lines: string[]
    reportId: string | null
    projectId: string | null
  } | null
  projects: Array<{
    id: string
    title: string
    phase: string | null
    progress: number
    health: 'healthy' | 'watch' | 'risk' | 'blocked'
    status: string | null
    nextMilestone: string | null
  }>
  decisions: Array<{
    id: string
    title: string
    projectId: string | null
    projectTitle: string
    urgency: string | null
    dueDate: string | null
  }>
  activity: Array<{
    id: string
    title: string
    body: string | null
    createdAt: string
    projectTitle: string | null
  }>
  team: Array<{
    id: string
    name: string
    avatarUrl: string | null
    role: string | null
  }>
}

const HEALTH_LABEL: Record<OverviewPayload['projects'][number]['health'], string> = {
  healthy: 'Healthy',
  watch: 'Needs attention',
  risk: 'At risk',
  blocked: 'Blocked',
}

type Props = {
  greeting: string
  firstName: string
  data: OverviewPayload
}

export default function WorkspaceOverviewLive({ greeting, firstName, data }: Props) {
  const { workspace, summary, briefing, projects, decisions, activity, team } = data

  return (
    <div className="fas-wo">
      <OverviewPendingInvites />

      <section className="fas-wo-hero fas-assemble">
        <h1 className="fas-wo-greet">
          {greeting}, {firstName}.
        </h1>
        <p className="fas-wo-calm">{summary.calmLine}</p>
        <ul className="fas-wo-meta" aria-label="Workspace summary">
          <li>{summary.activeProjects} Active Project{summary.activeProjects === 1 ? '' : 's'}</li>
          <li>{summary.pendingDecisions} Pending Decision{summary.pendingDecisions === 1 ? '' : 's'}</li>
          <li>{summary.teamMembers} Team Member{summary.teamMembers === 1 ? '' : 's'}</li>
          {summary.nextMilestone ? (
            <li>Next Milestone: {summary.nextMilestone}</li>
          ) : (
            <li>No upcoming milestone</li>
          )}
        </ul>
      </section>

      {briefing ? (
        <section className="fas-wo-briefing fas-assemble fas-assemble-d1" aria-labelledby="fas-wo-briefing-title">
          <h2 id="fas-wo-briefing-title" className="fas-wo-briefing-title">
            Today&apos;s Briefing
          </h2>
          <p className="fas-wo-briefing-project">{briefing.projectTitle}</p>
          <ul className="fas-wo-briefing-lines">
            {briefing.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <div className="fas-wo-briefing-actions">
            <button type="button" className="fas-wo-btn fas-wo-btn--quiet" disabled title="Coming soon">
              <Headphones size={15} weight="regular" />
              Listen to Briefing
            </button>
            <Link href="/overview/projects" className="fas-wo-btn">
              <FileText size={15} weight="regular" />
              Read Summary
            </Link>
          </div>
        </section>
      ) : null}

      <section className="fas-wo-section fas-assemble fas-assemble-d2" aria-labelledby="fas-wo-projects-title">
        <div className="fas-wo-section-head">
          <h2 id="fas-wo-projects-title" className="fas-wo-section-title">Active Projects</h2>
          <Link href="/overview/projects" className="fas-wo-section-link">
            All projects
            <ArrowRight size={12} weight="bold" />
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="fas-wo-empty">
            <p>No projects yet. Create your first project to give this workspace a center of gravity.</p>
            <button type="button" className="fas-btn" onClick={() => openNewProject()}>
              Neues Projekt
            </button>
          </div>
        ) : (
          <div className="fas-wo-project-grid">
            {projects.slice(0, 6).map((p) => (
              <article key={p.id} className="fas-wo-project">
                <div className="fas-wo-project-top">
                  <h3 className="fas-wo-project-name">{p.title}</h3>
                  <span className={`fas-wo-health fas-wo-health--${p.health}`}>
                    {HEALTH_LABEL[p.health]}
                  </span>
                </div>
                <div className="fas-wo-progress" aria-label={`Progress ${p.progress}%`}>
                  <span className="fas-wo-progress-bar" style={{ width: `${p.progress}%` }} />
                </div>
                <dl className="fas-wo-project-meta">
                  <div>
                    <dt>Phase</dt>
                    <dd>{formatLabel(p.phase || p.status || 'Planning')}</dd>
                  </div>
                  <div>
                    <dt>Progress</dt>
                    <dd>{p.progress}%</dd>
                  </div>
                  <div>
                    <dt>Next</dt>
                    <dd>{p.nextMilestone || '—'}</dd>
                  </div>
                </dl>
                <Link href={`/overview/projects`} className="fas-wo-project-open">
                  Open Project
                  <ArrowRight size={13} weight="bold" />
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="fas-wo-section fas-assemble fas-assemble-d3" aria-labelledby="fas-wo-decisions-title">
        <div className="fas-wo-section-head">
          <h2 id="fas-wo-decisions-title" className="fas-wo-section-title">Pending Decisions</h2>
        </div>
        {decisions.length === 0 ? (
          <p className="fas-wo-quiet">No decisions need you right now.</p>
        ) : (
          <div className="fas-wo-decision-list">
            {decisions.map((d) => (
              <article key={d.id} className="fas-wo-decision">
                <div className="fas-wo-decision-copy">
                  <h3 className="fas-wo-decision-title">{d.title}</h3>
                  <p className="fas-wo-decision-meta">
                    {d.projectTitle}
                    {d.urgency ? `, ${formatLabel(d.urgency)}` : ''}
                    {d.dueDate ? `, due ${formatDate(d.dueDate)}` : ''}
                  </p>
                </div>
                <Link href="/overview/inbox" className="fas-wo-btn">
                  Review
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="fas-wo-split">
        <section className="fas-wo-section fas-assemble fas-assemble-d4" aria-labelledby="fas-wo-activity-title">
          <div className="fas-wo-section-head">
            <h2 id="fas-wo-activity-title" className="fas-wo-section-title">Workspace Activity</h2>
            <Link href="/overview/activity" className="fas-wo-section-link">
              Full feed
              <ArrowRight size={12} weight="bold" />
            </Link>
          </div>
          {activity.length === 0 ? (
            <p className="fas-wo-quiet">Activity will appear as work moves through projects.</p>
          ) : (
            <ol className="fas-wo-activity">
              {activity.map((a) => (
                <li key={a.id} className="fas-wo-activity-row">
                  <div className="fas-wo-activity-dot" aria-hidden />
                  <div className="fas-wo-activity-copy">
                    <p className="fas-wo-activity-title">{a.title}</p>
                    <p className="fas-wo-activity-meta">
                      {[a.projectTitle, formatRelative(a.createdAt)].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="fas-wo-section fas-assemble fas-assemble-d5" aria-labelledby="fas-wo-team-title">
          <div className="fas-wo-section-head">
            <h2 id="fas-wo-team-title" className="fas-wo-section-title">Team Snapshot</h2>
            <Link href="/overview/team" className="fas-wo-section-link">
              Team
              <ArrowRight size={12} weight="bold" />
            </Link>
          </div>
          {team.length === 0 ? (
            <p className="fas-wo-quiet">Invite people from workspace setup to see them here.</p>
          ) : (
            <ul className="fas-wo-team">
              {team.map((m) => (
                <li key={m.id} className="fas-wo-team-item" title={m.name}>
                  {m.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.avatarUrl} alt="" className="fas-wo-avatar" />
                  ) : (
                    <span className="fas-wo-avatar fas-wo-avatar--fallback">
                      {initials(m.name)}
                    </span>
                  )}
                  <span className="fas-wo-team-name">{m.name}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function formatLabel(raw: string): string {
  const s = raw.replace(/_/g, ' ').trim()
  if (!s) return raw
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

function formatRelative(iso: string): string {
  try {
    const t = new Date(iso).getTime()
    const diff = Date.now() - t
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return formatDate(iso)
  } catch {
    return ''
  }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
}
