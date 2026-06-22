'use client'

import type { Decision } from '@/components/decisions/decisions-shared'
import { EXECUTIVE_DECISION_CSS } from '@/components/decisions/executive-decision-styles'

type RoutingLevel = 'auto' | 'owner' | 'executive'

function resolveRouting(d: Decision): RoutingLevel {
  const strat = d.auto_resolve_strategy
  const esc = d.escalation_level ?? 0
  if (strat === 'tagro_default' && esc < 2) return 'auto'
  if (esc >= 2 || d.authority === 'executive') return 'executive'
  return 'owner'
}

const ROUTING_LABELS: Record<RoutingLevel, string> = {
  auto: 'Auto Resolve',
  owner: 'Assigned Owner',
  executive: 'Executive Escalation',
}

const PRIORITY_LABEL: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  normal: 'Normal',
  low: 'Low',
}

type Props = {
  decisions: Decision[]
  onOpen: (id: string) => void
  onChoose?: (id: string, optionId: string) => void
}

export default function ExecutiveDecisionCards({ decisions, onOpen, onChoose }: Props) {
  const open = decisions.filter(d =>
  ['open', 'waiting_for_client', 'in_progress'].includes(d.status),
  ).slice(0, 3)

  if (!open.length) return null

  return (
    <>
      <style>{EXECUTIVE_DECISION_CSS}</style>
      <div className="edc-grid" aria-label="Offene Entscheidungen">
        {open.map(d => {
          const title = d.client_title || d.title
          const impact = d.client_summary || d.description || 'Wird nach Freigabe umgesetzt.'
          const recId = d.recommended_option
          const recOpt = d.options_json.find(o => o.id === recId) || d.options_json[0]
          const altOpt = d.options_json.find(o => o.id !== recId)
          const routing = resolveRouting(d)
          const priority = d.urgency || 'normal'

          return (
            <article
              key={d.id}
              className={`edc-card${priority === 'critical' ? ' edc-card--critical' : ''}`}
            >
              <div className="edc-top">
                <h3 className="edc-title">{title}</h3>
                <span className={`edc-priority${priority === 'high' ? ' edc-priority--high' : priority === 'normal' || priority === 'low' ? ' edc-priority--normal' : ''}`}>
                  {PRIORITY_LABEL[priority] || priority}
                </span>
              </div>
              <p className="edc-impact">
                <strong>Impact:</strong> {impact}
              </p>
              <div className="edc-routing" aria-label="Routing">
                {(['auto', 'owner', 'executive'] as RoutingLevel[]).map(level => (
                  <span key={level} className={`edc-route${routing === level ? ' on' : ''}`}>
                    {ROUTING_LABELS[level]}
                  </span>
                ))}
              </div>
              {recOpt && (
                <div className="edc-tagro">
                  <p className="edc-tagro-label">Tagro Recommendation</p>
                  <p className="edc-tagro-rec">{recOpt.label}</p>
                </div>
              )}
              <div className="edc-options">
                {recOpt && (
                  <button
                    type="button"
                    className="edc-opt edc-opt--rec"
                    onClick={() => {
                      if (onChoose) onChoose(d.id, recOpt.id)
                      else onOpen(d.id)
                    }}
                  >
                    {recOpt.label} wählen
                  </button>
                )}
                {altOpt && (
                  <button
                    type="button"
                    className="edc-opt"
                    onClick={() => onOpen(d.id)}
                  >
                    {altOpt.label} wählen
                  </button>
                )}
                {!recOpt && (
                  <button type="button" className="edc-opt" onClick={() => onOpen(d.id)}>
                    Entscheidung öffnen
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </>
  )
}
