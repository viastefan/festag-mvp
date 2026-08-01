/**
 * Production Intelligence — core types (architecture reserved).
 * No runtime metering or UI. Doc: docs/festag-production-intelligence.md
 */

import type { TagroSuperintelligencePillar } from './pillars'

/** Module id in workspace personalization — activate dynamically, no forced UI. */
export const PRODUCTION_INTELLIGENCE_MODULE_ID = 'production' as const

export type ProductionIntelligencePhase = 'architecture_reserved' | 'instrumented' | 'live'

/** Current product phase — bump only when implementation deliberately starts. */
export const PRODUCTION_INTELLIGENCE_PHASE: ProductionIntelligencePhase =
  'architecture_reserved'

export type ProductionSourceKind =
  | 'ai_provider'
  | 'ide_agent'
  | 'scm'
  | 'ci'
  | 'hosting'
  | 'data'
  | 'design'
  | 'tracker'
  | 'comms'
  | 'billing'
  | 'knowledge'
  | 'observability'
  | 'other'

export type ProductionSourceStatus = 'available' | 'connected' | 'coming_soon' | 'unused'

/**
 * A production system Festag may observe — never replaces the tool.
 * Reserved row shape for future `production_sources`.
 */
export type ProductionSource = {
  id: string
  workspace_id: string
  kind: ProductionSourceKind
  provider: string
  status: ProductionSourceStatus
  external_ref?: string | null
  metadata?: Record<string, unknown>
  connected_at?: string | null
}

export type ProductionRecommendationKind =
  | 'budget_risk'
  | 'model_efficiency'
  | 'workflow_waste'
  | 'delivery_slowdown'
  | 'developer_workflow'
  | 'prompt_repetition'
  | 'unused_integration'
  | 'bottleneck'
  | 'infra_health'
  | 'other'

/**
 * Tagro may recommend — human always decides.
 * Never auto-apply like Cursor Auto Mode.
 */
export type ProductionRecommendation = {
  id: string
  workspace_id: string
  project_id?: string | null
  kind: ProductionRecommendationKind
  title: string
  rationale: string
  evidence_refs?: string[]
  status: 'proposed' | 'accepted' | 'deferred' | 'dismissed'
  decided_by?: string | null
  decided_at?: string | null
}

export type ProductionIntelligenceContext = {
  pillar: Extract<TagroSuperintelligencePillar, 'production'>
  phase: ProductionIntelligencePhase
  moduleId: typeof PRODUCTION_INTELLIGENCE_MODULE_ID
}
