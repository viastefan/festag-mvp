'use client'

/**
 * Legacy Decision Canvas UI — superseded by WorkspaceBoard (Overview v5).
 * Payload types remain the SSOT for useWorkspaceOverview.
 */

import { useEffect, useMemo, useState } from 'react'
import { Microphone } from '@phosphor-icons/react'
import OverviewPendingInvites from '@/components/app-shell/OverviewPendingInvites'
import { openNewProject } from '@/lib/new-project-open'
import {
  acceptDecisionRecommendation,
  buildDecisionCanvasTopic,
  enrichDecisionFocus,
  ensureCanvasSuggestion,
  type DecisionCanvasTopic,
} from '@/lib/overview/decision-canvas'

export type OverviewDecision = {
  id: string
  title: string
  summary?: string | null
  projectId: string | null
  projectTitle: string
  urgency: string | null
  dueDate: string | null
  responseType?: string | null
  decisionType?: string | null
  recommendedOptionId?: string | null
  recommendationReason?: string | null
  tagroReasoning?: string | null
  options?: Array<{
    id: string
    label: string
    hint: string | null
    recommended: boolean
  }>
  reasons?: string[]
  explainSteps?: Array<{ n: number; label: string }>
  needsSuggestion?: boolean
}

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
  /** Project Intelligence — calm view model, never raw analytics. */
  intelligence?: {
    score: number
    headline: string
    highlights: string[]
    learned: string | null
    confidence: number
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
  decisions: OverviewDecision[]
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
  onDecided?: () => void
}

type Phase = 'calm' | 'path' | 'focus' | 'sheet' | 'retract'

const INK_PATH =
  'M 36 42 C 140 28, 220 78, 300 118 S 430 172, 520 186'

export default function WorkspaceOverviewLive({
  greeting,
  firstName,
  data,
  onDecided,
}: Props) {
  const focusDecision = data.decisions[0] || null

  const topic = useMemo(() => {
    const focus = focusDecision
      ? enrichDecisionFocus({
          id: focusDecision.id,
          title: focusDecision.title,
          summary: focusDecision.summary || null,
          projectId: focusDecision.projectId,
          projectTitle: focusDecision.projectTitle,
          urgency: focusDecision.urgency,
          dueDate: focusDecision.dueDate,
          responseType: focusDecision.responseType || null,
          decisionType: focusDecision.decisionType || null,
          recommendedOptionId: focusDecision.recommendedOptionId || null,
          recommendationReason: focusDecision.recommendationReason || null,
          tagroReasoning: focusDecision.tagroReasoning || null,
          options: focusDecision.options || [],
        })
      : null

    /* Prefer server-enriched reasons/explain when present */
    if (focus && focusDecision) {
      if (focusDecision.reasons?.length) focus.reasons = focusDecision.reasons
      if (focusDecision.explainSteps?.length) {
        focus.explainSteps = focusDecision.explainSteps
      }
      if (typeof focusDecision.needsSuggestion === 'boolean') {
        focus.needsSuggestion = focusDecision.needsSuggestion
      }
    }

    return buildDecisionCanvasTopic({
      workspaceName: data.workspace.name,
      activeProjects: data.summary.activeProjects,
      pendingDecisions: data.summary.pendingDecisions,
      calmLine: data.summary.calmLine,
      focus,
    })
  }, [data, focusDecision])

  const [phase, setPhase] = useState<Phase>('calm')
  const [selected, setSelected] = useState<string | null>(null)
  const [explainOpen, setExplainOpen] = useState(false)
  const [listening, setListening] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [liveTopic, setLiveTopic] = useState<DecisionCanvasTopic | null>(null)

  const activeTopic = liveTopic && liveTopic.id === topic?.id ? liveTopic : topic

  useEffect(() => {
    setPhase('calm')
    setSelected(null)
    setExplainOpen(false)
    setSheetOpen(false)
    setError(null)
    setLiveTopic(null)
  }, [topic?.id])

  const lead = `${greeting}, ${firstName}.`

  async function activate() {
    if (!topic || phase !== 'calm') return
    setSelected(topic.recommendId)
    setError(null)
    setPhase('path')
    window.setTimeout(() => setPhase('focus'), 980)
    window.setTimeout(() => {
      setPhase('sheet')
      setSheetOpen(true)
    }, 1400)

    /* Harden recommendation while the path draws */
    if (topic.kind === 'decision' && topic.decisionId && topic.needsSuggestion) {
      const decisionId = topic.decisionId
      void ensureCanvasSuggestion(decisionId).then(async (res) => {
        if (!res.ok) return
        try {
          const wsId = data.workspace.id
          const qs = wsId ? `?workspaceId=${encodeURIComponent(wsId)}` : ''
          const overview = await fetch(`/api/workspaces/overview${qs}`, {
            cache: 'no-store',
          })
          if (!overview.ok) return
          const json = await overview.json()
          const next = (json?.decisions || []).find((d: OverviewDecision) => d.id === decisionId)
          if (!next) return
          const focus = enrichDecisionFocus({
            id: next.id,
            title: next.title,
            summary: next.summary || null,
            projectId: next.projectId,
            projectTitle: next.projectTitle,
            urgency: next.urgency,
            dueDate: next.dueDate,
            responseType: next.responseType || null,
            decisionType: next.decisionType || null,
            recommendedOptionId: next.recommendedOptionId || null,
            recommendationReason: next.recommendationReason || null,
            tagroReasoning: next.tagroReasoning || null,
            options: next.options || [],
          })
          if (next.reasons?.length) focus.reasons = next.reasons
          if (next.explainSteps?.length) focus.explainSteps = next.explainSteps
          focus.needsSuggestion = false
          const rebuilt = buildDecisionCanvasTopic({
            workspaceName: data.workspace.name,
            activeProjects: data.summary.activeProjects,
            pendingDecisions: data.summary.pendingDecisions,
            calmLine: data.summary.calmLine,
            focus,
          })
          if (rebuilt) {
            setLiveTopic(rebuilt)
            setSelected(rebuilt.recommendId)
          }
        } catch {
          /* keep synthetic topic */
        }
      })
    }
  }

  function retract(then?: () => void) {
    setExplainOpen(false)
    setSheetOpen(false)
    setPhase('retract')
    window.setTimeout(() => {
      setPhase('calm')
      setSelected(null)
      then?.()
    }, 580)
  }

  async function acceptRecommendation() {
    if (!activeTopic || busy) return
    const optionId = selected || activeTopic.recommendId
    if (!optionId) return

    if (activeTopic.kind === 'project') {
      if (optionId === 'later') {
        retract()
        return
      }
      retract(() => openNewProject())
      return
    }

    if (!activeTopic.decisionId) return
    setBusy(true)
    setError(null)
    const result = await acceptDecisionRecommendation({
      decisionId: activeTopic.decisionId,
      optionId,
      responseType: focusDecision?.responseType || activeTopic.responseType,
    })
    setBusy(false)
    if (!result.ok) {
      setError('Die Empfehlung konnte nicht übernommen werden.')
      return
    }
    retract(() => onDecided?.())
  }

  function reviewAlternatives() {
    setExplainOpen(false)
    setPhase('focus')
    setSheetOpen(true)
  }

  async function chooseOption(optionId: string) {
    setSelected(optionId)
    setSheetOpen(true)
    setPhase('sheet')
  }

  const showPath = phase === 'path' || phase === 'focus' || phase === 'sheet'
  const showFocus = phase === 'focus' || phase === 'sheet'
  const showSheet = Boolean(activeTopic) && (phase === 'sheet' || (phase === 'focus' && sheetOpen))
  const isRetracting = phase === 'retract'
  const isCalm = phase === 'calm' || isRetracting

  return (
    <div
      className={[
        'fas-dc',
        showSheet ? ' has-sheet' : '',
        showPath ? ' is-active' : '',
        isRetracting ? ' is-retracting' : '',
        listening ? ' is-listening' : '',
      ].join('')}
      data-phase={phase}
    >
      <div className="fas-dc-invites">
        <OverviewPendingInvites />
      </div>

      <svg
        className={`fas-dc-ink${showPath ? ' is-on' : ''}${isRetracting ? ' is-out' : ''}`}
        viewBox="0 0 560 240"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <path className="fas-dc-ink-track" d={INK_PATH} />
        <path className="fas-dc-ink-flow" d={INK_PATH} />
        <circle className="fas-dc-ink-start" cx="36" cy="42" r="3.5" />
        <circle className="fas-dc-ink-focus" cx="520" cy="186" r="5.5" />
      </svg>

      {explainOpen && activeTopic ? (
        <ExplainPopup topic={activeTopic} onClose={() => setExplainOpen(false)} />
      ) : null}

      <div className="fas-dc-stage">
        <div className="fas-dc-center">
          {isCalm ? (
            <div className="fas-dc-calm">
              <p className="fas-dc-greet">{lead}</p>
              <p className="fas-dc-status">
                {activeTopic?.calmStatus || data.summary.calmLine || 'Alles läuft ruhig.'}
              </p>
              {activeTopic ? (
                <button type="button" className="fas-dc-waiting" onClick={() => void activate()}>
                  <span className="fas-dc-waiting-dot" aria-hidden />
                  {activeTopic.waitingLabel}
                  <span className="fas-dc-waiting-chev" aria-hidden>
                    ›
                  </span>
                </button>
              ) : null}
            </div>
          ) : null}

          {showFocus && activeTopic ? (
            <div className="fas-dc-focus" key={`${activeTopic.id}-${activeTopic.recommendId || 'x'}`}>
              <p className="fas-dc-eyebrow">{activeTopic.eyebrow}</p>
              <h1 className="fas-dc-question">{activeTopic.question}</h1>
              <div className="fas-dc-options" role="radiogroup" aria-label="Optionen">
                {activeTopic.options.map((opt) => (
                  <label
                    key={opt.id}
                    className={`fas-dc-option${selected === opt.id ? ' is-on' : ''}`}
                  >
                    <input
                      type="radio"
                      name="fas-dc-opt"
                      value={opt.id}
                      checked={selected === opt.id}
                      onChange={() => void chooseOption(opt.id)}
                    />
                    <span className="fas-dc-radio" aria-hidden />
                    <span className="fas-dc-option-body">
                      <span className="fas-dc-option-label">{opt.label}</span>
                      {opt.hint ? (
                        <span className="fas-dc-option-hint">{opt.hint}</span>
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {showSheet && activeTopic ? (
          <aside className="fas-dc-sheet" aria-label="Tagro Empfehlung">
            <div className="fas-dc-sheet-handle" aria-hidden />
            <p className="fas-dc-sheet-kicker">Tagro Empfehlung</p>
            <p className="fas-dc-sheet-pick">{activeTopic.recommendLabel}</p>

            <p className="fas-dc-sheet-section">Begründung</p>
            <ul className="fas-dc-sheet-reasons">
              {activeTopic.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>

            {error ? (
              <p className="fas-dc-sheet-error" role="alert">
                {error}
              </p>
            ) : null}

            <div className="fas-dc-sheet-actions">
              <button
                type="button"
                className="fas-dc-sheet-btn is-accept"
                disabled={busy}
                onClick={() => void acceptRecommendation()}
              >
                {busy ? 'Wird übernommen…' : 'Empfehlung übernehmen'}
              </button>
              <button
                type="button"
                className="fas-dc-sheet-btn"
                disabled={busy}
                onClick={reviewAlternatives}
              >
                Alternativen prüfen
              </button>
              <button
                type="button"
                className="fas-dc-sheet-btn"
                disabled={busy}
                onClick={() => setExplainOpen((v) => !v)}
              >
                Entscheidung erklären
              </button>
            </div>
          </aside>
        ) : null}
      </div>

      {showSheet ? (
        <button
          type="button"
          className="fas-dc-sheet-scrim"
          aria-label="Schließen"
          onClick={() => {
            setSheetOpen(false)
            setExplainOpen(false)
            if (phase === 'sheet') setPhase('focus')
          }}
        />
      ) : null}

      <div className="fas-dc-dock">
        <div className={`fas-dc-wave${listening || showPath ? ' is-on' : ''}`} aria-hidden>
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <button
          type="button"
          className={`fas-dc-mic${listening ? ' is-on' : ''}`}
          aria-pressed={listening}
          aria-label={listening ? 'Zuhören beenden' : 'Tagro zuhören'}
          onClick={() => setListening((v) => !v)}
        >
          <Microphone size={16} weight="fill" />
        </button>
        <p className="fas-dc-dock-label">
          {listening
            ? 'Tagro hört zu'
            : showPath
              ? 'Tagro analysiert den Projektkontext…'
              : 'Tagro'}
        </p>
      </div>
    </div>
  )
}

function ExplainPopup({
  topic,
  onClose,
}: {
  topic: DecisionCanvasTopic
  onClose: () => void
}) {
  return (
    <div className="fas-dc-explain" role="dialog" aria-label={topic.explainTitle}>
      <p className="fas-dc-explain-title">{topic.explainTitle}</p>
      <ol className="fas-dc-explain-steps">
        {topic.explainSteps.map((s, i) => (
          <li key={`${s.n}-${s.label}`}>
            <span className="fas-dc-explain-n">{s.n}.</span>
            <span className="fas-dc-explain-label">{s.label}</span>
            {i < topic.explainSteps.length - 1 ? (
              <span className="fas-dc-explain-arrow" aria-hidden>
                ↓
              </span>
            ) : null}
          </li>
        ))}
      </ol>
      <button type="button" className="fas-dc-explain-close" onClick={onClose}>
        Schließen
      </button>
    </div>
  )
}
