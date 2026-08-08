/**
 * Tagro Intelligence — public entry point.
 *
 * Design rule for everything that leaves this module: the customer never sees
 * raw analytics. They see what happened, why, and what Tagro learned.
 */

export * from './types'
export * from './scoring'
export * from './dna'

import { scoreProjectWisdom, adaptConfidence } from './scoring'
import type { ScoredDecision } from './types'

/** Calm, user-facing view model. No metric names, no jargon. */
export type ProjectIntelligenceView = {
  /** 0–100 — shown as "Project Intelligence" only, never as a raw score name. */
  score: number
  /** One-line verdict, e.g. "Projekt läuft effizient." */
  headline: string
  /** Short, concrete facts — at most three. */
  highlights: string[]
  /** What Tagro took away from this period. */
  learned: string | null
  confidence: number
}

export function buildProjectIntelligence(input: {
  decisions: ScoredDecision[]
  autoDecidedToday?: number
  hoursSaved?: number
  openQuestions?: number
  priorConfidence?: number
}): ProjectIntelligenceView {
  const wisdom = scoreProjectWisdom(input.decisions)
  const confidence = adaptConfidence({
    prior: input.priorConfidence ?? 80,
    outcomes: input.decisions.map((d) => d.score),
  })

  const highlights: string[] = []
  if (input.autoDecidedToday) {
    highlights.push(
      `${input.autoDecidedToday} ${input.autoDecidedToday === 1 ? 'Entscheidung' : 'Entscheidungen'} automatisch getroffen`,
    )
  }
  if (input.hoursSaved) {
    highlights.push(
      `${input.hoursSaved} ${input.hoursSaved === 1 ? 'Stunde' : 'Stunden'} eingespart`,
    )
  }
  if (!input.openQuestions) {
    highlights.push('Keine zusätzlichen Rückfragen erforderlich')
  }

  return {
    score: wisdom.score,
    headline: headlineFor(wisdom.score, wisdom.decisionCount),
    highlights: highlights.slice(0, 3),
    learned: learnedFor(wisdom),
    confidence,
  }
}

function headlineFor(score: number, decisionCount: number): string {
  if (decisionCount === 0) return 'Noch keine abgeschlossenen Entscheidungen.'
  if (score >= 90) return 'Dein Projekt läuft ruhig.'
  if (score >= 75) return 'Dein Projekt läuft stabil.'
  if (score >= 60) return 'Dein Projekt läuft, mit etwas mehr Aufmerksamkeit.'
  return 'Dein Projekt braucht Aufmerksamkeit.'
}

function learnedFor(wisdom: ReturnType<typeof scoreProjectWisdom>): string | null {
  if (wisdom.decisionCount === 0) return null
  const weak = wisdom.weakest[0]
  if (!weak) return 'Tagro bestätigt die bisherigen Empfehlungen für ähnliche Projekte.'
  return `Tagro gewichtet Empfehlungen im Bereich ${weak.category} für kommende Projekte neu.`
}

export * from './derive'
