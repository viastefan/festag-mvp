/**
 * Übersetzt ein Risiko in die Form, die der mobile Flow zeigt.
 *
 * Zwei Quellen, eine Form:
 *   • `mobileRiskFromRisk` — das echte Risk-Objekt inklusive Belegen.
 *   • `buildMobileRisk`    — Notfallpfad aus einem blockierten Task, solange
 *                            die Risk-Intelligence-Migration noch nicht läuft.
 *
 * Alles hier ist aus vorhandenen Daten abgeleitet — keine Platzhalter.
 */

import type { MobileRisk, RiskLevel, RiskMeasure } from '@/components/dashboard/RiskFlowMobile'
import { delayLabel } from '@/lib/risks/present'
import type { Risk, RiskSignal } from '@/lib/risks/types'

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

/* ── Aus dem echten Risk-Objekt ─────────────────────────────────────────── */

/** critical/high → hoch, medium → mittel, low → niedrig. */
function levelFromImpact(impact: Risk['impact']): RiskLevel {
  if (impact === 'critical' || impact === 'high') return 'high'
  if (impact === 'low') return 'low'
  return 'mid'
}

function levelFromProbability(p: number | null | undefined): RiskLevel {
  const value = typeof p === 'number' ? p : 0.5
  if (value < 0.4) return 'low'
  if (value < 0.7) return 'mid'
  return 'high'
}

/** Der Chip über der Überschrift bleibt ein Wort — der Satz steht im Sheet. */
function recommendationWord(severity: Risk['severity']): string {
  if (severity === 'critical' || severity === 'high') return 'Absichern'
  if (severity === 'low') return 'Beobachten'
  return 'Prüfen'
}

function measureFromSeverity(severity: Risk['severity']): RiskMeasure {
  return severity === 'low' ? 'accept' : 'mitigate'
}

/**
 * Die Zeilen im Bottom Sheet sind die tatsächlichen Belege des Risikos —
 * genau die Signale, aus denen Festag es abgeleitet hat. Fehlen sie, bleibt
 * die Begründung aus dem Risiko selbst.
 */
function reasonsFrom(risk: Risk, signals: RiskSignal[]): string[] {
  const evidence = signals.map(s => s.label).slice(0, 4)
  const consequence = delayLabel(risk.potential_delay_days)

  const lines = [...evidence]
  if (consequence) lines.push(`Mögliche Auswirkung: ${consequence}`)
  if (risk.recommendation_reason) lines.push(risk.recommendation_reason)
  else if (risk.recommendation) lines.push(risk.recommendation)

  return lines.length ? lines : ['Festag beobachtet dieses Risiko.']
}

export function mobileRiskFromRisk(risk: Risk, signals: RiskSignal[] = []): MobileRisk {
  return {
    id: risk.id,
    projectId: risk.project_id,
    title: risk.title,
    description: risk.description || risk.client_summary || risk.title,
    recommendation: recommendationWord(risk.severity),
    reasons: reasonsFrom(risk, signals),
    suggestedImpact: levelFromImpact(risk.impact),
    suggestedProbability: levelFromProbability(risk.probability),
    suggestedMeasure: measureFromSeverity(risk.severity),
  }
}
