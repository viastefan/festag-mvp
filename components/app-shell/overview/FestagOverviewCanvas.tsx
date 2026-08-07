'use client'

/**
 * Festag Overview — the reference desktop canvas.
 *
 * Left: what Tagro has to say. Right: the living project constellation and
 * the people behind it. Warm ivory, Aeonik, white controls — the same light
 * theme as the login panels.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import OverviewStoryPanel from '@/components/app-shell/overview/OverviewStoryPanel'
import { FESTAG_OVERVIEW_PANEL_STYLES } from '@/components/app-shell/overview/festag-overview-panel-styles'
import { FESTAG_CANVAS_UI_STYLES } from '@/components/app-shell/overview/festag-canvas-ui-styles'
import ProjectIntelligencePanel from '@/components/app-shell/overview/ProjectIntelligencePanel'
import type { OverviewPayload } from '@/components/app-shell/WorkspaceOverviewLive'
import {
  acceptDecisionRecommendation,
  buildOverviewOsTopic,
  enrichDecisionFocus,
  type DecisionCanvasTopic,
} from '@/lib/overview/decision-canvas'
import { drawConstellation, hitTestNode, type CanvasNode } from './constellation'

type Props = {
  greeting: string
  firstName: string
  data: OverviewPayload
  onDecided?: () => void
}

const ROLE_COLORS = ['#7B6EAE', '#C9932B', '#2E9B52', '#C43C3C', '#4A7DB5']

export default function FestagOverviewCanvas({
  greeting,
  firstName,
  data,
  onDecided,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)
  const hoverRef = useRef<string | null>(null)

  const [selected, setSelected] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPanel, setShowPanel] = useState(false)
  const [showRecommend, setShowRecommend] = useState(false)

  const focusDecision = data.decisions[0] || null

  const topic: DecisionCanvasTopic | null = useMemo(() => {
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
    if (focus && focusDecision?.reasons?.length) focus.reasons = focusDecision.reasons

    return buildOverviewOsTopic({
      workspaceName: data.workspace.name,
      activeProjects: data.summary.activeProjects,
      pendingDecisions: data.summary.pendingDecisions,
      calmLine: data.summary.calmLine,
      focus,
      focusProject: null,
    })
  }, [data, focusDecision])

  useEffect(() => {
    setSelected(topic?.recommendId || null)
  }, [topic?.id, topic?.recommendId])

  /* Nodes are built from real counts — never invented. */
  const nodes: CanvasNode[] = useMemo(() => {
    const pending = data.summary.pendingDecisions
    const list: CanvasNode[] = [
      {
        id: 'docs',
        x: 0.2,
        y: 0.12,
        label: 'Dokumente',
        sub: 'aktualisieren',
        tone: 'amber',
        badge: 'Info',
      },
      {
        id: 'efficiency',
        x: 0.62,
        y: 0.24,
        label: 'Projekteffizienz',
        sub: 'beurteilen',
        tone: 'ink',
      },
      {
        id: 'tagro',
        x: 0.36,
        y: 0.66,
        label: 'Tagro',
        sub: 'erkennt optimale Projektentscheidungen',
        tone: 'ink',
      },
    ]
    const atRisk = data.projects.filter(
      (p) => p.health === 'risk' || p.health === 'blocked',
    ).length
    if (atRisk > 0) {
      list.push({
        id: 'risks',
        x: 0.42,
        y: 0.42,
        label: `${atRisk} ${atRisk === 1 ? 'Risiko' : 'Risiken'} erkannt`,
        tone: 'red',
        badge: 'Prüfen',
      })
    }
    if (pending > 0) {
      list.push({
        id: 'decisions',
        x: 0.16,
        y: 0.88,
        label: `${pending} offene ${pending === 1 ? 'Entscheidung' : 'Entscheidungen'}`,
        sub: '',
        tone: 'green',
        badge: 'Wartet',
        interactive: true,
      })
    }
    return list
  }, [data])

  const edges = useMemo(
    () =>
      [
        ['docs', 'risks'],
        ['docs', 'efficiency'],
        ['risks', 'efficiency'],
        ['risks', 'tagro'],
        ['tagro', 'decisions'],
      ].filter(([a, b]) =>
        nodes.some((n) => n.id === a) && nodes.some((n) => n.id === b),
      ) as Array<[string, string]>,
    [nodes],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const loop = () => {
      drawConstellation(canvas, nodes, edges, hoverRef.current)
      frameRef.current = requestAnimationFrame(loop)
    }
    frameRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frameRef.current)
  }, [nodes, edges])

  const onMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const hit = hitTestNode(e.clientX, e.clientY, e.currentTarget, nodes)
      hoverRef.current = hit
      e.currentTarget.style.cursor =
        hit && nodes.find((n) => n.id === hit)?.interactive ? 'pointer' : 'default'
    },
    [nodes],
  )

  const openDecision = useCallback(() => {
    if (!topic) return
    setShowPanel(true)
    setShowRecommend(false)
  }, [topic])

  async function accept() {
    if (!topic || busy) return
    const optionId = selected || topic.recommendId
    if (!optionId || !topic.decisionId) return
    setBusy(true)
    setError(null)
    const res = await acceptDecisionRecommendation({
      decisionId: topic.decisionId,
      optionId,
      responseType: focusDecision?.responseType || topic.responseType,
    })
    setBusy(false)
    if (!res.ok) {
      setError('Die Empfehlung konnte nicht übernommen werden.')
      return
    }
    setShowPanel(false)
    onDecided?.()
  }

  const roles = useMemo(() => {
    const map = new Map<string, number>()
    for (const m of data.team) {
      const role = m.role || 'Mitglied'
      map.set(role, (map.get(role) || 0) + 1)
    }
    return [...map.entries()].map(([role, count], i) => ({
      role,
      count,
      color: ROLE_COLORS[i % ROLE_COLORS.length],
    }))
  }, [data.team])

  return (
    <div className="fcv">
      <style>{FESTAG_CANVAS_UI_STYLES}</style>
      <style>{FESTAG_OVERVIEW_PANEL_STYLES}</style>

      <section className="fcv-copy">
        <h1 className="fcv-greet">
          {greeting}, {firstName}.
        </h1>
        <p className="fcv-body">{data.summary.calmLine}</p>

        <div className="fcv-actions">
          <button type="button" className="fcv-btn fcv-btn-dark" onClick={openDecision}>
            <ClusterIcon />
            Statusbericht öffnen
          </button>
          <button type="button" className="fcv-btn fcv-btn-white">
            <WaveIcon />
            Anhören
          </button>
        </div>

        {data.intelligence ? (
          <div className="fcv-intel">
            <ProjectIntelligencePanel intelligence={data.intelligence} />
          </div>
        ) : null}
      </section>

      <section className="fcv-stage">
        <canvas
          ref={canvasRef}
          className="fcv-canvas"
          onMouseMove={onMove}
          onMouseLeave={() => {
            hoverRef.current = null
          }}
          onClick={(e) => {
            const hit = hitTestNode(e.clientX, e.clientY, e.currentTarget, nodes)
            if (hit === 'decisions') openDecision()
          }}
        />

        {roles.length > 0 ? (
          <aside className="fcv-team" aria-label="Team">
            <header className="fcv-team-head">
              <span className="fcv-team-title">Entwickler</span>
              <span className="fcv-team-meta">
                {data.summary.teamMembers}{' '}
                {data.summary.teamMembers === 1 ? 'Mitglied' : 'Mitglieder'}
              </span>
            </header>
            {roles.map((r) => (
              <div key={r.role} className="fcv-team-row">
                <span className="fcv-team-dots" aria-hidden>
                  <i style={{ background: r.color }} />
                  <i style={{ background: r.color, opacity: 0.55 }} />
                  <i style={{ background: r.color, opacity: 0.3 }} />
                </span>
                <span className="fcv-team-role">{r.role}</span>
                <span className="fcv-team-n">{r.count}</span>
              </div>
            ))}
          </aside>
        ) : null}
      </section>

      {showPanel && topic ? (
        <>
          <div className="fcv-scrim" onClick={() => setShowPanel(false)} />
          <aside className="fcv-panel" aria-label="Entscheidung">
            <OverviewStoryPanel
              topic={topic}
              selected={selected}
              onSelect={setSelected}
              showDecision
              showRecommend={showRecommend}
              onOpenRecommend={() => setShowRecommend(true)}
              onAccept={() => void accept()}
              busy={busy}
              error={error}
              layout="rail"
            />
          </aside>
        </>
      ) : null}
    </div>
  )
}

function ClusterIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="4.5" cy="4.5" r="2" fill="currentColor" opacity="0.75" />
      <circle cx="11" cy="3.5" r="1.5" fill="currentColor" opacity="0.5" />
      <circle cx="7.5" cy="10" r="2.5" fill="currentColor" />
    </svg>
  )
}

function WaveIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="3" y="5" width="1.8" height="6" rx="0.9" fill="currentColor" opacity="0.55" />
      <rect x="6.2" y="2" width="1.8" height="12" rx="0.9" fill="currentColor" />
      <rect x="9.4" y="4" width="1.8" height="8" rx="0.9" fill="currentColor" opacity="0.55" />
      <rect x="12.6" y="6" width="1.8" height="4" rx="0.9" fill="currentColor" opacity="0.35" />
    </svg>
  )
}
