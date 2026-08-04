'use client'

/**
 * Festag Workspace Board — Software Production Operating System surface.
 *
 * Level 1: Knowledge constellation (WHERE)
 * Level 2: Project decision path (WHY)
 *
 * Camera moves through knowledge — no page navigation theater.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import OverviewPendingInvites from '@/components/app-shell/OverviewPendingInvites'
import { openNewProject } from '@/lib/new-project-open'
import {
  acceptDecisionRecommendation,
  ensureCanvasSuggestion,
} from '@/lib/overview/decision-canvas'
import {
  buildProjectPathView,
  buildWorkspaceConstellation,
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
  const [projectId, setProjectId] = useState<string | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(
    null,
  )

  const [selected, setSelected] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pathLive, setPathLive] = useState<ProjectPathView | null>(null)

  const pathBase = useMemo(
    () => buildProjectPathView(boardInput, projectId),
    [boardInput, projectId],
  )
  const path =
    pathLive && pathLive.projectId === pathBase?.projectId ? pathLive : pathBase

  useEffect(() => {
    setFocusId(constellation.focusNodeId)
  }, [constellation.focusNodeId])

  useEffect(() => {
    setPathLive(null)
    setSelected(pathBase?.topic?.recommendId || pathBase?.branches[0]?.id || null)
    setSheetOpen(false)
    setError(null)
  }, [pathBase?.projectId, pathBase?.topic?.id])

  /* Enter project — camera fly, no page swap */
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
    setSheetOpen(false)
    window.setTimeout(() => {
      setLevel('board')
      setProjectId(null)
      setPathLive(null)
      setFly(null)
    }, 420)
  }

  function onNodeActivate(node: BoardNode) {
    setFocusId(node.id)
    if (node.id === 'empty:start' || (!node.projectId && node.kind === 'project')) {
      enterProject(null, node.id)
      return
    }
    if (node.kind === 'decision' && node.projectId) {
      enterProject(node.projectId, node.id)
      return
    }
    if (node.projectId) {
      enterProject(node.projectId, node.id)
      return
    }
  }

  function zoomBy(delta: number) {
    setScale((s) => Math.max(0.55, Math.min(2.4, Number((s + delta).toFixed(2)))))
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
    const dx = e.clientX - dragRef.current.x
    const dy = e.clientY - dragRef.current.y
    setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy })
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
    const topic = path?.topic
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
    if (rebuilt) {
      setPathLive(rebuilt)
      setSelected(rebuilt.topic?.recommendId || rebuilt.branches[0]?.id || null)
    }
  }

  useEffect(() => {
    if (level !== 'project') return
    void ensureSuggestionIfNeeded()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, path?.topic?.decisionId, path?.topic?.needsSuggestion])

  async function accept() {
    if (!path || busy) return
    const optionId = selected || path.topic?.recommendId || path.branches[0]?.id
    if (!optionId) return

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
      setSheetOpen(false)
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
    setSheetOpen(false)
    onDecided?.()
  }

  const showBoard = level === 'board' || fly !== null
  const showProject = level === 'project' || fly !== null

  return (
    <div
      className={[
        'fas-wb',
        `is-${level}`,
        sheetOpen ? ' has-sheet' : '',
        dragging ? ' is-dragging' : '',
      ].join('')}
    >
      <div className="fas-wb-invites">
        <OverviewPendingInvites />
      </div>

      {/* ── Level 1: Workspace Board ── */}
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
        </header>

        <div
          className="fas-wb-canvas"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          }}
        >
          <svg className="fas-wb-edges" viewBox="0 0 100 100" preserveAspectRatio="none">
            {constellation.edges.map((e) => {
              const a = constellation.nodes.find((n) => n.id === e.from)
              const b = constellation.nodes.find((n) => n.id === e.to)
              if (!a || !b) return null
              return (
                <line
                  key={e.id}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  className="fas-wb-edge"
                />
              )
            })}
          </svg>

          {constellation.nodes.map((node) => {
            const active = focusId === node.id
            return (
              <button
                key={node.id}
                type="button"
                className={[
                  'fas-wb-node',
                  KIND_CLASS[node.kind],
                  active ? ' is-active' : '',
                  node.attention ? ' is-attention' : '',
                ].join('')}
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
                onClick={(ev) => {
                  ev.stopPropagation()
                  onNodeActivate(node)
                }}
              >
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
          <ul className="fas-wb-legend" aria-label="Legende">
            <li>
              <span className="fas-wb-leg is-decision" />
              Entscheidung
            </li>
            <li>
              <span className="fas-wb-leg is-task" />
              Arbeit
            </li>
            <li>
              <span className="fas-wb-leg is-risk" />
              Risiko
            </li>
            <li>
              <span className="fas-wb-leg is-resource" />
              Ressource
            </li>
          </ul>
        </div>
      </section>

      {/* ── Level 2: Project path ── */}
      <section
        className={`fas-wb-project${showProject ? ' is-visible' : ''}${fly === 'in' ? ' is-entering' : ''}${fly === 'out' ? ' is-exiting' : ''}`}
        aria-hidden={level === 'board'}
      >
        <header className="fas-wb-project-head">
          <button type="button" className="fas-wb-back" onClick={leaveProject}>
            ← Workspace
          </button>
          <h1 className="fas-wb-project-title">{path?.projectTitle || 'Projekt'}</h1>
        </header>

        <div className="fas-wb-path-stage">
          <div className="fas-wb-path" aria-label="Projektpfad">
            <svg className="fas-wb-path-line" viewBox="0 0 40 520" preserveAspectRatio="none" aria-hidden>
              <path
                d="M 20 8 C 18 80, 22 140, 20 200 S 16 320, 20 400 S 24 480, 20 512"
                className="fas-wb-path-stroke"
              />
            </svg>

            <ol className="fas-wb-steps">
              {(path?.steps || []).map((step) => (
                <li
                  key={step.id}
                  className={`fas-wb-step is-${step.kind}`}
                >
                  <span className="fas-wb-step-dot" aria-hidden />
                  <div className="fas-wb-step-copy">
                    <p className="fas-wb-step-label">{step.label}</p>
                    {step.meta ? (
                      <p className="fas-wb-step-meta">{step.meta}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="fas-wb-branches" role="radiogroup" aria-label="Nächste Richtung">
            {(path?.branches || []).map((b) => (
              <button
                key={b.id}
                type="button"
                role="radio"
                aria-checked={selected === b.id}
                className={`fas-wb-branch${selected === b.id ? ' is-on' : ''}${b.recommended ? ' is-rec' : ''}`}
                onClick={() => {
                  setSelected(b.id)
                  setSheetOpen(true)
                }}
              >
                <span className="fas-wb-branch-dot" aria-hidden />
                <span className="fas-wb-branch-body">
                  <span className="fas-wb-branch-label">{b.label}</span>
                  {b.recommended ? (
                    <span className="fas-wb-branch-rec">Empfohlen</span>
                  ) : b.hint ? (
                    <span className="fas-wb-branch-hint">{b.hint}</span>
                  ) : null}
                </span>
                <span className="fas-wb-branch-chev" aria-hidden>
                  ›
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Tagro inspector — Apple-like, not SaaS */}
        {(sheetOpen || (path?.topic && level === 'project')) && path ? (
          <aside
            className={`fas-wb-inspector${sheetOpen ? ' is-open' : ' is-peek'}`}
            aria-label="Empfehlung"
          >
            <div className="fas-wb-inspector-handle" aria-hidden />
            <p className="fas-wb-inspector-title">
              {path.topic?.recommendLabel || path.branches.find((b) => b.recommended)?.label || 'Empfehlung'}
            </p>
            <p className="fas-wb-inspector-body">
              {path.insight}
            </p>
            {path.topic?.reasons && path.topic.reasons.length > 1 ? (
              <ul className="fas-wb-inspector-reasons">
                {path.topic.reasons.slice(0, 3).map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            ) : null}
            {error ? (
              <p className="fas-wb-inspector-error" role="alert">
                {error}
              </p>
            ) : null}
            <div className="fas-wb-inspector-actions">
              {!sheetOpen ? (
                <button
                  type="button"
                  className="fas-wb-btn is-primary"
                  onClick={() => setSheetOpen(true)}
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
                    className="fas-wb-btn"
                    disabled={busy}
                    onClick={() => setSheetOpen(false)}
                  >
                    Schließen
                  </button>
                </>
              )}
            </div>
          </aside>
        ) : null}

        {sheetOpen ? (
          <button
            type="button"
            className="fas-wb-scrim"
            aria-label="Schließen"
            onClick={() => setSheetOpen(false)}
          />
        ) : null}
      </section>
    </div>
  )
}
