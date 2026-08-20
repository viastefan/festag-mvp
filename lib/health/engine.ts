/**
 * Project Health — the engine.
 *
 * Pure functions only: no database, no fetch, no clock beyond the timestamp
 * the caller passes in. That keeps the model reasonable about and testable,
 * and it is the same discipline lib/intelligence/scoring.ts follows.
 *
 * Rules this file enforces:
 *  - A factor that cannot be measured is `null`, never 0. Zero is a verdict;
 *    "no data" is not.
 *  - Every factor carries `why`. A number without its cause never leaves here.
 *  - Confidence reflects how much of the model was actually measurable.
 */

import { scoreProjectWisdom } from '@/lib/intelligence/scoring'
import {
  HEALTH_FACTOR_WEIGHTS,
  type HealthBand,
  type HealthDelta,
  type HealthFactor,
  type HealthFactorId,
  type HealthInput,
  type ProjectHealth,
} from './types'

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

/** Plural-safe German noun helper — the surface must not read like a template. */
const n = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`

/**
 * Has this project produced any signal at all?
 *
 * The distinction matters more than it looks: "nothing is wrong" and "nothing
 * has happened yet" must never produce the same number. An empty project that
 * scores 100 is exactly the meaningless number the constitution forbids.
 */
function hasActivity(input: HealthInput): boolean {
  return (
    input.decisionOutcomes.length > 0 ||
    input.openDecisions > 0 ||
    input.tasksTotal > 0 ||
    input.openIssues > 0
  )
}

// ── Factors ──────────────────────────────────────────────────────────────

/**
 * How well past decisions actually turned out, weighted by how much each
 * category matters. Delegates to the existing Learning Engine rather than
 * inventing a second opinion about the same decisions.
 */
function decisionQuality(input: HealthInput): HealthFactor {
  const base = {
    id: 'decision_quality' as const,
    weight: HEALTH_FACTOR_WEIGHTS.decision_quality,
  }
  if (input.decisionOutcomes.length === 0) {
    return {
      ...base,
      value: null,
      why: 'Noch keine abgeschlossene Entscheidung — Qualität ist nicht messbar.',
    }
  }

  const wisdom = scoreProjectWisdom(
    input.decisionOutcomes.map((d, i) => ({
      decisionId: String(i),
      category: d.category,
      score: d.score,
    })),
  )

  const weak = wisdom.weakest[0]
  const why = weak
    ? `${n(wisdom.decisionCount, 'Entscheidung', 'Entscheidungen')} ausgewertet; schwächster Bereich ist ${weak.category}.`
    : `${n(wisdom.decisionCount, 'Entscheidung', 'Entscheidungen')} ausgewertet, keine Auffälligkeiten.`

  return {
    ...base,
    value: clamp(wisdom.score),
    why,
    evidence: { decisions: wisdom.decisionCount },
  }
}

/**
 * Whether decisions are moving. Open decisions are normal; overdue ones are
 * the real signal, because they block the work behind them.
 */
function decisionFlow(input: HealthInput): HealthFactor {
  const base = {
    id: 'decision_flow' as const,
    weight: HEALTH_FACTOR_WEIGHTS.decision_flow,
  }
  const { openDecisions, overdueDecisions } = input

  // A project that has never had a decision tells us nothing about its flow.
  if (openDecisions === 0 && input.decisionOutcomes.length === 0) {
    return {
      ...base,
      value: null,
      why: 'Noch keine Entscheidung in diesem Projekt — der Fluss ist nicht messbar.',
    }
  }

  if (openDecisions === 0) {
    return {
      ...base,
      value: 100,
      why: 'Keine Entscheidung wartet auf eine Antwort.',
      evidence: { open: 0, overdue: 0 },
    }
  }

  // Overdue costs far more than merely open — an open decision is work in
  // progress, an overdue one is work that has stopped.
  const value = clamp(100 - openDecisions * 6 - overdueDecisions * 18)
  const why = overdueDecisions
    ? overdueDecisions === 1
      ? '1 Entscheidung ist überfällig und hält die abhängige Arbeit auf.'
      : `${overdueDecisions} Entscheidungen sind überfällig und halten die abhängige Arbeit auf.`
    : `${n(openDecisions, 'Entscheidung wartet', 'Entscheidungen warten')} auf eine Antwort.`

  return {
    ...base,
    value,
    why,
    evidence: { open: openDecisions, overdue: overdueDecisions },
  }
}

/** Delivery progress, discounted by work that has slipped past its date. */
function delivery(input: HealthInput): HealthFactor {
  const base = { id: 'delivery' as const, weight: HEALTH_FACTOR_WEIGHTS.delivery }
  if (input.tasksTotal === 0) {
    return {
      ...base,
      value: null,
      why: 'Noch keine Aufgaben geplant — Lieferung ist nicht messbar.',
    }
  }

  const donePct = (input.tasksDone / input.tasksTotal) * 100
  const overduePenalty = (input.tasksOverdue / input.tasksTotal) * 45
  const why = input.tasksOverdue
    ? `${input.tasksDone} von ${input.tasksTotal} Aufgaben erledigt, ${n(input.tasksOverdue, 'Aufgabe', 'Aufgaben')} überfällig.`
    : `${input.tasksDone} von ${input.tasksTotal} Aufgaben erledigt, nichts überfällig.`

  return {
    ...base,
    value: clamp(donePct - overduePenalty),
    why,
    evidence: {
      total: input.tasksTotal,
      done: input.tasksDone,
      overdue: input.tasksOverdue,
    },
  }
}

/** Stability — open issues, with critical ones weighted much harder. */
function stability(input: HealthInput): HealthFactor {
  const base = { id: 'stability' as const, weight: HEALTH_FACTOR_WEIGHTS.stability }
  const { openIssues, criticalIssues } = input

  // "No open issues" is only good news once the project is actually running.
  // On an untouched project it is the absence of data, not stability.
  if (openIssues === 0 && criticalIssues === 0) {
    return hasActivity(input)
      ? {
          ...base,
          value: 100,
          why: 'Kein offenes Problem gemeldet.',
          evidence: { open: 0, critical: 0 },
        }
      : {
          ...base,
          value: null,
          why: 'Noch keine Arbeit erfasst — Stabilität ist nicht messbar.',
        }
  }

  const nonCritical = Math.max(0, openIssues - criticalIssues)
  const value = clamp(100 - criticalIssues * 25 - nonCritical * 5)
  const why = criticalIssues
    ? `${n(criticalIssues, 'kritisches Problem', 'kritische Probleme')} offen.`
    : `${n(openIssues, 'offenes Problem', 'offene Probleme')}, keines kritisch.`

  return {
    ...base,
    value,
    why,
    evidence: { open: openIssues, critical: criticalIssues },
  }
}

/**
 * Tagro efficiency — the share of Tagro's proposals that were taken as-is.
 * This is the honest version of the metric: it measures whether Tagro was
 * actually useful, not how many tokens it spent.
 */
function tagroEfficiency(input: HealthInput): HealthFactor {
  const base = {
    id: 'tagro_efficiency' as const,
    weight: HEALTH_FACTOR_WEIGHTS.tagro_efficiency,
  }
  if (input.tagroProposed === 0) {
    return {
      ...base,
      value: null,
      why: 'Tagro hat in diesem Projekt noch nichts vorgeschlagen.',
    }
  }

  const share = (input.tagroAcceptedClean / input.tagroProposed) * 100
  const reworked = input.tagroProposed - input.tagroAcceptedClean
  const why = reworked
    ? `${input.tagroAcceptedClean} von ${input.tagroProposed} Vorschlägen unverändert übernommen, ${n(reworked, 'wurde', 'wurden')} angepasst.`
    : `Alle ${input.tagroProposed} Vorschläge unverändert übernommen.`

  return {
    ...base,
    value: clamp(share),
    why,
    evidence: {
      proposed: input.tagroProposed,
      acceptedClean: input.tagroAcceptedClean,
    },
  }
}

// ── Composition ──────────────────────────────────────────────────────────

export function bandFor(score: number | null): HealthBand {
  if (score === null) return 'healthy'
  if (score < 45) return 'blocked'
  if (score < 62) return 'risk'
  if (score < 80) return 'watch'
  return 'healthy'
}

/**
 * Compose project health from its factors.
 *
 * `at` is injected rather than read from the clock so the result is
 * deterministic and snapshots can be recomputed for a past point in time.
 */
export function computeProjectHealth(
  input: HealthInput,
  at: string = new Date().toISOString(),
): ProjectHealth {
  const factors: HealthFactor[] = [
    decisionQuality(input),
    decisionFlow(input),
    delivery(input),
    stability(input),
    tagroEfficiency(input),
  ]

  const measured = factors.filter(
    (f): f is HealthFactor & { value: number } => f.value !== null,
  )

  if (measured.length === 0) {
    return {
      projectId: input.projectId,
      score: null,
      band: 'healthy',
      factors,
      confidence: 0,
      cause: null,
      computedAt: at,
    }
  }

  const weightSum = measured.reduce((s, f) => s + f.weight, 0)
  const score = clamp(
    measured.reduce((s, f) => s + f.value * f.weight, 0) / weightSum,
  )

  // Confidence is how much of the model's total weight we could measure —
  // a health score built on one factor must not read as authoritative.
  const totalWeight = factors.reduce((s, f) => s + f.weight, 0)
  const confidence = clamp((weightSum / totalWeight) * 100)

  // The cause is the measurable factor pulling hardest below the result.
  const cause =
    measured
      .filter((f) => f.value < score)
      .sort((a, b) => (a.value - score) * a.weight - (b.value - score) * b.weight)[0]
      ?.id ?? null

  return {
    projectId: input.projectId,
    score,
    band: bandFor(score),
    factors,
    confidence,
    cause,
    computedAt: at,
  }
}

/**
 * Explain a change between two computations. Returns `null` when nothing moved,
 * so callers never persist an empty delta.
 */
export function diffHealth(
  previous: ProjectHealth | null,
  next: ProjectHealth,
): HealthDelta | null {
  const prevScore = previous?.score ?? null
  if (prevScore === next.score) return null

  const prevById = new Map<HealthFactorId, number | null>(
    (previous?.factors ?? []).map((f) => [f.id, f.value]),
  )
  const touched = next.factors
    .filter((f) => (prevById.get(f.id) ?? null) !== f.value)
    .map((f) => f.id)

  const lead = next.factors.find((f) => f.id === (next.cause ?? touched[0]))
  const direction =
    prevScore === null || next.score === null
      ? 'neu berechnet'
      : next.score > prevScore
        ? 'verbessert'
        : 'verschlechtert'

  return {
    previous: prevScore,
    next: next.score,
    why: lead ? `${direction}: ${lead.why}` : `${direction}.`,
    factorsTouched: touched,
    at: next.computedAt,
  }
}
