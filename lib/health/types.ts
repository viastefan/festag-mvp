/**
 * Project Health — shared types.
 *
 * Health is derived, never hand-entered. It is the weighted composition of a
 * few measured factors, and every factor carries the reason it sits where it
 * does: the constitution forbids shipping a number without its cause chain
 * (docs/festag-production-intelligence.md — "Never a meaningless number").
 *
 * The engine is internal. Nothing here is a user-facing label — the surface
 * speaks about "Projekt läuft ruhig", never about scores or efficiency points
 * (see lib/intelligence/types.ts for the same rule on the Learning Engine).
 */

/** Shared vocabulary with Delivery Pulse so one project reads the same everywhere. */
export type HealthBand = 'healthy' | 'watch' | 'risk' | 'blocked'

/**
 * The measurable dimensions of project health. Kept deliberately small: each
 * one must be computable from data Festag already owns, or it does not belong
 * here yet.
 */
export const HEALTH_FACTORS = [
  'decision_quality',
  'decision_flow',
  'delivery',
  'stability',
  'tagro_efficiency',
] as const

export type HealthFactorId = (typeof HEALTH_FACTORS)[number]

/** Internal labels — diagnostics and settings only, never customer copy. */
export const HEALTH_FACTOR_LABELS: Record<HealthFactorId, string> = {
  decision_quality: 'Entscheidungsqualität',
  decision_flow: 'Entscheidungsfluss',
  delivery: 'Lieferung',
  stability: 'Stabilität',
  tagro_efficiency: 'Tagro-Effizienz',
}

/**
 * Relative importance. A project whose decisions turn out badly is in deeper
 * trouble than one that is merely slow, so quality outweighs flow.
 */
export const HEALTH_FACTOR_WEIGHTS: Record<HealthFactorId, number> = {
  decision_quality: 1.4,
  decision_flow: 1.0,
  delivery: 1.2,
  stability: 1.3,
  tagro_efficiency: 0.6,
}

export type HealthFactor = {
  id: HealthFactorId
  /** 0–100. `null` means "not measurable yet" — excluded from the roll-up. */
  value: number | null
  weight: number
  /** Why this factor sits where it does. Mandatory, plain language. */
  why: string
  /** The raw counts behind `value`, so the number can always be traced back. */
  evidence?: Record<string, number>
}

export type ProjectHealth = {
  projectId: string
  /** 0–100, weighted over measurable factors. `null` when nothing is measurable. */
  score: number | null
  band: HealthBand
  factors: HealthFactor[]
  /** How much of the model could actually be measured, 0–100. */
  confidence: number
  /** The factor dragging hardest, if any — the honest headline cause. */
  cause: HealthFactorId | null
  computedAt: string
}

/** A change in health, with the reason it moved. Never store a delta without one. */
export type HealthDelta = {
  previous: number | null
  next: number | null
  why: string
  factorsTouched: HealthFactorId[]
  at: string
}

/**
 * Everything the engine needs, already reduced to counts. Collecting these is
 * the caller's job so the engine itself stays pure and testable.
 */
export type HealthInput = {
  projectId: string

  /** Resolved decisions with their scored outcome (lib/intelligence/scoring). */
  decisionOutcomes: Array<{ category: string; score: number }>

  /** Decisions still waiting on a human. */
  openDecisions: number
  /** Open decisions past their due date. */
  overdueDecisions: number

  /** Task counts for the delivery signal. */
  tasksTotal: number
  tasksDone: number
  /** Tasks past their due date and not done. */
  tasksOverdue: number

  /** Issue counts for the stability signal. */
  openIssues: number
  criticalIssues: number

  /** Decisions Tagro proposed, and how many were taken without rework. */
  tagroProposed: number
  tagroAcceptedClean: number
}
