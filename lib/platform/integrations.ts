/**
 * Festag Integrations — Connect your workspace.
 *
 * Constitution: docs/festag-integrations-constitution.md
 * Integrations are signals that make the workspace smarter — not API settings.
 */

import type { WorkspaceUnderstanding } from '@/lib/platform/identity'

/** UI copy — never “APIs” / “OAuth” / “configure integrations”. */
export const CONNECT_WORKSPACE_HEADLINE = 'Verbinde deinen Workspace.'
export const CONNECT_WORKSPACE_SUPPORT =
  'Verbinde die Tools, die du schon nutzt. Tagro wird automatisch smarter.'

/** Only visible states on integration cards. */
export const INTEGRATION_STATES = [
  'connected',
  'available',
  'recommended',
  'coming_soon',
] as const

export type IntegrationState = (typeof INTEGRATION_STATES)[number]

export const INTEGRATION_STATE_LABELS: Record<IntegrationState, string> = {
  connected: 'Verbunden',
  available: 'Verfügbar',
  recommended: 'Empfohlen',
  coming_soon: 'Bald',
}

export const INTEGRATION_CATEGORIES = [
  'development',
  'design',
  'marketing',
  'business',
  'finance',
  'calendars',
  'communication',
] as const

export type IntegrationCategory = (typeof INTEGRATION_CATEGORIES)[number]

/**
 * Catalog IDs — grow over time. `connectable` = live connect today.
 * Others surface as Coming Soon until wired.
 */
export const INTEGRATION_CATALOG = [
  // Development
  { id: 'github', name: 'GitHub', category: 'development', connectable: true },
  { id: 'gitlab', name: 'GitLab', category: 'development', connectable: false },
  { id: 'bitbucket', name: 'Bitbucket', category: 'development', connectable: false },
  { id: 'linear', name: 'Linear', category: 'development', connectable: false },
  { id: 'jira', name: 'Jira', category: 'development', connectable: false },
  { id: 'vercel', name: 'Vercel', category: 'development', connectable: false },
  { id: 'supabase', name: 'Supabase', category: 'development', connectable: false },
  { id: 'railway', name: 'Railway', category: 'development', connectable: false },
  { id: 'cloudflare', name: 'Cloudflare', category: 'development', connectable: false },
  { id: 'firebase', name: 'Firebase', category: 'development', connectable: false },
  // Design
  { id: 'figma', name: 'Figma', category: 'design', connectable: false },
  { id: 'adobe', name: 'Adobe', category: 'design', connectable: false },
  { id: 'framer', name: 'Framer', category: 'design', connectable: false },
  // Marketing
  { id: 'google_analytics', name: 'Google Analytics', category: 'marketing', connectable: false },
  { id: 'meta', name: 'Meta', category: 'marketing', connectable: false },
  { id: 'linkedin', name: 'LinkedIn', category: 'marketing', connectable: false },
  { id: 'hubspot', name: 'HubSpot', category: 'marketing', connectable: false },
  { id: 'mailchimp', name: 'Mailchimp', category: 'marketing', connectable: false },
  // Business
  { id: 'slack', name: 'Slack', category: 'business', connectable: false },
  { id: 'microsoft_teams', name: 'Microsoft Teams', category: 'business', connectable: false },
  { id: 'google_workspace', name: 'Google Workspace', category: 'business', connectable: false },
  { id: 'notion', name: 'Notion', category: 'business', connectable: false },
  { id: 'google_drive', name: 'Google Drive', category: 'business', connectable: false },
  { id: 'dropbox', name: 'Dropbox', category: 'business', connectable: false },
  // Finance
  { id: 'stripe', name: 'Stripe', category: 'finance', connectable: false },
  { id: 'lexoffice', name: 'Lexoffice', category: 'finance', connectable: false },
  { id: 'datev', name: 'DATEV', category: 'finance', connectable: false },
  // Calendars
  { id: 'google_calendar', name: 'Google Calendar', category: 'calendars', connectable: false },
  { id: 'outlook_calendar', name: 'Outlook Calendar', category: 'calendars', connectable: false },
  { id: 'apple_calendar', name: 'Apple Calendar', category: 'calendars', connectable: false },
  // Communication
  { id: 'discord', name: 'Discord', category: 'communication', connectable: false },
  { id: 'whatsapp_business', name: 'WhatsApp Business', category: 'communication', connectable: false },
  { id: 'email', name: 'Email', category: 'communication', connectable: false },
  { id: 'zoom', name: 'Zoom', category: 'communication', connectable: false },
] as const satisfies ReadonlyArray<{
  id: string
  name: string
  category: IntegrationCategory
  connectable: boolean
}>

export type IntegrationId = (typeof INTEGRATION_CATALOG)[number]['id']

export type IntegrationDef = (typeof INTEGRATION_CATALOG)[number]

/** Onboarding / first paint — progressive disclosure cap. */
export const ONBOARDING_INTEGRATION_LIMIT = 8

/** Context pack → recommended IDs (constitution examples). */
const CONTEXT_RECOMMENDATIONS: Record<string, IntegrationId[]> = {
  agency: ['github', 'slack', 'google_drive', 'stripe'],
  startup: ['github', 'vercel', 'supabase', 'linear'],
  marketing: ['google_analytics', 'meta', 'figma', 'notion'],
  architecture_construction: ['google_drive', 'google_calendar', 'dropbox'],
  enterprise: ['microsoft_teams', 'outlook_calendar', 'jira'],
  internal_product: ['github', 'linear', 'slack', 'notion'],
  freelance: ['github', 'figma', 'stripe', 'google_calendar'],
  software: ['github', 'vercel', 'linear', 'figma'],
  design: ['figma', 'notion', 'slack', 'google_drive'],
  events: ['google_calendar', 'slack', 'google_drive', 'stripe'],
  ai: ['github', 'vercel', 'supabase', 'linear'],
}

/**
 * Recommend integration IDs from Workspace Understanding.
 * Falls back to a calm universal starter set.
 */
export function recommendIntegrationIds(
  understanding: WorkspaceUnderstanding | null | undefined,
): IntegrationId[] {
  const keys = [
    understanding?.companyType,
    understanding?.industry,
    understanding?.role,
    understanding?.recommendedDashboard,
  ]
    .filter(Boolean)
    .map((k) => String(k).toLowerCase())

  const fromUnderstanding = (understanding?.likelyIntegrations ?? [])
    .map((id) => id.toLowerCase().replace(/\s+/g, '_'))
    .filter((id): id is IntegrationId => INTEGRATION_CATALOG.some((c) => c.id === id))

  const fromPacks: IntegrationId[] = []
  for (const key of keys) {
    const pack = CONTEXT_RECOMMENDATIONS[key]
    if (pack) fromPacks.push(...pack)
  }

  // Marketing agency heuristic
  if (
    keys.some((k) => k.includes('market')) ||
    (understanding?.companyType === 'agency' && understanding?.industry === 'marketing')
  ) {
    fromPacks.push(...CONTEXT_RECOMMENDATIONS.marketing)
  }

  const merged = [...fromUnderstanding, ...fromPacks]
  if (!merged.length) {
    return ['github', 'slack', 'notion', 'figma', 'google_calendar']
  }
  return Array.from(new Set(merged))
}

export type RankedIntegration = {
  def: IntegrationDef
  state: IntegrationState
  /** Sort: connected → recommended → available → coming_soon */
  rank: number
}

/**
 * Progressive list for onboarding: recommended + connectable first, capped.
 */
export function rankIntegrationsForOnboarding(opts: {
  understanding?: WorkspaceUnderstanding | null
  connectedIds?: Iterable<string>
  limit?: number
}): RankedIntegration[] {
  const connected = new Set(
    Array.from(opts.connectedIds ?? []).map((id) => id.toLowerCase()),
  )
  const recommended = new Set(recommendIntegrationIds(opts.understanding))
  const limit = opts.limit ?? ONBOARDING_INTEGRATION_LIMIT

  const ranked: RankedIntegration[] = INTEGRATION_CATALOG.map((def) => {
    const isConnected = connected.has(def.id)
    const isRecommended = recommended.has(def.id)
    let state: IntegrationState
    if (isConnected) state = 'connected'
    else if (!def.connectable) state = 'coming_soon'
    else if (isRecommended) state = 'recommended'
    else state = 'available'

    const rank =
      state === 'connected' ? 0
      : state === 'recommended' ? 1
      : state === 'available' ? 2
      : 3

    return { def, state, rank }
  })

  // Prefer recommended + connectable; always include GitHub if connectable.
  const preferred = ranked
    .filter(
      (r) =>
        r.state === 'connected' ||
        r.state === 'recommended' ||
        (r.def.connectable && recommended.has(r.def.id)) ||
        r.def.id === 'github',
    )
    .sort((a, b) => a.rank - b.rank || a.def.name.localeCompare(b.def.name))

  const rest = ranked
    .filter((r) => !preferred.some((p) => p.def.id === r.def.id))
    .filter((r) => recommended.has(r.def.id) || r.def.connectable)
    .sort((a, b) => a.rank - b.rank || a.def.name.localeCompare(b.def.name))

  // Fill with a few calm Coming Soon from recommended packs, then truncate.
  const fill = ranked
    .filter((r) => !preferred.some((p) => p.def.id === r.def.id) && !rest.some((p) => p.def.id === r.def.id))
    .filter((r) => recommended.has(r.def.id))
    .sort((a, b) => a.def.name.localeCompare(b.def.name))

  return [...preferred, ...rest, ...fill].slice(0, limit)
}

export function integrationStateLabel(state: IntegrationState): string {
  return INTEGRATION_STATE_LABELS[state]
}

export function getIntegrationDef(id: string): IntegrationDef | undefined {
  return INTEGRATION_CATALOG.find((c) => c.id === id)
}
