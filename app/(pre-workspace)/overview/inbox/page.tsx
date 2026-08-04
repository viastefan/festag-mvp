'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import AppShellModulePage from '@/components/app-shell/AppShellModulePage'
import { useWorkspaceOverview } from '@/hooks/useWorkspaceOverview'
import { getActiveWorkspaceId, WORKSPACE_SWITCHED_EVENT } from '@/lib/active-workspace'

type InboxItem = {
  id: string
  title: string | null
  body: string | null
  project_id: string | null
  created_at: string
  read_at: string | null
  type?: string | null
}

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

export default function HomeInboxPage() {
  const { state } = useWorkspaceOverview()
  const [items, setItems] = useState<InboxItem[]>([])
  const [projects, setProjects] = useState<Record<string, { title: string }>>({})
  const [inboxLoading, setInboxLoading] = useState(true)
  const [decisionsOnly, setDecisionsOnly] = useState(false)

  const loadInbox = useCallback(async () => {
    setInboxLoading(true)
    try {
      const res = await fetch('/api/inbox/items?limit=80', { cache: 'no-store' })
      if (!res.ok) {
        setItems([])
        return
      }
      const json = await res.json()
      setItems(Array.isArray(json?.items) ? json.items : [])
      setProjects(json?.projects && typeof json.projects === 'object' ? json.projects : {})
    } catch {
      setItems([])
    } finally {
      setInboxLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadInbox()
  }, [loadInbox])

  useEffect(() => {
    function onSwitch() {
      void loadInbox()
    }
    window.addEventListener(WORKSPACE_SWITCHED_EVENT, onSwitch)
    return () => window.removeEventListener(WORKSPACE_SWITCHED_EVENT, onSwitch)
  }, [loadInbox])

  if (state.status === 'loading' || (state.status === 'ready' && inboxLoading)) {
    return <AppShellModulePage title="Posteingang" loading />
  }
  if (state.status === 'empty') {
    return <AppShellModulePage title="Posteingang" noWorkspace />
  }
  if (state.status === 'error') {
    return <AppShellModulePage title="Posteingang" error />
  }

  const decisions = state.data.decisions || []
  const activeWs = getActiveWorkspaceId()
  const wsProjectIds = new Set(state.data.projects.map((p) => p.id))

  const scopedItems = items.filter((item) => {
    if (!item.project_id) return true
    if (!activeWs) return true
    return wsProjectIds.has(item.project_id)
  })

  const showDecisions = decisionsOnly || scopedItems.length === 0
  const empty =
    scopedItems.length === 0 && decisions.length === 0

  if (empty) {
    return (
      <AppShellModulePage
        title="Posteingang"
        empty
        emptyBody="Alles ruhig. Entscheidungen und Nachrichten erscheinen hier, sobald sie dich brauchen."
        emptyAction="none"
      />
    )
  }

  return (
    <AppShellModulePage
      title="Posteingang"
      action={
        decisions.length > 0 && scopedItems.length > 0 ? (
          <button
            type="button"
            className="fas-btn fas-btn--ghost"
            onClick={() => setDecisionsOnly((v) => !v)}
          >
            {decisionsOnly ? 'Alle Nachrichten' : 'Nur Entscheidungen'}
          </button>
        ) : null
      }
    >
      {showDecisions && decisions.length > 0 ? (
        <section className="fas-module-block" aria-label="Offene Entscheidungen">
          <h2 className="fas-module-sub">Offene Entscheidungen</h2>
          <ul className="fas-list">
            {decisions.map((d) => (
              <li key={d.id} className="fas-list-row">
                <div className="fas-list-copy">
                  <p className="fas-list-title">{d.title}</p>
                  <p className="fas-list-meta">
                    {[d.projectTitle, d.urgency].filter(Boolean).join(', ')}
                  </p>
                </div>
                <Link href={`/decisions/${d.id}`} className="fas-list-action">
                  Prüfen
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!decisionsOnly && scopedItems.length > 0 ? (
        <section className="fas-module-block" aria-label="Nachrichten">
          {decisions.length > 0 ? <h2 className="fas-module-sub">Nachrichten</h2> : null}
          <ul className="fas-list">
            {scopedItems.map((item) => {
              const projectTitle = item.project_id
                ? projects[item.project_id]?.title
                : null
              return (
                <li
                  key={item.id}
                  className={`fas-list-row${!item.read_at ? ' is-unread' : ''}`}
                >
                  <div className="fas-list-copy">
                    <p className="fas-list-title">{item.title || 'Nachricht'}</p>
                    <p className="fas-list-meta">
                      {[
                        projectTitle,
                        formatRelative(item.created_at),
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                  {item.project_id ? (
                    <Link href={`/project/${item.project_id}`} className="fas-list-action">
                      Öffnen
                    </Link>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </AppShellModulePage>
  )
}
