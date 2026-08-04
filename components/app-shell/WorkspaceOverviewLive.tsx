'use client'

/**
 * Decision Canvas — Overview identity.
 * The decision is the hero. Not Tagro. Not a network. Not a dashboard.
 * Silence is default. Every motion means attention is deserved.
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Microphone, X } from '@phosphor-icons/react'
import OverviewPendingInvites from '@/components/app-shell/OverviewPendingInvites'
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

/** Canvas breath: calm → ink → decision hero → dissolve */
type CanvasPhase = 'calm' | 'ink' | 'decision' | 'project' | 'dissolve'

type Choice = { id: string; label: string }

function buildCalmCopy(
  greeting: string,
  firstName: string,
  data: OverviewPayload,
): { lead: string; lines: string[] } {
  const lead = `${greeting}, ${firstName}.`
  if (data.summary.activeProjects === 0) {
    return {
      lead,
      lines: [
        `In ${data.workspace.name} läuft noch alles ruhig.`,
        'Das erste Projekt wartet auf dich.',
      ],
    }
  }
  if (data.summary.pendingDecisions > 0) {
    return {
      lead,
      lines: [
        'Everything is running smoothly.',
        data.summary.pendingDecisions === 1
          ? 'One approval is waiting.'
          : `${data.summary.pendingDecisions} approvals are waiting.`,
      ],
    }
  }
  if (data.summary.calmLine) {
    return { lead, lines: [data.summary.calmLine] }
  }
  return {
    lead,
    lines: [`Alles in ${data.workspace.name} läuft ruhig.`],
  }
}

function decisionPrompt(title: string): string {
  if (/design/i.test(title)) return 'Choose the primary design direction.'
  if (/homepage|startseite/i.test(title)) return 'Freigeben oder Änderungen anfordern.'
  return 'Wähle die Richtung, die Tagro als Nächstes ausführen soll.'
}

function decisionChoices(title: string): Choice[] {
  if (/design/i.test(title)) {
    return [
      { id: 'a', label: 'Modern Minimal' },
      { id: 'b', label: 'Elegant Corporate' },
    ]
  }
  return [
    { id: 'approve', label: 'Freigeben' },
    { id: 'changes', label: 'Änderungen anfordern' },
  ]
}

export default function WorkspaceOverviewLive({ greeting, firstName, data }: Props) {
  const { workspace, summary, decisions } = data
  const focusDecision = decisions[0] || null
  const needsFirstProject = summary.activeProjects === 0
  const hasDecision = Boolean(focusDecision) && summary.pendingDecisions > 0

  const calm = useMemo(
    () => buildCalmCopy(greeting, firstName, data),
    [greeting, firstName, data],
  )

  const [phase, setPhase] = useState<CanvasPhase>(() =>
    needsFirstProject ? 'project' : hasDecision ? 'ink' : 'calm',
  )
  const [panelOpen, setPanelOpen] = useState(() => needsFirstProject || hasDecision)
  const [selected, setSelected] = useState<string | null>(null)
  const [listening, setListening] = useState(false)
  const [statusKey, setStatusKey] = useState(0)

  useEffect(() => {
    setStatusKey((k) => k + 1)
    if (needsFirstProject) {
      setPhase('project')
      setPanelOpen(true)
      return
    }
    if (hasDecision) {
      setPhase('ink')
      setPanelOpen(true)
      const t = window.setTimeout(() => setPhase('decision'), 700)
      return () => window.clearTimeout(t)
    }
    setPhase('calm')
    setPanelOpen(false)
    setSelected(null)
  }, [needsFirstProject, hasDecision, focusDecision?.id, summary.activeProjects])

  const choices = focusDecision ? decisionChoices(focusDecision.title) : []
  const prompt = focusDecision ? decisionPrompt(focusDecision.title) : ''

  function dismissPanel() {
    setPhase('dissolve')
    setPanelOpen(false)
    setSelected(null)
    window.setTimeout(() => setPhase('calm'), 480)
  }

  function onSelectChoice(id: string) {
    setSelected(id)
  }

  const showHero = phase === 'decision' && focusDecision
  const showProjectHero = phase === 'project' && needsFirstProject
  const showInk = phase === 'ink'
  const showDots = phase === 'calm' || phase === 'ink' || phase === 'dissolve'

  return (
    <div
      className={`fas-dc${panelOpen ? ' has-panel' : ''}${listening ? ' is-listening' : ''}`}
      data-phase={phase}
    >
      <OverviewPendingInvites />

      <div className="fas-dc-stage">
        <div className="fas-dc-canvas" aria-live="polite">
          {/* Breath marks — almost invisible when calm */}
          {showDots ? (
            <div className={`fas-dc-breath${phase === 'ink' ? ' is-ink' : ''}`} aria-hidden>
              <span />
              <span />
              <span />
            </div>
          ) : null}

          {/* Ink line — Apple Intelligence quiet: 1px primary, soft, no glow */}
          {showInk ? <div className="fas-dc-ink" aria-hidden /> : null}

          {phase === 'calm' || phase === 'ink' || phase === 'dissolve' ? (
            <div key={`calm-${statusKey}`} className="fas-dc-calm">
              <p className="fas-dc-calm-lead">{calm.lead}</p>
              {calm.lines.map((line) => (
                <p key={line} className="fas-dc-calm-line">
                  {line}
                </p>
              ))}
            </div>
          ) : null}

          {showHero ? (
            <div key={focusDecision!.id} className="fas-dc-hero">
              <h1 className="fas-dc-hero-title">{focusDecision!.title}</h1>
              <p className="fas-dc-hero-prompt">{prompt}</p>
              <div className="fas-dc-ink fas-dc-ink--hero" aria-hidden />
              <div className="fas-dc-choices" role="group" aria-label="Optionen">
                {choices.map((c, i) => (
                  <div key={c.id} className="fas-dc-choice-wrap">
                    {i > 0 ? <span className="fas-dc-or">or</span> : null}
                    <button
                      type="button"
                      className={`fas-dc-choice${selected === c.id ? ' is-selected' : ''}`}
                      onClick={() => onSelectChoice(c.id)}
                    >
                      {c.label}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {showProjectHero ? (
            <div className="fas-dc-hero">
              <h1 className="fas-dc-hero-title">Erstes Projekt</h1>
              <p className="fas-dc-hero-prompt">
                Tagro strukturiert es, sobald du startest — in {workspace.name}.
              </p>
              <div className="fas-dc-ink fas-dc-ink--hero" aria-hidden />
              <div className="fas-dc-choices">
                <button
                  type="button"
                  className="fas-dc-choice is-selected"
                  onClick={() => openNewProject()}
                >
                  Neues Projekt
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {panelOpen && showHero && focusDecision ? (
          <aside className="fas-dc-panel" aria-label="Entscheidung">
            <div className="fas-dc-panel-top">
              <span className="fas-dc-panel-dot" aria-hidden />
              <p className="fas-dc-panel-status">Wartet auf dich</p>
              <button
                type="button"
                className="fas-dc-panel-close"
                aria-label="Schließen"
                onClick={dismissPanel}
              >
                <X size={16} weight="light" />
              </button>
            </div>
            <h2 className="fas-dc-panel-title">{focusDecision.title}</h2>
            <p className="fas-dc-panel-lead">{prompt}</p>
            <div className="fas-dc-panel-actions">
              {choices.map((c) => (
                <Link
                  key={c.id}
                  href={
                    focusDecision.id
                      ? `/decisions/${focusDecision.id}`
                      : '/overview/inbox'
                  }
                  className={`fas-dc-panel-btn${selected === c.id || (!selected && c.id === choices[0]?.id) ? ' is-primary' : ''}`}
                  onClick={() => onSelectChoice(c.id)}
                >
                  {c.label}
                </Link>
              ))}
            </div>
          </aside>
        ) : null}

        {panelOpen && showProjectHero ? (
          <aside className="fas-dc-panel" aria-label="Projekt">
            <div className="fas-dc-panel-top">
              <span className="fas-dc-panel-dot" aria-hidden />
              <p className="fas-dc-panel-status">Bereit</p>
              <button
                type="button"
                className="fas-dc-panel-close"
                aria-label="Schließen"
                onClick={dismissPanel}
              >
                <X size={16} weight="light" />
              </button>
            </div>
            <h2 className="fas-dc-panel-title">Erstelle dein erstes Projekt</h2>
            <p className="fas-dc-panel-lead">
              Ein Name reicht. Tagro strukturiert den Rest.
            </p>
            <div className="fas-dc-panel-actions">
              <button
                type="button"
                className="fas-dc-panel-btn is-primary"
                onClick={() => openNewProject()}
              >
                Neues Projekt
              </button>
            </div>
          </aside>
        ) : null}
      </div>

      <footer className="fas-dc-footer">
        <div className="fas-dc-status" aria-live="polite">
          {showHero || showProjectHero ? (
            <>
              <p className="fas-dc-status-lead">{calm.lead}</p>
              <p className="fas-dc-status-body">
                {showProjectHero
                  ? `In ${workspace.name} wartet noch das erste Projekt.`
                  : calm.lines[calm.lines.length - 1]}
              </p>
            </>
          ) : (
            <p className="fas-dc-status-quiet">Festag</p>
          )}
        </div>

        <div className="fas-dc-voice">
          <button
            type="button"
            className={`fas-dc-mic${listening ? ' is-on' : ''}`}
            aria-pressed={listening}
            aria-label={listening ? 'Zuhören beenden' : 'Tagro zuhören'}
            onClick={() => setListening((v) => !v)}
          >
            <Microphone size={18} weight="fill" />
          </button>
          <p className="fas-dc-voice-label">{listening ? 'Tagro hört zu' : 'Tagro'}</p>
        </div>

        <div className="fas-dc-footer-spacer" aria-hidden />
      </footer>
    </div>
  )
}
