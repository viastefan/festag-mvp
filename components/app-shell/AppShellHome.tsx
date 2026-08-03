'use client'

import { useRouter } from 'next/navigation'
import {
  APP_SHELL_CREATE_WORKSPACE_HREF,
  appShellGreeting,
} from '@/components/app-shell/app-shell-nav'
import AppShellWorkflow from '@/components/app-shell/AppShellWorkflow'
import { prepareAuthRouteTransition, navigateLeavingAuthChrome } from '@/lib/auth-theme'
import { getDisplayName, type UserProfile } from '@/lib/hooks/useUser'
import { ArrowRight } from '@phosphor-icons/react'

type Props = {
  user: UserProfile | null
}

export default function AppShellHome({ user }: Props) {
  const router = useRouter()
  const firstName = getDisplayName(user) || 'there'
  const greet = appShellGreeting()

  function createWorkspace() {
    prepareAuthRouteTransition(APP_SHELL_CREATE_WORKSPACE_HREF)
    router.push(APP_SHELL_CREATE_WORKSPACE_HREF)
  }

  function openDocs(path = '/docs') {
    navigateLeavingAuthChrome(path)
  }

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
        <button type="button" className="fas-btn" onClick={createWorkspace}>
          Create Workspace
        </button>
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
