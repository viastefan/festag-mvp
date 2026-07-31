/**
 * Workspace — primary object of Festag.
 *
 * Architecture confirmation: docs/festag-architecture-confirmation.md
 * A workspace is how work happens — not who the user is.
 */

/**
 * Product Workspace Types (Tagro suggests; user confirms).
 * Belongs to the workspace, never the account.
 *
 * Maps onto legacy DB `workspaces.mode` where possible:
 *   delivery | team | agency  (repo enum today)
 * Product vocabulary expands beyond the enum via metadata until schema catches up.
 */
export const WORKSPACE_TYPES = [
  'agency',
  'startup',
  'company',
  'personal',
  'studio',
  'enterprise',
] as const

export type WorkspaceType = (typeof WORKSPACE_TYPES)[number]

export const WORKSPACE_TYPE_LABELS: Record<WorkspaceType, string> = {
  agency: 'Agentur',
  startup: 'Startup',
  company: 'Unternehmen',
  personal: 'Persönlich',
  studio: 'Studio',
  enterprise: 'Enterprise',
}

/** Path inside workspaces.metadata */
export const WORKSPACE_TYPE_META_KEY = 'workspace_type' as const

/**
 * Legacy portal modes still on `workspaces.mode`.
 * Soft-map product Workspace Type → existing enum until migration.
 */
export type LegacyWorkspaceMode = 'delivery' | 'team' | 'agency'

export function workspaceTypeToLegacyMode(type: WorkspaceType): LegacyWorkspaceMode {
  switch (type) {
    case 'agency':
    case 'studio':
      return 'agency'
    case 'enterprise':
    case 'company':
    case 'startup':
      return 'team'
    case 'personal':
    default:
      return 'delivery'
  }
}

export function legacyModeToWorkspaceType(mode: string | null | undefined): WorkspaceType {
  if (mode === 'agency') return 'agency'
  if (mode === 'team') return 'company'
  return 'personal'
}

export function readWorkspaceType(metadata: unknown, legacyMode?: string | null): WorkspaceType | null {
  if (metadata && typeof metadata === 'object') {
    const raw = (metadata as Record<string, unknown>)[WORKSPACE_TYPE_META_KEY]
    if (typeof raw === 'string' && (WORKSPACE_TYPES as readonly string[]).includes(raw)) {
      return raw as WorkspaceType
    }
  }
  if (legacyMode) return legacyModeToWorkspaceType(legacyMode)
  return null
}

export function workspaceTypePatch(
  existingMeta: Record<string, unknown> | null | undefined,
  type: WorkspaceType,
  opts?: { suggestedByTagro?: boolean; confirmed?: boolean },
): Record<string, unknown> {
  return {
    ...(existingMeta ?? {}),
    [WORKSPACE_TYPE_META_KEY]: type,
    workspace_type_meta: {
      suggestedByTagro: opts?.suggestedByTagro ?? true,
      confirmed: opts?.confirmed ?? false,
      updatedAt: new Date().toISOString(),
    },
  }
}

/**
 * Suggest Workspace Type from Tagro understanding / natural language.
 */
export function suggestWorkspaceType(input: {
  companyType?: string | null
  industry?: string | null
  role?: string | null
  context?: string | null
}): { type: WorkspaceType; confidence: number } {
  const blob = [
    input.companyType,
    input.industry,
    input.role,
    input.context,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (/agenc|agentur|clients?|kunden/.test(blob)) {
    return { type: 'agency', confidence: 0.85 }
  }
  if (/studio|design studio|creative/.test(blob)) {
    return { type: 'studio', confidence: 0.8 }
  }
  if (/enterprise|konzern|corporation/.test(blob)) {
    return { type: 'enterprise', confidence: 0.8 }
  }
  if (/saas|startup|founder|funding/.test(blob)) {
    return { type: 'startup', confidence: 0.85 }
  }
  if (/company|gmbh|firma|internal product|product team/.test(blob)) {
    return { type: 'company', confidence: 0.75 }
  }
  if (/freelance|solo|personal|allein/.test(blob)) {
    return { type: 'personal', confidence: 0.7 }
  }
  return { type: 'personal', confidence: 0.4 }
}

/** Optional Focus Areas — soft prefs for Tagro; never role classification. Skip always. */
export const FOCUS_AREA_IDS = [
  'development',
  'design',
  'product',
  'marketing',
  'operations',
  'finance',
  'sales',
  'strategy',
  'legal',
  'support',
  'research',
] as const

export type FocusAreaId = (typeof FOCUS_AREA_IDS)[number]

export const FOCUS_AREA_LABELS: Record<FocusAreaId, string> = {
  development: 'Entwicklung',
  design: 'Design',
  product: 'Produkt',
  marketing: 'Marketing',
  operations: 'Operations',
  finance: 'Finanzen',
  sales: 'Vertrieb',
  strategy: 'Strategie',
  legal: 'Recht',
  support: 'Support',
  research: 'Forschung',
}

/** Soft one-liners — never role classification. */
export const FOCUS_AREA_DESCRIPTIONS: Record<FocusAreaId, string> = {
  development: 'Code, Reviews und Delivery.',
  design: 'Interfaces, Prototypen und Systeme.',
  product: 'Roadmap, Scope und Prioritäten.',
  marketing: 'Kampagnen, Content und Wachstum.',
  operations: 'Abläufe, Qualität und Übergaben.',
  finance: 'Budget, Rechnungen und Zahlen.',
  sales: 'Pipeline, Angebote und Kunden.',
  strategy: 'Richtung, Entscheidungen und Fokus.',
  legal: 'Verträge, Compliance und Freigaben.',
  support: 'Anfragen, Feedback und Hilfe.',
  research: 'Insights, Tests und Lernen.',
}

export const FOCUS_AREAS_META_KEY = 'focus_areas' as const

export function readFocusAreas(metadata: unknown): FocusAreaId[] {
  if (!metadata || typeof metadata !== 'object') return []
  const raw = (metadata as Record<string, unknown>)[FOCUS_AREAS_META_KEY]
  if (!Array.isArray(raw)) return []
  return raw.filter((id): id is FocusAreaId =>
    typeof id === 'string' && (FOCUS_AREA_IDS as readonly string[]).includes(id),
  )
}

export function focusAreasPatch(
  existingMeta: Record<string, unknown> | null | undefined,
  areas: FocusAreaId[],
): Record<string, unknown> {
  return {
    ...(existingMeta ?? {}),
    [FOCUS_AREAS_META_KEY]: areas,
    focus_areas_meta: {
      updatedAt: new Date().toISOString(),
      source: 'onboarding',
    },
  }
}
