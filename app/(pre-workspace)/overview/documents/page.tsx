'use client'

import Link from 'next/link'
import AppShellModulePage from '@/components/app-shell/AppShellModulePage'
import { useWorkspaceOverview } from '@/hooks/useWorkspaceOverview'
import { openNewProject } from '@/lib/new-project-open'

export default function HomeDocumentsPage() {
  const { state } = useWorkspaceOverview()

  if (state.status === 'loading') {
    return <AppShellModulePage title="Dokumente" loading />
  }
  if (state.status === 'empty') {
    return <AppShellModulePage title="Dokumente" noWorkspace />
  }
  if (state.status === 'error') {
    return <AppShellModulePage title="Dokumente" error />
  }

  const projects = state.data.projects || []
  if (projects.length === 0) {
    return (
      <AppShellModulePage
        title="Dokumente"
        empty
        emptyBody="Dokumente leben in Projekten. Lege ein Projekt an, dann erscheinen Dateien und Deliverables dort."
        emptyAction="new-project"
      />
    )
  }

  return (
    <AppShellModulePage
      title="Dokumente"
      action={
        <button type="button" className="fas-btn" onClick={() => openNewProject()}>
          Neues Projekt
        </button>
      }
    >
      <p className="fas-module-lead-inline">
        Öffne ein Projekt, um Dateien und Deliverables zu sehen.
      </p>
      <ul className="fas-list">
        {projects.map((p) => (
          <li key={p.id} className="fas-list-row">
            <div className="fas-list-copy">
              <p className="fas-list-title">{p.title}</p>
              <p className="fas-list-meta">{p.phase || p.status || 'Planung'}</p>
            </div>
            <Link href={`/project/${p.id}`} className="fas-list-action">
              Öffnen
            </Link>
          </li>
        ))}
      </ul>
    </AppShellModulePage>
  )
}
