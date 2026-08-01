/**
 * Tagro Invisible Operating Intelligence — Constitution II SSOT.
 *
 * Doc: docs/festag-tagro-invisible-intelligence.md
 * Rule: .cursor/rules/festag-tagro-invisible-intelligence.mdc
 *
 * Voice lives under Experience Intelligence (OS Layer 8), not under chat.
 * See docs/festag-os-constitution-v1.md.
 *
 * Philosophy + interaction contracts — not a UI implementation.
 */

import type { TagroIntelligenceLayer } from '@/lib/intelligence/superintelligence'

/** How Tagro may surface intelligence without requiring a chat. */
export const TAGRO_SURFACE_KINDS = [
  'inline_suggestion',
  'project_recommendation',
  'automatic_summary',
  'contextual_interpretation',
  'risk_warning',
  'architecture_explanation',
  'budget_forecast',
  'timeline_prediction',
  'production_insight',
  'workspace_setup',
  'module_recommendation',
  'chat',
] as const

export type TagroSurfaceKind = (typeof TAGRO_SURFACE_KINDS)[number]

/**
 * Chat is allowed but never privileged as the only or primary product surface.
 */
export const TAGRO_CHAT_IS_PRIMARY_SURFACE = false

export type TagroInteractionStep =
  | 'observe_context'
  | 'understand_relationships'
  | 'predict'
  | 'recommend'
  | 'await_human_confirm'
  | 'continue_work'

/** Festag interaction loop — AI disappears into the workflow. */
export const TAGRO_INTERACTION_LOOP: TagroInteractionStep[] = [
  'observe_context',
  'understand_relationships',
  'predict',
  'recommend',
  'await_human_confirm',
  'continue_work',
]

/** Context domains Tagro should reuse — never re-ask when already known. */
export const TAGRO_KNOWN_CONTEXT_KEYS = [
  'workspace',
  'project',
  'client',
  'developer',
  'repository',
  'deployment',
  'budget',
  'architecture',
  'conversation_history',
] as const

export type TagroKnownContextKey = (typeof TAGRO_KNOWN_CONTEXT_KEYS)[number]

export type TagroSurfaceMessage = {
  layer: TagroIntelligenceLayer
  surface: TagroSurfaceKind
  /** Why this appeared — calm, specific. */
  reason: string
  recommendation?: string
  /** Human must confirm before irreversible side effects. */
  requires_confirmation: boolean
}

/**
 * Digital twin intent — understanding the workspace, not surveillance.
 * Learning must honor adaptive_intelligence_enabled / personal-profile opt-in.
 */
export type WorkspaceDigitalTwinAspect =
  | 'who_works_together'
  | 'what_is_built'
  | 'why_decisions'
  | 'where_risks'
  | 'how_production_evolves'
  | 'which_tools_connected'
  | 'how_business_performs'

export const WORKSPACE_DIGITAL_TWIN_ASPECTS: WorkspaceDigitalTwinAspect[] = [
  'who_works_together',
  'what_is_built',
  'why_decisions',
  'where_risks',
  'how_production_evolves',
  'which_tools_connected',
  'how_business_performs',
]

export type InvisibleIntelligenceGate = {
  forcesChatUnnecessarily: boolean
  asksKnownContext: boolean
  treatsChatAsProduct: boolean
  silentIrreversibleAction: boolean
  marketingAiOnly: boolean
  strengthensInvisibleOs: boolean
}

/**
 * Constitution II gate — true only when the proposal fits invisible OS intelligence.
 */
export function passesInvisibleIntelligenceGate(
  g: InvisibleIntelligenceGate,
): boolean {
  if (g.forcesChatUnnecessarily) return false
  if (g.asksKnownContext) return false
  if (g.treatsChatAsProduct) return false
  if (g.silentIrreversibleAction) return false
  if (g.marketingAiOnly) return false
  return g.strengthensInvisibleOs
}
