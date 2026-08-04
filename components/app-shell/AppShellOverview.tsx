'use client'

import { appShellGreeting } from '@/components/app-shell/app-shell-nav'
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
  const { state: load, refresh } = useWorkspaceOverview()

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
