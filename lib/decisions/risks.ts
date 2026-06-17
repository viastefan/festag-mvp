import type { Decision, ProjectLite } from '@/components/decisions/decisions-shared'
import { fmtDueIn, isOpenDecisionStatus } from '@/components/decisions/decisions-shared'

export type DecisionRiskSeverity = 'critical' | 'high' | 'medium'

/** One actionable risk signal derived from an open decision. */
export type DecisionRiskSignal = {
  id: string
  decisionId: string
  severity: DecisionRiskSeverity
  title: string
  projectTitle?: string
  reason: string
  detail?: string
  dueLabel?: string | null
  sortScore: number
}

function dueTimestamp(d: Decision): number | null {
  const raw = d.due_at || d.due_date
  if (!raw) return null
  const t = new Date(raw).getTime()
  return Number.isNaN(t) ? null : t
}

function isOverdue(d: Decision): boolean {
  const t = dueTimestamp(d)
  return t !== null && t < Date.now()
}

/**
 * Score a single open decision into a client-facing risk signal.
 * Uses engine fields: urgency, escalation_level, due_at, decision_type,
 * reversibility, urgency_score.
 */
export function evaluateDecisionRisk(
  d: Decision,
  project?: ProjectLite | null,
): DecisionRiskSignal | null {
  if (!isOpenDecisionStatus(d.status)) return null

  const title = (d.client_title || d.title || 'Entscheidung').trim()
  const projectTitle = project?.title
  const escalation = d.escalation_level ?? 0
  const urgencyScore = typeof d.urgency_score === 'number' ? d.urgency_score : 0
  const overdue = isOverdue(d)
  const dueLabel = fmtDueIn(d.due_at || d.due_date || null)
  const base = {
    id: `risk-${d.id}`,
    decisionId: d.id,
    title,
    projectTitle,
    dueLabel,
  }

  if (escalation >= 3) {
    return {
      ...base,
      severity: 'critical',
      reason: 'Frist abgelaufen',
      detail: 'Tagro hat diese Entscheidung als überfällig markiert.',
      sortScore: 100,
    }
  }

  if (d.urgency === 'critical' && overdue) {
    return {
      ...base,
      severity: 'critical',
      reason: 'Kritisch und überfällig',
      detail: 'Ohne Freigabe blockiert der Fortschritt weiter.',
      sortScore: 98,
    }
  }

  if (escalation >= 2) {
    return {
      ...base,
      severity: 'critical',
      reason: 'An Owner eskaliert',
      detail: 'Die Entscheidung wartet auf Aufmerksamkeit auf Projektebene.',
      sortScore: 92,
    }
  }

  if (d.urgency === 'critical') {
    return {
      ...base,
      severity: 'critical',
      reason: 'Kritische Priorität',
      detail: d.client_summary || d.description || undefined,
      sortScore: 88,
    }
  }

  if (overdue) {
    return {
      ...base,
      severity: 'high',
      reason: 'Überfällig',
      detail: dueLabel ? `Fällig: ${dueLabel}` : 'Die Frist ist überschritten.',
      sortScore: 82,
    }
  }

  if (d.decision_type === 'risk_response') {
    return {
      ...base,
      severity: 'high',
      reason: 'Offenes Projektrisiko',
      detail: 'Tagro hat eine Risiko-Entscheidung vorbereitet.',
      sortScore: 78,
    }
  }

  if (d.decision_type === 'escalation') {
    return {
      ...base,
      severity: 'high',
      reason: 'Eskalation offen',
      detail: 'Erfordert eine klare Richtungsentscheidung.',
      sortScore: 76,
    }
  }

  if (d.reversibility === 'one_way_door' && (d.urgency === 'high' || urgencyScore >= 65)) {
    return {
      ...base,
      severity: 'high',
      reason: 'Schwer rückgängig',
      detail: 'Eine falsche Wahl wäre teuer — bitte bewusst entscheiden.',
      sortScore: 72,
    }
  }

  if (d.urgency === 'high') {
    return {
      ...base,
      severity: 'high',
      reason: 'Hohe Dringlichkeit',
      detail: d.client_summary || undefined,
      sortScore: 68,
    }
  }

  if (urgencyScore >= 72) {
    return {
      ...base,
      severity: 'medium',
      reason: 'Zeitdruck steigt',
      detail: `Dringlichkeits-Score ${Math.round(urgencyScore)}`,
      sortScore: 55,
    }
  }

  if (escalation >= 1) {
    return {
      ...base,
      severity: 'medium',
      reason: 'Erinnerung aktiv',
      detail: 'Die Entscheidung wurde bereits einmal hervorgehoben.',
      sortScore: 48,
    }
  }

  if (d.decision_type === 'payment' || d.decision_type === 'contract' || d.decision_type === 'legal') {
    return {
      ...base,
      severity: 'medium',
      reason: 'Compliance-relevant',
      detail: 'Rechtliche oder vertragliche Tragweite — nicht delegierbar.',
      sortScore: 42,
    }
  }

  return null
}

/** All risk signals for the current decision set, highest severity first. */
export function deriveDecisionRisks(
  decisions: Decision[],
  projects: Record<string, ProjectLite>,
): DecisionRiskSignal[] {
  const items: DecisionRiskSignal[] = []
  for (const d of decisions) {
    const project = d.project_id ? projects[d.project_id] : undefined
    const signal = evaluateDecisionRisk(d, project)
    if (signal) items.push(signal)
  }
  const severityRank: Record<DecisionRiskSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
  }
  return items.sort((a, b) => {
    const sev = severityRank[a.severity] - severityRank[b.severity]
    if (sev !== 0) return sev
    return b.sortScore - a.sortScore
  })
}

export function countDecisionRisks(
  decisions: Decision[],
  projects: Record<string, ProjectLite>,
): number {
  return deriveDecisionRisks(decisions, projects).length
}
