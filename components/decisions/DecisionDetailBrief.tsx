'use client'

import { useMemo } from 'react'
import { Clock, WarningCircle } from '@phosphor-icons/react'
import { evaluateDecisionRisk } from '@/lib/decisions/risks'
import type { Decision, ProjectLite } from '@/components/decisions/decisions-shared'
import {
  DUE_SOURCE_LABEL,
  URGENCY_LABEL,
  fmtDueIn,
  impactLine,
  isOpenDecisionStatus,
  tagroSummaryLine,
  urgencyDotColor,
} from '@/components/decisions/decisions-shared'

type Props = {
  decision: Decision
  project: ProjectLite | null
}

export default function DecisionDetailBrief({ decision, project }: Props) {
  const isOpen = isOpenDecisionStatus(decision.status)
  const tagro = tagroSummaryLine(decision)
  const impact = impactLine(decision)
  const timeNeeded = decision.response_type === 'multi_choice' ? '2 Minuten' : '30 Sekunden'
  const dueRaw = decision.due_at || decision.due_date
  const dueLabel = fmtDueIn(dueRaw)
  const escalation = decision.escalation_level ?? 0
  const showPrioWarn = (decision.urgency === 'critical' || escalation >= 2) && isOpen
  const risk = useMemo(
    () => (isOpen ? evaluateDecisionRisk(decision, project) : null),
    [decision, project, isOpen],
  )

  return (
    <section className="dec-detail-brief" aria-label="Entscheidungskontext">
      <div className="dec-detail-brief-grid">
        <div className="dec-detail-brief-cell">
          <p className="dec-detail-brief-label">Priorität</p>
          <span
            className="dec-detail-brief-value dec-detail-brief-prio"
            style={{ ['--dec-dot-color' as string]: urgencyDotColor(decision.urgency) }}
          >
            {showPrioWarn ? (
              <WarningCircle size={13} weight="fill" className="dec-detail-brief-prio-warn" aria-hidden />
            ) : (
              <span className="dec-detail-brief-dot" aria-hidden />
            )}
            {URGENCY_LABEL[decision.urgency] || 'Normal'}
          </span>
        </div>

        <div className="dec-detail-brief-cell">
          <p className="dec-detail-brief-label">Benötigte Zeit</p>
          <p className="dec-detail-brief-value">{timeNeeded}</p>
        </div>

        {dueLabel && (
          <div className="dec-detail-brief-cell">
            <p className="dec-detail-brief-label">Frist</p>
            <p className="dec-detail-brief-value dec-detail-brief-due">
              <Clock size={13} weight="regular" aria-hidden />
              {dueLabel}
              {decision.effective_due_source && DUE_SOURCE_LABEL[decision.effective_due_source] && (
                <span className="dec-detail-brief-due-src">
                  {DUE_SOURCE_LABEL[decision.effective_due_source]}
                </span>
              )}
            </p>
          </div>
        )}

        {escalation >= 2 && isOpen && (
          <div className="dec-detail-brief-cell">
            <p className="dec-detail-brief-label">Eskalation</p>
            <p className="dec-detail-brief-value dec-detail-brief-esc">
              <WarningCircle size={13} weight="fill" aria-hidden />
              {escalation >= 3 ? 'Frist abgelaufen' : 'An Owner eskaliert'}
            </p>
          </div>
        )}
      </div>

      <div className="dec-detail-brief-copy">
        <div className="dec-detail-brief-block">
          <p className="dec-detail-brief-label">Tagro empfiehlt</p>
          <p className="dec-detail-brief-text">{tagro}</p>
        </div>
        <div className="dec-detail-brief-block">
          <p className="dec-detail-brief-label">Auswirkung</p>
          <p className="dec-detail-brief-text">{impact}</p>
        </div>
      </div>

      {risk && (
        <div className={`dec-detail-brief-risk dec-detail-brief-risk--${risk.severity}`}>
          <p className="dec-detail-brief-risk-reason">{risk.reason}</p>
          {risk.detail && <p className="dec-detail-brief-risk-detail">{risk.detail}</p>}
        </div>
      )}
    </section>
  )
}
