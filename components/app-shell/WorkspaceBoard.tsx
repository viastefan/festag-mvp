'use client'

/**
 * Festag Workspace Board — mock-faithful Wissensraum + Entscheidungsfluss.
 * Always paints a visible constellation (never an empty calm page).
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Sparkle } from '@phosphor-icons/react'
import OverviewPendingInvites from '@/components/app-shell/OverviewPendingInvites'
import { openNewProject } from '@/lib/new-project-open'
import {
  acceptDecisionRecommendation,
  ensureCanvasSuggestion,
} from '@/lib/overview/decision-canvas'
import {
  buildProjectPathView,
  buildWorkspaceConstellation,
  edgePath,
  type BoardNode,
  type OverviewBoardInput,
  type ProjectPathView,
} from '@/lib/overview/workspace-board'
import type { OverviewPayload } from '@/components/app-shell/WorkspaceOverviewLive'

type Props = {
  greeting: string
  firstName: string
  data: OverviewPayload
  onDecided?: () => void
}

type Level = 'board' | 'flying' | 'project'

const KIND_CLASS: Record<BoardNode['kind'], string> = {
  project: 'is-project',
  decision: 'is-decision',
  task: 'is-task',
  risk: 'is-risk',
  resource: 'is-resource',
  knowledge: 'is-knowledge',
}

export default function WorkspaceBoard({
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

  const [level, setLevel] = useState<Level>('board')
  const [fly, setFly] = useState<'in' | 'out' | null>(null)
  const [projectId, setProjectId] = useState<string | null>(
    () => data.projects[0]?.id || null,
  )
  const [focusId, setFocusId] = useState<string>(constellation.focusNodeId)
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(
    null,
  )

  const [selected, setSelected] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pathLive, setPathLive] = useState<ProjectPathView | null>(null)

  const pathBase = useMemo(
    () => buildProjectPathView(boardInput, projectId),
    [boardInput, projectId],
  )
  const path =
    pathLive && pathLive.projectId === pathBase.projectId ? pathLive : pathBase

  const currentStepIndex = Math.max(
    0,
    path.steps.findIndex((s) => s.kind === 'current'),
  )

  useEffect(() => {
    setFocusId(constellation.focusNodeId)
  }, [constellation.focusNodeId])

  useEffect(() => {
    setPathLive(null)
    setSelected(
      pathBase.topic?.recommendId ||
        pathBase.branches.find((b) => b.recommended)?.id ||
        pathBase.branches[0]?.id ||
        null,
    )
    setDetailOpen(false)
    setError(null)
  }, [pathBase.projectId, pathBase.topic?.id])

  function enterProject(nextProjectId: string | null, nodeId?: string) {
    if (level === 'flying') return
    if (nodeId) setFocusId(nodeId)
    setProjectId(nextProjectId)
    setFly('in')
    setLevel('flying')
    window.setTimeout(() => {
      setLevel('project')
      setFly(null)
    }, 520)
  }

  function leaveProject() {
    if (level !== 'project') return
    setFly('out')
    setLevel('flying')
    setDetailOpen(false)
    window.setTimeout(() => {
      setLevel('board')
      setFly(null)
    }, 420)
  }

  function onNodeActivate(node: BoardNode) {
    setFocusId(node.id)
    enterProject(node.projectId || data.projects[0]?.id || null, node.id)
  }

  function zoomBy(delta: number) {
    setScale((s) => Math.max(0.55, Math.min(2.2, Number((s + delta).toFixed(2)))))
  }

  function onPointerDown(e: React.PointerEvent) {
    if (level !== 'board') return
    if ((e.target as HTMLElement).closest('.fas-wb-node')) return
    dragRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
    setDragging(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return
    setPan({
      x: dragRef.current.panX + (e.clientX - dragRef.current.x),
      y: dragRef.current.panY + (e.clientY - dragRef.current.y),
    })
  }

  function onPointerUp() {
    dragRef.current = null
    setDragging(false)
  }

  function onWheel(e: React.WheelEvent) {
    if (level !== 'board') return
    e.preventDefault()
    zoomBy(e.deltaY > 0 ? -0.08 : 0.08)
  }

  async function ensureSuggestionIfNeeded() {
    const topic = path.topic
    if (!topic?.decisionId || !topic.needsSuggestion) return
    const res = await ensureCanvasSuggestion(topic.decisionId)
    if (!res.ok) return
    const qs = data.workspace.id
      ? `?workspaceId=${encodeURIComponent(data.workspace.id)}`
      : ''
    const overview = await fetch(`/api/workspaces/overview${qs}`, { cache: 'no-store' })
    if (!overview.ok) return
    const json = await overview.json()
    const nextInput: OverviewBoardInput = {
      ...boardInput,
      decisions: json.decisions || boardInput.decisions,
    }
    const rebuilt = buildProjectPathView(nextInput, projectId)
    setPathLive(rebuilt)
    setSelected(
      rebuilt.topic?.recommendId ||
        rebuilt.branches.find((b) => b.recommended)?.id ||
        rebuilt.branches[0]?.id ||
        null,
    )
  }

  useEffect(() => {
    if (level !== 'project') return
    void ensureSuggestionIfNeeded()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, path.topic?.decisionId, path.topic?.needsSuggestion])

  async function accept() {
    if (busy) return
    const optionId = selected || path.topic?.recommendId || path.branches[0]?.id
    if (!optionId || optionId.startsWith('plan-')) {
      setDetailOpen(false)
      return
    }

    if (path.topic?.kind === 'project' || path.projectId === 'first-project') {
      if (optionId === 'later') {
        leaveProject()
        return
      }
      leaveProject()
      window.setTimeout(() => openNewProject(), 450)
      return
    }

    if (!path.topic?.decisionId) {
      setDetailOpen(false)
      return
    }

    setBusy(true)
    setError(null)
    const result = await acceptDecisionRecommendation({
      decisionId: path.topic.decisionId,
      optionId,
      responseType: path.topic.responseType,
    })
    setBusy(false)
    if (!result.ok) {
      setError('Die Empfehlung konnte nicht übernommen werden.')
      return
    }
    setDetailOpen(false)
    onDecided?.()
  }

  const showBoard = level === 'board' || fly !== null
  const showProject = level === 'project' || fly !== null

  return (
    <div
      className={[
        'fas-wb',
        `is-${level}`,
        detailOpen ? ' has-detail' : '',
        dragging ? ' is-dragging' : '',
      ].join('')}
      data-nodes={constellation.nodes.length}
    >
      {/* In-flow sizer — absolute layers need a real box height */}
      <div className="fas-wb-sizer" aria-hidden />

      <div className="fas-wb-invites">
        <OverviewPendingInvites />
      </div>

      {/* LEVEL 1 — Wissensraum */}
      <section
        className={`fas-wb-board${showBoard ? ' is-visible' : ''}${fly === 'in' ? ' is-exiting' : ''}${fly === 'out' ? ' is-entering' : ''}`}
        aria-hidden={level === 'project'}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <header className="fas-wb-board-head">
          <p className="fas-wb-greet">
            {greeting}, {firstName}.
          </p>
          <p className="fas-wb-status">{data.summary.calmLine}</p>
          <p className="fas-wb-hint">Klicke einen Knoten, um hineinzuzoomen.</p>
        </header>

        <div
          className="fas-wb-canvas"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          }}
        >
          <svg
            className="fas-wb-edges"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            {constellation.edges.map((e) => {
              const a = constellation.nodes.find((n) => n.id === e.from)
              const b = constellation.nodes.find((n) => n.id === e.to)
              if (!a || !b) return null
              return (
                <path
                  key={e.id}
                  d={edgePath(a.x, a.y, b.x, b.y)}
                  className="fas-wb-edge"
                />
              )
            })}
          </svg>

          {constellation.nodes.map((node) => {
            const active = focusId === node.id || Boolean(node.center)
            return (
              <button
                key={node.id}
                type="button"
                className={[
                  'fas-wb-node',
                  KIND_CLASS[node.kind],
                  active ? ' is-active' : '',
                  node.center ? ' is-center' : '',
                ].join('')}
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
                onClick={(ev) => {
                  ev.stopPropagation()
                  onNodeActivate(node)
                }}
              >
                <span className="fas-wb-halo" aria-hidden />
                <span className="fas-wb-dot" aria-hidden />
                <span className="fas-wb-node-label">{node.label}</span>
                {node.meta ? (
                  <span className="fas-wb-node-meta">{node.meta}</span>
                ) : null}
              </button>
            )
          })}
        </div>

        <div className="fas-wb-board-foot">
          <div className="fas-wb-tools">
            <div className="fas-wb-zoom" role="group" aria-label="Zoom">
              <button type="button" onClick={() => zoomBy(-0.12)} aria-label="Herauszoomen">
                −
              </button>
              <span>{Math.round(scale * 100)}%</span>
              <button type="button" onClick={() => zoomBy(0.12)} aria-label="Hineinzoomen">
                +
              </button>
              <button
                type="button"
                className="fas-wb-zoom-reset"
                onClick={() => {
                  setScale(1)
                  setPan({ x: 0, y: 0 })
                }}
              >
                Reset
              </button>
            </div>
            <div className="fas-wb-minimap" aria-hidden>
              <svg viewBox="0 0 100 70">
                {constellation.edges.map((e) => {
                  const a = constellation.nodes.find((n) => n.id === e.from)
                  const b = constellation.nodes.find((n) => n.id === e.to)
                  if (!a || !b) return null
                  return (
                    <line
                      key={e.id}
                      x1={a.x}
                      y1={a.y * 0.7}
                      x2={b.x}
                      y2={b.y * 0.7}
                      className="fas-wb-mm-edge"
                    />
                  )
                })}
                {constellation.nodes.map((n) => (
                  <circle
                    key={n.id}
                    cx={n.x}
                    cy={n.y * 0.7}
                    r={n.center ? 2.4 : 1.2}
                    className={`fas-wb-mm-dot${n.center ? ' is-on' : ''}`}
                  />
                ))}
              </svg>
            </div>
          </div>

          <ul className="fas-wb-legend" aria-label="Legende">
            <li>
              <span className="fas-wb-leg is-decision" />
              Entscheidung
            </li>
            <li>
              <span className="fas-wb-leg is-task" />
              Aufgabe
            </li>
            <li>
              <span className="fas-wb-leg is-risk" />
              Risiko
            </li>
            <li>
              <span className="fas-wb-leg is-resource" />
              Ressource
            </li>
            <li>
              <span className="fas-wb-leg is-line" />
              Abhängigkeit
            </li>
          </ul>
        </div>
      </section>

      {/* LEVEL 2 — Entscheidungsfluss */}
      <section
        className={`fas-wb-project${showProject ? ' is-visible' : ''}${fly === 'in' ? ' is-entering' : ''}${fly === 'out' ? ' is-exiting' : ''}`}
        aria-hidden={level === 'board'}
      >
        <header className="fas-wb-project-head">
          <button type="button" className="fas-wb-back" onClick={leaveProject}>
            ← Wissensraum
          </button>
        </header>

        <div className="fas-wb-flow">
          <div className="fas-wb-rail" aria-label="Projektpfad">
            <div className="fas-wb-rail-line" aria-hidden />
            <ol className="fas-wb-steps">
              {path.steps.map((step) => (
                <li key={step.id} className={`fas-wb-step is-${step.kind}`}>
                  <span className="fas-wb-step-mark" aria-hidden>
                    {step.kind === 'done' ? (
                      <svg viewBox="0 0 16 16" width="10" height="10">
                        <path
                          d="M3.5 8.2l2.8 2.8 6.2-6.4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : null}
                  </span>
                  <div className="fas-wb-step-copy">
                    <p className="fas-wb-step-label">{step.label}</p>
                    {step.meta ? <p className="fas-wb-step-meta">{step.meta}</p> : null}
                  </div>
                  {step.kind === 'current' ? (
                    <span className="fas-wb-stem" aria-hidden />
                  ) : null}
                </li>
              ))}
            </ol>
          </div>

          <div
            className="fas-wb-branch-col"
            style={{
              ['--wb-branch-top' as string]: `${currentStepIndex * 72 + 4}px`,
            }}
          >
            <div className="fas-wb-branch-list" role="radiogroup" aria-label="Nächste Schritte">
              {path.branches.map((b) => {
                const isDecision = !b.id.startsWith('plan-')
                const on = selected === b.id
                return (
                  <button
                    key={b.id}
                    type="button"
                    role={isDecision ? 'radio' : undefined}
                    aria-checked={isDecision ? on : undefined}
                    className={`fas-wb-branch${on ? ' is-on' : ''}${b.recommended ? ' is-rec' : ''}${!isDecision ? ' is-future' : ''}`}
                    onClick={() => {
                      if (!isDecision) return
                      setSelected(b.id)
                    }}
                  >
                    <span className="fas-wb-branch-dot" aria-hidden />
                    <span className="fas-wb-branch-body">
                      <span className="fas-wb-branch-label">{b.label}</span>
                      {b.recommended ? (
                        <span className="fas-wb-branch-rec">Empfohlene Entscheidung</span>
                      ) : null}
                    </span>
                    <span className="fas-wb-branch-chev" aria-hidden>
                      ›
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {level === 'project' || fly === 'in' ? (
          <aside className={`fas-wb-insight${detailOpen ? ' is-open' : ''}`} aria-label="Tagro Insight">
            <div className="fas-wb-insight-main">
              <span className="fas-wb-insight-icon" aria-hidden>
                <Sparkle size={16} weight="fill" />
              </span>
              <div className="fas-wb-insight-copy">
                <p className="fas-wb-insight-k">Tagro Insight</p>
                <p className="fas-wb-insight-text">{path.insight}</p>
                {detailOpen && path.topic?.reasons && path.topic.reasons.length > 1 ? (
                  <ul className="fas-wb-insight-reasons">
                    {path.topic.reasons.slice(0, 3).map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                ) : null}
                {error ? (
                  <p className="fas-wb-insight-error" role="alert">
                    {error}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="fas-wb-insight-actions">
              {!detailOpen ? (
                <button
                  type="button"
                  className="fas-wb-btn is-ghost"
                  onClick={() => setDetailOpen(true)}
                >
                  Details anzeigen
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="fas-wb-btn is-primary"
                    disabled={busy}
                    onClick={() => void accept()}
                  >
                    {busy ? 'Wird übernommen…' : 'Empfehlung übernehmen'}
                  </button>
                  <button
                    type="button"
                    className="fas-wb-btn is-ghost"
                    disabled={busy}
                    onClick={() => setDetailOpen(false)}
                  >
                    Schließen
                  </button>
                </>
              )}
            </div>
          </aside>
        ) : null}
      </section>
    </div>
  )
}
