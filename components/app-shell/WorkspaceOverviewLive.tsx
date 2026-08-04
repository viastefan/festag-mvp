'use client'

/**
 * Festag Overview — Living Network operating interface.
 * Not a dashboard. Not a chatbot. Tagro IS the interface.
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Check,
  Microphone,
  MicrophoneSlash,
  Sparkle,
  UploadSimple,
  X,
} from '@phosphor-icons/react'
import OverviewPendingInvites from '@/components/app-shell/OverviewPendingInvites'
import TagroLivingNetwork, {
  deriveNetworkActive,
  type NetworkActive,
  type NetworkNodeKind,
} from '@/components/app-shell/TagroLivingNetwork'
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

type PanelKind = 'decision' | 'project' | null

function buildStatusLines(
  greeting: string,
  firstName: string,
  data: OverviewPayload,
): { lead: string; body: string } {
  const lead = `${greeting}, ${firstName}.`
  if (data.summary.activeProjects === 0) {
    return {
      lead,
      body: `In ${data.workspace.name} wartet noch das erste Projekt.`,
    }
  }
  const focus = data.decisions[0]
  if (focus) {
    const project = focus.projectTitle || data.briefing?.projectTitle || 'Dein Projekt'
    return {
      lead,
      body: `${project} ist bereit für deine Freigabe. Eine Entscheidung steht aus.`,
    }
  }
  if (data.summary.calmLine) {
    return { lead, body: data.summary.calmLine }
  }
  return {
    lead,
    body: `Alles in ${data.workspace.name} läuft ruhig.`,
  }
}

const DECISION_STEPS = [
  { id: 'q', label: 'Qualitätsprüfung abschließen', done: true },
  { id: 'p', label: 'Performance validieren', done: true },
  { id: 's', label: 'SEO & Inhalte prüfen', done: true },
  { id: 'd', label: 'Veröffentlichung starten', done: false },
] as const

export default function WorkspaceOverviewLive({ greeting, firstName, data }: Props) {
  const { workspace, summary, projects, decisions } = data
  const riskCount = projects.filter((p) => p.health === 'risk' || p.health === 'blocked').length
  const focusDecision = decisions[0] || null

  const derivedActive = useMemo(
    () =>
      deriveNetworkActive({
        pendingDecisions: summary.pendingDecisions,
        decisionTitle: focusDecision?.title || null,
        activeProjects: summary.activeProjects,
        riskCount,
      }),
    [summary.pendingDecisions, summary.activeProjects, focusDecision?.title, riskCount],
  )

  const [active, setActive] = useState<NetworkActive>(derivedActive)
  const [panelDismissed, setPanelDismissed] = useState(false)
  const [listening, setListening] = useState(false)
  const [statusKey, setStatusKey] = useState(0)

  useEffect(() => {
    if (!panelDismissed) setActive(derivedActive)
  }, [derivedActive, panelDismissed])

  useEffect(() => {
    setStatusKey((k) => k + 1)
  }, [summary.pendingDecisions, summary.activeProjects, focusDecision?.id])

  const status = useMemo(
    () => buildStatusLines(greeting, firstName, data),
    [greeting, firstName, data],
  )

  const panelKind: PanelKind =
    panelDismissed
      ? null
      : active?.kind === 'decision' && focusDecision
        ? 'decision'
        : active?.kind === 'project' && summary.activeProjects === 0
          ? 'project'
          : null

  function dismissPanel() {
    setPanelDismissed(true)
    setActive(null)
  }

  function onNodeActivate(kind: NetworkNodeKind) {
    if (kind === 'decision' && focusDecision) {
      setPanelDismissed(false)
      setActive({
        kind: 'decision',
        label: focusDecision.title,
        sublabel: 'Entscheidung erforderlich',
      })
      return
    }
    if (kind === 'project' && summary.activeProjects === 0) {
      setPanelDismissed(false)
      setActive({
        kind: 'project',
        label: 'Erstes Projekt',
        sublabel: 'Bereit zum Start',
      })
      return
    }
    /* Idle nodes: soft focus only, no panel clutter */
    setActive({
      kind,
      label: kind.charAt(0).toUpperCase() + kind.slice(1),
      sublabel: 'Kein offener Kontext',
    })
    window.setTimeout(() => {
      setActive(panelDismissed ? null : derivedActive)
    }, 1600)
  }

  return (
    <div className={`fas-ln${panelKind ? ' has-panel' : ''}${listening ? ' is-listening' : ''}`}>
      <OverviewPendingInvites />

      <div className="fas-ln-stage">
        <TagroLivingNetwork
          active={active}
          className="fas-ln-network"
          onNodeActivate={onNodeActivate}
          onCoreActivate={() => setListening((v) => !v)}
        />

        {panelKind === 'decision' && focusDecision ? (
          <aside className="fas-ln-panel" aria-label="Entscheidung">
            <div className="fas-ln-panel-top">
              <span className="fas-ln-panel-dot" aria-hidden />
              <p className="fas-ln-panel-status">Entscheidung erforderlich</p>
              <button
                type="button"
                className="fas-ln-panel-close"
                aria-label="Schließen"
                onClick={dismissPanel}
              >
                <X size={16} weight="light" />
              </button>
            </div>

            <h2 className="fas-ln-panel-title">{focusDecision.title}</h2>
            <p className="fas-ln-panel-lead">
              {/homepage|startseite/i.test(focusDecision.title)
                ? 'Tagro empfiehlt, die neue Homepage zu veröffentlichen.'
                : `Tagro empfiehlt, „${focusDecision.title}“ freizugeben.`}
            </p>

            <div className="fas-ln-rec">
              <span className="fas-ln-rec-ico" aria-hidden>
                <Sparkle size={14} weight="fill" />
              </span>
              <div>
                <p className="fas-ln-rec-title">Freigeben</p>
                <p className="fas-ln-rec-body">
                  Alle Ziele wurden erreicht. Keine kritischen Issues.
                </p>
              </div>
            </div>

            <p className="fas-ln-steps-label">Wie Tagro vorgehen würde</p>
            <ul className="fas-ln-steps">
              {DECISION_STEPS.map((step) => (
                <li key={step.id} className={step.done ? 'is-done' : 'is-pending'}>
                  <span className="fas-ln-step-ico" aria-hidden>
                    {step.done ? (
                      <Check size={14} weight="bold" />
                    ) : (
                      <UploadSimple size={14} weight="regular" />
                    )}
                  </span>
                  <span className="fas-ln-step-label">{step.label}</span>
                  {!step.done ? (
                    <span className="fas-ln-step-badge">Wartet auf Entscheidung</span>
                  ) : null}
                </li>
              ))}
            </ul>

            <div className="fas-ln-actions">
              <Link
                href={focusDecision.id ? `/decisions/${focusDecision.id}` : '/overview/inbox'}
                className="fas-ln-btn fas-ln-btn--primary"
              >
                Freigeben
              </Link>
              <Link
                href={focusDecision.id ? `/decisions/${focusDecision.id}` : '/overview/inbox'}
                className="fas-ln-btn fas-ln-btn--ghost"
              >
                Änderungen anfordern
              </Link>
            </div>
            <p className="fas-ln-panel-foot">
              Diese Entscheidung wird das Deployment starten.
            </p>
          </aside>
        ) : null}

        {panelKind === 'project' ? (
          <aside className="fas-ln-panel" aria-label="Projekt">
            <div className="fas-ln-panel-top">
              <span className="fas-ln-panel-dot" aria-hidden />
              <p className="fas-ln-panel-status">Bereit</p>
              <button
                type="button"
                className="fas-ln-panel-close"
                aria-label="Schließen"
                onClick={dismissPanel}
              >
                <X size={16} weight="light" />
              </button>
            </div>
            <h2 className="fas-ln-panel-title">Erstelle dein erstes Projekt</h2>
            <p className="fas-ln-panel-lead">
              Tagro strukturiert es, sobald du startest — in {workspace.name}.
            </p>
            <div className="fas-ln-actions">
              <button
                type="button"
                className="fas-ln-btn fas-ln-btn--primary"
                onClick={() => openNewProject()}
              >
                Neues Projekt
              </button>
            </div>
          </aside>
        ) : null}
      </div>

      <footer className="fas-ln-footer">
        <div key={statusKey} className="fas-ln-status" aria-live="polite">
          <p className="fas-ln-status-lead">{status.lead}</p>
          <p className="fas-ln-status-body">{status.body}</p>
          <div className="fas-ln-status-dots" aria-hidden>
            <span className="is-on" />
            <span />
            <span />
          </div>
        </div>

        <div className="fas-ln-voice">
          <div className="fas-ln-voice-row">
            <div className={`fas-ln-wave${listening ? ' is-on' : ''}`} aria-hidden>
              {Array.from({ length: 10 }).map((_, i) => (
                <span key={`l${i}`} style={{ ['--i' as string]: i }} />
              ))}
            </div>
            <button
              type="button"
              className={`fas-ln-mic${listening ? ' is-on' : ''}`}
              aria-pressed={listening}
              aria-label={listening ? 'Zuhören beenden' : 'Tagro zuhören'}
              onClick={() => setListening((v) => !v)}
            >
              {listening ? (
                <MicrophoneSlash size={20} weight="fill" />
              ) : (
                <Microphone size={20} weight="fill" />
              )}
            </button>
            <div className={`fas-ln-wave${listening ? ' is-on' : ''}`} aria-hidden>
              {Array.from({ length: 10 }).map((_, i) => (
                <span key={`r${i}`} style={{ ['--i' as string]: 9 - i }} />
              ))}
            </div>
          </div>
          <p className="fas-ln-voice-label">
            {listening ? 'Tagro hört zu' : 'Tagro'}
          </p>
        </div>

        <div className="fas-ln-footer-spacer" aria-hidden />
      </footer>
    </div>
  )
}
