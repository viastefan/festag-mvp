'use client'

import AppShellModulePage from '@/components/app-shell/AppShellModulePage'
import { useWorkspaceOverview } from '@/hooks/useWorkspaceOverview'

function roleLabel(role: string | null): string {
  if (!role) return 'Mitglied'
  if (role === 'owner' || role === 'project_owner') return 'Owner'
  if (role === 'admin') return 'Admin'
  return role.charAt(0).toUpperCase() + role.slice(1)
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
}

export default function HomeTeamPage() {
  const { state } = useWorkspaceOverview()

  if (state.status === 'loading') {
    return <AppShellModulePage title="Team" loading />
  }
  if (state.status === 'empty') {
    return <AppShellModulePage title="Team" noWorkspace />
  }
  if (state.status === 'error') {
    return <AppShellModulePage title="Team" error />
  }

  const team = state.data.team || []
  if (team.length === 0) {
    return (
      <AppShellModulePage
        title="Team"
        empty
        emptyBody="Noch niemand außer dir. Lade Mitwirkende über ein Projekt ein."
        emptyAction="new-project"
        emptyActionLabel="Projekt anlegen"
      />
    )
  }

  return (
    <AppShellModulePage title="Team">
      <ul className="fas-team-grid">
        {team.map((m) => (
          <li key={m.id} className="fas-team-card">
            {m.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.avatarUrl} alt="" className="fas-team-avatar" />
            ) : (
              <span className="fas-team-avatar fas-team-avatar--fallback" aria-hidden>
                {initials(m.name)}
              </span>
            )}
            <div className="fas-team-copy">
              <p className="fas-team-name">{m.name}</p>
              <p className="fas-team-role">{roleLabel(m.role)}</p>
            </div>
          </li>
        ))}
      </ul>
    </AppShellModulePage>
  )
}
