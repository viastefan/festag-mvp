'use client'

/**
 * Festag Workspace Board — Wissensraum (left mock) + Entscheidungsfluss.
 * Constellation is a single SVG so nodes always paint (no % layout collapse).
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

const VB_W = 1000
const VB_H = 640

function kindFill(kind: BoardNode['kind'], center?: boolean): string {
  if (center || kind === 'decision') return '#5B647D'
  if (kind === 'risk') return '#C45B52'
  if (kind === 'task') return '#5F6B5A'
  if (kind === 'resource') return '#6B6280'
  return '#6B6862'
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
  const [focusId, setFocusId] = useState(constellation.focusNodeId)
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)

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
    if ((e.target as Element).closest('[data-node]')) return
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
    const rebuilt = buildProjectPathView(
      { ...boardInput, decisions: json.decisions || boardInput.decisions },
      projectId,
    )
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

  /* Map 0–100 layout → SVG viewBox */
  const svgNodes = constellation.nodes.map((n) => ({
    ...n,
    sx: (n.x / 100) * VB_W,
    sy: (n.y / 100) * VB_H,
  }))
  const byId = new Map(svgNodes.map((n) => [n.id, n]))

  return (
    <div
      className={[
        'fas-wb',
        `is-${level}`,
        detailOpen ? ' has-detail' : '',
        dragging ? ' is-dragging' : '',
      ].join('')}
    >
      <div className="fas-wb-sizer" aria-hidden />

      <div className="fas-wb-invites">
        <OverviewPendingInvites />
      </div>

      {/* ── Wissensraum (mock left) ── */}
      <section
        className={`fas-wb-board${showBoard ? ' is-visible' : ''}${fly === 'in' ? ' is-exiting' : ''}${fly === 'out' ? ' is-entering' : ''}`}
        aria-hidden={level === 'project'}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <p className="fas-wb-quiet">
          {greeting}, {firstName}. {data.summary.calmLine}
        </p>

        <div
          className="fas-wb-stage"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          }}
        >
          <svg
            className="fas-wb-svg"
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            role="img"
            aria-label="Wissensraum"
          >
            <defs>
              <radialGradient id="fasWbGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#5B647D" stopOpacity="0.35" />
                <stop offset="45%" stopColor="#5B647D" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#5B647D" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* soft ambient dots — calm universe */}
            {[
              [120, 90],
              [880, 110],
              [200, 520],
              [820, 500],
              [150, 300],
              [900, 340],
              [480, 80],
              [520, 580],
            ].map(([x, y], i) => (
              <circle key={`a${i}`} cx={x} cy={y} r="1.2" fill="rgba(26,25,23,0.12)" />
            ))}

            {constellation.edges.map((e) => {
              const a = byId.get(e.from)
              const b = byId.get(e.to)
              if (!a || !b) return null
              return (
                <path
                  key={e.id}
                  d={edgePath(a.sx, a.sy, b.sx, b.sy)}
                  fill="none"
                  stroke="rgba(26,25,23,0.14)"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                />
              )
            })}

            {svgNodes.map((node) => {
              const active = focusId === node.id || Boolean(node.center)
              const r = node.center ? 7 : 4.5
              const fill = kindFill(node.kind, node.center)
              return (
                <g
                  key={node.id}
                  data-node={node.id}
                  className={`fas-wb-gnode${active ? ' is-active' : ''}${node.center ? ' is-center' : ''}`}
                  transform={`translate(${node.sx} ${node.sy})`}
                  style={{ cursor: 'pointer' }}
                  onClick={(ev) => {
                    ev.stopPropagation()
                    onNodeActivate(node)
                  }}
                >
                  {node.center ? (
                    <circle r="52" fill="url(#fasWbGlow)" pointerEvents="none" />
                  ) : null}
                  <circle
                    r={r + 10}
                    fill="transparent"
                    pointerEvents="all"
                  />
                  <circle
                    r={r}
                    fill={fill}
                    opacity={active ? 1 : 0.85}
                  />
                  {node.center ? (
                    <circle
                      r={r + 5}
                      fill="none"
                      stroke="#5B647D"
                      strokeOpacity="0.28"
                      strokeWidth="2"
                    />
                  ) : null}
                  <text
                    y={node.center ? 28 : 22}
                    textAnchor="middle"
                    className={node.center ? 'fas-wb-svg-label is-center' : 'fas-wb-svg-label'}
                  >
                    {node.label}
                  </text>
                  {node.meta ? (
                    <text
                      y={node.center ? 46 : 38}
                      textAnchor="middle"
                      className="fas-wb-svg-meta"
                    >
                      {node.meta}
                    </text>
                  ) : null}
                </g>
              )
            })}
          </svg>
        </div>

        <div className="fas-wb-board-foot">
          <div className="fas-wb-tools">
            <div className="fas-wb-zoom" role="group" aria-label="Zoom">
              <button type="button" onClick={() => zoomBy(-0.12)} aria-label="Herauszoomen">
                −
              </button>
              <button type="button" onClick={() => zoomBy(0.12)} aria-label="Hineinzoomen">
                +
              </button>
            </div>
            <div className="fas-wb-minimap" aria-hidden>
              <svg viewBox={`0 0 ${VB_W} ${VB_H}`}>
                {constellation.edges.map((e) => {
                  const a = byId.get(e.from)
                  const b = byId.get(e.to)
                  if (!a || !b) return null
                  return (
                    <line
                      key={e.id}
                      x1={a.sx}
                      y1={a.sy}
                      x2={b.sx}
                      y2={b.sy}
                      stroke="rgba(26,25,23,0.15)"
                      strokeWidth="4"
                    />
                  )
                })}
                {svgNodes.map((n) => (
                  <circle
                    key={n.id}
                    cx={n.sx}
                    cy={n.sy}
                    r={n.center ? 14 : 7}
                    fill={n.center ? '#5B647D' : 'rgba(26,25,23,0.35)'}
                  />
                ))}
                <rect
                  x={VB_W * 0.28}
                  y={VB_H * 0.22}
                  width={VB_W * 0.44}
                  height={VB_H * 0.5}
                  fill="none"
                  stroke="#5B647D"
                  strokeOpacity="0.45"
                  strokeWidth="6"
                  rx="8"
                />
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

      {/* ── Entscheidungsfluss (mock right) ── */}
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
