// ─────────────────────────────────────────────────────────────────────────────
// Deterministic severity.
//
// The model may estimate probability and impact — it never picks severity.
// Severity is computed here from probability + impact + time sensitivity +
// how much of the project hangs off the risk, so the same inputs always give
// the same answer and we can explain every step of it.
// ─────────────────────────────────────────────────────────────────────────────

import type { RiskLevel } from '@/lib/risks/types'

export type SeverityInput = {
  /** 0..1. Defaults to 0.5 when unknown. */
  probability?: number | null
  impact: RiskLevel
  /** Days until the deadline the risk threatens. Negative = already passed. */
  daysUntilDeadline?: number | null
  /** How many tasks/decisions/milestones depend on this. */
  dependentCount?: number | null
}

export type SeverityResult = {
  severity: RiskLevel
  /** 0..100 — internal, used for ordering. Not shown as a percentage. */
  score: number
  /** Plain-language reasons the score landed where it did. */
  factors: string[]
}

const IMPACT_SCORE: Record<RiskLevel, number> = {
  low: 25,
  medium: 50,
  high: 75,
  critical: 95,
}

const IMPACT_LABEL: Record<RiskLevel, string> = {
  low: 'gering',
  medium: 'mittel',
  high: 'hoch',
  critical: 'kritisch',
}

export function computeSeverity(input: SeverityInput): SeverityResult {
  const probability = clamp01(typeof input.probability === 'number' ? input.probability : 0.5)
  const impact = input.impact
  const factors: string[] = []

  // Impact sets the ceiling, probability scales it. A high-impact risk that
  // is unlikely still matters more than a certain but harmless one.
  let score = IMPACT_SCORE[impact] * (0.5 + 0.5 * probability)
  factors.push(`Auswirkung ${IMPACT_LABEL[impact]}, Wahrscheinlichkeit ${Math.round(probability * 100)}%`)

  const days = input.daysUntilDeadline
  if (typeof days === 'number') {
    if (days < 0) {
      score += 15
      factors.push('Der betroffene Termin ist bereits überschritten')
    } else if (days <= 3) {
      score += 12
      factors.push('Weniger als drei Tage bis zum betroffenen Termin')
    } else if (days <= 7) {
      score += 8
      factors.push('Weniger als eine Woche bis zum betroffenen Termin')
    } else if (days <= 14) {
      score += 4
      factors.push('Der betroffene Termin liegt in unter zwei Wochen')
    }
  }

  const dependents = Math.max(0, input.dependentCount ?? 0)
  if (dependents > 0) {
    const bonus = Math.min(dependents, 4) * 3
    score += bonus
    factors.push(
      dependents === 1
        ? 'Eine weitere Aufgabe hängt davon ab'
        : `${dependents} weitere Vorgänge hängen davon ab`,
    )
  }

  score = Math.round(Math.min(100, Math.max(0, score)))

  const severity: RiskLevel =
    score >= 80 ? 'critical'
    : score >= 60 ? 'high'
    : score >= 38 ? 'medium'
    : 'low'

  return { severity, score, factors }
}

export const SEVERITY_RANK: Record<RiskLevel, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

/** Highest severity first, then most recent signal. */
export function compareRiskSeverity(
  a: { severity: RiskLevel; last_signal_at?: string | null; updated_at?: string },
  b: { severity: RiskLevel; last_signal_at?: string | null; updated_at?: string },
): number {
  const rank = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
  if (rank !== 0) return rank
  const ta = new Date(a.last_signal_at || a.updated_at || 0).getTime()
  const tb = new Date(b.last_signal_at || b.updated_at || 0).getTime()
  return tb - ta
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0.5
  return Math.min(1, Math.max(0, n))
}
