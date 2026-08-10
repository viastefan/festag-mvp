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
import type { FlowNodeId } from './overview-nodes'

type Props = {
  greeting: string
  firstName: string
  data: OverviewPayload
  onDecided?: () => void
}

type ViewMode = 'flow' | 'report' | 'list'

function fmtActivityAge(iso: string): string {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return ''
  const mins = Math.floor((Date.now() - t) / 60000)
  if (mins < 1) return 'jetzt'
  if (mins < 60) return `vor ${mins} Min.`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `vor ${hours} Std.`
  const days = Math.floor(hours / 24)
  if (days < 7) return `vor ${days} Tg.`
  return new Date(iso).toLocaleDateString('de', { day: '2-digit', month: 'short' })
}

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
  /* null = follow the briefing's project; set once the user picks one. */
  const [pickedProjectId, setPickedProjectId] = useState<string | null>(null)

  const focusDecision =
    data.decisions.find((d) => d.id === focusDecisionId) || data.decisions[0] || null
  const hasProjects = data.projects.length > 0

  const atRisk = useMemo(
    () => data.projects.filter((p) => p.health === 'risk' || p.health === 'blocked').length,
    [data.projects],
  )
  const healthLabel = !hasProjects ? '—' : atRisk > 0 ? 'Achtung' : 'Stabil'
  const openTasks = data.tasks?.length ?? 0

  /** The project the Overview is currently about — the Projekt station sets it. */
  const activeProject = useMemo(() => {
    const byPick = pickedProjectId && data.projects.find((p) => p.id === pickedProjectId)
    if (byPick) return byPick
    const byBriefing =
      data.briefing?.projectId && data.projects.find((p) => p.id === data.briefing?.projectId)
    return byBriefing || data.projects[0] || null
  }, [pickedProjectId, data.projects, data.briefing?.projectId])

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

  /** The calm facts — one quiet line, never six equal-weight nodes. */
  const ambient = useMemo(() => {
    const out: string[] = []
    if (hasProjects) out.push(`Status ${healthLabel.toLowerCase()}`)
    if (openTasks > 0) out.push(`${openTasks} ${openTasks === 1 ? 'Aufgabe' : 'Aufgaben'} in Arbeit`)
    if (data.summary.teamMembers > 0) out.push(`${data.summary.teamMembers} im Team`)
    return out
  }, [hasProjects, healthLabel, openTasks, data.summary.teamMembers])

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

  /** Detail for whichever node is focused — swaps straight into the right rail. */
  function renderNodeDetail(id: FlowNodeId) {
    switch (id) {
      case 'decisions':
        return topic ? (
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
        ) : (
          <p className="ffl-empty">Gerade wartet keine Entscheidung auf dich.</p>
        )
      case 'risks':
        return atRisk === 0 ? (
          <p className="ffl-empty">Aktuell keine offenen Risiken.</p>
        ) : (
          data.projects
            .filter((p) => p.health === 'risk' || p.health === 'blocked')
            .map((p) => (
              <article key={p.id} className="ffl-item">
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
        )
      case 'team':
        return data.team.map((m) => (
          <div key={m.id} className="ffl-row">
            <span className="ffl-row-name">{m.name}</span>
            {m.role ? <span className="ffl-chip is-quiet">{m.role}</span> : null}
          </div>
        ))
      case 'project':
      case 'status':
        return hasProjects ? (
          data.projects.map((p) => {
            const isActive = activeProject?.id === p.id
            return (
              <button
                key={p.id}
                type="button"
                className={`ffl-row is-pick${isActive ? ' is-active' : ''}`}
                aria-pressed={isActive}
                onClick={() => setPickedProjectId(p.id)}
              >
                <span className="ffl-row-name">{p.title}</span>
                <span className="ffl-row-meta">
                  {isActive ? 'Aktiv' : p.phase || p.status || '—'}
                </span>
              </button>
            )
          })
        ) : (
          <p className="ffl-empty">Noch kein Projekt. Leg dein erstes an — Tagro übernimmt danach Planung und Entscheidungen.</p>
        )
      case 'communication':
        return data.activity.length > 0 ? (
          data.activity.slice(0, 6).map((a) => (
            <div key={a.id} className="ffl-row">
              <span className="ffl-row-name">{a.title}</span>
            </div>
          ))
        ) : (
          <p className="ffl-empty">Heute war es still.</p>
        )
      default:
        return null
    }
  }

  const detailOpen = view === 'flow' && focus !== null

  return (
    <div ref={rootRef} className={`ffl is-view-${view}${detailOpen ? ' has-detail' : ''}`}>
      <style>{FESTAG_FLOW_STYLES}</style>
      <style>{FESTAG_OVERVIEW_PANEL_STYLES}</style>

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

      {/* ── Stage — a flat, hairline list. A row opens its detail on the right. ──
          Stays mounted in Bericht so it can exit glassy to the right. */}
      {view === 'flow' || view === 'report' ? (
        <section
          className={`ffl-stage${view === 'report' ? ' is-report-exit' : ''}`}
          aria-label="Projektübersicht"
          aria-hidden={view === 'report' || undefined}
        >
          <div className="ffl-inbox">
            <div className="ffl-inbox-status">
              <span className="ffl-inbox-pulse" aria-hidden />
              <span>Tagro beobachtet dein Projekt laufend im Hintergrund.</span>
            </div>
            <div className="ffl-inbox-list">
              {data.activity.length > 0 ? (
                data.activity.slice(0, 8).map((a) => (
                  <div key={a.id} className="ffl-inbox-row">
                    <span className="ffl-inbox-row-title">{a.title}</span>
                    <span className="ffl-inbox-row-meta">
                      {a.projectTitle ? <span className="ffl-inbox-row-project">{a.projectTitle}</span> : null}
                      <span className="ffl-inbox-row-time">{fmtActivityAge(a.createdAt)}</span>
                    </span>
                  </div>
                ))
              ) : (
                <p className="ffl-empty">Heute war es still.</p>
              )}
            </div>
          </div>
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
          {renderNodeDetail(focus as FlowNodeId)}
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

