'use client'

/**
 * One decision, as an editorial row on a single running path.
 *
 * The left column is not an index — it is the Flow path from the design
 * constitution: one organic line in Primary Blue running through every open
 * decision, with a node per row. Answering a decision draws a check into its
 * node, holds it for a beat so the completion is felt, then the row retracts
 * and the path closes behind it.
 *
 * Reading order is the decision order: what is being decided → what Tagro
 * recommends → why → what it costs me → what I do.
 */

import { useMemo } from 'react'
import {
  ArrowRight, Clock, CreditCard, Lock, PencilSimple, Scales,
  ShieldWarning, Signature, Sparkle, TrendUp,
} from '@phosphor-icons/react'
import type { AffectedWork } from '@/lib/decisions/affected'
import { dueLine, isOverdue } from '@/lib/decisions/center'
import { rationaleTeaser } from '@/lib/decisions/rationale'
import DecisionBrandMark from '@/components/decisions/DecisionBrandMark'
import {
  URGENCY_LABEL,
  isOpenDecisionStatus,
  type DecOption,
  type Decision,
  type ProjectLite,
} from '@/components/decisions/decisions-shared'

export type RowAction = 'resolve' | 'options' | 'details' | 'why'

/** Where this row sits on the running path. */
export type PathPosition = 'single' | 'first' | 'middle' | 'last'

type Props = {
  decision: Decision
  project: ProjectLite | null
  affected?: AffectedWork
  recommended: DecOption | null
  position: PathPosition
  /** Answered just now — draw the check and hold before the row retracts. */
  completing: boolean
  canAct: boolean
  onAction: (action: RowAction) => void
}

/** Quiet type marks — a hint, never a badge. */
function TypeIcon({ type }: { type?: string | null }) {
  const size = 18
  switch (type) {
    case 'payment': return <CreditCard size={size} />
    case 'direction': return <PencilSimple size={size} />
    case 'data_protection':
    case 'legal': return <Lock size={size} />
    case 'contract': return <Signature size={size} />
    case 'budget': return <TrendUp size={size} />
    case 'risk_response':
    case 'escalation': return <ShieldWarning size={size} />
    case 'tradeoff':
    case 'scope': return <Scales size={size} />
    default: return <Sparkle size={size} />
  }
}

/** How long answering realistically takes. */
function effortLabel(d: Decision): string {
  if (d.response_type === 'free_text') return '2 Min.'
  if (d.response_type === 'multi_choice') return '1 Min.'
  return '30 Sek.'
}

export default function DecisionBoardRow({
  decision, project, affected, recommended, position, completing, canAct, onAction,
}: Props) {
  const blocked = affected?.blocks.length ?? 0
  const affects = affected?.affects.length ?? 0
  const areas = blocked + affects
  const due = dueLine(decision)
  const overdue = isOverdue(decision)
  const escalated = (decision.escalation_level ?? 0) >= 2
  const urgent = decision.urgency === 'critical' || decision.urgency === 'high'

  const recLabel = recommended ? (recommended.client_label || recommended.label) : null
  const recWhy = decision.tagro_recommendation_reason?.trim()
    || decision.tagro_reasoning?.trim()
    || recommended?.description?.trim()
    || null

  const primaryLabel = decision.response_type === 'binary' ? 'Freigeben' : 'Entscheiden'
  const secondaryLabel = decision.response_type === 'binary' ? 'Andere Optionen' : 'Optionen ansehen'

  const teaser = useMemo(() => rationaleTeaser(decision, affected), [decision, affected])

  /**
   * A rejected recommendation is not a quiet footnote — it means the last
   * proposal was turned down and the decision came back. It gets the alert
   * treatment, same as an expired deadline.
   */
  const rejected = decision.status === 'awaiting_clarification'
  const settled = !isOpenDecisionStatus(decision.status)
  const state = escalated
    ? ((decision.escalation_level ?? 0) >= 3 ? 'Frist abgelaufen' : 'An Owner eskaliert')
    : rejected
      ? 'Empfehlung abgelehnt · wartet auf neue Aufbereitung'
      : decision.queued
        ? 'Tagro hält sie zurück'
        : null

  return (
    <article
      className={`dcb-row dcb-path-${position}${completing ? ' is-done' : ''}`}
      aria-busy={completing}
    >
      {/* The running path. The node is an outline and nothing else — a ring on
          a line, no fill, no glyph, while the decision waits. Answering runs a
          five-second ring around it and writes a check inside, then it fades. */}
      <div className="dcb-path">
        <span className="dcb-path-line dcb-path-line--up" aria-hidden />
        <button
          type="button"
          className={`dcb-path-node${urgent ? ' is-urgent' : ''}${overdue || rejected ? ' is-overdue' : ''}`}
          onClick={() => onAction('resolve')}
          disabled={completing || !canAct || settled}
          aria-label="Als erledigt markieren"
        >
          <span className="dcb-path-tip" aria-hidden>Als erledigt markieren</span>
          <svg viewBox="0 0 28 28" fill="none" className="dcb-path-svg">
            <circle className="dcb-path-rim" cx="14" cy="14" r="11" strokeWidth="1.25" />
            <circle className="dcb-path-sweep" cx="14" cy="14" r="11" strokeWidth="1.75" />
            <path className="dcb-path-tick" d="M9.2 14.3l3.4 3.4 6.2-6.9"
              strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="dcb-path-line dcb-path-line--down" aria-hidden />
      </div>

      <span className="dcb-icon" aria-hidden>
        <TypeIcon type={decision.decision_type} />
      </span>

      <div className="dcb-head-m">
        <h3 className="dcb-title">{decision.client_title || decision.title}</h3>
        {project?.title && <p className="dcb-project">{project.title}</p>}
        {state && <p className={`dcb-state${escalated || rejected ? ' is-alert' : ''}`}>{state}</p>}
      </div>

      <div className="dcb-rec">
        <p className="dcb-rec-label">Tagro empfiehlt</p>
        {recLabel ? (
          <>
            <p className="dcb-rec-name">
              <DecisionBrandMark label={recLabel} />
              {recLabel}
            </p>
            {recWhy && <p className="dcb-rec-why">{recWhy}</p>}
          </>
        ) : (
          <p className="dcb-rec-none">
            {recWhy || 'Mehrere Optionen sind ähnlich geeignet — hier zählt dein Urteil.'}
          </p>
        )}
        {/* The grounds are always one click away, never a wall of text here. */}
        <button type="button" className="dcb-why" onClick={() => onAction('why')}>
          {teaser ? `Warum? ${teaser}` : 'Warum empfiehlt Tagro das?'}
        </button>
      </div>

      <div className="dcb-meta">
        <span className="dcb-meta-time">
          <Clock size={14} weight="regular" aria-hidden />
          {effortLabel(decision)}
        </span>

        {areas > 0 && (
          <div>
            <p className="dcb-meta-key">Wartet darauf</p>
            <p className="dcb-meta-val">{areas} {areas === 1 ? 'Aufgabe' : 'Aufgaben'}</p>
          </div>
        )}

        {due ? (
          <div>
            <p className="dcb-meta-key">Frist</p>
            <p className={`dcb-meta-val${overdue ? ' is-red' : ''}`}>{due}</p>
          </div>
        ) : (
          <div>
            <p className="dcb-meta-key">Priorität</p>
            <p className={`dcb-meta-val${urgent ? ' is-red' : ''}`}>
              {URGENCY_LABEL[decision.urgency] || 'Normal'}
            </p>
          </div>
        )}
      </div>

      <div className="dcb-actions">
        {settled ? (
          <button
            type="button"
            className="dcb-btn"
            onClick={() => onAction('details')}
          >
            Details ansehen
          </button>
        ) : (
          <>
            <button
              type="button"
              className="dcb-btn dcb-btn--primary"
              onClick={() => onAction('resolve')}
              disabled={completing || !canAct}
              title={canAct ? undefined : 'Diese Entscheidung liegt bei jemand anderem'}
            >
              {primaryLabel}
              <ArrowRight size={14} weight="regular" className="dcb-btn-arrow" aria-hidden />
            </button>
            <button
              type="button"
              className="dcb-btn"
              onClick={() => onAction('options')}
              disabled={completing}
            >
              {secondaryLabel}
            </button>
            <button
              type="button"
              className="dcb-btn dcb-btn--ghost"
              onClick={() => onAction('details')}
              disabled={completing}
            >
              Details
            </button>
          </>
        )}
      </div>
    </article>
  )
}
