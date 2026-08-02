/**
 * Master Auth → Onboarding flow (canvas SSOT).
 * Identity → Profile (name + optional context) → Workspace → Connect → Preparing → Dashboard
 */

import type { WorkspaceType } from '@/lib/platform/workspace'
import type { IntegrationId } from '@/lib/platform/integrations'
import { INTEGRATION_CATALOG } from '@/lib/platform/integrations'

export const MASTER_BUILD_STEPS = ['profile', 'workspace', 'connect'] as const
export type MasterBuildStep = (typeof MASTER_BUILD_STEPS)[number]

/** Progress beads — preparing is /preparing after Connect. */
export const MASTER_FLOW_DOTS = [
  { id: 'profile' as const, label: 'Profil' },
  { id: 'workspace' as const, label: 'Workspace' },
  { id: 'connect' as const, label: 'Quellen' },
]

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

/** Calm light silhouette presets — serious, optional, no photo theater. */
export const PROFILE_AVATAR_PRESETS = [
  { id: 'bone', src: '/onboarding/avatars/soft-bone.svg', label: 'Hell' },
  { id: 'slate', src: '/onboarding/avatars/soft-slate.svg', label: 'Slate' },
  { id: 'warm', src: '/onboarding/avatars/soft-warm.svg', label: 'Warm' },
  { id: 'sage', src: '/onboarding/avatars/soft-sage.svg', label: 'Sage' },
  { id: 'mauve', src: '/onboarding/avatars/soft-mauve.svg', label: 'Mauve' },
] as const

export type ProfileAvatarPresetId = (typeof PROFILE_AVATAR_PRESETS)[number]['id']

export function isProfileAvatarPreset(url: string | null | undefined): boolean {
  if (!url) return false
  return PROFILE_AVATAR_PRESETS.some((p) => url === p.src || url.endsWith(p.src))
}

export const WORKSPACE_OPTIONS = ['Developer', 'Agentur', 'Startup', 'Unternehmen'] as const
export type WorkspaceOption = (typeof WORKSPACE_OPTIONS)[number]

/** @deprecated Use WORKSPACE_OPTIONS */
export const CLARIFY_OPTIONS = WORKSPACE_OPTIONS
/** @deprecated Use WorkspaceOption */
export type ClarifyOption = WorkspaceOption

/** Stable H1 for workspace step — never swaps on pick (avoids glassy jank). */
export const WORKSPACE_HEADER_IDLE = {
  lead: 'Welchen Workspace?',
  muted: 'So startet dein Betriebssystem.',
} as const

/** Per-option title + calm support — lives on the card, not the H1. */
export const WORKSPACE_CARD: Record<
  WorkspaceOption,
  { title: string; support: string }
> = {
  Developer: {
    title: 'Developer',
    support: 'Selbst entwickeln — nah am Code und Execution.',
  },
  Agentur: {
    title: 'Agentur',
    support: 'Für Kunden liefern — ruhige Statusberichte.',
  },
  Startup: {
    title: 'Startup',
    support: 'Produkt-Team führen — Tempo mit Klarheit.',
  },
  Unternehmen: {
    title: 'Unternehmen',
    support: 'Mehrere Streams steuern — ein Workspace-Graph.',
  },
}

/** @deprecated Prefer WORKSPACE_CARD + WORKSPACE_HEADER_IDLE */
export const WORKSPACE_HEADER: Record<WorkspaceOption, { lead: string; muted: string }> = {
  Developer: { lead: WORKSPACE_CARD.Developer.title + '.', muted: WORKSPACE_CARD.Developer.support },
  Agentur: { lead: WORKSPACE_CARD.Agentur.title + '.', muted: WORKSPACE_CARD.Agentur.support },
  Startup: { lead: WORKSPACE_CARD.Startup.title + '.', muted: WORKSPACE_CARD.Startup.support },
  Unternehmen: {
    lead: WORKSPACE_CARD.Unternehmen.title + '.',
    muted: WORKSPACE_CARD.Unternehmen.support,
  },
}

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

/** Prefer idle H1 — dynamic headers caused glassy settle jank on every toggle. */
export function connectHeaderFor(
  _connected?: Iterable<string>,
  _sources?: Array<{ id: string; name: string }>,
): { lead: string; muted: string } {
  return { ...CONNECT_HEADER_IDLE }
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
    raw === 'workspace' ||
    raw === 'passt' ||
    raw === 'clarify' ||
    raw === 'typ' ||
    raw === 'type' ||
    raw === 'workspace_type'
  ) {
    return 'workspace'
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
