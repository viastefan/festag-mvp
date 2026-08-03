'use client'

import { openWorkspaceCreateWizard } from '@/lib/workspace-create-open'

type Props = {
  title: string
  description?: string
  /** Workspaces route — this *is* the create surface entry. */
  ctaLabel?: string
}

export default function AppShellModuleEmpty({
  title,
  description = 'Create a workspace to unlock this part of Festag.',
  ctaLabel = 'Workspace erstellen',
}: Props) {
  return (
    <div className="fas-empty fas-assemble">
      <h1 className="fas-empty-title">{title}</h1>
      <p className="fas-empty-body">{description}</p>
      <button type="button" className="fas-btn" onClick={() => openWorkspaceCreateWizard()}>
        {ctaLabel}
      </button>
    </div>
  )
}
