'use client'

import { useRouter } from 'next/navigation'
import { CaretRight, Check, Plus } from '@phosphor-icons/react'
import { FESTAG_PAGE_STYLES } from '@/components/app-shell/festag-page-styles'
import { useWorkspaceOverview } from '@/hooks/useWorkspaceOverview'
import { openNewProject } from '@/lib/new-project-open'
import { openWorkspaceCreateWizard } from '@/lib/workspace-create-open'

const HEALTH_LABEL: Record<string, string> = {
  healthy: 'Stabil',
  watch: 'Aufmerksamkeit',
  risk: 'Risiko',
  blocked: 'Blockiert',
}
const HEALTH_TONE: Record<string, 'green' | 'amber' | 'red'> = {
  healthy: 'green',
  watch: 'amber',
  risk: 'red',
  blocked: 'red',
}

export default function HomeProjectsPage() {
  const router = useRouter()
  const { state } = useWorkspaceOverview()

  const projects = state.status === 'ready' ? state.data.projects || [] : []
  const workspaceName = state.status === 'ready' ? state.data.workspace.name : ''

  return (
    <div className="fps">
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: FESTAG_PAGE_STYLES }} />

      <header className="fps-head">
        <h1 className="fps-title">Projekte</h1>
        {state.status === 'ready' ? (
          <p className="fps-stat-line">
            <strong>{projects.length}</strong> {projects.length === 1 ? 'Projekt' : 'Projekte'}
            {workspaceName ? <> {' · '}{workspaceName}</> : null}
          </p>
        ) : null}
      </header>

      {state.status === 'ready' && projects.length > 0 ? (
        <div className="fps-filters">
          <button type="button" className="fps-filter" onClick={() => openNewProject()}>
            <Plus size={12} weight="bold" style={{ marginRight: 5, verticalAlign: -1 }} />
            Neues Projekt
          </button>
        </div>
      ) : null}

      {state.status === 'loading' ? (
        <p className="fps-empty">Lade Projekte…</p>
      ) : state.status === 'empty' ? (
        <div className="fps-list">
          <div className="fps-empty">
            <p>Lege zuerst einen Workspace an — dann leben deine Projekte hier.</p>
            <button type="button" className="fps-filter" style={{ marginTop: 12 }} onClick={() => openWorkspaceCreateWizard()}>
              Workspace erstellen
            </button>
          </div>
        </div>
      ) : state.status === 'error' ? (
        <div className="fps-list"><p className="fps-empty">Etwas ist schiefgelaufen. Bitte lade die Seite neu.</p></div>
      ) : projects.length === 0 ? (
        <div className="fps-list">
          <div className="fps-empty">
            <p>Noch keine Projekte in {workspaceName}. Leg dein erstes an — Tagro übernimmt Planung, Mitwirkende und Einladungen.</p>
            <button type="button" className="fps-filter" style={{ marginTop: 12 }} onClick={() => openNewProject()}>
              <Plus size={12} weight="bold" style={{ marginRight: 5, verticalAlign: -1 }} />
              Neues Projekt
            </button>
          </div>
        </div>
      ) : (
        <div className="fps-list">
          {projects.map((p) => {
            const tone = HEALTH_TONE[p.health] || 'green'
            const attn = p.health !== 'healthy'
            return (
              <button
                key={p.id}
                type="button"
                className="fps-row"
                onClick={() => router.push(`/project/${p.id}`)}
              >
                <div className="fps-row-body">
                  <span className={`fps-mark${attn ? ` is-attn is-${tone === 'amber' ? 'red' : tone}` : ''}`} aria-hidden>
                    {attn ? <span className="fps-mark-dot" /> : <Check size={10} weight="bold" />}
                  </span>
                  <span className="fps-row-copy">
                    <span className="fps-row-title">{p.title}</span>
                    <span className="fps-row-sub">
                      {(p.phase || p.status || 'Planung')}
                      {' · '}{p.progress}% · {p.nextMilestone || 'kein Meilenstein gesetzt'}
                    </span>
                  </span>
                </div>
                <div className="fps-row-right">
                  <span className={`fps-row-meta is-${tone}`}>{HEALTH_LABEL[p.health] || p.health}</span>
                  <CaretRight size={12} weight="bold" className="fps-chev" aria-hidden />
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
