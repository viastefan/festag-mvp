'use client'

/**
 * One decision, as an editorial row.
 *
 * Reading order is the decision order: what is being decided → what Tagro
 * recommends → why → what it costs me → what I do. Metadata is never louder
 * than the decision, and the action column is a fixed width so every button on
 * the page lines up regardless of label length.
 */

import { useMemo } from 'react'
import {
  ArrowRight, Clock, CreditCard, Lock, PencilSimple, Scales,
  ShieldWarning, Signature, Sparkle, TrendUp,
} from '@phosphor-icons/react'
import type { AffectedWork } from '@/lib/decisions/affected'
import { dueLine, isOverdue } from '@/lib/decisions/center'
import DecisionBrandMark from '@/components/decisions/DecisionBrandMark'
import {
  URGENCY_LABEL,
  type DecOption,
  type Decision,
  type ProjectLite,
} from '@/components/decisions/decisions-shared'

export type RowAction = 'resolve' | 'options' | 'details'

type Props = {
  decision: Decision
  project: ProjectLite | null
  affected?: AffectedWork
  recommended: DecOption | null
  index: number
  resolving: boolean
  canAct: boolean
  onAction: (action: RowAction) => void
}

/** Quiet type marks — a hint, never a badge. */
function TypeIcon({ type }: { type?: string | null }) {
  const size = 19
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

/**
 * How long answering realistically takes. Free text and multi-select need
 * thought; a two-option approval does not.
 */
function effortLabel(d: Decision): string {
  if (d.response_type === 'free_text') return '2 Min.'
  if (d.response_type === 'multi_choice') return '1 Min.'
  return '30 Sek.'
}

export default function DecisionBoardRow({
  decision, project, affected, recommended, index, resolving, canAct, onAction,
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

  // Binary approvals read as "Freigeben"; a real choice reads as "Entscheiden".
  const primaryLabel = decision.response_type === 'binary' ? 'Freigeben' : 'Entscheiden'
  const secondaryLabel = decision.response_type === 'binary' ? 'Andere Optionen' : 'Optionen ansehen'

  /**
   * The impact sentence — only when it is short enough to read as a value in a
   * narrow column. A long summary belongs in the detail view, not wrapped over
   * four lines of metadata; priority is the honest fallback.
   */
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
    <article className={`dcb-row${resolving ? ' is-resolving' : ''}`} aria-busy={resolving}>
      <p className="dcb-num">{String(index + 1).padStart(2, '0')}</p>

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
          disabled={resolving || !canAct}
          title={canAct ? undefined : 'Diese Entscheidung liegt bei jemand anderem'}
        >
          {primaryLabel}
          <ArrowRight size={14} weight="regular" className="dcb-btn-arrow" aria-hidden />
        </button>
        <button
          type="button"
          className="dcb-btn"
          onClick={() => onAction('options')}
          disabled={resolving}
        >
          {secondaryLabel}
        </button>
        <button
          type="button"
          className="dcb-btn"
          onClick={() => onAction('details')}
          disabled={resolving}
        >
          Details
        </button>
      </div>
    </article>
  )
}
