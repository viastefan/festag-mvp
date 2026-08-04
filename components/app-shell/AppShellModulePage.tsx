'use client'

/**
 * Shared module chrome for Festag OS rail pages.
 * One H1, optional primary action, honest empty / loading states.
 */

import type { ReactNode } from 'react'
import { openWorkspaceCreateWizard } from '@/lib/workspace-create-open'
import { openNewProject } from '@/lib/new-project-open'

type EmptyAction = 'create-workspace' | 'new-project' | 'none' | (() => void)

type Props = {
  title: string
  loading?: boolean
  /** No workspace at all */
  noWorkspace?: boolean
  empty?: boolean
  emptyBody?: string
  emptyAction?: EmptyAction
  emptyActionLabel?: string
  action?: ReactNode
  children?: ReactNode
  error?: boolean
}

export default function AppShellModulePage({
  title,
  loading,
  noWorkspace,
  empty,
  emptyBody,
  emptyAction = 'none',
  emptyActionLabel,
  action,
  children,
  error,
}: Props) {
  if (loading) {
    return (
      <div className="fas-module fas-assemble" aria-busy="true">
        <div className="fas-wo-skeleton" />
      </div>
    )
  }

  if (noWorkspace) {
    return (
      <div className="fas-empty fas-assemble">
        <h1 className="fas-empty-title">{title}</h1>
        <p className="fas-empty-body">
          Lege zuerst einen Workspace an — dann lebt dieser Bereich.
        </p>
        <button type="button" className="fas-btn" onClick={() => openWorkspaceCreateWizard()}>
          Workspace erstellen
        </button>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fas-empty fas-assemble">
        <h1 className="fas-empty-title">{title}</h1>
        <p className="fas-empty-body">
          Etwas ist schiefgelaufen. Bitte lade die Seite neu.
        </p>
      </div>
    )
  }

  if (empty) {
    const label =
      emptyActionLabel ||
      (emptyAction === 'create-workspace'
        ? 'Workspace erstellen'
        : emptyAction === 'new-project'
          ? 'Neues Projekt'
          : null)

    function onEmptyAction() {
      if (emptyAction === 'create-workspace') openWorkspaceCreateWizard()
      else if (emptyAction === 'new-project') openNewProject()
      else if (typeof emptyAction === 'function') emptyAction()
    }

    return (
      <div className="fas-empty fas-assemble">
        <h1 className="fas-empty-title">{title}</h1>
        {emptyBody ? <p className="fas-empty-body">{emptyBody}</p> : null}
        {label ? (
          <button type="button" className="fas-btn" onClick={onEmptyAction}>
            {label}
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="fas-module fas-assemble">
      <header className="fas-module-head">
        <h1 className="fas-module-title">{title}</h1>
        {action ? <div className="fas-module-actions">{action}</div> : null}
      </header>
      <div className="fas-module-body">{children}</div>
    </div>
  )
}
