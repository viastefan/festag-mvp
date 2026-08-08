'use client'

import { useEffect, useRef, useState } from 'react'
import { appShellGreeting } from '@/components/app-shell/app-shell-nav'
import WorkspaceBoard from '@/components/app-shell/WorkspaceBoard'
import { navigateLeavingAuthChrome } from '@/lib/auth-theme'
import { getDisplayName, type UserProfile } from '@/lib/hooks/useUser'
import { openWorkspaceCreateWizard } from '@/lib/workspace-create-open'
import { useWorkspaceOverview } from '@/hooks/useWorkspaceOverview'
import { isOverviewPreview } from '@/lib/demo/overview-preview'
import { ArrowRight } from '@phosphor-icons/react'

type Props = {
  user: UserProfile | null
}

export default function AppShellOverview({ user }: Props) {
  const preview = isOverviewPreview()
  const firstName = getDisplayName(user) || (preview ? 'Stefan' : 'du')
  const greet = appShellGreeting()
  const { state: load, refresh } = useWorkspaceOverview()

  /* New user with no workspace — funnel straight into the (modular) create wizard,
     once per session so it never fights a user who closed it. */
  const autoOpenedRef = useRef(false)
  useEffect(() => {
    if (preview) return
    if (load.status !== 'empty' || autoOpenedRef.current) return
    try {
      if (sessionStorage.getItem('festag_ws_wizard_autoopened')) return
      sessionStorage.setItem('festag_ws_wizard_autoopened', '1')
    } catch {
      /* private mode — still open once via ref guard */
    }
    autoOpenedRef.current = true
    openWorkspaceCreateWizard()
  }, [load.status, preview])

  /* Only admit to loading once it is actually slow. */
  const [slowLoad, setSlowLoad] = useState(false)
  useEffect(() => {
    if (load.status !== 'loading') {
      setSlowLoad(false)
      return
    }
    const t = window.setTimeout(() => setSlowLoad(true), 400)
    return () => window.clearTimeout(t)
  }, [load.status])

  function openDocs(path = '/docs') {
    navigateLeavingAuthChrome(path)
  }

  if (load.status === 'loading') {
    /* Fast loads should show nothing at all — a skeleton that flashes for
       120ms reads as jank, not as progress. */
    return slowLoad ? (
      <div className="fas-home fas-wo-loading" aria-busy="true">
        <div className="fas-wo-skeleton" />
      </div>
    ) : (
      <div className="fas-home" aria-busy="true" />
    )
  }

  if (load.status === 'ready') {
    return (
      <WorkspaceBoard
        greeting={greet}
        firstName={firstName}
        data={load.data}
        onDecided={() => void refresh()}
      />
    )
  }

  /* No workspace — premium onboarding, never fake projects or stats */
  return (
    <div className="fas-home fas-onboard">
      <section className="fas-onboard-hero fas-assemble">
        <p className="fas-onboard-greet">
          {greet}, {firstName}.
        </p>
        <h1 className="fas-onboard-title">
          Erstelle deinen Workspace.
        </h1>
        <p className="fas-onboard-body">
          Dein Workspace ist der Ort, in dem Projekte, Team und Tagro zusammenlaufen.
          Sobald er steht, entsteht hier automatisch deine operative Übersicht — ohne Fake-Daten.
        </p>
        <button type="button" className="fas-btn fas-onboard-cta" onClick={() => openWorkspaceCreateWizard()}>
          Workspace erstellen
        </button>
        {load.status === 'error' ? (
          <p className="fas-onboard-status" role="status">
            Übersicht konnte nicht geladen werden. Bitte erneut versuchen.
          </p>
        ) : null}
      </section>

      <ol className="fas-onboard-steps fas-assemble fas-assemble-d2" aria-label="Nächste Schritte">
        <li className="fas-onboard-step">
          <span className="fas-onboard-step-n" aria-hidden>1</span>
          <div>
            <p className="fas-onboard-step-title">Workspace anlegen</p>
            <p className="fas-onboard-step-copy">Name, Nutzung und Domain — in wenigen Sekunden bereit.</p>
          </div>
        </li>
        <li className="fas-onboard-step">
          <span className="fas-onboard-step-n" aria-hidden>2</span>
          <div>
            <p className="fas-onboard-step-title">Erstes Projekt mit Tagro</p>
            <p className="fas-onboard-step-copy">Beschreibe die Idee — Tagro strukturiert Aufgaben und Mitwirkende.</p>
          </div>
        </li>
        <li className="fas-onboard-step">
          <span className="fas-onboard-step-n" aria-hidden>3</span>
          <div>
            <p className="fas-onboard-step-title">Team einladen</p>
            <p className="fas-onboard-step-copy">Mitglieder sehen denselben Workspace — eine Quelle der Wahrheit.</p>
          </div>
        </li>
      </ol>

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
