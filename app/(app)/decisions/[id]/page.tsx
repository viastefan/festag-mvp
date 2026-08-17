'use client'

/**
 * /decisions/[id] — one decision, at full length.
 *
 * Same visual law as the board: warm canvas, editorial headline carrying the
 * whole statement, everything Tagro authored inside one pale blue field, and
 * the grounds spelled out rather than hidden behind a link. The list stays
 * scannable because the depth lives here.
 *
 * The answer itself runs through the same resolve sheet as the board, so there
 * is exactly one confirm/options/reject flow in the product.
 */

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, ArrowRight, Clock } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import TagroContentFab from '@/components/TagroContentFab'
import {
  MOCK_AFFECTED,
  MOCK_DECISIONS,
  MOCK_PROJECTS,
  URGENCY_LABEL,
  fmtAgo,
  isOpenDecisionStatus,
  type DecOption,
  type Decision,
  type ProjectLite,
} from '@/components/decisions/decisions-shared'
import DecisionBrandMark from '@/components/decisions/DecisionBrandMark'
import DecisionResolveSheet, { type ResolveStep } from '@/components/decisions/DecisionResolveSheet'
import { DECISION_BOARD_CSS, DECISION_SHEET_CSS } from '@/components/decisions/decision-board-styles'
import { confidencePercent, doorLabel, dueLine, eventActorLabel, eventLabel, isOverdue } from '@/lib/decisions/center'
import { buildRationale } from '@/lib/decisions/rationale'
import type { AffectedWork } from '@/lib/decisions/affected'

type EventLite = {
  id: string
  event_type: string
  actor_kind?: string | null
  created_at: string
}

export default function DecisionDetailPage() {
  return (
    <Suspense fallback={<div className="dcb"><div className="dcb-inner"><p className="dcd-loading">Lade…</p></div></div>}>
      <DecisionDetail />
    </Suspense>
  )
}

function DecisionDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])

  const [decision, setDecision] = useState<Decision | null>(null)
  const [project, setProject] = useState<ProjectLite | null>(null)
  const [affected, setAffected] = useState<AffectedWork | null>(null)
  const [events, setEvents] = useState<EventLite[]>([])
  const [options, setOptions] = useState<DecOption[]>([])
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState('')
  const [sheet, setSheet] = useState<ResolveStep | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data?.user?.id || ''))
  }, [supabase])

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)

    const mock = MOCK_DECISIONS.find(d => d.id === id)
    if (mock) {
      setDecision(mock)
      setProject(mock.project_id ? MOCK_PROJECTS[mock.project_id] ?? null : null)
      setAffected((MOCK_AFFECTED[mock.id] as AffectedWork) ?? null)
      setOptions((mock.options_json || []).map(o => ({ id: o.id, label: o.label, description: o.hint })))
      setEvents([])
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`/api/decisions/${id}?expand=options,affected,events`, { credentials: 'include' })
      if (!res.ok) { setDecision(null); return }
      const data = await res.json()
      setDecision(data.decision ?? null)
      setProject(data.project ?? null)
      setAffected((data.affected ?? null) as AffectedWork | null)
      setEvents(Array.isArray(data.events) ? (data.events as EventLite[]) : [])
      setOptions(Array.isArray(data.options) ? (data.options as DecOption[]) : [])
    } catch {
      setDecision(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { void load() }, [load])
  useEffect(() => { if (searchParams?.get('discuss') === '1') setSheet('reject') }, [searchParams])

  const recommended = useMemo(
    () => options.find(o => o.recommended_by_tagro)
      ?? options.find(o => {
        const key = decision?.recommended_option?.toLowerCase()
        return !!key && (String(o.external_id || o.id).toLowerCase() === key || o.label.toLowerCase() === key)
      })
      ?? null,
    [options, decision?.recommended_option],
  )

  const recLabel = recommended ? (recommended.client_label || recommended.label) : null

  const rationale = useMemo(
    () => (decision ? buildRationale(decision, { work: affected ?? undefined, recommendationLabel: recLabel }) : []),
    [decision, affected, recLabel],
  )

  function goBack() { router.push('/decisions') }

  if (loading) {
    return (
      <div className="dcb">
        <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: DECISION_BOARD_CSS }} />
        <div className="dcb-inner"><p className="dcd-loading">Entscheidung wird geladen…</p></div>
      </div>
    )
  }

  if (!decision) {
    return (
      <div className="dcb">
        <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: DECISION_BOARD_CSS }} />
        <div className="dcb-inner">
          <h1 className="dcd-h1">Diese Entscheidung gibt es nicht mehr.</h1>
          <p className="dcd-lead">Sie wurde archiviert, oder du hast keinen Zugriff darauf.</p>
          <button type="button" className="dcb-btn dcb-btn--primary dcd-back-cta" onClick={goBack}>
            Alle Entscheidungen
          </button>
        </div>
      </div>
    )
  }

  // Identity is empty on first paint and in the demo preview — treating that as
  // "not the decider" would grey out the action before auth resolves. The
  // /decide endpoint enforces authority server-side regardless.
  const isDecider = !me
    || decision.id.startsWith('mock-')
    || decision.requested_for === me
    || (!decision.requested_for && decision.created_by !== me)
  const open = isOpenDecisionStatus(decision.status)
  const due = dueLine(decision)
  const overdue = isOverdue(decision)
  const door = doorLabel(decision)
  const confidence = confidencePercent(decision)
  const blocks = affected?.blocks ?? []
  const affects = affected?.affects ?? []
  const title = decision.client_title || decision.title
  const rawSummary = decision.client_summary || decision.description
  /**
   * Legacy rows exist where the summary repeats the title verbatim (or the
   * title is just the summary's first sentence). Rendering both turns the
   * headline into an echo, so the second clause only survives if it actually
   * says something new.
   */
  const summary = (() => {
    const t = title?.trim().replace(/[.…]+$/, '') ?? ''
    const s = rawSummary?.trim() ?? ''
    if (!s || !t) return s || null
    if (s === t) return null
    if (s.startsWith(t) || t.startsWith(s.slice(0, Math.min(s.length, 40)))) return null
    return s
  })()
  const primaryLabel = decision.response_type === 'binary' ? 'Freigeben' : 'Entscheiden'

  return (
    <div className="dcb">
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: DECISION_BOARD_CSS }} />
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: DECISION_SHEET_CSS }} />

      <div className="dcb-inner dcd">
        <button type="button" className="dcd-back" onClick={goBack}>
          <ArrowLeft size={14} weight="regular" aria-hidden />
          Alle Entscheidungen
        </button>

        {/* The headline is the statement: what is being decided, and what it
            changes. Everything else on the page supports these two sentences. */}
        <h1 className="dcd-h1">
          {title}
          {summary && <span className="dcd-h1-second"> {summary}</span>}
        </h1>

        <p className="dcd-context">
          {[project?.title, open ? 'Wartet auf eine Entscheidung' : 'Entschieden'].filter(Boolean).join(' · ')}
        </p>

        {recLabel && (
          <section className="dcd-tagro" aria-label="Tagros Empfehlung">
            <p className="dcd-tagro-head">Tagro empfiehlt</p>
            <p className="dcd-tagro-pick">
              <DecisionBrandMark label={recLabel} />
              {recLabel}
            </p>
            {(decision.tagro_recommendation_reason || decision.tagro_reasoning) && (
              <p className="dcd-tagro-why">
                {decision.tagro_recommendation_reason || decision.tagro_reasoning}
              </p>
            )}
            {confidence !== null && (
              <p className="dcd-tagro-confidence">
                <span className="dcd-meter" aria-hidden><span style={{ width: `${confidence}%` }} /></span>
                Sicherheit {confidence} %
              </p>
            )}
          </section>
        )}

        <div className="dcd-facts">
          {due && (
            <div className="dcd-fact">
              <p className="dcd-fact-key">Frist</p>
              <p className={`dcd-fact-val${overdue ? ' is-red' : ''}`}>
                <Clock size={15} weight="regular" aria-hidden />
                {due}
              </p>
            </div>
          )}
          {door && (
            <div className="dcd-fact">
              <p className="dcd-fact-key">Tragweite</p>
              <p className="dcd-fact-val">{door}</p>
            </div>
          )}
          <div className="dcd-fact">
            <p className="dcd-fact-key">Priorität</p>
            <p className={`dcd-fact-val${decision.urgency === 'critical' ? ' is-red' : ''}`}>
              {URGENCY_LABEL[decision.urgency] || 'Normal'}
            </p>
          </div>
          {blocks.length + affects.length > 0 && (
            <div className="dcd-fact">
              <p className="dcd-fact-key">Betroffene Bereiche</p>
              <p className="dcd-fact-val">{blocks.length + affects.length}</p>
            </div>
          )}
        </div>

        {open && (
          <div className="dcd-actions">
            <button
              type="button"
              className="dcb-btn dcb-btn--primary dcd-cta"
              onClick={() => setSheet('confirm')}
              disabled={!isDecider}
              title={isDecider ? undefined : 'Diese Entscheidung liegt bei jemand anderem'}
            >
              {primaryLabel}
              <ArrowRight size={14} weight="regular" className="dcb-btn-arrow" aria-hidden />
            </button>
            {options.length > 1 && (
              <button type="button" className="dcb-btn dcd-cta" onClick={() => setSheet('options')}>
                Optionen ansehen
              </button>
            )}
            {!isDecider && <p className="dcd-note">Wartet auf die entscheidende Person.</p>}
          </div>
        )}

        {rationale.length > 0 && (
          <section className="dcd-section">
            <h2 className="dcd-h2">Warum Tagro das vorschlägt</h2>
            <div className="dcd-grounds">
              {rationale.map(block => (
                <div key={block.label} className="dcd-ground">
                  <p className="dcd-ground-key">{block.label}</p>
                  <p className="dcd-ground-body">{block.body}</p>
                  {block.detail && block.detail.length > 0 && (
                    <ul className="dcd-ground-detail">
                      {block.detail.map(line => <li key={line}>{line}</li>)}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {(blocks.length > 0 || affects.length > 0) && (
          <section className="dcd-section">
            <h2 className="dcd-h2">
              {blocks.length > 0 ? 'Diese Arbeit wartet darauf' : 'Betroffene Arbeit'}
            </h2>
            <ul className="dcd-tasks">
              {[...blocks, ...affects].map(task => (
                <li key={`${task.link_kind}-${task.id}`} className={`dcd-task${task.link_kind === 'blocks' ? ' is-blocked' : ''}`}>
                  <span className="dcd-task-dot" aria-hidden />
                  <span className="dcd-task-name">{task.title}</span>
                  <span className="dcd-task-kind">{task.link_kind === 'blocks' ? 'blockiert' : 'betroffen'}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {events.length > 0 && (
          <section className="dcd-section">
            <h2 className="dcd-h2">Verlauf</h2>
            <ol className="dcd-trail">
              {events.map(ev => {
                const actor = eventActorLabel(ev.actor_kind)
                return (
                  <li key={ev.id} className="dcd-trail-item">
                    <span className="dcd-trail-dot" aria-hidden />
                    <span className="dcd-trail-copy">
                      <span className="dcd-trail-title">{eventLabel(ev.event_type)}</span>
                      <span className="dcd-trail-meta" suppressHydrationWarning>
                        {[actor, fmtAgo(ev.created_at)].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ol>
          </section>
        )}
      </div>

      {sheet && (
        <DecisionResolveSheet
          decision={decision}
          project={project}
          affected={affected ?? undefined}
          options={options}
          recommended={recommended}
          initialStep={sheet}
          me={me}
          onClose={() => setSheet(null)}
          onResolved={(patch) => {
            setDecision(curr => (curr ? { ...curr, ...patch } : curr))
            setSheet(null)
            void load()
          }}
          onEscalateToDrawer={() => setSheet(null)}
        />
      )}

      <div className="dcd-fab">
        <TagroContentFab
          context={{ contextType: 'decision', id: decision.id, title, subtitle: project?.title }}
        />
      </div>
    </div>
  )
}
