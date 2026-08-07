/**
 * Tagro Intelligence — Decision Outcome, Project Wisdom, Confidence.
 *
 * All scoring is derived, never hand-entered. Every function is pure so the
 * engine can be reasoned about and tested without a database.
 */

import type {
  DecisionAcceptance,
  DecisionOutcome,
  DecisionSignals,
  ProjectWisdom,
  ScoredDecision,
} from './types'

/**
 * Importance weights per decision category. A wrong security call costs far
 * more than a wrong headline style, and the roll-up must reflect that.
 */
export const CATEGORY_WEIGHTS: Record<string, number> = {
  security: 3,
  privacy: 3,
  legal: 2.75,
  database: 2.5,
  architecture: 2.5,
  payment: 2.25,
  hosting: 2,
  infrastructure: 2,
  backend: 1.75,
  integrations: 1.5,
  framework: 1.5,
  deployment: 1.5,
  ux: 1,
  frontend: 1,
  navigation: 0.75,
  branding: 0.6,
  design: 0.5,
  content: 0.5,
}
export const DEFAULT_CATEGORY_WEIGHT = 1

export function categoryWeight(category: string): number {
  return CATEGORY_WEIGHTS[category.trim().toLowerCase()] ?? DEFAULT_CATEGORY_WEIGHT
}

/** How much each measured dimension contributes to a decision's outcome. */
const PART_WEIGHTS = {
  acceptance: 0.22,
  stability: 0.2,
  quality: 0.22,
  delivery: 0.16,
  satisfaction: 0.2,
} as const

const ACCEPTANCE_SCORE: Record<DecisionAcceptance, number> = {
  accepted: 1,
  modified: 0.55,
  dev_override: 0.25,
  rejected: 0,
}

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n)

/** Highest outcome a reverted decision can reach. */
const REVERTED_CEILING = 45

/**
 * Score a single decision from its lifecycle signals.
 *
 * Dimensions without evidence are dropped rather than guessed — a decision
 * with no satisfaction survey is scored on what is actually known.
 */
export function scoreDecisionOutcome(
  decisionId: string,
  signals: DecisionSignals,
): DecisionOutcome {
  const parts: Record<string, number> = {}

  parts.acceptance = ACCEPTANCE_SCORE[signals.acceptance] ?? 0.5

  // Reverting is the strongest negative signal a decision can carry.
  const revisions = Math.max(0, signals.revisions ?? 0)
  parts.stability = signals.reverted ? 0 : clamp01(1 - revisions * 0.25)

  const bugs = Math.max(0, signals.bugs ?? 0)
  parts.quality = clamp01(1 - bugs * 0.2)

  if (signals.delayDays !== undefined) {
    // On time or early is full marks; two weeks late is a zero.
    parts.delivery = clamp01(1 - Math.max(0, signals.delayDays) / 14)
  }

  if (signals.satisfaction !== undefined) {
    parts.satisfaction = clamp01((signals.satisfaction - 1) / 4)
  }

  let weighted = 0
  let weightSum = 0
  for (const [key, value] of Object.entries(parts)) {
    const w = PART_WEIGHTS[key as keyof typeof PART_WEIGHTS] ?? 0
    weighted += value * w
    weightSum += w
  }

  let score = weightSum > 0 ? Math.round((weighted / weightSum) * 100) : 50

  // A decision that was later replaced did not hold up, however smoothly it
  // was implemented at the time. Cap it so clean execution cannot disguise a
  // wrong call — this is the signal Tagro must learn from most.
  if (signals.reverted) score = Math.min(score, REVERTED_CEILING)

  return { decisionId, score, parts, summary: explainOutcome(score, signals) }
}

function explainOutcome(score: number, signals: DecisionSignals): string {
  if (signals.reverted) return 'Später ersetzt — Tagro gewichtet ähnliche Empfehlungen neu.'
  if (signals.acceptance === 'rejected') return 'Empfehlung abgelehnt — Tagro lernt aus der Alternative.'
  if (signals.acceptance === 'dev_override') return 'Von der Entwicklung überschrieben — Muster wird angepasst.'
  if ((signals.bugs ?? 0) > 0) return 'Umgesetzt, aber mit Nacharbeit — Qualität fließt ins Lernen ein.'
  if (score >= 90) return 'Übernommen und sauber umgesetzt — Empfehlung bestätigt.'
  if (score >= 70) return 'Erfolgreich umgesetzt, mit kleineren Anpassungen.'
  return 'Umgesetzt, mit spürbarem Mehraufwand.'
}

/**
 * Roll all scored decisions of a project into one Project Wisdom Score,
 * weighted by category importance.
 */
export function scoreProjectWisdom(decisions: ScoredDecision[]): ProjectWisdom {
  if (decisions.length === 0) {
    return { score: 0, decisionCount: 0, weakest: [] }
  }

  let weighted = 0
  let weightSum = 0
  const byCategory = new Map<string, { total: number; n: number }>()

  for (const d of decisions) {
    const w = categoryWeight(d.category)
    weighted += d.score * w
    weightSum += w

    const key = d.category.trim().toLowerCase()
    const acc = byCategory.get(key) || { total: 0, n: 0 }
    acc.total += d.score
    acc.n += 1
    byCategory.set(key, acc)
  }

  const weakest = [...byCategory.entries()]
    .map(([category, v]) => ({ category, score: Math.round(v.total / v.n) }))
    .filter((c) => c.score < 75)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)

  return {
    score: Math.round(weighted / weightSum),
    decisionCount: decisions.length,
    weakest,
  }
}

/**
 * Adapt a recommendation's confidence from observed outcomes.
 *
 * Uses a prior-weighted mean so a single bad result cannot collapse a
 * well-established recommendation, while a consistent trend still moves it.
 * Recent outcomes count more than old ones.
 */
export function adaptConfidence(input: {
  /** Current confidence, 0–100. */
  prior: number
  /** Outcome scores (0–100), oldest first. */
  outcomes: number[]
  /** How many observations the prior is worth. Higher = more inertia. */
  priorWeight?: number
}): number {
  const { prior, outcomes } = input
  if (outcomes.length === 0) return Math.round(clampPct(prior))

  const priorWeight = input.priorWeight ?? 4
  let weighted = prior * priorWeight
  let weightSum = priorWeight

  outcomes.forEach((score, i) => {
    // Newest observation carries full weight, older ones decay toward 0.5.
    const age = outcomes.length - 1 - i
    const w = Math.pow(0.85, age)
    weighted += score * w
    weightSum += w
  })

  // Confidence never reaches absolute certainty — Tagro stays correctable.
  return Math.round(clampPct(weighted / weightSum, 5, 99))
}

function clampPct(n: number, min = 0, max = 100): number {
  return n < min ? min : n > max ? max : n
}

/**
 * Decide whether Tagro may auto-approve a recommendation.
 * Everything below the workspace threshold stays with the human.
 */
export function canAutoApprove(input: {
  confidence: number
  threshold: number
  category: string
  /** Categories the customer always wants to confirm personally. */
  manualCategories?: string[]
}): boolean {
  const manual = (input.manualCategories ?? ['security', 'privacy', 'legal', 'payment', 'budget'])
    .map((c) => c.trim().toLowerCase())
  if (manual.includes(input.category.trim().toLowerCase())) return false
  return input.confidence >= input.threshold
}
