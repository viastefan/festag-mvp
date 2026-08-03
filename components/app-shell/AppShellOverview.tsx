'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  APP_SHELL_CREATE_WORKSPACE_HREF,
  appShellGreeting,
} from '@/components/app-shell/app-shell-nav'
import AppShellWorkflow from '@/components/app-shell/AppShellWorkflow'
import { prepareAuthRouteTransition, navigateLeavingAuthChrome } from '@/lib/auth-theme'
import { getDisplayName, type UserProfile } from '@/lib/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { getRememberedWorkspaceName } from '@/lib/pending-workspace'
import { ArrowRight } from '@phosphor-icons/react'

type Props = {
  user: UserProfile | null
}

export default function AppShellOverview({ user }: Props) {
  const router = useRouter()
  const firstName = getDisplayName(user) || 'there'
  const greet = appShellGreeting()
  const [workspaceName, setWorkspaceName] = useState<string | null>(
    () => getRememberedWorkspaceName(),
  )

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!alive || !authUser) return

        const { data: owned } = await supabase
          .from('workspaces')
          .select('name')
          .eq('primary_owner_id', authUser.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()

        let name = typeof owned?.name === 'string' ? owned.name.trim() : ''
        if (!name) {
          const { data: member } = await supabase
            .from('workspace_members')
            .select('workspace_id')
            .eq('user_id', authUser.id)
            .limit(1)
            .maybeSingle()
          if (member?.workspace_id) {
            const { data: ws } = await supabase
              .from('workspaces')
              .select('name')
              .eq('id', member.workspace_id)
              .maybeSingle()
            name = typeof ws?.name === 'string' ? ws.name.trim() : ''
          }
        }
        if (alive) setWorkspaceName(name || null)
      } catch { /* best-effort */ }
    })()
    return () => { alive = false }
  }, [user?.id])

  function createWorkspace() {
    prepareAuthRouteTransition(APP_SHELL_CREATE_WORKSPACE_HREF)
    router.push(APP_SHELL_CREATE_WORKSPACE_HREF)
  }

  function openDocs(path = '/docs') {
    navigateLeavingAuthChrome(path)
  }

  const hasWorkspace = Boolean(workspaceName)

  return (
    <div className="fas-home">
      <section className="fas-hero fas-assemble">
        <h1 className="fas-hero-greet">
          {greet}, {firstName}.
        </h1>
        <p className="fas-hero-title">
          {hasWorkspace ? workspaceName : 'Welcome to Festag.'}
        </p>
        <p className="fas-hero-support">
          {hasWorkspace
            ? 'Your workspace is ready. Workspace dashboard modules arrive next.'
            : 'Create your first workspace to start building software with Tagro.'}
        </p>
        {!hasWorkspace ? (
          <button type="button" className="fas-btn" onClick={createWorkspace}>
            Create Workspace
          </button>
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
