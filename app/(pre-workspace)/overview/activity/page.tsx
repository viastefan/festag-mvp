'use client'

import Link from 'next/link'
import AppShellModulePage from '@/components/app-shell/AppShellModulePage'
import { useWorkspaceOverview } from '@/hooks/useWorkspaceOverview'

function formatRelative(iso: string): string {
  try {
    const t = new Date(iso).getTime()
    const diff = Date.now() - t
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'gerade eben'
    if (mins < 60) return `vor ${mins}m`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `vor ${hours}h`
    const days = Math.floor(hours / 24)
    if (days < 7) return `vor ${days}d`
    return new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
  } catch {
    return ''
  }
}

export default function HomeActivityPage() {
  const { state } = useWorkspaceOverview()

  if (state.status === 'loading') {
    return <AppShellModulePage title="Aktivität" loading />
  }
  if (state.status === 'empty') {
    return <AppShellModulePage title="Aktivität" noWorkspace />
  }
  if (state.status === 'error') {
    return <AppShellModulePage title="Aktivität" error />
  }

  const activity = state.data.activity || []
  if (activity.length === 0) {
    return (
      <AppShellModulePage
        title="Aktivität"
        empty
        emptyBody="Aktivität erscheint, sobald in Projekten gearbeitet wird."
        emptyAction="new-project"
      />
    )
  }

  return (
    <AppShellModulePage title="Aktivität">
      <ol className="fas-list fas-list--feed">
        {activity.map((a) => (
          <li key={a.id} className="fas-list-row">
            <span className="fas-list-dot" aria-hidden />
            <div className="fas-list-copy">
              <p className="fas-list-title">{a.title}</p>
              <p className="fas-list-meta">
                {[a.projectTitle, formatRelative(a.createdAt)].filter(Boolean).join(', ')}
              </p>
            </div>
          </li>
        ))}
      </ol>
      {state.data.projects[0] ? (
        <p className="fas-module-foot">
          <Link href={`/project/${state.data.projects[0].id}`} className="fas-wo-section-link">
            Zum aktuellen Projekt
          </Link>
        </p>
      ) : null}
    </AppShellModulePage>
  )
}
