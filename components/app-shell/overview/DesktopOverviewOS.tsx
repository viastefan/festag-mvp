'use client'

/**
 * Desktop Overview OS — reference dashboard with orchestrated focus animations.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowsOut, Sparkle } from '@phosphor-icons/react'
import OverviewPendingInvites from '@/components/app-shell/OverviewPendingInvites'
import DesktopKnowledgeMesh from '@/components/festag-canvas/DesktopKnowledgeMesh'
import FestagKnowledgeEdges from '@/components/festag-canvas/FestagKnowledgeEdges'
import FestagPath from '@/components/festag-canvas/FestagPath'
import { FESTAG_OVERVIEW_OS_STYLES } from '@/components/app-shell/overview/festag-overview-os-styles'
import type { OverviewPayload, OverviewDecision } from '@/components/app-shell/WorkspaceOverviewLive'
import { useStatusReportPlayback } from '@/hooks/useStatusReportPlayback'
import { openNewProject } from '@/lib/new-project-open'
import {
  acceptDecisionRecommendation,
  buildDecisionCanvasTopic,
  enrichDecisionFocus,
  ensureCanvasSuggestion,
  type DecisionCanvasTopic,
} from '@/lib/overview/decision-canvas'
import {
  buildWorkspaceConstellation,
  edgePath,
  type BoardNode,
  type OverviewBoardInput,
} from '@/lib/overview/workspace-board'
import { getVoicePreferences } from '@/lib/voice'

type Props = {
  greeting: string
  firstName: string
  data: OverviewPayload
  onDecided?: () => void
}

type Camera = { panX: number; panY: number; scale: number }
type FocusPhase = 'overview' | 'focusing' | 'focused' | 'closing'

const CAMERA_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'
const OVERVIEW_CAMERA: Camera = { panX: 0, panY: 0, scale: 1 }

const TIMING = {
  cameraMs: 1200,
  pathDelayMs: 480,
  pathDrawMs: 1500,
  revealMs: 780,
  popupMs: 360,
  closePathMs: 560,
  closeCameraMs: 1050,
} as const

function kindClass(kind: BoardNode['kind'], center?: boolean): string {
  if (center || kind === 'decision') return 'is-decision'
  if (kind === 'risk') return 'is-risk'
  if (kind === 'task') return 'is-task'
  if (kind === 'resource') return 'is-resource'
  return 'is-knowledge'
}

function buildVoiceLines(input: {
  greeting: string
  firstName: string
  calmLine: string
  waitingLabel?: string
}): string[] {
  const lines = [
    `${input.greeting}, ${input.firstName}.`,
    input.calmLine?.trim() || 'Alles läuft ruhig.',
  ]
  if (input.waitingLabel) {
    lines.push(
      input.waitingLabel.endsWith('.') ? input.waitingLabel : `${input.waitingLabel}.`,
    )
  }
  return lines
}

function buildActivePath(center: BoardNode, target: BoardNode): string {
  const entry = { x: 20, y: 76 }
  const mid = edgePath(entry.x, entry.y, center.x, center.y)
  const tail = edgePath(center.x, center.y, target.x, target.y).replace(/^M [^ ]+ [^ ]+ /, '')
  return `${mid} ${tail}`
}

function splitReason(text: string): { lead: string; detail: string | null } {
  const idx = text.indexOf(':')
  if (idx <= 0) return { lead: text, detail: null }
  return {
    lead: text.slice(0, idx).trim(),
    detail: text.slice(idx + 1).trim() || null,
  }
}

export default function DesktopOverviewOS({
  greeting,
  firstName,
  data,
  onDecided,
}: Props) {
  const boardInput: OverviewBoardInput = useMemo(
    () => ({
      workspaceName: data.workspace.name,
      calmLine: data.summary.calmLine,
      projects: data.projects,
      tasks: data.tasks || [],
      decisions: data.decisions,
      activity: data.activity,
      team: data.team,
    }),
    [data],
  )

  const constellation = useMemo(
    () => buildWorkspaceConstellation(boardInput),
    [boardInput],
  )

  const focusDecision = data.decisions[0] || null
  const mapRef = useRef<HTMLElement>(null)
  const timersRef = useRef<number[]>([])

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

  const [selected, setSelected] = useState<string | null>(() => topic?.recommendId || null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [liveTopic, setLiveTopic] = useState<DecisionCanvasTopic | null>(null)
  const [focusPhase, setFocusPhase] = useState<FocusPhase>('overview')
  const [camera, setCamera] = useState<Camera>(OVERVIEW_CAMERA)
  const [pathOn, setPathOn] = useState(false)
  const [pathRetracting, setPathRetracting] = useState(false)
  const [showReveal, setShowReveal] = useState(false)
  const [showInspector, setShowInspector] = useState(false)

  const activeTopic = liveTopic && liveTopic.id === topic?.id ? liveTopic : topic

  const clearTimers = useCallback(() => {
    for (const id of timersRef.current) window.clearTimeout(id)
    timersRef.current = []
  }, [])

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms)
    timersRef.current.push(id)
    return id
  }, [])

  const voiceLines = useMemo(() => {
    if (data.briefing?.lines?.length) return data.briefing.lines
    return buildVoiceLines({
      greeting,
      firstName,
      calmLine: activeTopic?.calmStatus || data.summary.calmLine,
      waitingLabel: activeTopic?.waitingLabel,
    })
  }, [data, greeting, firstName, activeTopic])

  const playback = useStatusReportPlayback({
    sentences: voiceLines,
    onComplete: useCallback(() => {}, []),
  })

  const { play, stop, speaking, activeIndex, activeWordIndex, supported } = playback

  const centerNode = constellation.nodes.find((n) => n.center)
  const pathTarget =
    constellation.nodes.find((n) => /umsetzung|implement/i.test(n.label)) ||
    constellation.nodes.find((n) => !n.center && n.kind === 'task') ||
    constellation.nodes[1]

  const computeFocusCamera = useCallback((): Camera | null => {
    const map = mapRef.current
    const node = centerNode
    if (!map || !node) return null

    const rect = map.getBoundingClientRect()
    const scale = 1.34
    const targetX = rect.width * 0.31
    const targetY = rect.height * 0.5
    const nodeX = (node.x / 100) * rect.width
    const nodeY = (node.y / 100) * rect.height

    return {
      panX: targetX - nodeX * scale,
      panY: targetY - nodeY * scale,
      scale,
    }
  }, [centerNode])

  const focusDecisionView = useCallback(() => {
    if (!activeTopic || focusPhase === 'focusing' || focusPhase === 'focused') return

    clearTimers()
    const nextCamera = computeFocusCamera()
    if (!nextCamera) return

    setFocusPhase('focusing')
    setPathRetracting(false)
    setShowReveal(false)
    setShowInspector(false)
    setPathOn(false)

    requestAnimationFrame(() => {
      setCamera(nextCamera)
    })

    schedule(() => setShowInspector(true), 320)
    schedule(() => setPathOn(true), TIMING.pathDelayMs)
    schedule(() => setShowReveal(true), TIMING.revealMs)
    schedule(() => setFocusPhase('focused'), TIMING.cameraMs)
  }, [activeTopic, focusPhase, clearTimers, computeFocusCamera, schedule])

  const resetCamera = useCallback(() => {
    if (focusPhase === 'overview' || focusPhase === 'closing') return

    clearTimers()
    setFocusPhase('closing')
    setShowInspector(false)
    setShowReveal(false)

    if (pathOn) {
      setPathRetracting(true)
      schedule(() => {
        setPathOn(false)
        setPathRetracting(false)
      }, TIMING.closePathMs)
    }

    schedule(() => {
      setCamera(OVERVIEW_CAMERA)
    }, 120)

    schedule(() => {
      setFocusPhase('overview')
    }, TIMING.closeCameraMs)
  }, [focusPhase, pathOn, clearTimers, schedule])

  useEffect(() => {
    setSelected(topic?.recommendId || null)
    setLiveTopic(null)
    setError(null)
    clearTimers()
    setFocusPhase('overview')
    setCamera(OVERVIEW_CAMERA)
    setPathOn(false)
    setPathRetracting(false)
    setShowReveal(false)
    setShowInspector(false)
  }, [topic?.id, clearTimers])

  useEffect(() => {
    return () => clearTimers()
  }, [clearTimers])

  useEffect(() => {
    const onResize = () => {
      if (focusPhase !== 'focused' && focusPhase !== 'focusing') return
      const next = computeFocusCamera()
      if (next) setCamera(next)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [focusPhase, computeFocusCamera])

  useEffect(() => {
    const prefs = getVoicePreferences()
    if (!prefs.enabled || !prefs.statusReportsEnabled) return
    if (supported) {
      const t = window.setTimeout(() => play(), 600)
      return () => clearTimeout(t)
    }
    return undefined
  }, [topic?.id, supported, play])

  useEffect(() => {
    if (!activeTopic?.decisionId || !activeTopic.needsSuggestion) return
    void ensureCanvasSuggestion(activeTopic.decisionId).then(async (res) => {
      if (!res.ok) return
      try {
        const qs = data.workspace.id
          ? `?workspaceId=${encodeURIComponent(data.workspace.id)}`
          : ''
        const overview = await fetch(`/api/workspaces/overview${qs}`, { cache: 'no-store' })
        if (!overview.ok) return
        const json = await overview.json()
        const next = (json?.decisions || []).find(
          (d: OverviewDecision) => d.id === activeTopic.decisionId,
        )
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
        /* keep topic */
      }
    })
  }, [activeTopic?.decisionId, activeTopic?.needsSuggestion, data])

  const byId = useMemo(
    () => new Map(constellation.nodes.map((n) => [n.id, n])),
    [constellation.nodes],
  )

  const knowledgeEdges = useMemo(
    () =>
      constellation.edges
        .map((e) => {
          const a = byId.get(e.from)
          const b = byId.get(e.to)
          if (!a || !b) return null
          return {
            id: e.id,
            d: edgePath(a.x, a.y, b.x, b.y),
            cross: e.id.includes('cross'),
          }
        })
        .filter(Boolean) as Array<{ id: string; d: string; cross?: boolean }>,
    [constellation.edges, byId],
  )

  const activePathD =
    centerNode && pathTarget
      ? buildActivePath(centerNode, pathTarget)
      : 'M 22 74 C 32 62, 38 54, 44 54 S 62 42, 68 38'

  async function accept() {
    if (!activeTopic || busy) return
    const optionId = selected || activeTopic.recommendId
    if (!optionId) return

    if (activeTopic.kind === 'project') {
      if (optionId === 'later') return
      openNewProject()
      return
    }

    if (!activeTopic.decisionId) return
    setBusy(true)
    setError(null)
    stop()
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
    resetCamera()
    onDecided?.()
  }

  function onNodeClick(node: BoardNode) {
    if (!activeTopic) return
    focusDecisionView()
  }

  const lineIndex = activeIndex >= 0 ? activeIndex : 0
  const currentLine = voiceLines[lineIndex] || ''
  const words = currentLine.split(/\s+/).filter(Boolean)
  const altOption = activeTopic?.options.find((o) => o.id !== activeTopic.recommendId)
  const isFocused = focusPhase === 'focused' || focusPhase === 'focusing'

  return (
    <>
      <style>{FESTAG_OVERVIEW_OS_STYLES}</style>
      <div
        className={[
          'fas-wb',
          'fas-wb-os',
          'festag-readmode',
          `is-phase-${focusPhase}`,
          isFocused ? 'is-decision-focus' : '',
          showInspector ? 'has-popup' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="fas-wb-invites">
          <OverviewPendingInvites />
        </div>

        <main className="fas-wb-os-canvas">
          <header className="fas-wb-os-head">
            <div className="fas-wb-os-head-copy">
              <h1 className="fas-wb-os-title">
                {greeting}, {firstName}.
              </h1>
              <p className="fas-wb-os-calm">
                {activeTopic?.calmStatus || data.summary.calmLine}
              </p>
              {activeTopic && data.summary.pendingDecisions > 0 ? (
                <button
                  type="button"
                  className="fas-wb-os-waiting"
                  onClick={focusDecisionView}
                >
                  <span className="fas-wb-os-waiting-dot" aria-hidden />
                  {activeTopic.waitingLabel}
                  <span className="fas-wb-os-waiting-chev" aria-hidden>
                    →
                  </span>
                </button>
              ) : null}
            </div>
          </header>

          <section
            className="fas-wb-os-map"
            ref={mapRef}
            aria-label="Wissensraum"
            onClick={(e) => {
              if (isFocused && e.target === e.currentTarget) resetCamera()
            }}
          >
            <div className="fas-wb-os-map-vignette" aria-hidden />
            <div className="fas-wb-os-map-grain" aria-hidden />
            <div
              className={[
                'fas-wb-os-world',
                isFocused ? 'is-focused' : '',
                focusPhase === 'focusing' ? 'is-camera-moving' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{
                transform: `translate3d(${camera.panX}px, ${camera.panY}px, 0) scale(${camera.scale})`,
                transition:
                  focusPhase === 'closing' || focusPhase === 'focusing'
                    ? `transform ${focusPhase === 'closing' ? TIMING.closeCameraMs : TIMING.cameraMs}ms ${CAMERA_EASE}`
                    : 'none',
              }}
            >
              <DesktopKnowledgeMesh />

              <FestagKnowledgeEdges
                edges={knowledgeEdges}
                className="fas-wb-os-knowledge-edges"
              />

              {pathOn && centerNode ? (
                <FestagPath
                  d={activePathD}
                  visible
                  alwaysOn={!pathRetracting}
                  retracting={pathRetracting}
                  className="fas-wb-os-path"
                  start={{ x: 20, y: 76 }}
                  end={{ x: pathTarget?.x ?? 68, y: pathTarget?.y ?? 38 }}
                  drawDelayMs={pathRetracting ? 0 : TIMING.pathDelayMs}
                  drawDurationMs={TIMING.pathDrawMs}
                />
              ) : null}

              {constellation.nodes.map((node, i) => (
                <button
                  key={node.id}
                  type="button"
                  data-node={node.id}
                  className={[
                    'fas-wb-os-node',
                    kindClass(node.kind, node.center),
                    node.center ? 'is-center' : '',
                    showReveal && node.center ? 'is-active' : '',
                    pathOn && pathTarget && node.id === pathTarget.id ? 'is-path-end' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{
                    left: `${node.x}%`,
                    top: `${node.y}%`,
                    ['--node-i' as string]: i,
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    onNodeClick(node)
                  }}
                >
                  <span className="fas-wb-os-node-glow" aria-hidden />
                  <span className="fas-wb-os-node-ring" aria-hidden />
                  <span className="fas-wb-os-node-dot" aria-hidden />
                  <span className="fas-wb-os-node-copy">
                    <span className="fas-wb-os-node-label">{node.label}</span>
                    {node.meta ? (
                      <span className="fas-wb-os-node-meta">{node.meta}</span>
                    ) : null}
                  </span>
                </button>
              ))}

              {showReveal && activeTopic && centerNode ? (
                <div
                  className="fas-wb-os-decision is-visible"
                  style={{
                    left: `${centerNode.x}%`,
                    top: `${centerNode.y + 11}%`,
                  }}
                >
                  <p className="fas-wb-os-decision-k">Entscheidung</p>
                  <p className="fas-wb-os-decision-q">{activeTopic.question}</p>
                </div>
              ) : null}
            </div>

            {showInspector && activeTopic ? (
              <aside
                className={[
                  'fas-wb-os-popup',
                  focusPhase === 'closing' ? 'is-out' : 'is-in',
                ].join(' ')}
                aria-label="Tagro Empfehlung"
              >
                <div className="fas-wb-os-popup-inner">
                  <header className="fas-wb-os-insp-head fas-wb-os-stagger" style={{ ['--stagger' as string]: 0 }}>
                    <div className="fas-wb-os-insp-head-left">
                      <Sparkle size={14} weight="fill" aria-hidden />
                      <span>Tagro Empfehlung</span>
                    </div>
                    <button
                      type="button"
                      className="fas-wb-os-popup-expand"
                      aria-label="Schließen"
                      onClick={resetCamera}
                    >
                      <ArrowsOut size={16} weight="regular" />
                    </button>
                  </header>

                  <p className="fas-wb-os-insp-pick fas-wb-os-stagger" style={{ ['--stagger' as string]: 1 }}>
                    {activeTopic.recommendLabel}
                  </p>
                  <p className="fas-wb-os-insp-sub fas-wb-os-stagger" style={{ ['--stagger' as string]: 2 }}>
                    Empfohlen für dein Projekt
                  </p>

                  <ul className="fas-wb-os-insp-reasons">
                    {activeTopic.reasons.map((r, i) => {
                      const { lead, detail } = splitReason(r)
                      return (
                        <li
                          key={r}
                          className="fas-wb-os-stagger"
                          style={{ ['--stagger' as string]: 3 + i }}
                        >
                          <span className="fas-wb-os-reason-check" aria-hidden />
                          <span className="fas-wb-os-reason-copy">
                            <span className="fas-wb-os-reason-lead">{lead}</span>
                            {detail ? (
                              <span className="fas-wb-os-reason-detail">{detail}</span>
                            ) : null}
                          </span>
                        </li>
                      )
                    })}
                  </ul>

                  {altOption ? (
                    <section
                      className="fas-wb-os-alt fas-wb-os-stagger"
                      style={{ ['--stagger' as string]: 7 }}
                    >
                      <p className="fas-wb-os-alt-k">Alternative</p>
                      <p className="fas-wb-os-alt-label">
                        {altOption.label}
                        {altOption.hint ? `: ${altOption.hint}` : ''}
                      </p>
                    </section>
                  ) : null}

                  {error ? (
                    <p className="fas-wb-os-error" role="alert">
                      {error}
                    </p>
                  ) : null}

                  <div
                    className="fas-wb-os-actions fas-wb-os-stagger"
                    style={{ ['--stagger' as string]: 8 }}
                  >
                    <button
                      type="button"
                      className="fas-wb-os-btn-primary"
                      disabled={busy}
                      onClick={() => void accept()}
                    >
                      {busy ? 'Wird übernommen…' : 'Empfehlung übernehmen'}
                    </button>
                    <button
                      type="button"
                      className="fas-wb-os-btn-ghost"
                      onClick={resetCamera}
                    >
                      Alternativen prüfen
                    </button>
                    <button type="button" className="fas-wb-os-btn-link">
                      Entscheidung erklären
                    </button>
                  </div>
                </div>
              </aside>
            ) : null}
          </section>

          <footer className="fas-wb-os-voice" aria-live="polite">
            <div className="fas-wb-os-voice-shell">
              <div className={`fas-wb-os-wave${speaking ? ' is-on' : ''}`} aria-hidden>
                {Array.from({ length: 11 }).map((_, i) => (
                  <span key={i} style={{ ['--i' as string]: i }} />
                ))}
              </div>
              <p className="fas-wb-os-voice-text">
                {speaking && words.length ? (
                  words.map((w, i) => (
                    <span
                      key={`${lineIndex}-${i}`}
                      className={[
                        'fas-wb-os-word',
                        i < activeWordIndex ? ' is-past' : '',
                        i === activeWordIndex ? ' is-current' : '',
                      ].join('')}
                    >
                      {w}{' '}
                    </span>
                  ))
                ) : (
                  <>
                    Tagro analysiert{' '}
                    <span className="fas-wb-os-word is-current">dein Projekt</span>
                    … Letztes Update: gerade eben
                  </>
                )}
              </p>
              <div className="fas-wb-os-voice-rail" aria-hidden>
                {Array.from({ length: 56 }).map((_, i) => (
                  <span key={i} style={{ ['--i' as string]: i }} />
                ))}
              </div>
            </div>
          </footer>
        </main>
      </div>
    </>
  )
}
