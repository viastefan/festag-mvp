/**
 * Tagro Intelligence — derive learning signals from real decision rows.
 *
 * Maps the shape of public.decisions onto DecisionSignals so scoring never
 * depends on anyone filling in a form.
 */

import { scoreDecisionOutcome } from './scoring'
import type { DecisionAcceptance, DecisionOutcome, DecisionSignals } from './types'

/** The subset of public.decisions the engine reads. */
export type DecisionRow = {
  id: string
  decision_type?: string | null
  recommended_option?: string | null
  selected_option?: string | null
  status?: string | null
  superseded_by?: string | null
  decided_at?: string | null
  due_at?: string | null
  decided_by?: string | null
  created_by?: string | null
  created_by_tagro?: boolean | null
}

/** Facts that live outside the decisions table. */
export type DecisionEvidence = {
  revisions?: number
  bugs?: number
  satisfaction?: number
  followUpQuestions?: number
  /** True when a developer replaced the choice during implementation. */
  developerOverride?: boolean
}

const norm = (v?: string | null) => (v || '').trim().toLowerCase()

export function deriveAcceptance(
  row: DecisionRow,
  evidence: DecisionEvidence = {},
): DecisionAcceptance {
  if (evidence.developerOverride) return 'dev_override'

  const status = norm(row.status)
  if (status === 'rejected' || status === 'declined') return 'rejected'

  const recommended = norm(row.recommended_option)
  const selected = norm(row.selected_option)

  // No recommendation to compare against — treat a made choice as accepted.
  if (!recommended) return selected ? 'accepted' : 'accepted'
  if (!selected) return 'accepted'

  return selected === recommended ? 'accepted' : 'modified'
}

/** Whole days a decision landed after its due date. Never negative-clamped. */
export function deriveDelayDays(row: DecisionRow): number | undefined {
  if (!row.decided_at || !row.due_at) return undefined
  const decided = Date.parse(row.decided_at)
  const due = Date.parse(row.due_at)
  if (Number.isNaN(decided) || Number.isNaN(due)) return undefined
  return Math.round((decided - due) / 86_400_000)
}

export function deriveSignals(
  row: DecisionRow,
  evidence: DecisionEvidence = {},
): DecisionSignals {
  return {
    acceptance: deriveAcceptance(row, evidence),
    reverted: Boolean(row.superseded_by),
    revisions: evidence.revisions ?? 0,
    bugs: evidence.bugs ?? 0,
    delayDays: deriveDelayDays(row),
    satisfaction: evidence.satisfaction,
    followUpQuestions: evidence.followUpQuestions ?? 0,
  }
}

/** Category used for importance weighting; falls back to the decision type. */
export function deriveCategory(row: DecisionRow): string {
  return norm(row.decision_type) || 'general'
}

export function scoreDecisionRow(
  row: DecisionRow,
  evidence: DecisionEvidence = {},
): DecisionOutcome & { category: string } {
  const outcome = scoreDecisionOutcome(row.id, deriveSignals(row, evidence))
  return { ...outcome, category: deriveCategory(row) }
}
