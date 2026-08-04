'use client'

import Link from 'next/link'
import AppShellModulePage from '@/components/app-shell/AppShellModulePage'
import { useWorkspaceOverview } from '@/hooks/useWorkspaceOverview'
import { openNewProject } from '@/lib/new-project-open'

function formatStatus(raw: string | null): string {
  if (!raw) return 'Offen'
  const s = raw.replace(/_/g, ' ').trim()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function HomeTasksPage() {
  const { state } = useWorkspaceOverview()

  if (state.status === 'loading') {
    return <AppShellModulePage title="Aufgaben" loading />
  }
  if (state.status === 'empty') {
    return <AppShellModulePage title="Aufgaben" noWorkspace />
  }
  if (state.status === 'error') {
    return <AppShellModulePage title="Aufgaben" error />
  }

  const tasks = state.data.tasks || []
  if (tasks.length === 0) {
    return (
      <AppShellModulePage
        title="Aufgaben"
        empty
        emptyBody="Noch keine offenen Aufgaben in diesem Workspace. Mit einem Projekt starten Aufgaben von selbst zu entstehen."
        emptyAction="new-project"
      />
    )
  }

  return (
    <AppShellModulePage
      title="Aufgaben"
      action={
        <button type="button" className="fas-btn" onClick={() => openNewProject()}>
          Neues Projekt
        </button>
      }
    >
      <ul className="fas-list">
        {tasks.map((t) => (
          <li key={t.id} className="fas-list-row">
            <div className="fas-list-copy">
              <p className="fas-list-title">{t.title}</p>
              <p className="fas-list-meta">
                {[t.projectTitle, formatStatus(t.status)].filter(Boolean).join(', ')}
              </p>
            </div>
            {t.projectId ? (
              <Link href={`/project/${t.projectId}`} className="fas-list-action">
                Öffnen
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </AppShellModulePage>
  )
}
