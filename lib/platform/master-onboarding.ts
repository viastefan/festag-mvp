/**
 * Master Auth → Onboarding flow (canvas SSOT).
 * Identity (login/register) → Intent → Clarify? → Connect → Preparing → Dashboard
 */

import type { WorkspaceType } from '@/lib/platform/workspace'
import type { IntegrationId } from '@/lib/platform/integrations'
import { INTEGRATION_CATALOG } from '@/lib/platform/integrations'

export const MASTER_BUILD_STEPS = ['intent', 'clarify', 'connect'] as const
export type MasterBuildStep = (typeof MASTER_BUILD_STEPS)[number]

/** Progress beads — auth is separate; preparing is /preparing. */
export const MASTER_FLOW_DOTS = [
  { id: 'intent' as const, label: 'Ziel' },
  { id: 'clarify' as const, label: 'Passt das?' },
  { id: 'connect' as const, label: 'Quellen' },
  { id: 'preparing' as const, label: 'Prepare' },
]

export const GOAL_EXAMPLES = [
  'Ich entwickle Websites für Kunden.',
  'Ich suche einen Freelancer für mein Startup.',
  'Ich organisiere Kundenprojekte zentral.',
  'Ich arbeite allein an einer SaaS.',
  'Wir sind eine Agentur mit acht Mitarbeitern.',
  'Ich suche einen Entwickler für mein Projekt.',
  'Ich möchte GitHub und Supabase anbinden.',
  'Ich leite ein Produktteam.',
  'Ich brauche klare Statusberichte für Kunden.',
  'Ich baue meine erste App.',
] as const

export const CLARIFY_OPTIONS = ['Developer', 'Agentur', 'Startup', 'Unternehmen'] as const
export type ClarifyOption = (typeof CLARIFY_OPTIONS)[number]

export const CLARIFY_HEADER: Record<ClarifyOption, { lead: string; muted: string }> = {
  Developer: {
    lead: 'Selbst entwickeln.',
    muted: 'Execution Panel zuerst — nah am Code.',
  },
  Agentur: {
    lead: 'Für Kunden liefern.',
    muted: 'Delivery zuerst — ruhige Statusberichte.',
  },
  Startup: {
    lead: 'Produkt-Team führen.',
    muted: 'Tempo mit Klarheit — ohne PM-Overhead.',
  },
  Unternehmen: {
    lead: 'Mehrere Streams steuern.',
    muted: 'Überblick zuerst — ein Workspace-Graph.',
  },
}

/** Connect step — idle + per-source headers (short, like Clarify). */
export const CONNECT_HEADER_IDLE = {
  lead: 'Quellen verbinden.',
  muted: 'Was nutzt du schon?',
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

export function connectHeaderFor(
  connected: Iterable<string>,
  sources: Array<{ id: string; name: string }>,
): { lead: string; muted: string } {
  const ids = [...connected]
  if (ids.length === 0) return { ...CONNECT_HEADER_IDLE }

  const byId = new Map(sources.map((s) => [s.id, s.name]))
  if (ids.length === 1) {
    const id = ids[0] as IntegrationId
    const known = CONNECT_HEADERS[id]
    if (known) return known
    const name = byId.get(id) || id
    return { lead: `${name} anbinden.`, muted: 'Im Workspace verfügbar.' }
  }

  const names = ids.map((id) => byId.get(id) || id)
  if (names.length === 2) {
    return {
      lead: `${names[0]} und ${names[1]}.`,
      muted: 'Weitere ergänzt du später.',
    }
  }
  return {
    lead: `${names.length} Quellen verbunden.`,
    muted: 'Weitere ergänzt du später.',
  }
}

/** Preparing lyrics — matches master canvas PreparingStage. */
export const MASTER_PREP_LINES = [
  'Blueprint anwenden…',
  'Module einrichten…',
  'Navigation anpassen…',
  'Empfehlungen aufbauen…',
  'Gleich soweit…',
] as const

export const INTENT_MIN_CHARS = 8
export const INTENT_SETTLE_MS = 1100

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

/** Map Tagro blueprint display names → catalog ids (best-effort). */
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
  if (raw === 'ziel' || raw === 'kontext' || raw === 'context' || raw === 'intent') return 'intent'
  if (raw === 'passt' || raw === 'clarify' || raw === 'typ' || raw === 'type' || raw === 'workspace_type') {
    return 'clarify'
  }
  if (
    raw === 'quellen' ||
    raw === 'verbinden' ||
    raw === 'connect' ||
    raw === 'integrations' ||
    raw === 'fokus' ||
    raw === 'focus'
  ) {
    return 'connect'
  }
  if ((MASTER_BUILD_STEPS as readonly string[]).includes(raw)) return raw as MasterBuildStep
  /* Legacy name step → start at intent */
  if (raw === 'name' || raw === 'profil' || raw === 'profile' || raw === 'about') return 'intent'
  return null
}
