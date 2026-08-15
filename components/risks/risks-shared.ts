/**
 * Gemeinsame Bausteine der Risiko-Oberfläche.
 *
 * Beschriftungen und Fassungen kommen aus lib/risks/present.ts — hier steht
 * nur, was die Liste zum Sortieren, Filtern und Anzeigen braucht.
 */

import { SEVERITY_RANK } from '@/lib/risks/severity'
import type { Risk, RiskLevel, RiskStatus } from '@/lib/risks/types'
import { RISK_OPEN_STATUSES } from '@/lib/risks/types'

export type RiskFilter = 'attention' | 'critical' | 'monitoring' | 'closed' | 'all'

export const RISK_FILTERS: { id: RiskFilter; label: string }[] = [
  { id: 'attention', label: 'Braucht Aufmerksamkeit' },
  { id: 'critical', label: 'Kritisch' },
  { id: 'monitoring', label: 'Beobachtung' },
  { id: 'closed', label: 'Erledigt' },
  { id: 'all', label: 'Alle' },
]

export function isOpenRisk(risk: Risk): boolean {
  return RISK_OPEN_STATUSES.has(risk.status)
}

export function matchesFilter(risk: Risk, filter: RiskFilter): boolean {
  switch (filter) {
    case 'attention':
      return isOpenRisk(risk)
    case 'critical':
      return isOpenRisk(risk) && (risk.severity === 'critical' || risk.severity === 'high')
    case 'monitoring':
      return risk.status === 'monitoring' || risk.status === 'accepted'
    case 'closed':
      return risk.status === 'resolved' || risk.status === 'dismissed' || risk.status === 'mitigated'
    default:
      return true
  }
}

/** Schwerstes zuerst, dann das zuletzt Bewegte. */
export function sortRisks(risks: Risk[]): Risk[] {
  return [...risks].sort((a, b) => {
    const rank = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
    if (rank !== 0) return rank
    const ta = new Date(a.last_signal_at || a.updated_at).getTime()
    const tb = new Date(b.last_signal_at || b.updated_at).getTime()
    return tb - ta
  })
}

/** Nur Kritisch bekommt Rot — sonst wäre die Liste eine Ampel. */
export function severityTone(severity: RiskLevel): 'red' | 'attn' | 'none' {
  if (severity === 'critical') return 'red'
  if (severity === 'high') return 'attn'
  return 'none'
}

export const CLOSED_STATUS_TAG: Partial<Record<RiskStatus, string>> = {
  resolved: 'Gelöst',
  mitigated: 'Abgesichert',
  dismissed: 'Verworfen',
  accepted: 'Akzeptiert',
}

export function fmtAgo(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = Date.now() - new Date(iso).getTime()
  const m = Math.round(d / 60000)
  if (m < 1) return 'gerade eben'
  if (m < 60) return `vor ${m} Min.`
  const h = Math.round(m / 60)
  if (h < 24) return `vor ${h} Std.`
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short' }).format(new Date(iso))
}

export type RiskProjectLite = { id: string; title: string }
