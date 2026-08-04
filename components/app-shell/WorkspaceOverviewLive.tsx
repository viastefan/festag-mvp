'use client'

/**
 * Decision Canvas — Overview.
 * One composition. The decision (or next step) is the hero.
 * No network. No orb. No duplicate panels. No dashboard.
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Microphone } from '@phosphor-icons/react'
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

type Mode = 'calm' | 'project' | 'decision'

type Choice = {
  id: string
  label: string
  href?: string
  onClick?: () => void
}

function decisionPrompt(title: string): string {
  if (/design/i.test(title)) return 'Wähle die Designrichtung.'
  if (/homepage|startseite/i.test(title)) return 'Freigeben oder Änderungen anfordern.'
  return 'Wähle, wie es weitergeht.'
}

function decisionChoices(title: string, decisionId: string): Choice[] {
  const href = decisionId ? `/decisions/${decisionId}` : '/overview/inbox'
  if (/design/i.test(title)) {
    return [
      { id: 'a', label: 'Modern Minimal', href },
      { id: 'b', label: 'Elegant Corporate', href },
    ]
  }
  return [
    { id: 'approve', label: 'Freigeben', href },
    { id: 'changes', label: 'Änderungen anfordern', href },
  ]
}

export default function WorkspaceOverviewLive({ greeting, firstName, data }: Props) {
  const { workspace, summary, decisions } = data
  const focusDecision = decisions[0] || null
  const [listening, setListening] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)

  const mode: Mode = useMemo(() => {
    if (summary.activeProjects === 0) return 'project'
    if (focusDecision && summary.pendingDecisions > 0) return 'decision'
    return 'calm'
  }, [summary.activeProjects, summary.pendingDecisions, focusDecision])

  const lead = `${greeting}, ${firstName}.`

  const calmLines = useMemo(() => {
    if (mode === 'project') {
      return [
        `In ${workspace.name} läuft noch alles ruhig.`,
        'Das erste Projekt wartet auf dich.',
      ]
    }
    if (mode === 'decision') {
      return [
        'Alles läuft ruhig.',
        summary.pendingDecisions === 1
          ? 'Eine Freigabe wartet.'
          : `${summary.pendingDecisions} Freigaben warten.`,
      ]
    }
    if (summary.calmLine) return [summary.calmLine]
    return [`Alles in ${workspace.name} läuft ruhig.`]
  }, [mode, workspace.name, summary.pendingDecisions, summary.calmLine])

  const choices: Choice[] = useMemo(() => {
    if (mode === 'project') {
      return [{ id: 'new', label: 'Neues Projekt', onClick: () => openNewProject() }]
    }
    if (mode === 'decision' && focusDecision) {
      return decisionChoices(focusDecision.title, focusDecision.id)
    }
    return []
  }, [mode, focusDecision])

  const heroTitle = mode === 'decision' && focusDecision ? focusDecision.title : null
  const heroPrompt =
    mode === 'decision' && focusDecision
      ? decisionPrompt(focusDecision.title)
      : mode === 'project'
        ? null
        : null

  const needsAttention = mode !== 'calm'

  return (
    <div className={`fas-dc${listening ? ' is-listening' : ''}`} data-mode={mode}>
      <div className="fas-dc-invites">
        <OverviewPendingInvites />
      </div>

      <div className="fas-dc-canvas">
        {/* Idle breath — almost invisible */}
        <div className={`fas-dc-breath${needsAttention ? ' is-awake' : ''}`} aria-hidden>
          <span />
          <span />
          <span />
        </div>

        {mode === 'decision' && heroTitle ? (
          <div className="fas-dc-block">
            <h1 className="fas-dc-title">{heroTitle}</h1>
            {heroPrompt ? <p className="fas-dc-support">{heroPrompt}</p> : null}
          </div>
        ) : (
          <div className="fas-dc-block">
            <p className="fas-dc-title">{lead}</p>
            {calmLines.map((line) => (
              <p key={line} className="fas-dc-support">
                {line}
              </p>
            ))}
          </div>
        )}

        {/* Ink — only when attention is deserved */}
        {needsAttention ? <div className="fas-dc-ink" aria-hidden /> : null}

        {choices.length > 0 ? (
          <div className="fas-dc-choices" role="group" aria-label="Nächster Schritt">
            {choices.map((c, i) => {
              const isOn = selected === c.id || (selected === null && i === 0 && mode === 'project')
              const className = `fas-dc-choice${isOn ? ' is-on' : ''}`
              if (c.href) {
                return (
                  <div key={c.id} className="fas-dc-choice-row">
                    {i > 0 ? <span className="fas-dc-or">oder</span> : null}
                    <Link
                      href={c.href}
                      className={className}
                      onClick={() => setSelected(c.id)}
                    >
                      {c.label}
                    </Link>
                  </div>
                )
              }
              return (
                <div key={c.id} className="fas-dc-choice-row">
                  {i > 0 ? <span className="fas-dc-or">oder</span> : null}
                  <button
                    type="button"
                    className={className}
                    onClick={() => {
                      setSelected(c.id)
                      c.onClick?.()
                    }}
                  >
                    {c.label}
                  </button>
                </div>
              )
            })}
          </div>
        ) : null}
      </div>

      <div className="fas-dc-dock">
        <button
          type="button"
          className={`fas-dc-mic${listening ? ' is-on' : ''}`}
          aria-pressed={listening}
          aria-label={listening ? 'Zuhören beenden' : 'Tagro zuhören'}
          onClick={() => setListening((v) => !v)}
        >
          <Microphone size={18} weight="fill" />
        </button>
        <span className="fas-dc-dock-label">{listening ? 'Tagro hört zu' : 'Tagro'}</span>
      </div>
    </div>
  )
}
