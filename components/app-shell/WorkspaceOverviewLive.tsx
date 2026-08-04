'use client'

/**
 * Festag OS Overview — Tagro is the interface.
 * Living core (signal nodes) → Spotify-style lyrics briefing → context panel → projects.
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Headphones, Pause, Play, Square, X } from '@phosphor-icons/react'
import OverviewPendingInvites from '@/components/app-shell/OverviewPendingInvites'
import TagroLivingCore, {
  buildTagroSignals,
  deriveTagroLivingState,
  type TagroLivingState,
} from '@/components/app-shell/TagroLivingCore'
import BriefingLyricsFlow from '@/components/briefing/BriefingLyricsFlow'
import { useStatusReportPlayback } from '@/hooks/useStatusReportPlayback'
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
  const { workspace, summary, projects, decisions, activity, team, tasks } = data
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

  const paragraphs = useMemo(
    () => buildBriefingParagraphs(greeting, firstName, data),
    [greeting, firstName, data],
  )

  const signals = useMemo(
    () =>
      buildTagroSignals({
        workspaceName: workspace.name,
        summary,
        projects,
        tasks,
        decisions,
        activity,
        team,
        briefingProject: data.briefing?.projectTitle || null,
      }),
    [workspace.name, summary, projects, tasks, decisions, activity, team, data.briefing?.projectTitle],
  )

  const audio = useStatusReportPlayback({ sentences: paragraphs })

  useEffect(() => {
    if (audio.playing && !audio.paused) {
      setVizState('audio')
      return
    }
    if (audio.paused) {
      setVizState('listening')
      return
    }
    setVizState(livingState)
  }, [audio.playing, audio.paused, livingState])

  useEffect(() => {
    if (decisions.length > 0 && !panelDismissed) setPanelOpen(true)
    if (decisions.length === 0) {
      setPanelOpen(false)
      setPanelDismissed(false)
    }
  }, [decisions.length, panelDismissed])

  const focusDecision = decisions[0] || null
  const visibleProjects = projects.slice(0, 3)
  const audioLabel = audio.playing && !audio.paused
    ? 'Pausieren'
    : audio.paused
      ? 'Fortsetzen'
      : 'Briefing anhören'

  return (
    <div className={`fas-tagro${panelOpen && focusDecision ? ' has-panel' : ''}${audio.speaking ? ' is-audio' : ''}`}>
      <OverviewPendingInvites />

      <div className="fas-tagro-canvas">
        <section className="fas-tagro-stage" aria-label="Tagro">
          <div className="fas-tagro-core-wrap">
            <TagroLivingCore
              state={vizState}
              className="fas-tagro-core"
              signals={signals}
              onCoreActivate={() => {
                if (!audio.supported || paragraphs.length === 0) return
                audio.toggle()
              }}
            />
          </div>

          <div className="fas-tagro-lyrics-host" aria-live="polite">
            <h1 className="sr-only">{paragraphs[0]}</h1>
            <BriefingLyricsFlow
              sentences={paragraphs}
              activeIndex={audio.displayActiveIndex}
              activeWordIndex={audio.activeWordIndex}
              autoScroll={audio.autoScroll}
              animating={audio.playing && !audio.paused}
              onUserScroll={audio.takeScrollControl}
              className="fas-tagro-lyrics"
            />
          </div>

          <div className="fas-tagro-audio">
            {audio.supported ? (
              <>
                <button
                  type="button"
                  className={`fas-tagro-audio-btn${audio.speaking ? ' is-live' : ''}`}
                  onClick={() => audio.toggle()}
                  aria-pressed={audio.playing && !audio.paused}
                >
                  {audio.playing && !audio.paused ? (
                    <Pause size={15} weight="fill" />
                  ) : audio.paused ? (
                    <Play size={15} weight="fill" />
                  ) : (
                    <Headphones size={15} weight="regular" />
                  )}
                  <span>{audioLabel}</span>
                </button>
                {audio.speaking ? (
                  <>
                    <button
                      type="button"
                      className="fas-tagro-audio-stop"
                      onClick={() => audio.stop()}
                      aria-label="Briefing stoppen"
                    >
                      <Square size={12} weight="fill" />
                    </button>
                    <div className="fas-tagro-audio-progress" aria-hidden>
                      <span style={{ width: `${Math.round(audio.progress * 100)}%` }} />
                    </div>
                  </>
                ) : null}
              </>
            ) : (
              <p className="fas-tagro-audio-fallback">Audio-Briefing braucht Browser-Sprachausgabe.</p>
            )}
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
