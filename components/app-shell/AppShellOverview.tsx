'use client'

import { useCallback, useEffect, useState } from 'react'
import { appShellGreeting } from '@/components/app-shell/app-shell-nav'
import AppShellWorkflow from '@/components/app-shell/AppShellWorkflow'
import WorkspaceOverviewLive, {
  type OverviewPayload,
} from '@/components/app-shell/WorkspaceOverviewLive'
import { navigateLeavingAuthChrome } from '@/lib/auth-theme'
import { getDisplayName, type UserProfile } from '@/lib/hooks/useUser'
import {
  openWorkspaceCreateWizard,
  WORKSPACE_CREATED_EVENT,
  WORKSPACE_RENAMED_EVENT,
} from '@/lib/workspace-create-open'
import { ArrowRight } from '@phosphor-icons/react'

type Props = {
  user: UserProfile | null
}

type LoadState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'ready'; data: OverviewPayload }
  | { status: 'error' }

export default function AppShellOverview({ user }: Props) {
  const firstName = getDisplayName(user) || 'there'
  const greet = appShellGreeting()
  const [load, setLoad] = useState<LoadState>({ status: 'loading' })

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/workspaces/overview', { cache: 'no-store' })
      if (!res.ok) {
        setLoad({ status: 'error' })
        return
      }
      const json = await res.json()
      if (!json?.workspace?.id) {
        setLoad({ status: 'empty' })
        return
      }
      setLoad({
        status: 'ready',
        data: {
          workspace: json.workspace,
          summary: json.summary,
          briefing: json.briefing,
          projects: json.projects || [],
          decisions: json.decisions || [],
          activity: json.activity || [],
          team: json.team || [],
        },
      })
    } catch {
      setLoad({ status: 'error' })
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh, user?.id])

  useEffect(() => {
    function onChanged() {
      void refresh()
    }
    window.addEventListener(WORKSPACE_CREATED_EVENT, onChanged)
    window.addEventListener(WORKSPACE_RENAMED_EVENT, onChanged)
    return () => {
      window.removeEventListener(WORKSPACE_CREATED_EVENT, onChanged)
      window.removeEventListener(WORKSPACE_RENAMED_EVENT, onChanged)
    }
  }, [refresh])

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

  /* Empty / soft — onboarding path: never feel abandoned */
  return (
    <div className="fas-home">
      <section className="fas-hero fas-assemble">
        <h1 className="fas-hero-greet">
          {greet}, {firstName}.
        </h1>
        <p className="fas-hero-title">Welcome to Festag.</p>
        <p className="fas-hero-support">
          Create your first workspace to start building software with Tagro.
        </p>
        <button type="button" className="fas-btn" onClick={() => openWorkspaceCreateWizard()}>
          Create workspace
        </button>
        {load.status === 'error' ? (
          <p className="fas-hero-support" style={{ marginTop: 14 }}>
            Couldn&apos;t load your workspace. Try creating one, or refresh.
          </p>
        ) : null}
      </section>

      <div className="fas-cards">
        <article className="fas-card fas-assemble fas-assemble-d2">
          <h2 className="fas-card-title">What is a Workspace?</h2>
          <p className="fas-card-body">
            A workspace is how your company works in Festag — projects, people, knowledge, and decisions in one living system.
          </p>
        </article>

        <article className="fas-card fas-assemble fas-assemble-d3">
          <h2 className="fas-card-title">How Festag Works</h2>
          <AppShellWorkflow />
        </article>

        <article className="fas-card fas-assemble fas-assemble-d4">
          <h2 className="fas-card-title">Explore Festag</h2>
          <div className="fas-card-links">
            <button type="button" className="fas-card-link" onClick={() => openDocs('/docs')}>
              Product Tour
              <ArrowRight size={13} weight="bold" />
            </button>
            <button type="button" className="fas-card-link" onClick={() => openDocs('/docs')}>
              Documentation
              <ArrowRight size={13} weight="bold" />
            </button>
            <span className="fas-card-link" style={{ cursor: 'default' }}>
              Examples
              <span className="fas-card-link-muted">Coming soon</span>
            </span>
          </div>
        </article>
      </div>
    </div>
  )
}
