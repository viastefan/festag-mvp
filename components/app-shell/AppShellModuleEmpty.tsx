'use client'

import { openWorkspaceCreateWizard } from '@/lib/workspace-create-open'
import { openNewProject } from '@/lib/new-project-open'

type Props = {
  title: string
  description?: string
  ctaLabel?: string
  /** Default: create workspace. Use new-project when a workspace already exists. */
  action?: 'create-workspace' | 'new-project' | 'none'
}

export default function AppShellModuleEmpty({
  title,
  description = 'Lege einen Workspace an, um diesen Bereich freizuschalten.',
  ctaLabel,
  action = 'create-workspace',
}: Props) {
  const label =
    ctaLabel ||
    (action === 'new-project'
      ? 'Neues Projekt'
      : action === 'create-workspace'
        ? 'Workspace erstellen'
        : null)

  function onClick() {
    if (action === 'create-workspace') openWorkspaceCreateWizard()
    else if (action === 'new-project') openNewProject()
  }

  return (
    <div className="fas-empty fas-assemble">
      <h1 className="fas-empty-title">{title}</h1>
      <p className="fas-empty-body">{description}</p>
      {label ? (
        <button type="button" className="fas-btn" onClick={onClick}>
          {label}
        </button>
      ) : null}
    </div>
  )
}
