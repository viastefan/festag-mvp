'use client'

import Link from 'next/link'
import { ArrowRight } from '@phosphor-icons/react'
import AppShellModulePage from '@/components/app-shell/AppShellModulePage'
import { useWorkspaceOverview } from '@/hooks/useWorkspaceOverview'
import { openNewProject } from '@/lib/new-project-open'

const HEALTH_LABEL: Record<string, string> = {
  healthy: 'Stabil',
  watch: 'Aufmerksamkeit',
  risk: 'Risiko',
  blocked: 'Blockiert',
}

export default function HomeProjectsPage() {
  const { state } = useWorkspaceOverview()

  if (state.status === 'loading') {
    return <AppShellModulePage title="Projekte" loading />
  }
  if (state.status === 'empty') {
    return <AppShellModulePage title="Projekte" noWorkspace />
  }
  if (state.status === 'error') {
    return <AppShellModulePage title="Projekte" error />
  }

  const projects = state.data.projects || []
  if (projects.length === 0) {
    return (
      <AppShellModulePage
        title="Projekte"
        empty
        emptyBody={`Noch keine Projekte in ${state.data.workspace.name}. Mit Tagro anlegen — Chat, Mitwirkende und Einladungen folgen im Popup.`}
        emptyAction="new-project"
      />
    )
  }

  return (
    <AppShellModulePage
      title="Projekte"
      action={
        <button type="button" className="fas-btn" onClick={() => openNewProject()}>
          Neues Projekt
        </button>
      }
    >
      <div className="fas-wo-project-grid">
        {projects.map((p) => (
          <article key={p.id} className="fas-wo-project">
            <div className="fas-wo-project-top">
              <h2 className="fas-wo-project-name">{p.title}</h2>
              <span className={`fas-wo-health fas-wo-health--${p.health}`}>
                {HEALTH_LABEL[p.health] || p.health}
              </span>
            </div>
            <div className="fas-wo-progress" aria-label={`Fortschritt ${p.progress}%`}>
              <span className="fas-wo-progress-bar" style={{ width: `${p.progress}%` }} />
            </div>
            <dl className="fas-wo-project-meta">
              <div>
                <dt>Phase</dt>
                <dd>{p.phase || p.status || 'Planung'}</dd>
              </div>
              <div>
                <dt>Fortschritt</dt>
                <dd>{p.progress}%</dd>
              </div>
              <div>
                <dt>Nächstes</dt>
                <dd>{p.nextMilestone || '—'}</dd>
              </div>
            </dl>
            <Link href={`/project/${p.id}`} className="fas-wo-project-open">
              Projekt öffnen
              <ArrowRight size={13} weight="bold" />
            </Link>
          </article>
        ))}
      </div>
    </AppShellModulePage>
  )
}
