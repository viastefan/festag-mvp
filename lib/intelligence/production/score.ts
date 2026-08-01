/**
 * Production Score — multi-signal model with mandatory explainability.
 * Architecture reserved — no live computation.
 * Doc: docs/festag-production-intelligence.md
 */

export const PRODUCTION_SCORE_FACTORS = [
  'ai_efficiency',
  'developer_efficiency',
  'budget_health',
  'delivery_health',
  'code_quality',
  'review_quality',
  'automation',
  'communication',
  'project_health',
  'infrastructure_health',
] as const

export type ProductionScoreFactorId = (typeof PRODUCTION_SCORE_FACTORS)[number]

export const PRODUCTION_SCORE_FACTOR_LABELS: Record<ProductionScoreFactorId, string> = {
  ai_efficiency: 'AI Efficiency',
  developer_efficiency: 'Developer Efficiency',
  budget_health: 'Budget Health',
  delivery_health: 'Delivery Health',
  code_quality: 'Code Quality',
  review_quality: 'Review Quality',
  automation: 'Automation',
  communication: 'Communication',
  project_health: 'Project Health',
  infrastructure_health: 'Infrastructure Health',
}

export type ProductionScoreFactor = {
  id: ProductionScoreFactorId
  /** 0–100 when computed; omit while reserved. */
  value?: number
  weight: number
  /** Why this factor sits where it does. */
  reason: string
}

export type ProductionScoreDelta = {
  at: string
  previous: number
  next: number
  /** Mandatory — never ship score changes without cause. */
  why: string
  factors_touched: ProductionScoreFactorId[]
}

/**
 * Reserved score document. Never display a number without factors + why.
 */
export type ProductionScore = {
  workspace_id: string
  project_id?: string | null
  /** Overall 0–100 — null while architecture_reserved. */
  score: number | null
  factors: ProductionScoreFactor[]
  recent_deltas: ProductionScoreDelta[]
  computed_at?: string | null
}

/** Default equal-ish weights for future compute — not used at runtime yet. */
export const PRODUCTION_SCORE_DEFAULT_WEIGHTS: Record<ProductionScoreFactorId, number> = {
  ai_efficiency: 0.12,
  developer_efficiency: 0.12,
  budget_health: 0.12,
  delivery_health: 0.14,
  code_quality: 0.1,
  review_quality: 0.08,
  automation: 0.08,
  communication: 0.08,
  project_health: 0.1,
  infrastructure_health: 0.06,
}

export function emptyProductionScore(
  workspaceId: string,
  projectId?: string | null,
): ProductionScore {
  return {
    workspace_id: workspaceId,
    project_id: projectId ?? null,
    score: null,
    factors: PRODUCTION_SCORE_FACTORS.map(id => ({
      id,
      weight: PRODUCTION_SCORE_DEFAULT_WEIGHTS[id],
      reason: 'Reserved — not computed in architecture phase.',
    })),
    recent_deltas: [],
    computed_at: null,
  }
}
