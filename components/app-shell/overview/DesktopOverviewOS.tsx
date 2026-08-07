'use client'

/**
 * Desktop Overview OS — reference dashboard (map + right rail + in-canvas chrome).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowsOut } from '@phosphor-icons/react'
import OverviewStoryPanel from '@/components/app-shell/overview/OverviewStoryPanel'
import ProjectIntelligencePanel from '@/components/app-shell/overview/ProjectIntelligencePanel'
import { FESTAG_OVERVIEW_PANEL_STYLES } from '@/components/app-shell/overview/festag-overview-panel-styles'
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
  buildOverviewOsTopic,
  enrichDecisionFocus,
  ensureCanvasSuggestion,
  type DecisionCanvasTopic,
} from '@/lib/overview/decision-canvas'
import {
  buildWorkspaceConstellation,
  buildOverviewActivePath,
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
  cameraMs: 1100,
  pathDelayMs: 400,
  pathDrawMs: 1400,
  revealMs: 680,
  closePathMs: 500,
  closeCameraMs: 950,
} as const

function kindClass(kind: BoardNode['kind'], center?: boolean): string {
  if (center || kind === 'decision') return 'is-decision'
  if (kind === 'risk') return 'is-risk'
  if (kind === 'task') return 'is-task'
  if (kind === 'resource') return 'is-resource'
  return 'is-knowledge'
}

function labelAnchor(x: number, y: number): string {
  if (y < 20) return 'is-anchor-s'
  if (y > 62) return 'is-anchor-n'
  if (x < 22) return 'is-anchor-e'
  if (x > 72) return 'is-anchor-w'
  if (x < 44) return 'is-anchor-e'
  return 'is-anchor-w'
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
  const autoFocusedRef = useRef(false)

  const focusProject =
    data.projects.find((p) => p.id === focusDecision?.projectId) ||
    data.projects[0] ||
    null

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

    return buildOverviewOsTopic({
      workspaceName: data.workspace.name,
      activeProjects: data.summary.activeProjects,
      pendingDecisions: data.summary.pendingDecisions,
      calmLine: data.summary.calmLine,
      focus,
      focusProject: focusProject
        ? {
            id: focusProject.id,
            title: focusProject.title,
            phase: focusProject.phase,
            nextMilestone: focusProject.nextMilestone,
            health: focusProject.health,
            progress: focusProject.progress,
          }
        : null,
    })
  }, [data, focusDecision, focusProject])

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
  const [showRailRecommend, setShowRailRecommend] = useState(false)

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
    constellation.nodes.find(
      (n) => !n.center && centerNode && n.y < centerNode.y && n.kind === 'task',
    ) ||
    constellation.nodes.find((n) => !n.center && n.kind === 'project') ||
    constellation.nodes.find((n) => !n.center) ||
    null

  const activePath = useMemo(() => {
    if (!centerNode || !pathTarget) return null
    return buildOverviewActivePath(
      { x: centerNode.x, y: centerNode.y },
      { x: pathTarget.x, y: pathTarget.y },
    )
  }, [centerNode, pathTarget])

  const computeFocusCamera = useCallback((): Camera | null => {
    const map = mapRef.current
    const node = centerNode
    if (!map || !node) return null

    const rect = map.getBoundingClientRect()
    const scale = 1.28
    const targetX = rect.width * 0.32
    const targetY = rect.height * 0.46
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
    setShowRailRecommend(false)
    setPathOn(false)
    setShowInspector(true)

    /* Rail reflow shrinks map — recompute camera after layout */
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const cam = computeFocusCamera() || nextCamera
        setCamera(cam)
      })
    })

    schedule(() => setPathOn(true), TIMING.pathDelayMs)
    schedule(() => setShowReveal(true), TIMING.revealMs)
    schedule(() => setShowRailRecommend(true), TIMING.revealMs + 520)
    schedule(() => setFocusPhase('focused'), TIMING.cameraMs)
  }, [activeTopic, focusPhase, clearTimers, computeFocusCamera, schedule])

  const resetCamera = useCallback(() => {
    if (focusPhase === 'overview' || focusPhase === 'closing') return

    clearTimers()
    setFocusPhase('closing')
    setShowInspector(false)
    setShowReveal(false)
    setShowRailRecommend(false)

    if (pathOn) {
      setPathRetracting(true)
      schedule(() => {
        setPathOn(false)
        setPathRetracting(false)
      }, TIMING.closePathMs)
    }

    schedule(() => setCamera(OVERVIEW_CAMERA), 100)
    schedule(() => setFocusPhase('overview'), TIMING.closeCameraMs)
    autoFocusedRef.current = false
  }, [focusPhase, pathOn, clearTimers, schedule])

  useEffect(() => {
    setSelected(topic?.recommendId || null)
    setLiveTopic(null)
    setError(null)
    clearTimers()

    if (!topic) {
      autoFocusedRef.current = false
      setFocusPhase('overview')
      setCamera(OVERVIEW_CAMERA)
      setPathOn(false)
      setPathRetracting(false)
      setShowReveal(false)
      setShowInspector(false)
      setShowRailRecommend(false)
      return
    }

    autoFocusedRef.current = true
    setShowInspector(true)
    setFocusPhase('focusing')
    setPathRetracting(false)
    setShowReveal(false)
    setShowRailRecommend(false)
    setPathOn(false)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const cam = computeFocusCamera()
        if (cam) setCamera(cam)
      })
    })
    schedule(() => setPathOn(true), TIMING.pathDelayMs)
    schedule(() => setShowReveal(true), TIMING.revealMs)
    schedule(() => setShowRailRecommend(true), TIMING.revealMs + 520)
    schedule(() => setFocusPhase('focused'), TIMING.cameraMs)
  }, [topic?.id, clearTimers, computeFocusCamera, schedule, topic])

  useEffect(() => () => clearTimers(), [clearTimers])

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
      const t = window.setTimeout(() => play(), 700)
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
        /* keep */
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
    activePath?.d ||
    'M 12 84 C 28 82, 30 68, 46 52 C 58 28, 54 36, 68 30'

  async function accept() {
    if (!activeTopic || busy) return
    const optionId = selected || activeTopic.recommendId
    if (!optionId) return

    if (activeTopic.kind === 'project') {
      if (optionId === 'later') return
      openNewProject()
      return
    }

    if (activeTopic.kind === 'insight' && activeTopic.href) {
      stop()
      resetCamera()
      window.location.assign(activeTopic.href)
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

  const lineIndex = activeIndex >= 0 ? activeIndex : 0
  const currentLine = voiceLines[lineIndex] || ''
  const words = currentLine.split(/\s+/).filter(Boolean)
  const isFocused = focusPhase === 'focused' || focusPhase === 'focusing'
  const hasPendingDecision = data.summary.pendingDecisions > 0
  const primaryLabel =
    activeTopic?.kind === 'insight'
      ? 'Empfehlung öffnen'
      : busy
        ? 'Wird übernommen…'
        : 'Empfehlung übernehmen'
  const decisionContext =
    centerNode?.label ||
    activeTopic?.explainTitle ||
    focusProject?.title ||
    data.workspace.name

  return (
    <>
      <style>{FESTAG_OVERVIEW_OS_STYLES}</style>
      <style>{FESTAG_OVERVIEW_PANEL_STYLES}</style>
      <div
        className={[
          'fas-wb',
          'fas-wb-os',
          'festag-readmode',
          `is-phase-${focusPhase}`,
          isFocused ? 'is-decision-focus' : '',
          showInspector ? 'has-rail' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="fas-wb-invites">
          <OverviewPendingInvites />
        </div>

        <main className="fas-wb-os-canvas">
          <div className="fas-wb-os-stage">
            <section
              className="fas-wb-os-map"
              ref={mapRef}
              aria-label="Wissensraum"
            >
              <div className="fas-wb-os-map-head">
                <h1 className="fas-wb-os-title">
                  {greeting}, {firstName}.
                </h1>
                <p className="fas-wb-os-calm">
                  {activeTopic?.calmStatus || data.summary.calmLine}
                </p>
                {activeTopic && !isFocused ? (
                  <button
                    type="button"
                    className="fas-wb-os-waiting"
                    onClick={focusDecisionView}
                  >
                    <span className="fas-wb-os-waiting-dot" aria-hidden />
                    {hasPendingDecision
                      ? activeTopic.waitingLabel
                      : activeTopic.waitingLabel}
                    <span className="fas-wb-os-waiting-chev" aria-hidden>→</span>
                  </button>
                ) : null}

                {data.intelligence && !isFocused ? (
                  <div className="fas-wb-os-pi">
                    <ProjectIntelligencePanel intelligence={data.intelligence} />
                  </div>
                ) : null}
              </div>

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

                {pathOn && centerNode && activePath ? (
                  <FestagPath
                    d={activePathD}
                    visible
                    alwaysOn={!pathRetracting}
                    retracting={pathRetracting}
                    className="fas-wb-os-path"
                    start={activePath.entry}
                    end={activePath.end}
                    drawDelayMs={pathRetracting ? 0 : TIMING.pathDelayMs}
                    drawDurationMs={TIMING.pathDrawMs}
                  />
                ) : null}

                {constellation.nodes.map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    data-node={node.id}
                    className={[
                      'fas-wb-os-node',
                      kindClass(node.kind, node.center),
                      labelAnchor(node.x, node.y),
                      node.center ? 'is-center' : '',
                      node.center && isFocused ? 'is-focus-node' : '',
                      showReveal && node.center ? 'is-active' : '',
                      pathOn && pathTarget && node.id === pathTarget.id ? 'is-path-end' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={{ left: `${node.x}%`, top: `${node.y}%` }}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (activeTopic) focusDecisionView()
                    }}
                  >
                    <span className="fas-wb-os-node-orb" aria-hidden>
                      <span className="fas-wb-os-node-glow" />
                      <span className="fas-wb-os-node-ring" />
                      <span className="fas-wb-os-node-dot" />
                    </span>
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
                    className="fas-wb-os-decision is-visible is-beside"
                    style={{
                      left: `${centerNode.x + 6}%`,
                      top: `${centerNode.y}%`,
                    }}
                  >
                    <p className="fas-wb-os-decision-ctx">{decisionContext}</p>
                    <span className="fas-wb-os-decision-pill">
                      {hasPendingDecision ? 'Entscheidung' : 'Tagro'}
                    </span>
                    <p className="fas-wb-os-decision-q">
                      {activeTopic.question}
                      <span className="fas-wb-os-decision-arr" aria-hidden>→</span>
                    </p>
                  </div>
                ) : null}
              </div>

              <footer className="fas-wb-os-voice" aria-live="polite">
                <div className={`fas-wb-os-wave${speaking ? ' is-on' : ''}`} aria-hidden>
                  {Array.from({ length: 9 }).map((_, i) => (
                    <span key={i} style={{ ['--i' as string]: i }} />
                  ))}
                </div>
                <div className="fas-wb-os-voice-copy">
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
                      <>Tagro analysiert dein Projekt…</>
                    )}
                  </p>
                  <p className="fas-wb-os-voice-meta">Letztes Update: gerade eben</p>
                </div>
                <div className="fas-wb-os-voice-rail" aria-hidden>
                  {Array.from({ length: 64 }).map((_, i) => (
                    <span key={i} style={{ ['--i' as string]: i }} />
                  ))}
                </div>
              </footer>
            </section>

            {showInspector && activeTopic ? (
              <aside
                className={[
                  'fas-wb-os-rail',
                  'fas-wb-os-canvas-rail',
                  focusPhase === 'closing' ? 'is-out' : 'is-in',
                ].join(' ')}
                aria-label="Entscheidung"
              >
                <button
                  type="button"
                  className="fas-wb-os-rail-close"
                  aria-label="Schließen"
                  onClick={resetCamera}
                >
                  <ArrowsOut size={15} weight="regular" />
                </button>
                <OverviewStoryPanel
                  topic={activeTopic}
                  selected={selected}
                  onSelect={setSelected}
                  showDecision={showReveal}
                  showRecommend={showRailRecommend}
                  onOpenRecommend={() => setShowRailRecommend(true)}
                  onAccept={() => void accept()}
                  busy={busy}
                  error={error}
                  acceptLabel={primaryLabel}
                  layout="rail"
                />
              </aside>
            ) : null}
          </div>
        </main>
      </div>
    </>
  )
}
