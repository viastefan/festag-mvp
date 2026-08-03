'use client'

import { useRouter } from 'next/navigation'
import { APP_SHELL_CREATE_WORKSPACE_HREF } from '@/components/app-shell/app-shell-nav'
import { prepareAuthRouteTransition } from '@/lib/auth-theme'

type Props = {
  title: string
  description?: string
  /** Workspaces route — this *is* the create surface entry. */
  ctaLabel?: string
}

export default function AppShellModuleEmpty({
  title,
  description = 'Create a workspace to unlock this part of Festag.',
  ctaLabel = 'Create Workspace',
}: Props) {
  const router = useRouter()

  function createWorkspace() {
    prepareAuthRouteTransition(APP_SHELL_CREATE_WORKSPACE_HREF)
    router.push(APP_SHELL_CREATE_WORKSPACE_HREF)
  }

  return (
    <div className="fas-empty fas-assemble">
      <h1 className="fas-empty-title">{title}</h1>
      <p className="fas-empty-body">{description}</p>
      <button type="button" className="fas-btn" onClick={createWorkspace}>
        {ctaLabel}
      </button>
    </div>
  )
}
