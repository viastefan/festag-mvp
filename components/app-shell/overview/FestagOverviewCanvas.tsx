'use client'

/**
 * Festag Overview — one report, three ways to read it.
 *
 *   Fluss   the project as a living flow; a node opens its detail beside it
 *   Bericht Tagro reads the day out loud, the text carries the room
 *   Liste   the same facts as a quiet, scannable list
 *
 * Nothing is invented: every number comes from the payload, and a section
 * that has nothing to say stays silent.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ChatCircle,
  Warning,
  CheckCircle,
  ChartBar,
  UsersThree,
  FolderSimple,
  ArrowRight,
  Play,
  Pause,
  X,
  GraphIcon,
  ListBullets,
  Article,
  CirclesThreePlus,
} from '@phosphor-icons/react'
import OverviewStoryPanel from '@/components/app-shell/overview/OverviewStoryPanel'
import FlowDetailBridge from '@/components/app-shell/overview/FlowDetailBridge'
import { FESTAG_OVERVIEW_PANEL_STYLES } from '@/components/app-shell/overview/festag-overview-panel-styles'
import { FESTAG_FLOW_STYLES } from '@/components/app-shell/overview/festag-flow-styles'
import OverviewReadStack, {
  buildOverviewOpening,
  buildOverviewReadBeats,
  type ReportFilter,
} from '@/components/app-shell/overview/OverviewReadStack'
import type { OverviewPayload } from '@/components/app-shell/WorkspaceOverviewLive'
import { useStatusReportPlayback } from '@/hooks/useStatusReportPlayback'
import { openNewProject } from '@/lib/new-project-open'
import {
  acceptDecisionRecommendation,
  buildOverviewOsTopic,
  enrichDecisionFocus,
  type DecisionCanvasTopic,
} from '@/lib/overview/decision-canvas'
import { FLOW_EDGES, FLOW_LAYOUT, type FlowNode, type FlowNodeId } from './overview-nodes'

type Props = {
  greeting: string
  firstName: string
  data: OverviewPayload
  onDecided?: () => void
}

type ViewMode = 'flow' | 'report' | 'list'

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
  const rootRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<ViewMode>('flow')
  const [focus, setFocus] = useState<FlowNodeId | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showRecommend, setShowRecommend] = useState(false)
  const [reportFilter, setReportFilter] = useState<ReportFilter>('all')

  const focusDecision = data.decisions[0] || null
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

  /* ── Spoken report — calm editorial lines ── */
  const lines = useMemo(() => {
    if (data.briefing?.lines?.length) {
      return data.briefing.lines.map(softenBriefingLine)
    }
    const out = [`${greeting}, ${firstName}.`, softenCalmLine(data.summary.calmLine)]
    if (data.summary.pendingDecisions > 0) {
      out.push(
        data.summary.pendingDecisions === 1
          ? 'Eine Entscheidung wartet noch auf deine Freigabe.'
          : `${data.summary.pendingDecisions} Entscheidungen warten noch auf deine Freigabe.`,
      )
    }
    if (atRisk > 0) {
      out.push(
        atRisk === 1
          ? 'Ein Risiko bleibt im Blick.'
          : `${atRisk} Risiken bleiben im Blick.`,
      )
    }
    if (atRisk === 0 && data.summary.pendingDecisions === 0) {
      out.push('Wir haben aktuell keine weiteren Sorgen.')
    }
    return out
  }, [data, greeting, firstName, atRisk])

  const { play, stop, speaking, activeIndex } = useStatusReportPlayback({
    sentences: lines,
    onComplete: useCallback(() => {}, []),
  })

  /* Leaving the report view must never leave a voice running. */
  useEffect(() => {
    if (view !== 'report') stop()
  }, [view, stop])
  useEffect(() => () => stop(), [stop])

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
    const copy: Record<FlowNodeId, { label: string; meta: string; metaTone?: FlowNode['tone'] }> = {
      communication: { label: 'Kommunikation', meta: 'Tagro hört mit' },
      risks: {
        label: 'Risiken',
        meta: atRisk > 0 ? `${atRisk} offen` : 'keine offenen',
        metaTone: atRisk > 0 ? 'red' : undefined,
      },
      decisions: {
        label: 'Entscheidungen',
        meta: data.summary.pendingDecisions > 0 ? `${data.summary.pendingDecisions} offen` : 'nichts offen',
        metaTone: data.summary.pendingDecisions > 0 ? 'green' : undefined,
      },
      status: {
        label: 'Projektstatus',
        meta: healthLabel,
        metaTone: healthLabel === 'Stabil' ? 'blue' : healthLabel === 'Achtung' ? 'red' : undefined,
      },
      team: {
        label: 'Team & Entwickler',
        meta: `${Math.max(1, data.summary.teamMembers)} aktiv`,
      },
      project: { label: 'Projekt', meta: hasProjects ? 'Gesamtbericht' : 'noch keins' },
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

  const detailOpen = view === 'flow' && focus !== null
  const focusTone = nodes.find((n) => n.id === focus)?.tone || 'ink'

  return (
    <div ref={rootRef} className={`ffl is-view-${view}${detailOpen ? ' has-detail' : ''}`}>
      <style>{FESTAG_FLOW_STYLES}</style>
      <style>{FESTAG_OVERVIEW_PANEL_STYLES}</style>

      <FlowDetailBridge
        active={detailOpen}
        focus={focus}
        rootRef={rootRef}
        tone={focusTone}
      />

      <OverviewViewMenu
        view={view}
        onChange={(v) => { setView(v); setFocus(null) }}
      />

      {/* ── Report column ── */}
      <section className={`ffl-report${view === 'report' ? ' is-centered' : ''}`}>
        {view !== 'report' ? (
          <OverviewReadStack
            greeting={greeting}
            firstName={firstName}
            beats={readBeats}
            filter={reportFilter}
            opening={readOpening}
            showCreateProject={!hasProjects}
            onCreateProject={() => openNewProject()}
          />
        ) : (
          /* ── Spoken report: the text carries the room ── */
          <div className="ffl-lyrics">
            <button
              type="button"
              className="ffl-play"
              onClick={() => (speaking ? stop() : play())}
              aria-label={speaking ? 'Bericht pausieren' : 'Bericht abspielen'}
            >
              {speaking ? <Pause size={17} weight="fill" /> : <Play size={17} weight="fill" />}
              {speaking ? 'Pause' : 'Bericht abspielen'}
            </button>

            <div className="ffl-lyric-lines">
              {lines.map((l, i) => (
                <p
                  key={`${i}-${l}`}
                  className={[
                    'ffl-lyric',
                    speaking && i === activeIndex ? 'is-now' : '',
                    speaking && i < activeIndex ? 'is-past' : '',
                  ].filter(Boolean).join(' ')}
                >
                  {l}
                </p>
              ))}
            </div>

            {data.summary.pendingDecisions > 0 && topic ? (
              <div className="ffl-inline">
                <p className="ffl-inline-k">Dazu wartet auf dich</p>
                <article className="ffl-inline-card">
                  <p className="ffl-inline-title">{topic.question}</p>
                  <div className="ffl-inline-actions">
                    <button type="button" className="ffl-btn-primary" disabled={busy} onClick={() => void accept()}>
                      {busy ? 'Wird übernommen…' : 'Empfehlung übernehmen'}
                    </button>
                    <button type="button" className="ffl-btn-quiet" onClick={() => { setView('flow'); openDecisions() }}>
                      Details
                    </button>
                  </div>
                  {error ? <p className="ffl-inline-error" role="alert">{error}</p> : null}
                </article>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {/* ── Flow ── */}
      {view === 'flow' ? (
        <section className="ffl-stage" aria-label="Projektfluss">
          <svg className="ffl-edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            {FLOW_EDGES.map((d) => (
              <path key={d} d={d} vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
          {nodes.map((node) => {
            const Icon = ICONS[node.id]
            const isFocus = focus === node.id
            return (
              <button
                key={node.id}
                type="button"
                data-ffl-node={node.id}
                className={[
                  'ffl-node',
                  `is-${node.tone}`,
                  isFocus ? 'is-focus' : '',
                  focus && !isFocus ? 'is-dim' : '',
                  reportFilter !== 'all' && reportFilter !== node.id ? 'is-filter-dim' : '',
                ].filter(Boolean).join(' ')}
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
                onClick={() => {
                  setReportFilter(node.id)
                  if (node.id === 'decisions') openDecisions()
                  else setFocus(isFocus ? null : node.id)
                }}
                aria-pressed={isFocus}
              >
                <span className="ffl-node-orb"><Icon size={20} weight="fill" /></span>
                <span className="ffl-node-copy">
                  <span className="ffl-node-label">{node.label}</span>
                  <span className={`ffl-node-meta${node.metaTone ? ` is-${node.metaTone}` : ''}`}>{node.meta}</span>
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
              <DetailHead tone="ink" title="Team & Entwickler" />
              {data.team.map((m) => (
                <div key={m.id} className="ffl-row" data-ffl-bridge-target>
                  <span className="ffl-row-name">{m.name}</span>
                  {m.role ? <span className="ffl-chip is-quiet">{m.role}</span> : null}
                </div>
              ))}
            </>
          ) : focus === 'project' || focus === 'status' ? (
            <>
              <DetailHead tone={focus === 'status' ? 'blue' : 'ink'} title={focus === 'status' ? 'Projektstatus' : 'Projekte'} />
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
              <DetailHead tone="blue" title="Kommunikation" />
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

function DetailHead({ tone, title }: { tone: string; title: string }) {
  return (
    <header className="ffl-detail-head">
      <span className={`ffl-detail-dot is-${tone}`} aria-hidden />
      <h2 className="ffl-detail-title">{title}</h2>
    </header>
  )
}

function softenCalmLine(line: string) {
  const t = line.trim()
  if (!t) return 'Heute läuft alles planmäßig.'
  if (/läuft ruhig/i.test(t)) return 'Heute läuft alles planmäßig.'
  return t.endsWith('.') ? t : `${t}.`
}

function softenBriefingLine(line: string) {
  return line
    .replace(/Entscheidungen warten noch\.?/i, 'Entscheidungen warten noch auf deine Freigabe.')
    .replace(/Eine Entscheidung wartet noch\.?/i, 'Eine Entscheidung wartet noch auf deine Freigabe.')
    .replace(/Keine offenen Entscheidungen\.?/i, 'Wir haben aktuell keine weiteren Sorgen.')
    .replace(/Fortschritt bei (\d+)\s*%\.?/i, 'Dein Projekt steht bei $1%.')
}
