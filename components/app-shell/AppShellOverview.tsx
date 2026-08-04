'use client'

import { appShellGreeting } from '@/components/app-shell/app-shell-nav'
import AppShellWorkflow from '@/components/app-shell/AppShellWorkflow'
import WorkspaceOverviewLive from '@/components/app-shell/WorkspaceOverviewLive'
import { navigateLeavingAuthChrome } from '@/lib/auth-theme'
import { getDisplayName, type UserProfile } from '@/lib/hooks/useUser'
import { openWorkspaceCreateWizard } from '@/lib/workspace-create-open'
import { useWorkspaceOverview } from '@/hooks/useWorkspaceOverview'
import { ArrowRight } from '@phosphor-icons/react'

type Props = {
  user: UserProfile | null
}

export default function AppShellOverview({ user }: Props) {
  const firstName = getDisplayName(user) || 'du'
  const greet = appShellGreeting()
  const { state: load } = useWorkspaceOverview()

  function openDocs(path = '/docs') {
    navigateLeavingAuthChrome(path)
  }

  if (load.status === 'loading') {
    return (
      <div className="fas-home fas-wo-loading" aria-busy="true">
        <div className="fas-wo-skeleton" />
      </div>
    )
  }

  if (load.status === 'ready') {
    return (
      <WorkspaceOverviewLive
        greeting={greet}
        firstName={firstName}
        data={load.data}
      />
    )
  }

  return (
    <div className="fas-home">
      <section className="fas-hero fas-assemble">
        <h1 className="fas-hero-greet">
          {greet}, {firstName}.
        </h1>
        <p className="fas-hero-title">Willkommen bei Festag.</p>
        <button type="button" className="fas-btn" onClick={() => openWorkspaceCreateWizard()}>
          Workspace erstellen
        </button>
        {load.status === 'error' ? (
          <p className="fas-hero-support" role="status">
            Übersicht konnte nicht geladen werden. Bitte erneut versuchen.
          </p>
        ) : null}
      </section>

      <AppShellWorkflow />

      <section className="fas-support fas-assemble fas-assemble-d3">
        <button type="button" className="fas-support-link" onClick={() => openDocs()}>
          Docs
          <ArrowRight size={14} weight="bold" />
        </button>
        <button type="button" className="fas-support-link" onClick={() => openDocs('/docs/getting-started')}>
          Erste Schritte
          <ArrowRight size={14} weight="bold" />
        </button>
      </section>
    </div>
  )
}
