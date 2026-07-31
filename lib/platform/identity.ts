/**
 * Festag Identity — Workspace Profile + Account Profile.
 *
 * Constitution: docs/festag-identity-constitution.md
 * Users describe work in natural language. Tagro infers the rest.
 */

/** Canonical rotating examples for Workspace Context (calm fade — no typing). */
export const WORKSPACE_CONTEXT_EXAMPLES = [
  'Ich führe eine Software-Agentur.',
  'Ich baue ein SaaS-Startup auf.',
  'Ich arbeite vor allem an Kundenprojekten.',
  'Ich steuere interne Produktteams.',
  'Ich gestalte digitale Produkte.',
  'Ich koordiniere Marketing-Kampagnen.',
  'Ich baue KI-Produkte.',
  'Ich führe eine Software-Agentur mit acht Entwicklern.',
  'Ich bin CEO eines SaaS-Startups.',
  'Ich arbeite freiberuflich als Full-Stack-Entwickler.',
] as const

/** Field labels — never Bio / About You / Description. */
export const WORKSPACE_CONTEXT_LABEL = 'Erzähl Tagro von deiner Arbeit.'
export const WORKSPACE_CONTEXT_LABEL_ALT = 'Workspace-Kontext'
export const WORKSPACE_CONTEXT_SUPPORT =
  'Beschreibe, woran du arbeitest. Tagro personalisiert deinen Workspace automatisch.'

/** Temporary Focus Views — adapt dashboard, never rewrite permissions. */
export const FOCUS_VIEWS = [
  'executive',
  'builder',
  'designer',
  'marketing',
  'finance',
  'operations',
] as const

export type FocusView = (typeof FOCUS_VIEWS)[number]

/**
 * Silent Tagro understanding of Workspace Context.
 * Never expose raw analysis in UI — drive modules / dashboard / suggestions.
 */
export type WorkspaceUnderstanding = {
  role?: string | null
  industry?: string | null
  teamSize?: string | null
  companyType?: string | null
  projectComplexity?: string | null
  likelyIntegrations?: string[]
  recommendedModules?: string[]
  recommendedDashboard?: string | null
  confidence?: number
  /** Freeform notes for Tagro — not shown to users. */
  notes?: string | null
}

/** Long-lived workspace memory — how this workspace operates. */
export type WorkspaceProfile = {
  /** Natural-language Workspace Context from onboarding / Settings. */
  context: string
  inferred?: WorkspaceUnderstanding | null
  updatedAt?: string
  source?: 'onboarding' | 'settings' | 'observation' | string
}

/** Personal identity — who the user is (not how a workspace works). */
export type AccountProfile = {
  fullName?: string | null
  avatarUrl?: string | null
  position?: string | null
}

/** Path inside workspaces.metadata */
export const WORKSPACE_PROFILE_META_KEY = 'workspace_profile' as const

export function readWorkspaceProfile(metadata: unknown): WorkspaceProfile | null {
  if (!metadata || typeof metadata !== 'object') return null
  const raw = (metadata as Record<string, unknown>)[WORKSPACE_PROFILE_META_KEY]
  if (!raw || typeof raw !== 'object') return null
  const ctx = String((raw as WorkspaceProfile).context ?? '').trim()
  if (!ctx) return null
  return {
    context: ctx,
    inferred: (raw as WorkspaceProfile).inferred ?? null,
    updatedAt: (raw as WorkspaceProfile).updatedAt,
    source: (raw as WorkspaceProfile).source,
  }
}

export function workspaceProfilePatch(
  existingMeta: Record<string, unknown> | null | undefined,
  profile: WorkspaceProfile,
): Record<string, unknown> {
  const base = { ...(existingMeta ?? {}) }
  base[WORKSPACE_PROFILE_META_KEY] = {
    context: profile.context.trim(),
    inferred: profile.inferred ?? null,
    updatedAt: profile.updatedAt ?? new Date().toISOString(),
    source: profile.source ?? 'onboarding',
  }
  return base
}

/**
 * Lightweight heuristic inference (silent). LLM refinement can replace this
 * without changing the Workspace Profile contract.
 */
export function inferWorkspaceUnderstanding(context: string): WorkspaceUnderstanding {
  const t = context.toLowerCase()
  const likelyIntegrations: string[] = []
  const recommendedModules: string[] = []
  let companyType: string | null = null
  let role: string | null = null
  let industry: string | null = null

  if (/agenc|agentur|clients?|kunden/.test(t)) {
    companyType = 'agency'
    recommendedModules.push('clients', 'projects', 'invoices', 'reports', 'team')
    likelyIntegrations.push('github')
  }
  if (/saas|startup|founder|ceo|funding/.test(t)) {
    companyType = companyType || 'startup'
    role = /ceo/.test(t) ? 'ceo' : /founder/.test(t) ? 'founder' : role
    recommendedModules.push('roadmap', 'projects', 'analytics', 'tagro')
  }
  if (/design|figma|interface|ui\/ux|ux/.test(t)) {
    role = role || 'designer'
    recommendedModules.push('assets', 'files', 'reviews', 'projects')
  }
  if (/market(ing)?|campaign|brand|content/.test(t)) {
    role = role || 'marketing'
    industry = industry || 'marketing'
    recommendedModules.push('campaigns', 'calendar', 'content', 'analytics')
  }
  if (/product team|internal product|roadmap|scrum/.test(t)) {
    companyType = companyType || 'internal_product'
    recommendedModules.push('roadmap', 'meetings', 'reports', 'projects')
  }
  if (/freelance|freelancer|solo/.test(t)) {
    companyType = companyType || 'freelance'
    role = role || 'freelancer'
    recommendedModules.push('projects', 'clients', 'invoices')
  }
  if (/github|software|full-?stack|developer|engineer|code/.test(t)) {
    likelyIntegrations.push('github')
    industry = industry || 'software'
  }
  if (/ai |automation|machine learning|ml\b/.test(t)) {
    industry = industry || 'ai'
    recommendedModules.push('projects', 'tagro', 'analytics')
  }
  if (/architect|construction|bau/.test(t)) {
    industry = 'architecture_construction'
    recommendedModules.push('projects', 'files', 'reports')
  }
  if (/event/.test(t)) {
    industry = industry || 'events'
    recommendedModules.push('calendar', 'projects', 'clients')
  }

  const teamSize =
    /\b(\d+)\s*(developers?|devs?|people|personen|mitarbeiter)/i.exec(context)?.[1] ??
    (/eight|acht/.test(t) ? '8' : null)

  const uniq = (xs: string[]) => Array.from(new Set(xs))

  return {
    role,
    industry,
    teamSize,
    companyType,
    projectComplexity: null,
    likelyIntegrations: uniq(likelyIntegrations),
    recommendedModules: uniq(recommendedModules),
    recommendedDashboard: companyType,
    confidence: companyType || role ? 0.7 : 0.35,
    notes: null,
  }
}
