/**
 * Festag OS Product Constitution v1.0 — platform pillars SSOT.
 *
 * Doc: docs/festag-os-constitution-v1.md
 * Rule: .cursor/rules/festag-os-constitution-v1.mdc
 *
 * Stop thinking in features. Think in pillars.
 */

export const FESTAG_OS_CONSTITUTION_VERSION = '1.0' as const

/** Eight platform pillars — not a feature catalog. */
export const FESTAG_OS_PILLARS = [
  'workspace',
  'project',
  'communication',
  'production',
  'business',
  'knowledge',
  'tagro',
  'experience',
] as const

export type FestagOsPillar = (typeof FESTAG_OS_PILLARS)[number]

export const FESTAG_OS_PILLAR_LABELS: Record<FestagOsPillar, string> = {
  workspace: 'Workspace OS',
  project: 'Project Intelligence',
  communication: 'Communication Intelligence',
  production: 'Production Intelligence',
  business: 'Business Intelligence',
  knowledge: 'Knowledge Intelligence',
  tagro: 'Tagro Intelligence',
  experience: 'Experience Intelligence',
}

export type FestagOsPillarMeta = {
  id: FestagOsPillar
  label: string
  goal: string
  /** Domain examples — not a backlog. */
  domains: string[]
}

export const FESTAG_OS_PILLAR_META: FestagOsPillarMeta[] = [
  {
    id: 'workspace',
    label: 'Workspace OS',
    goal: 'The right operating environment, automatically.',
    domains: [
      'accounts',
      'teams',
      'roles',
      'permissions',
      'workspaces',
      'modules',
      'invitations',
      'agencies',
      'companies',
    ],
  },
  {
    id: 'project',
    label: 'Project Intelligence',
    goal: 'Understand the complete project — why it exists and where it goes.',
    domains: [
      'projects',
      'decisions',
      'architecture',
      'roadmap',
      'goals',
      'risks',
      'delivery',
      'timeline',
      'dependencies',
      'automatic tasks',
    ],
  },
  {
    id: 'communication',
    label: 'Communication Intelligence',
    goal: 'User communicates; Tagro structures — same truth, right language and depth.',
    domains: [
      'interpretation',
      'reports',
      'summaries',
      'meeting notes',
      'inbox',
      'client communication',
      'developer communication',
      'auto status reports',
    ],
  },
  {
    id: 'production',
    label: 'Production Intelligence',
    goal: 'Optimize digital production collaboration across the toolchain.',
    domains: [
      'AI budget',
      'token intelligence',
      'scores',
      'forecast',
      'infrastructure',
      'GitHub',
      'Cursor',
      'Vercel',
      'Supabase',
      'CI/CD',
      'reviews',
      'hosting',
    ],
  },
  {
    id: 'business',
    label: 'Business Intelligence',
    goal: 'Sustainable business; Tagro drafts office work, humans approve.',
    domains: [
      'quotes',
      'invoices',
      'contracts',
      'documents',
      'CRM',
      'capacity',
      'revenue',
      'profit',
      'forecast',
    ],
  },
  {
    id: 'knowledge',
    label: 'Knowledge Intelligence',
    goal: 'Nothing important is ever forgotten.',
    domains: [
      'decisions history',
      'documentation',
      'APIs',
      'database',
      'constitutions',
      'architecture memory',
    ],
  },
  {
    id: 'tagro',
    label: 'Tagro Intelligence',
    goal: 'Connect every pillar — orchestrate, never replace.',
    domains: [
      'orchestration',
      'relationships',
      'digital twin',
      'cross-pillar events',
    ],
  },
  {
    id: 'experience',
    label: 'Experience Intelligence',
    goal: 'Same information, personally experienced — never surveillance.',
    domains: [
      'timing',
      'language',
      'density',
      'voice',
      'audio briefings',
      'work-style adaptation',
    ],
  },
]

/** Capabilities that cut across pillars — never become parallel products. */
export const FESTAG_OS_CROSS_CUTTING = [
  'smart_writing',
  'decision_intelligence',
  'ai_token_intelligence',
  'digital_twin',
] as const

export type FestagOsCrossCutting = (typeof FESTAG_OS_CROSS_CUTTING)[number]

export const FESTAG_OS_CROSS_CUTTING_OWNERS: Record<
  FestagOsCrossCutting,
  FestagOsPillar[]
> = {
  smart_writing: ['experience', 'communication', 'business'],
  decision_intelligence: ['project', 'knowledge'],
  ai_token_intelligence: ['production'],
  digital_twin: ['tagro'],
}

export function resolveOsPillar(
  candidate: string | null | undefined,
): FestagOsPillar | null {
  if (!candidate) return null
  const key = candidate.trim().toLowerCase().replace(/\s+/g, '_')
  const aliases: Record<string, FestagOsPillar> = {
    workspace: 'workspace',
    workspace_os: 'workspace',
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
    tagro: 'tagro',
    tagro_intelligence: 'tagro',
    superintelligence: 'tagro',
    experience: 'experience',
    experience_intelligence: 'experience',
    voice: 'experience',
    voice_intelligence: 'experience',
  }
  return aliases[key] ?? null
}

export function assertOsPillarOwner(
  candidate: string | null | undefined,
): FestagOsPillar {
  const owner = resolveOsPillar(candidate)
  if (!owner) {
    throw new Error(
      'Festag OS Constitution v1.0: no pillar owner. Do not build this as a feature.',
    )
  }
  return owner
}
