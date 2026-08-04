'use client'

/**
 * Festag OS Overview — Tagro is the interface.
 * Living core → briefing → contextual panel → secondary work (projects).
 * Not a KPI dashboard. Not a chat.
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, X } from '@phosphor-icons/react'
import OverviewPendingInvites from '@/components/app-shell/OverviewPendingInvites'
import TagroLivingCore, {
  deriveTagroLivingState,
  type TagroLivingState,
} from '@/components/app-shell/TagroLivingCore'
import { openNewProject } from '@/lib/new-project-open'

export type OverviewPayload = {
  workspace: { id: string; name: string; domain?: string }
  workspaces?: Array<{
    id: string
    name: string
    slug?: string | null
    isPersonal?: boolean
    role?: string | null
  }>
  summary: {
    activeProjects: number
    pendingDecisions: number
    teamMembers: number
    nextMilestone: string | null
    calmLine: string
  }
  briefing: {
    projectTitle: string
    lines: string[]
    reportId: string | null
    projectId: string | null
  } | null
  projects: Array<{
    id: string
    title: string
    phase: string | null
    progress: number
    health: 'healthy' | 'watch' | 'risk' | 'blocked'
    status: string | null
    nextMilestone: string | null
  }>
  tasks?: Array<{
    id: string
    title: string
    status: string | null
    projectId: string | null
    projectTitle: string
    updatedAt: string | null
  }>
  decisions: Array<{
    id: string
    title: string
    projectId: string | null
    projectTitle: string
    urgency: string | null
    dueDate: string | null
  }>
  activity: Array<{
    id: string
    title: string
    body: string | null
    createdAt: string
    projectTitle: string | null
  }>
  team: Array<{
    id: string
    name: string
    avatarUrl: string | null
    role: string | null
  }>
}

type Props = {
  greeting: string
  firstName: string
  data: OverviewPayload
}

function formatLabel(raw: string | null | undefined): string {
  if (!raw) return '—'
  const s = raw.replace(/_/g, ' ').trim()
  if (!s) return '—'
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function buildBriefingParagraphs(
  greeting: string,
  firstName: string,
  data: OverviewPayload,
): string[] {
  const paras: string[] = [`${greeting}, ${firstName}.`]
  if (data.summary.calmLine) paras.push(data.summary.calmLine)

  const lines = (data.briefing?.lines || [])
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 4)

  if (lines.length > 0) {
    paras.push(...lines)
  } else if (data.summary.pendingDecisions > 0) {
    paras.push(
      data.summary.pendingDecisions === 1
        ? 'Eine Entscheidung braucht deine Aufmerksamkeit.'
        : `${data.summary.pendingDecisions} Entscheidungen brauchen deine Aufmerksamkeit.`,
    )
  }

  if (data.summary.nextMilestone) {
    paras.push(`Nächster Meilenstein: ${data.summary.nextMilestone}.`)
  }

  return paras
}

export default function WorkspaceOverviewLive({ greeting, firstName, data }: Props) {
  const { workspace, summary, projects, decisions } = data
  const livingState = useMemo(
    () =>
      deriveTagroLivingState({
        pendingDecisions: summary.pendingDecisions,
        projects,
      }),
    [summary.pendingDecisions, projects],
  )
  const [vizState, setVizState] = useState<TagroLivingState>(livingState)
  const [panelOpen, setPanelOpen] = useState(decisions.length > 0)
  const [panelDismissed, setPanelDismissed] = useState(false)

  useEffect(() => {
    setVizState(livingState)
  }, [livingState])

  useEffect(() => {
    if (decisions.length > 0 && !panelDismissed) setPanelOpen(true)
    if (decisions.length === 0) {
      setPanelOpen(false)
      setPanelDismissed(false)
    }
  }, [decisions.length, panelDismissed])

  const paragraphs = useMemo(
    () => buildBriefingParagraphs(greeting, firstName, data),
    [greeting, firstName, data],
  )
  const focusDecision = decisions[0] || null
  const visibleProjects = projects.slice(0, 3)

  return (
    <div className={`fas-tagro${panelOpen && focusDecision ? ' has-panel' : ''}`}>
      <OverviewPendingInvites />

      <div className="fas-tagro-canvas">
        <section className="fas-tagro-stage" aria-label="Tagro">
          <TagroLivingCore state={vizState} className="fas-tagro-core" />

          <div className="fas-tagro-briefing" aria-live="polite">
            <h1 className="fas-tagro-greet">{paragraphs[0]}</h1>
            {paragraphs.slice(1).map((line) => (
              <p key={line} className="fas-tagro-line">
                {line}
              </p>
            ))}
          </div>

          {summary.pendingDecisions > 0 && !panelOpen ? (
            <button
              type="button"
              className="fas-tagro-nudge"
              onClick={() => {
                setPanelDismissed(false)
                setPanelOpen(true)
              }}
            >
              {summary.pendingDecisions === 1
                ? 'Tagro hat eine Entscheidung erkannt'
                : `Tagro hat ${summary.pendingDecisions} Entscheidungen erkannt`}
            </button>
          ) : null}
        </section>

        {panelOpen && focusDecision ? (
          <aside className="fas-tagro-panel" aria-label="Kontext">
            <div className="fas-tagro-panel-head">
              <p className="fas-tagro-panel-title">
                {focusDecision.title}
              </p>
              <button
                type="button"
                className="fas-tagro-panel-close"
                aria-label="Schließen"
                onClick={() => {
                  setPanelOpen(false)
                  setPanelDismissed(true)
                }}
              >
                <X size={16} weight="light" />
              </button>
            </div>
            <p className="fas-tagro-panel-meta">
              {focusDecision.projectTitle}
              {focusDecision.dueDate
                ? `, fällig ${new Date(focusDecision.dueDate).toLocaleDateString('de-DE', {
                    day: 'numeric',
                    month: 'short',
                  })}`
                : ''}
            </p>
            <p className="fas-tagro-panel-rec">
              Tagro empfiehlt, diese Entscheidung jetzt zu klären — damit der Workspace weiterlaufen kann.
            </p>
            <div className="fas-tagro-panel-actions">
              <Link
                href={focusDecision.id ? `/decisions/${focusDecision.id}` : '/overview/inbox'}
                className="fas-tagro-panel-primary"
              >
                Öffnen
              </Link>
              <Link
                href="/overview/inbox"
                className="fas-tagro-panel-secondary"
              >
                Alle Entscheidungen
              </Link>
            </div>
          </aside>
        ) : null}
      </div>

      <section className="fas-tagro-work" aria-labelledby="fas-tagro-projects-title">
        <div className="fas-tagro-work-head">
          <h2 id="fas-tagro-projects-title" className="fas-tagro-work-title">
            Projekte
          </h2>
          <Link href="/overview/projects" className="fas-tagro-work-link">
            Alle Projekte
            <ArrowRight size={12} weight="bold" />
          </Link>
        </div>

        {visibleProjects.length === 0 ? (
          <div className="fas-tagro-empty">
            <p>Noch keine Projekte. Tagro wartet auf den ersten Schwerpunkt in {workspace.name}.</p>
            <button type="button" className="fas-btn" onClick={() => openNewProject()}>
              Neues Projekt
            </button>
          </div>
        ) : (
          <ul className="fas-tagro-projects">
            {visibleProjects.map((p) => (
              <li key={p.id}>
                <Link href={`/project/${p.id}`} className="fas-tagro-project">
                  <span className="fas-tagro-project-name">{p.title}</span>
                  <span className="fas-tagro-project-meta">
                    {formatLabel(p.phase || p.status || 'Planung')}
                    {p.nextMilestone ? `, ${p.nextMilestone}` : ''}
                  </span>
                  <span className={`fas-tagro-project-pulse is-${p.health}`} aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
