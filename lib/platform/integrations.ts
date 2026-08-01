/**
 * Festag Integrations — Connect your workspace.
 *
 * Constitution: docs/festag-integrations-constitution.md
 * Integrations are signals that make the workspace smarter — not API settings.
 */

import type { WorkspaceUnderstanding } from '@/lib/platform/identity'

/** UI copy — never “APIs” / “OAuth” / “configure integrations”. */
export const CONNECT_WORKSPACE_HEADLINE = 'Verbinde deinen Workspace'
/** Muted continuation of the same H1 sentence (opacity-only hierarchy). */
export const CONNECT_WORKSPACE_REST =
  ' und arbeite mit den Tools, die du bereits nutzt.'
/** Calm support line under the H1 — not a second title. */
export const CONNECT_WORKSPACE_SUPPORT =
  'Verbinde Dienste, um Projekte zu synchronisieren, zu kommunizieren und deinen Workflow zu optimieren.'

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

/** Preferred onboarding showcase order — deep catalog, calm density. */
const ONBOARDING_SHOWCASE_ORDER: IntegrationId[] = [
  'github',
  'linear',
  'jira',
  'slack',
  'figma',
  'google_drive',
  'google_calendar',
  'notion',
  'dropbox',
  'discord',
  'vercel',
  'supabase',
  'stripe',
  'mailchimp',
  'hubspot',
  'microsoft_teams',
  'gitlab',
  'outlook_calendar',
  'google_analytics',
  'zoom',
]

function showcaseRank(id: IntegrationId): number {
  const i = ONBOARDING_SHOWCASE_ORDER.indexOf(id)
  return i === -1 ? 999 : i
}

/** Onboarding / first paint — show a deep catalog so the workspace feels connectable. */
export const ONBOARDING_INTEGRATION_LIMIT = 20

/** Short calm blurbs under integration names (Connect screen). */
export const INTEGRATION_BLURBS: Partial<Record<IntegrationId, string>> = {
  github: 'Repos, Commits, Pull Requests',
  gitlab: 'Repos und Pipelines',
  linear: 'Issues und Sprints',
  jira: 'Tickets und Boards',
  vercel: 'Deploys und Previews',
  supabase: 'Daten und Auth',
  figma: 'Designs und Prototypen',
  slack: 'Team-Kommunikation',
  microsoft_teams: 'Meetings und Chat',
  notion: 'Docs und Wikis',
  google_drive: 'Dateien und Freigaben',
  dropbox: 'Dateien und Sync',
  google_calendar: 'Termine und Deadlines',
  outlook_calendar: 'Kalender und Meetings',
  discord: 'Community und Voice',
  stripe: 'Zahlungen und Abos',
  hubspot: 'CRM und Pipeline',
  mailchimp: 'E-Mail und Kampagnen',
  google_analytics: 'Traffic und Conversion',
}

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
    else if (isRecommended) state = 'recommended'
    else if (!def.connectable) state = 'coming_soon'
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
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        showcaseRank(a.def.id) - showcaseRank(b.def.id) ||
        a.def.name.localeCompare(b.def.name),
    )

  const rest = ranked
    .filter((r) => !preferred.some((p) => p.def.id === r.def.id))
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        showcaseRank(a.def.id) - showcaseRank(b.def.id) ||
        a.def.name.localeCompare(b.def.name),
    )

  return [...preferred, ...rest].slice(0, limit)
}

export function integrationStateLabel(state: IntegrationState): string {
  return INTEGRATION_STATE_LABELS[state]
}

export function getIntegrationDef(id: string): IntegrationDef | undefined {
  return INTEGRATION_CATALOG.find((c) => c.id === id)
}
