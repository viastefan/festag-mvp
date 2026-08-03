/**
 * Master Auth → Onboarding flow (canvas SSOT).
 * Profile → Username → Connect → Preparing → Dashboard
 * Workspace creation happens after onboarding (/create-workspace).
 */

import type { WorkspaceType } from '@/lib/platform/workspace'
import type { IntegrationId } from '@/lib/platform/integrations'
import { INTEGRATION_CATALOG } from '@/lib/platform/integrations'

export const MASTER_BUILD_STEPS = ['profile', 'username', 'connect'] as const
export type MasterBuildStep = (typeof MASTER_BUILD_STEPS)[number]

/** Progress beads — preparing is /preparing after Connect. */
export const MASTER_FLOW_DOTS = [
  { id: 'profile' as const, label: 'Profil' },
  { id: 'username' as const, label: 'Benutzername' },
  { id: 'connect' as const, label: 'Quellen' },
]

export const USERNAME_HEADER = {
  lead: 'Benutzername wählen.',
  muted:
    'Dein Benutzername ist deine eindeutige Identität auf Festag. Andere können dich damit einladen und erwähnen.',
} as const

export const USERNAME_EXAMPLES = ['stefan', 'alex', 'sam', 'jordan'] as const

export const USERNAME_FOOT =
  'Du kannst den Benutzernamen später jederzeit ändern.' as const

export const USERNAME_MIN_CHARS = 2

export const NAME_EXAMPLES = [
  'Stefan Dirnberger',
  'Alex Müller',
  'Sam Rivera',
  'Jordan Lee',
] as const

/** Profile card H1 — calm, fits --mob-content-max on mobile + desktop. */
export const PROFILE_HEADER = {
  lead: 'Schön, dass du da bist.',
  muted: 'Name genügt. Bild und ein kurzer Satz optional.',
} as const

/**
 * Rotating context examples — Festag top customers (founders, agencies, startups).
 * Calm sentences Tagro can learn from; field auto-grows as you write.
 */
export const PROFILE_POSITION_EXAMPLES = [
  'Ich bin Gründer und will meine Developer hier anbinden — AI-Verbrauch und Effizienz sichtbar machen.',
  'Wir sind eine Agentur und brauchen einen ruhigen Überblick über alle Kundenprojekte.',
  'Als Startup-Founder will ich Delivery, Budget und Entscheidungen an einem Ort halten.',
  'Ich leite Product und will, dass Client und Developer dieselbe Lage sehen — ohne Status-Theater.',
  'Wir bauen Software für Kunden und wollen, dass nichts Wichtiges untergeht.',
] as const

/** Optional longer context — same spine as profile examples. */
export const CONTEXT_EXAMPLES = PROFILE_POSITION_EXAMPLES

/** @deprecated Prefer PROFILE_POSITION_EXAMPLES on the profile card. */
export const POSITION_EXAMPLES = PROFILE_POSITION_EXAMPLES

/** Max chars for optional profile context (facts / Tagro seed). */
export const PROFILE_CONTEXT_MAX_CHARS = 280

export const WORKSPACE_OPTIONS = ['Developer', 'Agentur', 'Startup', 'Unternehmen'] as const
export type WorkspaceOption = (typeof WORKSPACE_OPTIONS)[number]

/** @deprecated Use WORKSPACE_OPTIONS */
export const CLARIFY_OPTIONS = WORKSPACE_OPTIONS
/** @deprecated Use WorkspaceOption */
export type ClarifyOption = WorkspaceOption

/** Idle H1 — before a workspace type is chosen. */
export const WORKSPACE_HEADER_IDLE = {
  lead: 'Welchen Workspace?',
  muted: 'So startet dein Betriebssystem.',
} as const

/** Card labels only — no gray support lines in the boxes. */
export const WORKSPACE_CARD: Record<WorkspaceOption, { title: string }> = {
  Developer: { title: 'Developer' },
  Agentur: { title: 'Agentur' },
  Startup: { title: 'Startup' },
  Unternehmen: { title: 'Unternehmen' },
}

/** H1 after pick — calm sentence in the hero, not inside the card. */
export const WORKSPACE_HEADER_PICKED: Record<
  WorkspaceOption,
  { lead: string; muted: string }
> = {
  Developer: {
    lead: 'Developer Workspace.',
    muted: 'Selbst entwickeln — nah am Code und Execution.',
  },
  Agentur: {
    lead: 'Agentur Workspace.',
    muted: 'Für Kunden liefern — ruhige Statusberichte.',
  },
  Startup: {
    lead: 'Startup Workspace.',
    muted: 'Produkt-Team führen — Tempo mit Klarheit.',
  },
  Unternehmen: {
    lead: 'Unternehmen Workspace.',
    muted: 'Mehrere Streams steuern — ein Workspace-Graph.',
  },
}

export const WORKSPACE_FOOT =
  'Den Workspace-Typ kannst du später in den Einstellungen ändern.' as const

/** @deprecated Prefer WORKSPACE_HEADER_PICKED */
export const WORKSPACE_HEADER: Record<WorkspaceOption, { lead: string; muted: string }> =
  WORKSPACE_HEADER_PICKED

/** @deprecated Use WORKSPACE_HEADER */
export const CLARIFY_HEADER = WORKSPACE_HEADER

export const CONNECT_HEADER_IDLE = {
  lead: 'Quellen verbinden.',
  muted: 'Was nutzt du schon? Alles optional.',
} as const

export const CONNECT_HEADERS: Partial<Record<IntegrationId, { lead: string; muted: string }>> = {
  github: { lead: 'GitHub anbinden.', muted: 'Repos und Status nah am Code.' },
  figma: { lead: 'Figma anbinden.', muted: 'Designs und Freigaben im Projekt.' },
  slack: { lead: 'Slack anbinden.', muted: 'Signale aus dem Team-Chat.' },
  linear: { lead: 'Linear anbinden.', muted: 'Issues und Sprints im Graph.' },
  notion: { lead: 'Notion anbinden.', muted: 'Docs bleiben im Workspace.' },
  google_calendar: { lead: 'Kalender anbinden.', muted: 'Termine und Deadlines sichtbar.' },
  outlook_calendar: { lead: 'Outlook anbinden.', muted: 'Kalender und Meetings sichtbar.' },
  apple_calendar: { lead: 'Kalender anbinden.', muted: 'Termine und Deadlines sichtbar.' },
  vercel: { lead: 'Vercel anbinden.', muted: 'Deploys und Previews im Blick.' },
  supabase: { lead: 'Supabase anbinden.', muted: 'Daten und Auth im Blick.' },
  jira: { lead: 'Jira anbinden.', muted: 'Tickets und Boards im Graph.' },
  discord: { lead: 'Discord anbinden.', muted: 'Community-Signale im Workspace.' },
  gitlab: { lead: 'GitLab anbinden.', muted: 'Repos und Pipelines nah am Code.' },
  microsoft_teams: { lead: 'Teams anbinden.', muted: 'Meetings und Chat im Workspace.' },
}

/** Idle when nothing connected; otherwise reflects the latest toggle. */
export function connectHeaderFor(
  connected?: Iterable<string>,
  sources?: Array<{ id: string; name: string }>,
  lastTouchedId?: string | null,
): { lead: string; muted: string } {
  const ids = [...(connected ?? [])]
  if (ids.length === 0) return { ...CONNECT_HEADER_IDLE }

  const nameById = new Map((sources ?? []).map((s) => [s.id, s.name]))
  const headerFor = (id: string) => {
    const known = CONNECT_HEADERS[id as IntegrationId]
    if (known) return { ...known }
    const name = nameById.get(id) ?? id
    return { lead: `${name} anbinden.`, muted: 'Im Workspace verfügbar.' }
  }

  if (lastTouchedId && ids.includes(lastTouchedId)) {
    return headerFor(lastTouchedId)
  }
  if (ids.length === 1) return headerFor(ids[0])
  if (ids.length === 2) {
    const a = nameById.get(ids[0]) ?? ids[0]
    const b = nameById.get(ids[1]) ?? ids[1]
    return {
      lead: `${a} und ${b}.`,
      muted: 'Weitere ergänzt du später.',
    }
  }
  return {
    lead: `${ids.length} Quellen verbunden.`,
    muted: 'Weitere ergänzt du später.',
  }
}

export const DONE_HEADER = {
  lead: 'Alles bereit.',
  muted: 'Tagro richtet deinen Workspace ein.',
} as const

/** Preparing lyrics — matches master canvas PreparingStage. */
export const MASTER_PREP_LINES = [
  'Blueprint anwenden…',
  'Module einrichten…',
  'Navigation anpassen…',
  'Empfehlungen aufbauen…',
  'Gleich soweit…',
] as const

export const NAME_MIN_CHARS = 2
export const FIELD_SETTLE_MS = 320

/** @deprecated */
export const POSITION_MIN_CHARS = 2
export const GOAL_EXAMPLES = CONTEXT_EXAMPLES
export const INTENT_MIN_CHARS = NAME_MIN_CHARS
export const INTENT_SETTLE_MS = FIELD_SETTLE_MS

export function clarifyToWorkspaceType(pick: string): WorkspaceType {
  switch (pick) {
    case 'Agentur':
      return 'agency'
    case 'Startup':
      return 'startup'
    case 'Unternehmen':
      return 'company'
    case 'Developer':
    default:
      return 'personal'
  }
}

export function blueprintTypeToWorkspaceType(workspaceType: string): WorkspaceType {
  switch (workspaceType) {
    case 'Agency':
      return 'agency'
    case 'Startup':
      return 'startup'
    case 'Company':
      return 'company'
    case 'Developer':
    default:
      return 'personal'
  }
}

const NAME_TO_ID = new Map<string, IntegrationId>(
  INTEGRATION_CATALOG.map((d) => [d.name.toLowerCase(), d.id as IntegrationId]),
)

export function integrationNameToId(name: string): IntegrationId | null {
  const key = name.trim().toLowerCase()
  if (NAME_TO_ID.has(key)) return NAME_TO_ID.get(key)!
  if (key === 'microsoft') return 'microsoft_teams'
  if (key.includes('google calendar')) return 'google_calendar'
  const fuzzy = INTEGRATION_CATALOG.find((d) => d.name.toLowerCase().includes(key) || key.includes(d.id))
  return fuzzy ? (fuzzy.id as IntegrationId) : null
}

export function normalizeMasterStep(raw: string | null): MasterBuildStep | null {
  if (!raw) return null
  if (
    raw === 'profile' ||
    raw === 'name' ||
    raw === 'profil' ||
    raw === 'about' ||
    raw === 'position' ||
    raw === 'intent' ||
    raw === 'ziel' ||
    raw === 'kontext' ||
    raw === 'context'
  ) {
    return 'profile'
  }
  if (
    raw === 'username' ||
    raw === 'benutzer' ||
    raw === 'benutzername' ||
    raw === 'handle' ||
    raw === 'user'
  ) {
    return 'username'
  }
  // Legacy workspace step → username (workspace pick left onboarding).
  if (
    raw === 'workspace' ||
    raw === 'passt' ||
    raw === 'clarify' ||
    raw === 'typ' ||
    raw === 'type' ||
    raw === 'workspace_type'
  ) {
    return 'username'
  }
  if (
    raw === 'quellen' ||
    raw === 'verbinden' ||
    raw === 'connect' ||
    raw === 'integrations' ||
    raw === 'fokus' ||
    raw === 'focus' ||
    raw === 'done' ||
    raw === 'abschluss' ||
    raw === 'ready' ||
    raw === 'bereit'
  ) {
    return 'connect'
  }
  if ((MASTER_BUILD_STEPS as readonly string[]).includes(raw)) return raw as MasterBuildStep
  return null
}
