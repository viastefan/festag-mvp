/**
 * Tagro Superintelligence — domain intelligence layers.
 *
 * Full Festag OS pillars (incl. Tagro brain + Experience): docs/festag-os-constitution-v1.md
 * Doc: docs/festag-tagro-superintelligence.md
 *
 * Domain layers own problems. Tagro Intelligence (pillar `tagro` in os-constitution) coordinates.
 * Prefer assertOsPillarOwner for the full eight-pillar gate.
 */

export const TAGRO_INTELLIGENCE_LAYERS = [
  'workspace',
  'project',
  'communication',
  'production',
  'business',
  'knowledge',
  'experience',
] as const

export type TagroIntelligenceLayer = (typeof TAGRO_INTELLIGENCE_LAYERS)[number]

/** @deprecated Prefer TagroIntelligenceLayer */
export type TagroSuperintelligencePillar = TagroIntelligenceLayer

export const TAGRO_INTELLIGENCE_LAYER_LABELS: Record<TagroIntelligenceLayer, string> = {
  workspace: 'Workspace Intelligence',
  project: 'Project Intelligence',
  communication: 'Communication Intelligence',
  production: 'Production Intelligence',
  business: 'Business Intelligence',
  knowledge: 'Knowledge Intelligence',
  experience: 'Experience Intelligence',
}

/** @deprecated Prefer TAGRO_INTELLIGENCE_LAYER_LABELS */
export const TAGRO_SUPERINTELLIGENCE_LABELS = TAGRO_INTELLIGENCE_LAYER_LABELS

/** @deprecated Prefer TAGRO_INTELLIGENCE_LAYERS */
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
      'structured reports',
    ],
  },
  {
    id: 'production',
    label: 'Production Intelligence',
    goal: 'Continuously optimize digital production collaboration — never replace developers or AI.',
    owns: [
      'development',
      'AI usage',
      'token intelligence',
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
      'contracts',
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
      'constitutions',
    ],
  },
  {
    id: 'experience',
    label: 'Experience Intelligence',
    goal: 'Same information, personally experienced — timing, language, density, voice. Never surveillance.',
    owns: [
      'work-style timing',
      'language preference',
      'density',
      'voice input/output',
      'audio briefings',
      'personal presentation',
    ],
  },
]

/** Tagro Intelligence pillar — coordinates domain layers (OS Layer 7). */
export type TagroSuperintelligenceRole = 'coordinator'

export const TAGRO_SUPERINTELLIGENCE = {
  role: 'coordinator' as TagroSuperintelligenceRole,
  summary:
    'Tagro Intelligence: coordinates pillars and relationships. Never replaces a pillar. Never Auto Mode.',
} as const

export type TagroIntelligenceInsight = {
  layer: TagroIntelligenceLayer
  question: string
  reason: string
  confidence: number
  recommendation: string
  potential_impact: string
}

export function resolveIntelligenceOwner(
  candidate: string | null | undefined,
): TagroIntelligenceLayer | null {
  if (!candidate) return null
  const key = candidate.trim().toLowerCase().replace(/\s+/g, '_')
  const aliases: Record<string, TagroIntelligenceLayer> = {
    workspace: 'workspace',
    workspace_intelligence: 'workspace',
    workspace_os: 'workspace',
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
    experience: 'experience',
    experience_intelligence: 'experience',
    voice: 'experience',
    voice_intelligence: 'experience',
  }
  return aliases[key] ?? null
}

export function assertIntelligenceOwner(
  candidate: string | null | undefined,
): TagroIntelligenceLayer {
  const owner = resolveIntelligenceOwner(candidate)
  if (!owner) {
    throw new Error(
      'No clear intelligence-layer owner. See docs/festag-os-constitution-v1.md — do not build.',
    )
  }
  return owner
}
