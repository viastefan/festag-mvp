'use client'

import type { MemberWorkload, TeamMember } from '@/lib/teams/build-workload'

function memberName(m: TeamMember): string {
  return m.full_name?.trim() || m.first_name?.trim() || m.email?.split('@')[0] || 'Mitglied'
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '··'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function roleLabel(role?: string | null, position?: string | null): string {
  if (position?.trim()) return position.trim()
  if (!role) return 'Mitglied'
  if (role === 'project_owner' || role === 'owner') return 'Project Owner'
  if (role === 'developer' || role === 'dev') return 'Entwickler'
  if (role === 'designer') return 'Designer'
  if (role === 'reviewer') return 'Reviewer'
  return role
}

type Props = {
  member: TeamMember
  workload?: MemberWorkload
  isLast?: boolean
}

export default function TeamMemberCardRow({ member, workload: w, isLast }: Props) {
  const name = memberName(member)
  const atRisk = w?.atRisk

  return (
    <article
      className={`dec-card team-member-row${atRisk ? ' team-member-row--risk' : ''}`}
      style={isLast ? { borderBottom: 'none' } : undefined}
    >
      <div className="dec-card-left">
        <div className="team-member-mark">
          <span className="team-avatar">{initials(name)}</span>
          <div className="dec-card-title-block">
            <p className="dec-card-title">{name}</p>
            <p className="dec-card-project">{roleLabel(member.role, member.position)}</p>
          </div>
        </div>
        <span className="dec-card-type-pill">
          <span
            className="dec-card-dot"
            style={{ background: atRisk ? '#ea580c' : '#16a34a' }}
          />
          {(member.availability ?? 'full_time') === 'full_time' ? 'Verfügbar' : 'Eingeschränkt'}
        </span>
      </div>

      <div className="dec-card-mid">
        <div className="dec-card-section">
          <span className="dec-card-label">Workload</span>
          <span className="dec-card-muted">
            {w?.active ?? 0} aktiv · {w?.review ?? 0} review · {w?.blocked ?? 0} blockiert
          </span>
        </div>
      </div>

      <div className="dec-card-meta">
        <div className="dec-card-section">
          <span className="dec-card-label">Offen</span>
          <span className="dec-card-muted">{w?.open ?? 0} Tasks</span>
        </div>
        {w?.overloaded ? (
          <span className="team-risk-pill">Überlastet</span>
        ) : atRisk ? (
          <span className="team-risk-pill team-risk-pill--soft">Achtung</span>
        ) : null}
      </div>
    </article>
  )
}
