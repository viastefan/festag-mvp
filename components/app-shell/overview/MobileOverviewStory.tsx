'use client'

/**
 * Mobile Overview — living story (not shrunk desktop).
 *
 * Knowledge sleeps → Tagro speaks → one path grows → one decision → retract.
 * @see docs/festag-design-constitution.md
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import OverviewStoryPanel from '@/components/app-shell/overview/OverviewStoryPanel'
import { FESTAG_OVERVIEW_PANEL_STYLES } from '@/components/app-shell/overview/festag-overview-panel-styles'
import OverviewPendingInvites from '@/components/app-shell/OverviewPendingInvites'
import KnowledgeGrid from '@/components/festag-canvas/KnowledgeGrid'
import FestagPath, { MOBILE_INK_PATH } from '@/components/festag-canvas/FestagPath'
import { FESTAG_OVERVIEW_STORY_STYLES } from '@/components/app-shell/overview/festag-overview-story-styles'
import type { OverviewPayload, OverviewDecision } from '@/components/app-shell/WorkspaceOverviewLive'
import { useStatusReportPlayback } from '@/hooks/useStatusReportPlayback'
import { openNewProject } from '@/lib/new-project-open'
import { getVoicePreferences } from '@/lib/voice'
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

const FALLBACK_WORD_MS = 220
const FALLBACK_SENTENCE_MS = 680

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
  const [fallbackLine, setFallbackLine] = useState(0)
  const [fallbackWord, setFallbackWord] = useState(0)
  const [fallbackSpeaking, setFallbackSpeaking] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [liveTopic, setLiveTopic] = useState<DecisionCanvasTopic | null>(null)
  const activatedRef = useRef(false)
  const pendingDecisionsRef = useRef(data.summary.pendingDecisions)

  const activeTopic = liveTopic && liveTopic.id === topic?.id ? liveTopic : topic
  const activeTopicRef = useRef(activeTopic)
  useEffect(() => { activeTopicRef.current = activeTopic }, [activeTopic])
  useEffect(() => { pendingDecisionsRef.current = data.summary.pendingDecisions }, [data.summary.pendingDecisions])

  const beginFlow = useCallback(async () => {
    const current = activeTopicRef.current
    if (!current || activatedRef.current) return
    activatedRef.current = true
    setFallbackSpeaking(false)
    setSelected(current.recommendId)
    setError(null)
    setPhase('pulse')
    window.setTimeout(() => setPhase('path'), 720)
    window.setTimeout(() => setPhase('decision'), 1480)

    if (current.kind === 'decision' && current.decisionId && current.needsSuggestion) {
      const decisionId = current.decisionId
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
  }, [data])

  const handleVoiceComplete = useCallback(() => {
    if (activatedRef.current) return
    const current = activeTopicRef.current
    if (current && pendingDecisionsRef.current > 0) {
      void beginFlow()
    }
  }, [beginFlow])

  const playback = useStatusReportPlayback({
    sentences: voiceLines,
    onComplete: handleVoiceComplete,
    enabled: phase === 'rest',
  })
  const { supported, play, stop, speaking: ttsSpeaking, activeIndex, activeWordIndex } = playback

  useEffect(() => {
    setPhase('rest')
    setFallbackLine(0)
    setFallbackWord(0)
    setFallbackSpeaking(false)
    setSelected(null)
    setError(null)
    setLiveTopic(null)
    activatedRef.current = false
  }, [topic?.id])

  useEffect(() => {
    if (phase !== 'rest') stop()
  }, [phase, stop])

  useEffect(() => {
    if (phase !== 'rest') return
    const prefs = getVoicePreferences()
    if (!prefs.enabled || !prefs.statusReportsEnabled) return

    if (supported) {
      const t = window.setTimeout(() => play(), 420)
      return () => window.clearTimeout(t)
    }

    setFallbackSpeaking(true)
    setFallbackLine(0)
    setFallbackWord(0)
    return undefined
  }, [topic?.id, phase, supported, play])

  useEffect(() => {
    if (!fallbackSpeaking || phase !== 'rest' || supported) return
    const line = voiceLines[fallbackLine]
    if (!line) return
    const words = line.split(/\s+/).filter(Boolean)
    if (!words.length) return

    const atEnd = fallbackWord >= words.length - 1
    const t = window.setTimeout(
      () => {
        if (!atEnd) {
          setFallbackWord((w) => w + 1)
          return
        }
        if (fallbackLine < voiceLines.length - 1) {
          setFallbackLine((i) => i + 1)
          setFallbackWord(0)
          return
        }
        setFallbackSpeaking(false)
        handleVoiceComplete()
      },
      atEnd ? FALLBACK_SENTENCE_MS : FALLBACK_WORD_MS,
    )
    return () => clearTimeout(t)
  }, [
    fallbackSpeaking,
    phase,
    fallbackLine,
    fallbackWord,
    voiceLines,
    supported,
    handleVoiceComplete,
  ])

  const speaking = ttsSpeaking || fallbackSpeaking
  const lineIndex = supported && activeIndex >= 0 ? activeIndex : fallbackLine
  const wordIndex = supported && activeWordIndex >= 0 ? activeWordIndex : fallbackWord

  useEffect(() => {
    const on = speaking || phase !== 'rest'
    document.documentElement.classList.toggle('festag-story-focus', on)
    return () => document.documentElement.classList.remove('festag-story-focus')
  }, [speaking, phase])

  function openRecommend() {
    setPhase('recommend')
  }

  function openExplain() {
    setPhase('explain')
  }

  function retract(then?: () => void) {
    stop()
    setPhase('retract')
    window.setTimeout(() => {
      setPhase('rest')
      setFallbackSpeaking(false)
      activatedRef.current = false
      setFallbackLine(Math.max(0, voiceLines.length - 1))
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
      <style>{FESTAG_OVERVIEW_PANEL_STYLES}</style>
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
          className="fos-path"
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
            <OverviewStoryPanel
              topic={activeTopic}
              selected={selected}
              onSelect={setSelected}
              showDecision
              showRecommend={showRecommend}
              onOpenRecommend={openRecommend}
              onExplain={openExplain}
              onAccept={() => void accept()}
              busy={busy}
              error={error}
              layout="stack"
            />
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
