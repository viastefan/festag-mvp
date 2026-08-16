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

  const impact = useMemo(() => {
    const raw = decision.client_summary?.trim() || decision.description?.trim()
    if (!raw || raw.length > 52) return null
    return raw
  }, [decision.client_summary, decision.description])

  const state = escalated
    ? ((decision.escalation_level ?? 0) >= 3 ? 'Frist abgelaufen' : 'An Owner eskaliert')
    : decision.status === 'awaiting_clarification'
      ? 'Weitere Informationen benötigt'
      : decision.queued
        ? 'Tagro hält sie zurück'
        : null

  return (
    <article
      className={`dcb-row dcb-path-${position}${completing ? ' is-done' : ''}`}
      aria-busy={completing}
    >
      {/* The running path: line segments above/below, node in the middle. */}
      <div className="dcb-path" aria-hidden>
        <span className="dcb-path-line dcb-path-line--up" />
        <span className={`dcb-path-node${urgent ? ' is-urgent' : ''}${overdue ? ' is-overdue' : ''}`}>
          <svg className="dcb-path-check" viewBox="0 0 24 24" fill="none">
            <circle className="dcb-path-ring" cx="12" cy="12" r="10" strokeWidth="2" />
            <path className="dcb-path-tick" d="M7.5 12.4l3.1 3.1 6-6.4" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="dcb-path-line dcb-path-line--down" />
      </div>

      <span className="dcb-icon" aria-hidden>
        <TypeIcon type={decision.decision_type} />
      </span>

      <div className="dcb-head-m">
        <h3 className="dcb-title">{decision.client_title || decision.title}</h3>
        {project?.title && <p className="dcb-project">{project.title}</p>}
        {state && <p className={`dcb-state${escalated ? ' is-red' : ''}`}>{state}</p>}
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

        {areas > 0 ? (
          <div>
            <p className="dcb-meta-key">Betroffene Bereiche</p>
            <p className="dcb-meta-val">{areas}</p>
          </div>
        ) : impact ? (
          <div>
            <p className="dcb-meta-key">Auswirkung</p>
            <p className="dcb-meta-val">{impact}</p>
          </div>
        ) : null}

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
      </div>
    </article>
  )
}
