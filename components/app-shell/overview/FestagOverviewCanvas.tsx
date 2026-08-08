'use client'

/**
 * Festag Overview — the daily report as a living flow.
 *
 * Left: what Tagro has to say, plus the four numbers that matter today.
 * Middle: the flow of the project. Clicking a node lifts it and opens its
 * detail beside it. Right: the detail of whatever is in focus.
 */

import { useCallback, useMemo, useState } from 'react'
import {
  ChatCircle,
  Warning,
  CheckCircle,
  ChartBar,
  UsersThree,
  FolderSimple,
  ArrowRight,
  Plus,
} from '@phosphor-icons/react'
import OverviewStoryPanel from '@/components/app-shell/overview/OverviewStoryPanel'
import { FESTAG_OVERVIEW_PANEL_STYLES } from '@/components/app-shell/overview/festag-overview-panel-styles'
import { FESTAG_FLOW_STYLES } from '@/components/app-shell/overview/festag-flow-styles'
import ProjectIntelligencePanel from '@/components/app-shell/overview/ProjectIntelligencePanel'
import type { OverviewPayload } from '@/components/app-shell/WorkspaceOverviewLive'
import { openNewProject } from '@/lib/new-project-open'
import {
  acceptDecisionRecommendation,
  buildOverviewOsTopic,
  enrichDecisionFocus,
  type DecisionCanvasTopic,
} from '@/lib/overview/decision-canvas'
import {
  FLOW_EDGES,
  FLOW_LAYOUT,
  type FlowNode,
  type FlowNodeId,
} from './overview-nodes'

type Props = {
  greeting: string
  firstName: string
  data: OverviewPayload
  onDecided?: () => void
}

const ICONS: Record<FlowNodeId, typeof ChatCircle> = {
  communication: ChatCircle,
  risks: Warning,
  decisions: CheckCircle,
  status: ChartBar,
  team: UsersThree,
  project: FolderSimple,
}

export default function FestagOverviewCanvas({
  greeting,
  firstName,
  data,
  onDecided,
}: Props) {
  const [focus, setFocus] = useState<FlowNodeId | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showRecommend, setShowRecommend] = useState(false)

  const focusDecision = data.decisions[0] || null
  const hasProjects = data.projects.length > 0

  const atRisk = useMemo(
    () =>
      data.projects.filter((p) => p.health === 'risk' || p.health === 'blocked')
        .length,
    [data.projects],
  )

  const healthLabel = useMemo(() => {
    if (!hasProjects) return '—'
    if (atRisk > 0) return 'Achtung'
    return 'Stabil'
  }, [hasProjects, atRisk])

  const topic: DecisionCanvasTopic | null = useMemo(() => {
    const f = focusDecision
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
    if (f && focusDecision?.reasons?.length) f.reasons = focusDecision.reasons

    return buildOverviewOsTopic({
      workspaceName: data.workspace.name,
      activeProjects: data.summary.activeProjects,
      pendingDecisions: data.summary.pendingDecisions,
      calmLine: data.summary.calmLine,
      focus: f,
      focusProject: null,
    })
  }, [data, focusDecision])

  const nodes: FlowNode[] = useMemo(() => {
    const copy: Record<FlowNodeId, { label: string; meta: string; metaTone?: FlowNode['tone'] }> = {
      communication: { label: 'Kommunikation', meta: 'Tagro hört mit' },
      risks: {
        label: 'Risiken',
        meta: atRisk > 0 ? `${atRisk} offen` : 'keine offenen',
        metaTone: atRisk > 0 ? 'red' : undefined,
      },
      decisions: {
        label: 'Entscheidungen',
        meta:
          data.summary.pendingDecisions > 0
            ? `${data.summary.pendingDecisions} offen`
            : 'nichts offen',
        metaTone: data.summary.pendingDecisions > 0 ? 'green' : undefined,
      },
      status: { label: 'Projektstatus', meta: healthLabel, metaTone: 'blue' },
      team: {
        label: 'Team & Entwickler',
        meta: `${data.summary.teamMembers} aktiv`,
      },
      project: {
        label: 'Projekt',
        meta: hasProjects ? 'Gesamtbericht' : 'noch keins',
      },
    }
    return FLOW_LAYOUT.map((n) => ({ ...n, ...copy[n.id] }))
  }, [data, atRisk, healthLabel, hasProjects])

  const openDecisions = useCallback(() => {
    setFocus('decisions')
    setShowRecommend(false)
    setSelected(topic?.recommendId || null)
  }, [topic])

  async function accept() {
    if (!topic || busy || !topic.decisionId) return
    const optionId = selected || topic.recommendId
    if (!optionId) return
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
    setFocus(null)
    onDecided?.()
  }

  return (
    <div className={`ffl${focus ? ' is-focused' : ''}`}>
      <style>{FESTAG_FLOW_STYLES}</style>
      <style>{FESTAG_OVERVIEW_PANEL_STYLES}</style>

      {/* ── Left: the report ── */}
      <section className="ffl-report">
        <h1 className="ffl-greet">
          {greeting},
          <br />
          {firstName}.
        </h1>
        <p className="ffl-line">{data.summary.calmLine}</p>

        <div className="ffl-kpis">
          <Kpi n={atRisk} label="Risiken" tone="red" />
          <Kpi n={data.summary.pendingDecisions} label="Entscheidungen" tone="green" />
          <Kpi text={healthLabel} label="Projektstatus" tone="blue" />
          <Kpi n={data.summary.teamMembers} label="Team aktiv" tone="ink" />
        </div>

        {!hasProjects ? (
          <button type="button" className="ffl-cta" onClick={() => openNewProject()}>
            <Plus size={16} weight="bold" />
            Erstes Projekt anlegen
          </button>
        ) : (
          <button type="button" className="ffl-cta ffl-cta-quiet" onClick={() => openNewProject()}>
            <Plus size={16} weight="bold" />
            Neues Projekt
          </button>
        )}

        {data.intelligence ? (
          <div className="ffl-intel">
            <ProjectIntelligencePanel intelligence={data.intelligence} />
          </div>
        ) : null}
      </section>

      {/* ── Middle: the flow ── */}
      <section className="ffl-stage" aria-label="Projektfluss">
        <svg className="ffl-edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          {FLOW_EDGES.map((d) => (
            <path key={d} d={d} vectorEffect="non-scaling-stroke" />
          ))}
        </svg>

        {nodes.map((node) => {
          const Icon = ICONS[node.id]
          const isFocus = focus === node.id
          const dimmed = focus !== null && !isFocus
          return (
            <button
              key={node.id}
              type="button"
              className={[
                'ffl-node',
                `is-${node.tone}`,
                isFocus ? 'is-focus' : '',
                dimmed ? 'is-dim' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              onClick={() =>
                node.id === 'decisions' ? openDecisions() : setFocus(isFocus ? null : node.id)
              }
              aria-pressed={isFocus}
            >
              <span className="ffl-node-orb">
                <Icon size={20} weight="fill" />
              </span>
              <span className="ffl-node-copy">
                <span className="ffl-node-label">{node.label}</span>
                <span className={`ffl-node-meta${node.metaTone ? ` is-${node.metaTone}` : ''}`}>
                  {node.meta}
                </span>
              </span>
            </button>
          )
        })}
      </section>

      {/* ── Right: detail of whatever is in focus ── */}
      <aside className="ffl-detail" aria-live="polite">
        {focus === 'decisions' && topic ? (
          <>
            <DetailHead tone="green" title="Entscheidungen" />
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
          </>
        ) : focus === 'risks' ? (
          <>
            <DetailHead tone="red" title="Risiken" />
            <p className="ffl-detail-count">
              {atRisk} {atRisk === 1 ? 'offen' : 'offen'}
            </p>
            {data.projects
              .filter((p) => p.health === 'risk' || p.health === 'blocked')
              .map((p) => (
                <article key={p.id} className="ffl-item">
                  <div className="ffl-item-top">
                    <span className="ffl-item-title">{p.title}</span>
                    <span className={`ffl-chip is-${p.health === 'blocked' ? 'high' : 'mid'}`}>
                      {p.health === 'blocked' ? 'Hoch' : 'Mittel'}
                    </span>
                  </div>
                  {p.nextMilestone ? (
                    <p className="ffl-item-body">{p.nextMilestone}</p>
                  ) : null}
                  <span className="ffl-item-foot">
                    Tagro empfiehlt Klärung
                    <ArrowRight size={15} weight="bold" />
                  </span>
                </article>
              ))}
          </>
        ) : focus === 'team' ? (
          <>
            <DetailHead tone="ink" title="Team & Entwickler" />
            {data.team.map((m) => (
              <div key={m.id} className="ffl-row">
                <span className="ffl-row-name">{m.name}</span>
                {m.role ? <span className="ffl-chip is-quiet">{m.role}</span> : null}
              </div>
            ))}
          </>
        ) : focus === 'project' || focus === 'status' ? (
          <>
            <DetailHead
              tone={focus === 'status' ? 'blue' : 'ink'}
              title={focus === 'status' ? 'Projektstatus' : 'Projekte'}
            />
            {hasProjects ? (
              data.projects.map((p) => (
                <div key={p.id} className="ffl-row">
                  <span className="ffl-row-name">{p.title}</span>
                  <span className="ffl-row-meta">{p.phase || p.status || '—'}</span>
                </div>
              ))
            ) : (
              <p className="ffl-empty">
                Noch kein Projekt. Leg dein erstes an — Tagro übernimmt danach Planung
                und Entscheidungen.
              </p>
            )}
          </>
        ) : focus === 'communication' ? (
          <>
            <DetailHead tone="blue" title="Kommunikation" />
            {data.activity.length > 0 ? (
              data.activity.slice(0, 6).map((a) => (
                <div key={a.id} className="ffl-row">
                  <span className="ffl-row-name">{a.title}</span>
                </div>
              ))
            ) : (
              <p className="ffl-empty">Heute war es still.</p>
            )}
          </>
        ) : (
          <p className="ffl-hint">Wähle einen Punkt im Fluss, um Details zu sehen.</p>
        )}
      </aside>
    </div>
  )
}

function DetailHead({ tone, title }: { tone: string; title: string }) {
  return (
    <header className="ffl-detail-head">
      <span className={`ffl-detail-dot is-${tone}`} aria-hidden />
      <h2 className="ffl-detail-title">{title}</h2>
    </header>
  )
}

function Kpi({
  n,
  text,
  label,
  tone,
}: {
  n?: number
  text?: string
  label: string
  tone: string
}) {
  return (
    <div className="ffl-kpi">
      <span className="ffl-kpi-top">
        <span className={`ffl-kpi-dot is-${tone}`} aria-hidden />
        <span className="ffl-kpi-v">{text ?? n ?? 0}</span>
      </span>
      <span className="ffl-kpi-l">{label}</span>
    </div>
  )
}
