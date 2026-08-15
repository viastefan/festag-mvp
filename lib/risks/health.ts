// ─────────────────────────────────────────────────────────────────────────────
// Projektgesundheit aus offenen Risiken.
//
// Bewusst eine Einschätzung, keine Vorhersage: die Zahl sagt, wie viel
// Ungeklärtes gerade gegen den Plan arbeitet — nicht, wie ein Projekt ausgeht.
// Deshalb heißt sie in der Oberfläche „Festag-Einschätzung" und steht immer
// neben den Gründen, aus denen sie entstanden ist.
// ─────────────────────────────────────────────────────────────────────────────

import type { Risk, RiskCategory } from '@/lib/risks/types'
import { RISK_OPEN_STATUSES } from '@/lib/risks/types'

export type HealthLevel = 'good' | 'attention' | 'risk'

export type HealthDimension = 'delivery' | 'scope' | 'technical' | 'quality' | 'budget' | 'team'

export type ProjectHealth = {
  level: HealthLevel
  /** 0..100 — wie zuversichtlich der aktuelle Plan wirkt. */
  confidence: number
  dimensions: Partial<Record<HealthDimension, HealthLevel>>
  /** Die Risiken, die die Einschätzung am stärksten drücken. */
  reasons: string[]
  open_count: number
  critical_count: number
}

const DIMENSION_BY_CATEGORY: Record<RiskCategory, HealthDimension> = {
  delivery: 'delivery',
  timeline: 'delivery',
  dependency: 'delivery',
  scope: 'scope',
  budget: 'budget',
  technical: 'technical',
  quality: 'quality',
  team: 'team',
  client: 'scope',
  other: 'delivery',
}

/** Wie viel ein offenes Risiko von der Zuversicht abzieht. */
const WEIGHT: Record<Risk['severity'], number> = {
  critical: 26,
  high: 14,
  medium: 6,
  low: 2,
}

export function projectHealth(risks: Risk[]): ProjectHealth {
  const open = risks.filter(r => RISK_OPEN_STATUSES.has(r.status))

  let deduction = 0
  const dimensions: Partial<Record<HealthDimension, HealthLevel>> = {}

  for (const risk of open) {
    // Ein unwahrscheinliches Risiko wiegt weniger als ein wahrscheinliches.
    const probability = typeof risk.probability === 'number' ? risk.probability : 0.5
    deduction += WEIGHT[risk.severity] * (0.55 + 0.45 * probability)

    const dimension = DIMENSION_BY_CATEGORY[risk.category] ?? 'delivery'
    const level: HealthLevel =
      risk.severity === 'critical' || risk.severity === 'high' ? 'risk'
      : 'attention'
    // Die schlechtere Einstufung gewinnt.
    if (dimensions[dimension] !== 'risk') dimensions[dimension] = level
  }

  // 95 statt 100: auch ein ruhiges Projekt hat Unbekanntes.
  const confidence = Math.max(25, Math.min(95, Math.round(95 - deduction)))

  const criticalCount = open.filter(r => r.severity === 'critical').length
  const level: HealthLevel =
    criticalCount > 0 || confidence < 55 ? 'risk'
    : open.length > 0 || confidence < 80 ? 'attention'
    : 'good'

  const reasons = [...open]
    .sort((a, b) => WEIGHT[b.severity] - WEIGHT[a.severity])
    .slice(0, 3)
    .map(r => r.client_title || r.title)

  return {
    level,
    confidence,
    dimensions,
    reasons,
    open_count: open.length,
    critical_count: criticalCount,
  }
}

const LEVEL_LABEL: Record<HealthLevel, string> = {
  good: 'Stabil',
  attention: 'Aufmerksamkeit',
  risk: 'Unter Druck',
}

export function healthLabel(level: HealthLevel): string {
  return LEVEL_LABEL[level]
}

/**
 * Eine Zeile, die sowohl die Einschätzung als auch ihre Herkunft nennt.
 * Ohne Grund keine Zahl — sonst wirkt sie wie eine Messung.
 */
export function healthLine(health: ProjectHealth): string {
  if (health.open_count === 0) {
    return `Festag-Einschätzung: stabil · Zuversicht ${health.confidence}%`
  }
  const lead = health.reasons[0]
  return `Festag-Einschätzung: ${healthLabel(health.level).toLowerCase()} · Zuversicht ${health.confidence}%`
    + (lead ? ` — vor allem: ${lead}` : '')
}
