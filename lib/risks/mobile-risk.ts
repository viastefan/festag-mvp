/**
 * Übersetzt einen blockierten Task in das Risiko, das der mobile Flow zeigt.
 * Alles hier ist aus vorhandenen Task-Daten abgeleitet — keine Platzhalter.
 */

import type { MobileRisk, RiskLevel, RiskMeasure } from '@/components/dashboard/RiskFlowMobile'

export type RiskSourceTask = {
  id: string
  title: string
  priority?: string | null
  project_id?: string | null
  updated_at?: string | null
}

const LEVEL_WORD: Record<RiskLevel, string> = { low: 'Niedrig', mid: 'Mittel', high: 'Hoch' }
const IMPACT_WORD: Record<RiskLevel, string> = { low: 'Geringe', mid: 'Mittlere', high: 'Hohe' }

/** Priorität des Tasks → Auswirkung des Risikos. */
function impactFromPriority(priority?: string | null): RiskLevel {
  switch ((priority ?? '').toLowerCase()) {
    case 'critical':
    case 'high':
      return 'high'
    case 'low':
    case 'none':
      return 'low'
    default:
      return 'mid'
  }
}

/** Je schwerer die Auswirkung, desto aktiver die empfohlene Maßnahme. */
function measureFromImpact(impact: RiskLevel): RiskMeasure {
  return impact === 'low' ? 'accept' : 'mitigate'
}

function recommendationFromImpact(impact: RiskLevel): string {
  if (impact === 'high') return 'Absichern'
  if (impact === 'low') return 'Beobachten'
  return 'Prüfen'
}

/** „seit 3 Tagen" — bleibt bewusst grob, das Datum steht ohnehin am Task. */
function blockedSince(updatedAt?: string | null): string | null {
  if (!updatedAt) return null
  const then = new Date(updatedAt).getTime()
  if (Number.isNaN(then)) return null
  const days = Math.floor((Date.now() - then) / 86_400_000)
  if (days <= 0) return 'seit heute'
  if (days === 1) return 'seit gestern'
  if (days < 7) return `seit ${days} Tagen`
  const weeks = Math.floor(days / 7)
  return weeks === 1 ? 'seit einer Woche' : `seit ${weeks} Wochen`
}

export function buildMobileRisk(task: RiskSourceTask, projectTitle?: string | null): MobileRisk {
  const impact = impactFromPriority(task.priority)
  const probability: RiskLevel = 'mid'
  const since = blockedSince(task.updated_at)

  const description = since
    ? `Diese Aufgabe ist ${since} blockiert und könnte zu Verzögerungen führen.`
    : 'Diese Aufgabe ist blockiert und könnte zu Verzögerungen führen.'

  const reasons = [
    `${IMPACT_WORD[impact]} Auswirkung auf Projektzeitplan`,
    `Wahrscheinlichkeit: ${LEVEL_WORD[probability]}`,
    projectTitle ? `Betroffenes Projekt: ${projectTitle}` : 'Projektübergreifendes Risiko',
    since ? `Blockiert ${since}` : 'Alternativen verfügbar',
    'Frühzeitige Maßnahmen empfohlen',
  ]

  return {
    id: task.id,
    projectId: task.project_id ?? null,
    title: task.title,
    description,
    recommendation: recommendationFromImpact(impact),
    reasons,
    suggestedImpact: impact,
    suggestedProbability: probability,
    suggestedMeasure: measureFromImpact(impact),
  }
}
