'use client'

/**
 * Mobile Overview — living story (not shrunk desktop).
 *
 * Knowledge sleeps → Tagro speaks → one path grows → one decision → retract.
 * @see docs/festag-design-constitution.md
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Sparkle } from '@phosphor-icons/react'
import OverviewPendingInvites from '@/components/app-shell/OverviewPendingInvites'
import KnowledgeGrid from '@/components/festag-canvas/KnowledgeGrid'
import FestagPath, { MOBILE_INK_PATH } from '@/components/festag-canvas/FestagPath'
import { FESTAG_OVERVIEW_STORY_STYLES } from '@/components/app-shell/overview/festag-overview-story-styles'
import type { OverviewPayload, OverviewDecision } from '@/components/app-shell/WorkspaceOverviewLive'
import { openNewProject } from '@/lib/new-project-open'
import {
  acceptDecisionRecommendation,
  buildDecisionCanvasTopic,
  enrichDecisionFocus,
  ensureCanvasSuggestion,
  type DecisionCanvasTopic,
} from '@/lib/overview/decision-canvas'

type Props = {
  greeting: string
  firstName: string
  data: OverviewPayload
  onDecided?: () => void
}

type Phase =
  | 'rest'
  | 'pulse'
  | 'path'
  | 'decision'
  | 'recommend'
  | 'explain'
  | 'accepted'
  | 'retract'

const WORD_MS = 220
const SENTENCE_PAUSE_MS = 680

function buildVoiceLines(input: {
  greeting: string
  firstName: string
  calmLine: string
  projectTitle?: string
  waitingLabel?: string
}): string[] {
  const lead = `${input.greeting}, ${input.firstName}.`
  const calm = input.calmLine?.trim() || 'Alles läuft ruhig.'
  const project = input.projectTitle?.trim()
  const lines = [lead, calm]
  if (project) {
    lines.push(`${project} läuft stabil.`)
    lines.push('Keine Blocker.')
  }
  if (input.waitingLabel) {
    lines.push(input.waitingLabel.endsWith('.') ? input.waitingLabel : `${input.waitingLabel}.`)
  }
  return lines
}

export default function MobileOverviewStory({
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

  const voiceLines = useMemo(() => {
    if (data.briefing?.lines?.length) return data.briefing.lines
    return buildVoiceLines({
      greeting,
      firstName,
      calmLine: topic?.calmStatus || data.summary.calmLine,
      projectTitle: data.briefing?.projectTitle || data.projects[0]?.title,
      waitingLabel: topic?.waitingLabel,
    })
  }, [data, greeting, firstName, topic])

  const [phase, setPhase] = useState<Phase>('rest')
  const [lineIndex, setLineIndex] = useState(0)
  const [wordIndex, setWordIndex] = useState(0)
  const [speaking, setSpeaking] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [liveTopic, setLiveTopic] = useState<DecisionCanvasTopic | null>(null)
  const activatedRef = useRef(false)

  const activeTopic = liveTopic && liveTopic.id === topic?.id ? liveTopic : topic

  useEffect(() => {
    setPhase('rest')
    setLineIndex(0)
    setWordIndex(0)
    setSpeaking(true)
    setSelected(null)
    setError(null)
    setLiveTopic(null)
    activatedRef.current = false
  }, [topic?.id])

  useEffect(() => {
    const on = speaking || phase !== 'rest'
    document.documentElement.classList.toggle('festag-story-focus', on)
    return () => document.documentElement.classList.remove('festag-story-focus')
  }, [speaking, phase])

  useEffect(() => {
    if (!speaking || phase !== 'rest') return
    const line = voiceLines[lineIndex]
    if (!line) return
    const words = line.split(/\s+/).filter(Boolean)
    if (!words.length) return

    const atEndOfLine = wordIndex >= words.length - 1
    const isWaitingLine = /wartet|waiting|freigabe|approval|entscheidung/i.test(line)

    const t = window.setTimeout(
      () => {
        if (!atEndOfLine) {
          setWordIndex((w) => w + 1)
          return
        }
        if (lineIndex < voiceLines.length - 1) {
          setLineIndex((i) => i + 1)
          setWordIndex(0)
          return
        }
        setSpeaking(false)
        if (activeTopic && !activatedRef.current) {
          if (isWaitingLine || data.summary.pendingDecisions > 0) {
            void beginFlow()
          }
        }
      },
      atEndOfLine ? SENTENCE_PAUSE_MS : WORD_MS,
    )
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speaking, phase, lineIndex, wordIndex, voiceLines, activeTopic])

  async function ensureSuggestion(decisionId: string) {
    const res = await ensureCanvasSuggestion(decisionId)
    if (!res.ok) return
    try {
      const qs = data.workspace.id
        ? `?workspaceId=${encodeURIComponent(data.workspace.id)}`
        : ''
      const overview = await fetch(`/api/workspaces/overview${qs}`, { cache: 'no-store' })
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
      /* keep current topic */
    }
  }

  async function beginFlow() {
    if (!activeTopic || activatedRef.current) return
    activatedRef.current = true
    setSpeaking(false)
    setSelected(activeTopic.recommendId)
    setError(null)
    setPhase('pulse')
    window.setTimeout(() => setPhase('path'), 720)
    window.setTimeout(() => setPhase('decision'), 1480)

    if (activeTopic.kind === 'decision' && activeTopic.decisionId && activeTopic.needsSuggestion) {
      void ensureSuggestion(activeTopic.decisionId)
    }
  }

  function openRecommend() {
    setPhase('recommend')
  }

  function openExplain() {
    setPhase('explain')
  }

  function retract(then?: () => void) {
    setPhase('retract')
    window.setTimeout(() => {
      setPhase('rest')
      setSpeaking(false)
      activatedRef.current = false
      setLineIndex(voiceLines.length - 1)
      then?.()
    }, 620)
  }

  async function accept() {
    if (!activeTopic || busy) return
    const optionId = selected || activeTopic.recommendId
    if (!optionId) return

    if (activeTopic.kind === 'project') {
      if (optionId === 'later') {
        retract()
        return
      }
      setPhase('accepted')
      window.setTimeout(() => retract(() => openNewProject()), 900)
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
    setPhase('accepted')
    window.setTimeout(() => retract(() => onDecided?.()), 1100)
  }

  const showPath =
    phase === 'path' ||
    phase === 'decision' ||
    phase === 'recommend' ||
    phase === 'explain' ||
    phase === 'accepted'
  const showDecision =
    phase === 'decision' || phase === 'recommend' || phase === 'explain'
  const showRecommend = phase === 'recommend' || phase === 'explain'
  const pulse = phase === 'pulse' || phase === 'path'
  const isRest = phase === 'rest' || phase === 'retract'
  const isAccepted = phase === 'accepted'

  const currentLine = voiceLines[lineIndex] || ''
  const words = currentLine.split(/\s+/).filter(Boolean)

  return (
    <>
      <style>{FESTAG_OVERVIEW_STORY_STYLES}</style>
      <div
        className={[
          'fos',
          showPath ? ' is-flow' : '',
          phase === 'retract' ? ' is-retract' : '',
          speaking ? ' is-speaking' : '',
        ].join('')}
        data-phase={phase}
      >
        <div className="fos-invites">
          <OverviewPendingInvites />
        </div>

        <KnowledgeGrid pulseAt={pulse ? 'anchor' : null} />

        <FestagPath
          d={MOBILE_INK_PATH}
          visible={showPath}
          retracting={phase === 'retract' || isAccepted}
        />

        {phase === 'explain' && activeTopic ? (
          <ExplainBranch topic={activeTopic} onClose={() => setPhase('recommend')} />
        ) : null}

        <div className="fos-body">
          {isRest && !isAccepted ? (
            <header className="fos-greeting">
              <h1 className="fos-greeting-line">
                {greeting}, {firstName}.
              </h1>
              <p className="fos-greeting-calm">
                {activeTopic?.calmStatus || data.summary.calmLine}
              </p>
            </header>
          ) : null}

          {isAccepted && activeTopic ? (
            <header className="fos-greeting">
              <h1 className="fos-greeting-line">Entscheidung übernommen.</h1>
              <p className="fos-greeting-calm">
                Wir setzen {activeTopic.recommendLabel} um.
              </p>
            </header>
          ) : null}

          {showDecision && activeTopic ? (
            <article className="fos-panel is-decision">
              <p className="fos-panel-label">Entscheidung</p>
              <h2 className="fos-panel-title">{activeTopic.question}</h2>
              <div className="fos-options" role="radiogroup" aria-label="Optionen">
                {activeTopic.options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={selected === opt.id}
                    className={`fos-option${selected === opt.id ? ' is-on' : ''}${opt.recommended ? ' is-rec' : ''}`}
                    onClick={() => setSelected(opt.id)}
                  >
                    <span className="fos-option-label">{opt.label}</span>
                    {opt.hint ? (
                      <span className="fos-option-hint">{opt.hint}</span>
                    ) : null}
                  </button>
                ))}
              </div>
              {!showRecommend ? (
                <button type="button" className="fos-text-action" onClick={openRecommend}>
                  Empfehlung ansehen
                </button>
              ) : null}
            </article>
          ) : null}

          {showRecommend && activeTopic ? (
            <article className="fos-panel is-tagro">
              <div className="fos-tagro-head">
                <Sparkle size={15} weight="fill" aria-hidden />
                <span>Tagro</span>
              </div>
              <p className="fos-tagro-pick">{activeTopic.recommendLabel}</p>
              <p className="fos-tagro-why">Warum</p>
              <ul className="fos-tagro-reasons">
                {activeTopic.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              {error ? (
                <p className="fos-tagro-error" role="alert">
                  {error}
                </p>
              ) : null}
              <button
                type="button"
                className="fos-btn-primary"
                disabled={busy}
                onClick={() => void accept()}
              >
                {busy ? 'Wird übernommen…' : 'Empfehlung übernehmen'}
              </button>
              <button type="button" className="fos-text-action" onClick={openExplain}>
                Erklären
              </button>
            </article>
          ) : null}
        </div>

        <footer className="fos-voice" aria-live="polite">
          <div className={`fos-wave${speaking || showPath ? ' is-on' : ''}`} aria-hidden>
            {Array.from({ length: 9 }).map((_, i) => (
              <span key={i} style={{ ['--i' as string]: i }} />
            ))}
          </div>
          <p className="fos-voice-line">
            {speaking && words.length
              ? words.map((w, i) => (
                  <span
                    key={`${lineIndex}-${i}-${w}`}
                    className={[
                      'fos-word',
                      i < wordIndex ? ' is-past' : '',
                      i === wordIndex ? ' is-current' : '',
                      i > wordIndex ? ' is-future' : '',
                    ].join('')}
                  >
                    {w}{' '}
                  </span>
                ))
              : showPath
                ? (
                    <>
                      Tagro analysiert{' '}
                      <span className="fos-word is-current">den Projektkontext</span>
                      …
                    </>
                  )
                : 'Tagro'}
          </p>
        </footer>
      </div>
    </>
  )
}

function ExplainBranch({
  topic,
  onClose,
}: {
  topic: DecisionCanvasTopic
  onClose: () => void
}) {
  return (
    <div className="fos-explain" role="dialog" aria-label={topic.explainTitle}>
      <p className="fos-explain-title">{topic.explainTitle}</p>
      <ol className="fos-explain-steps">
        {topic.explainSteps.map((s, i) => (
          <li key={`${s.n}-${s.label}`}>
            <span className="fos-explain-n">{s.n}</span>
            <span className="fos-explain-label">{s.label}</span>
            {i < topic.explainSteps.length - 1 ? (
              <span className="fos-explain-arrow" aria-hidden>
                ↓
              </span>
            ) : null}
          </li>
        ))}
      </ol>
      <button type="button" className="fos-text-action" onClick={onClose}>
        Schließen
      </button>
    </div>
  )
}
