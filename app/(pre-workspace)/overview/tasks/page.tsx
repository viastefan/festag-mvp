'use client'

import { useRouter } from 'next/navigation'
import { Check } from '@phosphor-icons/react'
import { FESTAG_PAGE_STYLES } from '@/components/app-shell/festag-page-styles'
import { useWorkspaceOverview } from '@/hooks/useWorkspaceOverview'
import { openNewProject } from '@/lib/new-project-open'
import { openWorkspaceCreateWizard } from '@/lib/workspace-create-open'

function formatStatus(raw: string | null): string {
  if (!raw) return 'Offen'
  const s = raw.replace(/_/g, ' ').trim()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function isDone(status: string | null): boolean {
  const s = (status || '').toLowerCase()
  return s.includes('done') || s.includes('complete') || s.includes('approved') || s.includes('abgeschlossen')
}

export default function HomeTasksPage() {
  const router = useRouter()
  const { state } = useWorkspaceOverview()

  const tasks = state.status === 'ready' ? state.data.tasks || [] : []
  const openCount = tasks.filter((t) => !isDone(t.status)).length

  return (
    <div className="fps">
      <style>{FESTAG_PAGE_STYLES}</style>

      <header className="fps-head">
        <h1 className="fps-title">Aufgaben</h1>
        {state.status === 'ready' ? (
          <p className="fps-stat-line">
            <strong>{openCount}</strong> {openCount === 1 ? 'offene Aufgabe' : 'offene Aufgaben'}
            {tasks.length !== openCount ? <> {' · '}{tasks.length} insgesamt</> : null}
          </p>
        ) : null}
      </header>

      {state.status === 'loading' ? (
        <p className="fps-empty">Lade Aufgaben…</p>
      ) : state.status === 'empty' ? (
        <div className="fps-list">
          <div className="fps-empty">
            <p>Lege zuerst einen Workspace an — dann leben deine Aufgaben hier.</p>
            <button type="button" className="fps-filter" style={{ marginTop: 12 }} onClick={() => openWorkspaceCreateWizard()}>
              Workspace erstellen
            </button>
          </div>
        </div>
      ) : state.status === 'error' ? (
        <div className="fps-list"><p className="fps-empty">Etwas ist schiefgelaufen. Bitte lade die Seite neu.</p></div>
      ) : tasks.length === 0 ? (
        <div className="fps-list">
          <div className="fps-empty">
            <p>Noch keine offenen Aufgaben. Sobald ein Projekt läuft, entstehen Aufgaben von selbst.</p>
            <button type="button" className="fps-filter" style={{ marginTop: 12 }} onClick={() => openNewProject()}>
              Neues Projekt
            </button>
          </div>
        </div>
      ) : (
        <div className="fps-list">
          {tasks.map((t) => {
            const done = isDone(t.status)
            return (
              <button
                key={t.id}
                type="button"
                className="fps-row"
                onClick={() => { if (t.projectId) router.push(`/project/${t.projectId}`) }}
                disabled={!t.projectId}
                style={!t.projectId ? { cursor: 'default' } : undefined}
              >
                <div className="fps-row-body">
                  <span className={`fps-mark${!done ? ' is-attn' : ''}`} aria-hidden>
                    {done ? <Check size={10} weight="bold" /> : <span className="fps-mark-dot" />}
                  </span>
                  <span className="fps-row-copy">
                    <span className="fps-row-title">{t.title}</span>
                    <span className="fps-row-sub">
                      {[t.projectTitle, formatStatus(t.status)].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
