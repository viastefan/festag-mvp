/**
 * Project Health — the surface language.
 *
 * The engine thinks in numbers; the product speaks in sentences. This module
 * is the only place that turns one into the other, so the decision panel, the
 * project panel and the overview never describe the same project differently.
 *
 * Product law (docs/festag-production-intelligence.md, lib/intelligence/types.ts):
 *  - never present a factor as a labelled percentage ("Tagro-Effizienz: 62 %")
 *  - never show a number without the reason it moved
 *  - "not measurable" is said plainly, never rendered as 0 or as healthy
 */

import type { HealthBand, HealthFactorId, ProjectHealth } from './types'

/** One calm verdict per band. Never alarmist, never falsely reassuring. */
const BAND_HEADLINE: Record<HealthBand, string> = {
  healthy: 'Dieses Projekt läuft ruhig.',
  watch: 'Dieses Projekt läuft, braucht aber Aufmerksamkeit.',
  risk: 'Dieses Projekt gerät in Schieflage.',
  blocked: 'Dieses Projekt steht.',
}

/** Short band word for badges. */
export const BAND_WORD: Record<HealthBand, string> = {
  healthy: 'Ruhig',
  watch: 'Aufmerksam',
  risk: 'Kritisch',
  blocked: 'Gestoppt',
}

/**
 * How each factor is named to a human. Deliberately activity words, not
 * metric names — "Wie Tagro trifft" rather than "AI Efficiency Score".
 */
export const FACTOR_SURFACE: Record<HealthFactorId, string> = {
  decision_quality: 'Wie Entscheidungen ausgingen',
  decision_flow: 'Wie Entscheidungen laufen',
  delivery: 'Wie die Lieferung steht',
  stability: 'Wie stabil es läuft',
  tagro_efficiency: 'Wie oft Tagro richtig lag',
}

export type HealthSurface = {
  /** Big calm sentence. */
  headline: string
  /**
   * The single dimension dragging hardest, or null when nothing drags.
   * Carries its label so the line reads as a diagnosis ("Wie die Lieferung
   * steht — 1 von 2 Aufgaben erledigt") rather than as a bare fact.
   */
  cause: { id: HealthFactorId; label: string; why: string } | null
  /** Plain-language factor lines, measurable ones first. */
  lines: Array<{ id: HealthFactorId; label: string; why: string; state: 'good' | 'soft' | 'weak' | 'unknown' }>
  /** Set when the result rests on thin data. */
  caveat: string | null
  /** True when nothing could be measured at all. */
  measurable: boolean
}

function stateFor(value: number | null): 'good' | 'soft' | 'weak' | 'unknown' {
  if (value === null) return 'unknown'
  if (value >= 80) return 'good'
  if (value >= 55) return 'soft'
  return 'weak'
}

export function describeHealth(health: ProjectHealth | null): HealthSurface {
  if (!health || health.score === null) {
    const lines = (health?.factors ?? []).map((f) => ({
      id: f.id,
      label: FACTOR_SURFACE[f.id],
      why: f.why,
      state: stateFor(f.value),
    }))
    return {
      headline: 'Noch nicht messbar.',
      cause: null,
      lines,
      caveat:
        'Sobald Entscheidungen, Aufgaben oder Meldungen entstehen, verdichtet Festag sie hier.',
      measurable: false,
    }
  }

  const causeFactor = health.cause
    ? health.factors.find((f) => f.id === health.cause)
    : null

  // Order: what is dragging comes first, unmeasured factors last.
  const lines = [...health.factors]
    .sort((a, b) => {
      if (a.value === null && b.value !== null) return 1
      if (b.value === null && a.value !== null) return -1
      return (a.value ?? 0) - (b.value ?? 0)
    })
    .map((f) => ({
      id: f.id,
      label: FACTOR_SURFACE[f.id],
      why: f.why,
      state: stateFor(f.value),
    }))

  const cause =
    causeFactor && health.band !== 'healthy'
      ? {
          id: causeFactor.id,
          label: FACTOR_SURFACE[causeFactor.id],
          why: causeFactor.why,
        }
      : null

  return {
    headline: BAND_HEADLINE[health.band],
    cause,
    // The cause is spelled out above — repeating it verbatim in the list
    // reads as a stutter, so it is dropped from the lines.
    lines: cause ? lines.filter((l) => l.id !== cause.id) : lines,
    caveat:
      health.confidence < 60
        ? 'Beruht bisher auf wenigen Signalen — die Einschätzung wird genauer, je mehr läuft.'
        : null,
    measurable: true,
  }
}
