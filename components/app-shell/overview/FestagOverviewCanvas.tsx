'use client'

/**
 * Festag Overview — one report, three ways to read it.
 *
 *   Fluss   the project as a living flow; a node opens its detail beside it
 *   Bericht H1 + T1 center; flow exits glassy to the right
 *   Liste   the same facts as a quiet, scannable list
 *
 * Nothing is invented: every number comes from the payload, and a section
 * that has nothing to say stays silent.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  X,
  GraphIcon,
  ListBullets,
  Article,
  CirclesThreePlus,
} from '@phosphor-icons/react'
import OverviewStoryPanel from '@/components/app-shell/overview/OverviewStoryPanel'
import FlowDetailBridge from '@/components/app-shell/overview/FlowDetailBridge'
import FlowConstellation from '@/components/app-shell/overview/FlowConstellation'
import { FESTAG_OVERVIEW_PANEL_STYLES } from '@/components/app-shell/overview/festag-overview-panel-styles'
import { FESTAG_FLOW_STYLES } from '@/components/app-shell/overview/festag-flow-styles'
import OverviewReadStack, {
  buildOverviewOpening,
  buildOverviewReadBeats,
  type ReportFilter,
} from '@/components/app-shell/overview/OverviewReadStack'
import type { OverviewPayload } from '@/components/app-shell/WorkspaceOverviewLive'
import { openNewProject } from '@/lib/new-project-open'
import {
  acceptDecisionRecommendation,
  buildOverviewOsTopic,
  enrichDecisionFocus,
  type DecisionCanvasTopic,
} from '@/lib/overview/decision-canvas'
import { buildFlowNews, countDecisionUrgency } from '@/lib/overview/flow-news'
import { FLOW_EDGES, FLOW_LAYOUT, type FlowNode, type FlowNodeId } from './overview-nodes'

type Props = {
  greeting: string
  firstName: string
  data: OverviewPayload
  onDecided?: () => void
}

type ViewMode = 'flow' | 'report' | 'list'

export default function FestagOverviewCanvas({
  greeting,
  firstName,
  data,
  onDecided,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<ViewMode>('flow')
  const [focus, setFocus] = useState<FlowNodeId | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showRecommend, setShowRecommend] = useState(false)
  const [reportFilter, setReportFilter] = useState<ReportFilter>('all')
  const [focusDecisionId, setFocusDecisionId] = useState<string | null>(null)

  const focusDecision =
    data.decisions.find((d) => d.id === focusDecisionId) || data.decisions[0] || null
  const hasProjects = data.projects.length > 0

  const atRisk = useMemo(
    () => data.projects.filter((p) => p.health === 'risk' || p.health === 'blocked').length,
    [data.projects],
  )
  const healthLabel = !hasProjects ? '—' : atRisk > 0 ? 'Achtung' : 'Stabil'
  const openTasks = data.tasks?.length ?? 0

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

  useEffect(() => {
    function onSetView(e: Event) {
      const next = (e as CustomEvent<{ view?: ViewMode }>).detail?.view
      if (next === 'flow' || next === 'report' || next === 'list') {
        setView(next)
        setFocus(null)
      }
    }
    window.addEventListener('festag-overview-set-view', onSetView)
    return () => window.removeEventListener('festag-overview-set-view', onSetView)
  }, [])

  const readCtx = useMemo(
    () => ({
      calmLine: data.summary.calmLine,
      pendingDecisions: data.summary.pendingDecisions,
      atRisk,
      openTasks,
      teamMembers: data.summary.teamMembers,
      healthLabel,
      activityTitles: data.activity.map((a) => a.title).filter(Boolean),
      projectTitles: data.projects.map((p) => p.title).filter(Boolean),
      decisionTitles: data.decisions.map((d) => d.title || d.summary || '').filter(Boolean),
      teamNames: data.team.map((m) => m.name).filter(Boolean),
      briefingLines: data.briefing?.lines,
    }),
    [data, atRisk, openTasks, healthLabel],
  )

  const readBeats = useMemo(() => buildOverviewReadBeats(readCtx), [readCtx])

  const readOpening = useMemo(
    () => buildOverviewOpening(reportFilter, greeting, firstName, readCtx),
    [reportFilter, greeting, firstName, readCtx],
  )

  const nodes: FlowNode[] = useMemo(() => {
    const { soft, urgent } = countDecisionUrgency(data.decisions)
    const activityHint = data.activity[0]?.title || null
    const projectTitle = data.briefing?.projectTitle || data.projects[0]?.title || null
    const input = {
      atRisk,
      pendingDecisions: data.summary.pendingDecisions,
      softDecisions: soft,
      urgentDecisions: urgent,
      teamMembers: data.summary.teamMembers,
      openTasks,
      healthLabel,
      hasProjects,
      activityHint,
      projectTitle,
    }
    return FLOW_LAYOUT.map((n) => {
      const news = buildFlowNews(n.id, input)
      return {
        ...n,
        label: news.label,
        meta: news.meta,
        metaTone: news.metaTone,
        news: news.news,
        line: news.news,
        pulse: news.pulse,
      }
    })
  }, [data, atRisk, healthLabel, hasProjects, openTasks])

  const openDecisions = useCallback(() => {
    setFocus('decisions')
    setShowRecommend(false)
    setSelected(topic?.recommendId || null)
  }, [topic])

  const openMarkGate = useCallback((tone: 'risk' | 'decision' | 'efficiency', itemId?: string) => {
    setView('flow')
    if (tone === 'decision') {
      if (itemId) setFocusDecisionId(itemId)
      setReportFilter('decisions')
      setFocus('decisions')
      setShowRecommend(false)
      return
    }
    if (tone === 'risk') {
      setReportFilter('risks')
      setFocus('risks')
      setShowRecommend(false)
      return
    }
    setReportFilter('status')
    setFocus('status')
    setShowRecommend(false)
  }, [])

  useEffect(() => {
    if (focus !== 'decisions') return
    setSelected(topic?.recommendId || null)
  }, [focus, topic?.recommendId, focusDecision?.id])

  const markPreviews = useMemo(() => {
    const riskProject = data.projects.find((p) => p.health === 'risk' || p.health === 'blocked')
    return {
      decision: {
        title: topic?.question || data.decisions[0]?.title || 'Keine offene Entscheidung',
        hint: topic?.recommendLabel
          ? `Empfehlung: ${topic.recommendLabel}`
          : data.summary.pendingDecisions > 0
            ? `${data.summary.pendingDecisions} offen — tippen zum Öffnen`
            : 'Im Fluss öffnen',
      },
      risk: {
        title: atRisk > 0
          ? (riskProject?.title || `${atRisk} offene Risiken`)
          : 'Keine offenen Risiken',
        hint: atRisk > 0 ? 'Im Fluss ansehen' : 'Alles ruhig',
      },
      efficiency: {
        title: `Status: ${healthLabel}`,
        hint: openTasks > 0 ? `${openTasks} offene Aufgaben` : 'Projektstatus öffnen',
      },
    }
  }, [data, topic, atRisk, healthLabel, openTasks])

  const markGates = useMemo(() => ({
    decision: {
      items: data.decisions.map((d) => ({
        id: d.id,
        title: d.title || d.summary || 'Entscheidung',
        hint: d.urgency === 'high' || d.urgency === 'critical'
          ? 'eher dringend'
          : d.projectTitle || 'offen',
      })),
      empty: 'Keine offene Entscheidung',
    },
    risk: {
      items: data.projects
        .filter((p) => p.health === 'risk' || p.health === 'blocked')
        .map((p) => ({
          id: p.id,
          title: p.title,
          hint: p.health === 'blocked' ? 'blockiert' : 'im Blick',
        })),
      empty: 'Keine offenen Risiken',
    },
    efficiency: {
      items: [
        {
          id: 'status',
          title: `Status: ${healthLabel}`,
          hint: openTasks > 0 ? `${openTasks} Aufgaben offen` : 'im Fluss öffnen',
        },
      ],
    },
  }), [data.decisions, data.projects, healthLabel, openTasks])

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

  const detailOpen = view === 'flow' && focus !== null

  return (
    <div ref={rootRef} className={`ffl is-view-${view}${detailOpen ? ' has-detail' : ''}`}>
      <style>{FESTAG_FLOW_STYLES}</style>
      <style>{FESTAG_OVERVIEW_PANEL_STYLES}</style>

      <FlowDetailBridge
        active={detailOpen}
        focus={focus}
        rootRef={rootRef}
      />

      <OverviewViewMenu
        view={view}
        onChange={(v) => { setView(v); setFocus(null) }}
      />

      {/* ── Report column (H1 + T1 stay mounted in Fluss & Bericht) ── */}
      {view !== 'list' ? (
        <section className={`ffl-report${view === 'report' ? ' is-centered' : ''}`}>
          <OverviewReadStack
            greeting={greeting}
            firstName={firstName}
            beats={readBeats}
            filter={reportFilter}
            opening={readOpening}
            ctx={readCtx}
            showCreateProject={!hasProjects}
            onCreateProject={() => openNewProject()}
            onOpenMark={openMarkGate}
            markPreviews={markPreviews}
            markGates={markGates}
            reportActive={view === 'report'}
            onToggleReport={() => {
              setFocus(null)
              setView((v) => (v === 'report' ? 'flow' : 'report'))
            }}
          />
        </section>
      ) : null}

      {/* ── Flow — stays mounted in Bericht so it can exit glassy to the right ── */}
      {view === 'flow' || view === 'report' ? (
        <section
          className={`ffl-stage${view === 'report' ? ' is-report-exit' : ''}`}
          aria-label="Projektfluss"
          aria-hidden={view === 'report' || undefined}
        >
          <svg className="ffl-edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            {FLOW_EDGES.map((d) => (
              <path key={d} d={d} vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
          {nodes.map((node) => {
            const isFocus = focus === node.id
            return (
              <button
                key={node.id}
                type="button"
                data-ffl-node={node.id}
                tabIndex={view === 'report' ? -1 : 0}
                disabled={view === 'report'}
                className={[
                  'ffl-node',
                  `is-${node.tone}`,
                  `is-pulse-${node.pulse || 'calm'}`,
                  isFocus ? 'is-focus' : '',
                  focus && !isFocus ? 'is-dim' : '',
                  reportFilter !== 'all' && reportFilter !== node.id ? 'is-filter-dim' : '',
                ].filter(Boolean).join(' ')}
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
                onClick={() => {
                  if (view !== 'flow') return
                  setReportFilter(node.id)
                  if (isFocus) {
                    setFocus(null)
                    return
                  }
                  if (node.id === 'decisions') openDecisions()
                  else setFocus(node.id)
                }}
                aria-pressed={isFocus}
                aria-label={`${node.label}. ${node.news}`}
              >
                <span className="ffl-node-mark" aria-hidden>
                  <FlowConstellation
                    tone={node.metaTone || node.tone}
                    size={isFocus ? 30 : 28}
                    pulse={node.pulse}
                  />
                </span>
                <span className="ffl-node-copy">
                  <span className="ffl-node-head">
                    <span className="ffl-node-label">{node.label}</span>
                    {node.meta ? (
                      <span className={`ffl-node-meta${node.metaTone ? ` is-${node.metaTone}` : ''}`}>
                        {node.meta}
                      </span>
                    ) : null}
                  </span>
                  <span className={`ffl-node-line${isFocus ? ' is-focus-line' : ' is-idle-line'}`}>
                    {node.news}
                  </span>
                </span>
              </button>
            )
          })}
        </section>
      ) : null}

      {/* ── List ── */}
      {view === 'list' ? (
        <section className="ffl-list" aria-label="Übersicht als Liste">
          <ListRow n={openTasks} label="Aufgaben offen" tone="ink" />
          <ListRow n={atRisk} label="Risiken erkannt" tone="red" />
          <ListRow
            n={data.summary.pendingDecisions}
            label="Entscheidungen offen"
            tone="green"
            action={data.summary.pendingDecisions > 0 ? () => { setView('flow'); openDecisions() } : undefined}
          />
          <ListRow n={data.summary.teamMembers} label="Team aktiv" tone="ink" />
          <ListRow text={healthLabel} label="Projektstatus" tone="blue" />
        </section>
      ) : null}

      {/* ── Detail — only when something is in focus, and always closable ── */}
      {detailOpen ? (
        <aside className="ffl-detail" aria-live="polite">
          <button type="button" className="ffl-detail-close" onClick={() => setFocus(null)} aria-label="Schließen">
            <X size={16} weight="bold" />
          </button>

          {focus === 'decisions' ? (
            topic ? (
              <>
                <DetailHead title="Entscheidungen" />
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
            ) : (
              <>
                <DetailHead title="Entscheidungen" />
                <p className="ffl-empty" data-ffl-bridge-target>
                  Gerade wartet keine Entscheidung auf dich.
                </p>
              </>
            )
          ) : focus === 'risks' ? (
            <>
              <DetailHead title="Risiken" />
              {atRisk === 0 ? (
                <p className="ffl-empty">Aktuell keine offenen Risiken.</p>
              ) : (
                data.projects
                  .filter((p) => p.health === 'risk' || p.health === 'blocked')
                  .map((p) => (
                    <article key={p.id} className="ffl-item" data-ffl-bridge-target>
                      <div className="ffl-item-top">
                        <span className="ffl-item-title">{p.title}</span>
                        <span className={`ffl-chip is-${p.health === 'blocked' ? 'high' : 'mid'}`}>
                          {p.health === 'blocked' ? 'Hoch' : 'Mittel'}
                        </span>
                      </div>
                      {p.nextMilestone ? <p className="ffl-item-body">{p.nextMilestone}</p> : null}
                      <span className="ffl-item-foot">Tagro empfiehlt Klärung <ArrowRight size={15} weight="bold" /></span>
                    </article>
                  ))
              )}
            </>
          ) : focus === 'team' ? (
            <>
              <DetailHead title="Team & Entwickler" />
              {data.team.map((m) => (
                <div key={m.id} className="ffl-row" data-ffl-bridge-target>
                  <span className="ffl-row-name">{m.name}</span>
                  {m.role ? <span className="ffl-chip is-quiet">{m.role}</span> : null}
                </div>
              ))}
            </>
          ) : focus === 'project' || focus === 'status' ? (
            <>
              <DetailHead title={focus === 'status' ? 'Projektstatus' : 'Projekte'} />
              {hasProjects ? (
                data.projects.map((p) => (
                  <div key={p.id} className="ffl-row" data-ffl-bridge-target>
                    <span className="ffl-row-name">{p.title}</span>
                    <span className="ffl-row-meta">{p.phase || p.status || '—'}</span>
                  </div>
                ))
              ) : (
                <p className="ffl-empty">Noch kein Projekt. Leg dein erstes an — Tagro übernimmt danach Planung und Entscheidungen.</p>
              )}
            </>
          ) : focus === 'communication' ? (
            <>
              <DetailHead title="Kommunikation" />
              {data.activity.length > 0 ? (
                data.activity.slice(0, 6).map((a) => (
                  <div key={a.id} className="ffl-row" data-ffl-bridge-target>
                    <span className="ffl-row-name">{a.title}</span>
                  </div>
                ))
              ) : (
                <p className="ffl-empty">Heute war es still.</p>
              )}
            </>
          ) : null}
        </aside>
      ) : null}
    </div>
  )
}

function OverviewViewMenu({
  view,
  onChange,
}: {
  view: ViewMode
  onChange: (v: ViewMode) => void
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const items: Array<{ id: ViewMode; label: string; Icon: typeof GraphIcon }> = [
    { id: 'flow', label: 'Fluss', Icon: GraphIcon },
    { id: 'report', label: 'Bericht', Icon: Article },
    { id: 'list', label: 'Liste', Icon: ListBullets },
  ]

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div className="ffl-view-menu" ref={wrapRef}>
      <button
        type="button"
        className={`ffl-view-trigger${open ? ' is-on' : ''}`}
        aria-label="Ansicht"
        title="Ansicht"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <CirclesThreePlus size={18} weight="regular" />
      </button>
      {open ? (
        <div className="ffl-view-popover" role="menu" aria-label="Ansicht">
          {items.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              role="menuitemradio"
              aria-checked={view === id}
              className={`ffl-view-option${view === id ? ' is-on' : ''}`}
              onClick={() => {
                onChange(id)
                setOpen(false)
              }}
            >
              <Icon size={15} weight="regular" />
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ListRow({
  n, text, label, tone, action,
}: { n?: number; text?: string; label: string; tone: string; action?: () => void }) {
  const Tag = action ? 'button' : 'div'
  return (
    <Tag
      {...(action ? { type: 'button' as const, onClick: action } : {})}
      className={`ffl-lrow${action ? ' is-action' : ''}`}
    >
      <span className={`ffl-lrow-dot is-${tone}`} aria-hidden />
      <span className="ffl-lrow-v">{text ?? n ?? 0}</span>
      <span className="ffl-lrow-l">{label}</span>
      {action ? <ArrowRight size={16} weight="bold" /> : null}
    </Tag>
  )
}

function DetailHead({ title }: { title: string }) {
  return (
    <header className="ffl-detail-head">
      <h2 className="ffl-detail-title">{title}</h2>
    </header>
  )
}
