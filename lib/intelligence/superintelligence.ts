/**
 * Tagro Superintelligence — Operating Intelligence System (SSOT).
 *
 * Doc: docs/festag-tagro-superintelligence.md
 * Rule: .cursor/rules/festag-tagro-superintelligence.mdc
 *
 * Six independent layers + Superintelligence coordinator above them.
 * No overlap. Every feature must name exactly one owning layer.
 */

export const TAGRO_INTELLIGENCE_LAYERS = [
  'workspace',
  'project',
  'communication',
  'production',
  'business',
  'knowledge',
] as const

export type TagroIntelligenceLayer = (typeof TAGRO_INTELLIGENCE_LAYERS)[number]

/** @deprecated Prefer TagroIntelligenceLayer — kept for production module imports. */
export type TagroSuperintelligencePillar = TagroIntelligenceLayer

export const TAGRO_INTELLIGENCE_LAYER_LABELS: Record<TagroIntelligenceLayer, string> = {
  workspace: 'Workspace Intelligence',
  project: 'Project Intelligence',
  communication: 'Communication Intelligence',
  production: 'Production Intelligence',
  business: 'Business Intelligence',
  knowledge: 'Knowledge Intelligence',
}

/** @deprecated Prefer TAGRO_INTELLIGENCE_LAYER_LABELS */
export const TAGRO_SUPERINTELLIGENCE_LABELS = TAGRO_INTELLIGENCE_LAYER_LABELS

/** @deprecated Prefer TAGRO_INTELLIGENCE_LAYERS — same membership, historical name */
export const TAGRO_SUPERINTELLIGENCE_PILLARS = TAGRO_INTELLIGENCE_LAYERS

export type TagroIntelligenceLayerMeta = {
  id: TagroIntelligenceLayer
  label: string
  goal: string
  owns: string[]
}

export const TAGRO_INTELLIGENCE_LAYER_META: TagroIntelligenceLayerMeta[] = [
  {
    id: 'workspace',
    label: 'Workspace Intelligence',
    goal: 'Create the right workspace automatically.',
    owns: [
      'users',
      'permissions',
      'teams',
      'workspaces',
      'roles',
      'navigation',
      'modules',
      'invitations',
      'workspace evolution',
    ],
  },
  {
    id: 'project',
    label: 'Project Intelligence',
    goal: 'Understand why projects exist and where they are going.',
    owns: [
      'requirements',
      'ideas',
      'architecture',
      'roadmaps',
      'milestones',
      'dependencies',
      'risks',
      'decisions',
      'project history',
    ],
  },
  {
    id: 'communication',
    label: 'Communication Intelligence',
    goal: 'Interpretation so every participant understands the same information in their language.',
    owns: [
      'languages',
      'context',
      'tone',
      'stakeholders',
      'technical language',
      'business language',
      'client language',
    ],
  },
  {
    id: 'production',
    label: 'Production Intelligence',
    goal: 'Continuously optimize digital production collaboration — never replace developers or AI.',
    owns: [
      'development',
      'AI usage',
      'infrastructure',
      'delivery',
      'costs',
      'deployments',
      'automation',
      'code',
      'reviews',
      'quality',
      'hosting',
      'budgets',
    ],
  },
  {
    id: 'business',
    label: 'Business Intelligence',
    goal: 'Help companies build sustainable businesses.',
    owns: [
      'revenue',
      'invoices',
      'margins',
      'subscriptions',
      'customers',
      'forecasts',
      'capacity',
      'growth',
    ],
  },
  {
    id: 'knowledge',
    label: 'Knowledge Intelligence',
    goal: 'Nothing important is ever forgotten.',
    owns: [
      'architecture',
      'documentation',
      'decisions',
      'database',
      'API structure',
      'business rules',
      'vision',
      'history',
    ],
  },
]

/**
 * Superintelligence coordinates layers — it is not a seventh overlapping owner.
 */
export type TagroSuperintelligenceRole = 'coordinator'

export const TAGRO_SUPERINTELLIGENCE = {
  role: 'coordinator' as TagroSuperintelligenceRole,
  summary:
    'Coordinates intelligence layers and relationships between them. Never replaces a layer. Never Auto Mode.',
} as const

/** Insight envelope for any layer that surfaces intelligence to humans. */
export type TagroIntelligenceInsight = {
  layer: TagroIntelligenceLayer
  question: string
  reason: string
  confidence: number
  recommendation: string
  potential_impact: string
}

/**
 * Feature ownership gate — returns null when the proposal has no clear owner.
 * Agents and reviews should refuse features that fail this check.
 */
export function resolveIntelligenceOwner(
  candidate: string | null | undefined,
): TagroIntelligenceLayer | null {
  if (!candidate) return null
  const key = candidate.trim().toLowerCase().replace(/\s+/g, '_')
  const aliases: Record<string, TagroIntelligenceLayer> = {
    workspace: 'workspace',
    workspace_intelligence: 'workspace',
    project: 'project',
    project_intelligence: 'project',
    communication: 'communication',
    communication_intelligence: 'communication',
    production: 'production',
    production_intelligence: 'production',
    business: 'business',
    business_intelligence: 'business',
    knowledge: 'knowledge',
    knowledge_intelligence: 'knowledge',
  }
  return aliases[key] ?? null
}

export function assertIntelligenceOwner(
  candidate: string | null | undefined,
): TagroIntelligenceLayer {
  const owner = resolveIntelligenceOwner(candidate)
  if (!owner) {
    throw new Error(
      'Tagro Superintelligence: feature has no clear intelligence-layer owner. Do not build it.',
    )
  }
  return owner
}
