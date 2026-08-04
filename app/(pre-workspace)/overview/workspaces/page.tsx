'use client'

import { Check } from '@phosphor-icons/react'
import AppShellModulePage from '@/components/app-shell/AppShellModulePage'
import { useWorkspaceOverview } from '@/hooks/useWorkspaceOverview'
import {
  emitWorkspaceSwitched,
  getActiveWorkspaceId,
} from '@/lib/active-workspace'
import { openWorkspaceCreateWizard } from '@/lib/workspace-create-open'

function initial(name: string): string {
  const clean = name.trim()
  return clean ? clean.charAt(0).toUpperCase() : 'F'
}

export default function HomeWorkspacesPage() {
  const { state } = useWorkspaceOverview()

  if (state.status === 'loading') {
    return <AppShellModulePage title="Workspaces" loading />
  }
  if (state.status === 'empty') {
    return <AppShellModulePage title="Workspaces" noWorkspace />
  }
  if (state.status === 'error') {
    return <AppShellModulePage title="Workspaces" error />
  }

  const list = state.data.workspaces?.length
    ? state.data.workspaces
    : [{ id: state.data.workspace.id, name: state.data.workspace.name }]
  const activeId = getActiveWorkspaceId() || state.data.workspace.id

  return (
    <AppShellModulePage
      title="Workspaces"
      action={
        <button type="button" className="fas-btn" onClick={() => openWorkspaceCreateWizard()}>
          Workspace erstellen
        </button>
      }
    >
      <ul className="fas-list">
        {list.map((ws) => {
          const active = ws.id === activeId
          return (
            <li key={ws.id}>
              <button
                type="button"
                className={`fas-list-row fas-list-row--btn${active ? ' is-active' : ''}`}
                onClick={() => {
                  if (active) return
                  emitWorkspaceSwitched({ id: ws.id, name: ws.name })
                }}
              >
                <span className="fas-ws-switch-mark" aria-hidden>
                  {initial(ws.name)}
                </span>
                <div className="fas-list-copy">
                  <p className="fas-list-title">{ws.name}</p>
                  <p className="fas-list-meta">
                    {active ? 'Aktiv' : 'Wechseln'}
                  </p>
                </div>
                {active ? <Check size={14} weight="bold" aria-hidden /> : null}
              </button>
            </li>
          )
        })}
      </ul>
    </AppShellModulePage>
  )
}
