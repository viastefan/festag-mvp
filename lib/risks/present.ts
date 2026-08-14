// ─────────────────────────────────────────────────────────────────────────────
// One Risk object, two presentations.
//
// The client sees business consequence, the delivery side sees the technical
// evidence. Same row in `risks` — never two risk objects for the same thing.
//
// @see docs/festag-tagro-client-developer-scenarios.md
// ─────────────────────────────────────────────────────────────────────────────

import type {
  Risk,
  RiskCategory,
  RiskLevel,
  RiskResponse,
  RiskSignal,
  RiskStatus,
} from '@/lib/risks/types'

export type RiskAudience = 'client' | 'delivery'

export type PresentedRisk = {
  id: string
  title: string
  summary: string
  severity: RiskLevel
  severityLabel: string
  statusLabel: string
  categoryLabel: string
  /** "72% · Hohe Auswirkung" */
  metaLine: string
  probabilityPercent: number | null
  impactLabel: string
  /** "+2–4 Tage" — only when we actually estimated it. */
  consequenceLabel: string | null
  recommendation: string | null
  /** Evidence lines. Client audience gets the softened set. */
  evidence: string[]
  audience: RiskAudience
}

const SEVERITY_LABEL: Record<RiskLevel, string> = {
  critical: 'Kritisch',
  high: 'Hoch',
  medium: 'Mittel',
  low: 'Niedrig',
}

const IMPACT_LABEL: Record<RiskLevel, string> = {
  critical: 'Kritische Auswirkung',
  high: 'Hohe Auswirkung',
  medium: 'Mittlere Auswirkung',
  low: 'Geringe Auswirkung',
}

const STATUS_LABEL: Record<RiskStatus, string> = {
  detected: 'Erkannt',
  active: 'Aktiv',
  monitoring: 'Beobachtung',
  decision_required: 'Entscheidung nötig',
  accepted: 'Akzeptiert',
  mitigated: 'Abgesichert',
  resolved: 'Gelöst',
  dismissed: 'Verworfen',
}

const CATEGORY_LABEL: Record<RiskCategory, string> = {
  delivery: 'Lieferung',
  technical: 'Technik',
  scope: 'Scope',
  budget: 'Budget',
  quality: 'Qualität',
  dependency: 'Abhängigkeit',
  team: 'Team',
  client: 'Kunde',
  timeline: 'Zeitplan',
  other: 'Sonstiges',
}

export const RESPONSE_LABEL: Record<RiskResponse, string> = {
  accept: 'Akzeptieren',
  mitigate: 'Absichern',
  delegate: 'Delegieren',
  monitor: 'Beobachten',
}

export function severityLabel(s: RiskLevel): string { return SEVERITY_LABEL[s] }
export function statusLabel(s: RiskStatus): string { return STATUS_LABEL[s] ?? 'Erkannt' }
export function categoryLabel(c: RiskCategory): string { return CATEGORY_LABEL[c] ?? 'Sonstiges' }

/** Technical vocabulary that never reaches a client surface. */
const TECHNICAL_TERMS = [
  /\bPR\b/g,
  /\bpull request\b/gi,
  /\bCI\b/g,
  /\bbuild\b/gi,
  /\bmerge\b/gi,
  /\bbranch\b/gi,
  /\bcommit[s]?\b/gi,
  /\bdeployment\b/gi,
  /\bstack ?trace\b/gi,
  /\bmiddleware\b/gi,
  /\bendpoint\b/gi,
  /\btoken\b/gi,
]

export function containsTechnicalLanguage(text: string): boolean {
  return TECHNICAL_TERMS.some(p => { p.lastIndex = 0; return p.test(text) })
}

export function delayLabel(days: number | null | undefined): string | null {
  if (typeof days !== 'number' || !Number.isFinite(days) || days <= 0) return null
  if (days < 1) return 'unter einem Tag'
  const rounded = Math.round(days)
  // Estimates are ranges, never false precision.
  return rounded === 1 ? '+1 Tag' : `+${Math.max(1, rounded - 1)}–${rounded + 1} Tage`
}

/**
 * Evidence for a client surface: keep the observations that describe project
 * consequence, drop the ones written in delivery vocabulary. A client never
 * sees "PR seit 2 Tagen offen" — Tagro's client_summary carries the meaning.
 */
export function clientEvidence(signals: RiskSignal[]): string[] {
  return signals
    .filter(s => s.source_type !== 'github' && s.source_type !== 'ci')
    .map(s => s.label)
    .filter(label => !containsTechnicalLanguage(label))
}

export function deliveryEvidence(signals: RiskSignal[]): string[] {
  return signals.map(s => (s.occurrences > 1 ? `${s.label} (${s.occurrences}×)` : s.label))
}

export function presentRisk(
  risk: Risk,
  audience: RiskAudience,
  signals: RiskSignal[] = [],
): PresentedRisk {
  const isClient = audience === 'client'
  const probabilityPercent =
    typeof risk.probability === 'number' ? Math.round(risk.probability * 100) : null

  const title = isClient
    ? (risk.client_title || risk.title)
    : risk.title
  const summary = isClient
    ? (risk.client_summary || risk.client_title || fallbackClientSummary(risk))
    : (risk.description || risk.title)

  const metaParts: string[] = []
  if (probabilityPercent !== null) metaParts.push(`${probabilityPercent}%`)
  metaParts.push(IMPACT_LABEL[risk.impact])

  return {
    id: risk.id,
    title,
    summary,
    severity: risk.severity,
    severityLabel: SEVERITY_LABEL[risk.severity],
    statusLabel: statusLabel(risk.status),
    categoryLabel: categoryLabel(risk.category),
    metaLine: metaParts.join(' · '),
    probabilityPercent,
    impactLabel: IMPACT_LABEL[risk.impact],
    consequenceLabel: delayLabel(risk.potential_delay_days),
    recommendation: risk.recommendation ?? null,
    evidence: isClient ? clientEvidence(signals) : deliveryEvidence(signals),
    audience,
  }
}

/**
 * Last resort when Tagro hasn't written a client framing yet. Deliberately
 * vague about the technical cause and precise about the consequence.
 */
function fallbackClientSummary(risk: Risk): string {
  const delay = delayLabel(risk.potential_delay_days)
  const consequence = delay
    ? `Mögliche Auswirkung auf den Zeitplan: ${delay}.`
    : 'Der geplante Ablauf könnte betroffen sein.'
  switch (risk.category) {
    case 'scope':
      return `Der Projektumfang verändert sich. ${consequence}`
    case 'budget':
      return `Es zeichnet sich eine Budgetabweichung ab. ${consequence}`
    case 'quality':
      return `Die Qualitätssicherung braucht mehr Zeit als geplant. ${consequence}`
    case 'client':
      return `Eine Rückmeldung aus deinem Team fehlt noch. ${consequence}`
    case 'timeline':
    case 'delivery':
      return `Ein Arbeitspaket liegt hinter dem Plan. ${consequence}`
    default:
      return `Bei der Umsetzung ist etwas aufgetreten, das den Ablauf beeinflussen kann. ${consequence}`
  }
}

/**
 * What actually leaves the server for a given audience.
 *
 * A client-role user has read access to the risk row through RLS, so the
 * stripping happens here, in the API layer: the delivery-side wording, the
 * internal reasoning and the technical evidence never get serialised into a
 * client response at all.
 */
export function sanitizeRiskForAudience(risk: Risk, audience: RiskAudience): Risk {
  if (audience === 'delivery') return risk
  return {
    ...risk,
    title: risk.client_title || risk.title,
    description: risk.client_summary || fallbackClientSummary(risk),
    // Internal framing stays internal.
    recommendation_reason: null,
    response_note: null,
    resolution_note: risk.resolution_note ? 'Erledigt.' : null,
    dismiss_reason: null,
  }
}

export function sanitizeSignalsForAudience(
  signals: RiskSignal[],
  audience: RiskAudience,
): RiskSignal[] {
  if (audience === 'delivery') return signals
  return signals
    .filter(s => s.source_type !== 'github' && s.source_type !== 'ci')
    .filter(s => !containsTechnicalLanguage(s.label))
    .map(s => ({ ...s, detail: s.detail && containsTechnicalLanguage(s.detail) ? null : s.detail }))
}

/** Header line for a risk list: "3 aktiv · 1 kritisch · 2 in Beobachtung". */
export function riskSummaryLine(risks: Risk[]): string {
  const active = risks.filter(r =>
    r.status === 'detected' || r.status === 'active' || r.status === 'decision_required').length
  const critical = risks.filter(r => r.severity === 'critical' && r.status !== 'resolved').length
  const monitoring = risks.filter(r => r.status === 'monitoring').length

  const parts: string[] = [`${active} aktiv`]
  if (critical) parts.push(`${critical} kritisch`)
  if (monitoring) parts.push(`${monitoring} in Beobachtung`)
  return parts.join(' · ')
}
