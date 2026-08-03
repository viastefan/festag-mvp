'use client'

import { useRouter } from 'next/navigation'
import { APP_SHELL_CREATE_WORKSPACE_HREF, appShellRoleLabel } from '@/components/app-shell/app-shell-nav'
import { useUser, getFullDisplayName, getDisplayName } from '@/lib/hooks/useUser'
import { prepareAuthRouteTransition } from '@/lib/auth-theme'

export default function HomeSettingsPage() {
  const { user } = useUser()
  const router = useRouter()
  const name = getFullDisplayName(user) || getDisplayName(user) || '—'
  const email = user?.email || '—'
  const role = appShellRoleLabel(user?.role)

  function createWorkspace() {
    prepareAuthRouteTransition(APP_SHELL_CREATE_WORKSPACE_HREF)
    router.push(APP_SHELL_CREATE_WORKSPACE_HREF)
  }

  return (
    <div className="fas-settings-lite fas-assemble">
      <h1 className="fas-empty-title">Settings</h1>
      <p className="fas-empty-body" style={{ marginBottom: 28 }}>
        Account basics are available now. Workspace settings unlock after you create a workspace.
      </p>

      <div className="fas-settings-row">
        <div className="fas-settings-row-label">Name</div>
        <div className="fas-settings-row-value">{name}</div>
      </div>
      <div className="fas-settings-row" style={{ marginTop: 10 }}>
        <div className="fas-settings-row-label">Email</div>
        <div className="fas-settings-row-value">{email}</div>
      </div>
      <div className="fas-settings-row" style={{ marginTop: 10 }}>
        <div className="fas-settings-row-label">Role</div>
        <div className="fas-settings-row-value">{role}</div>
      </div>

      <button type="button" className="fas-btn" style={{ marginTop: 28 }} onClick={createWorkspace}>
        Create Workspace
      </button>
    </div>
  )
}
