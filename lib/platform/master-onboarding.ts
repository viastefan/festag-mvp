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
  'Ich entwickle Webseiten für Kunden.',
  'Ich suche einen Freelancer für mein Startup.',
  'Ich möchte Kundenprojekte organisieren.',
  'Ich arbeite alleine an einer SaaS.',
  'Wir sind eine Agentur mit 8 Mitarbeitern.',
  'Ich suche einen Entwickler für mein Projekt.',
  'Ich möchte GitHub und Supabase verbinden.',
  'Ich leite ein Produktteam.',
  'Ich brauche ein Projektmanagement für Kunden.',
  'Ich baue gerade meine erste App.',
] as const

export const CLARIFY_OPTIONS = ['Developer', 'Agentur', 'Startup', 'Unternehmen'] as const
export type ClarifyOption = (typeof CLARIFY_OPTIONS)[number]

export const CLARIFY_HEADER: Record<ClarifyOption, { lead: string; muted: string }> = {
  Developer: {
    lead: 'Du baust selbst — Execution-first.',
    muted: 'Tasks, GitHub und Status bleiben nah an deinem Code.',
  },
  Agentur: {
    lead: 'Du lieferst für Kunden — Delivery-first.',
    muted: 'Projekte, Freigaben und ruhige Statusberichte für Auftraggeber.',
  },
  Startup: {
    lead: 'Du bewegst ein Produkt-Team — Tempo mit Klarheit.',
    muted: 'Roadmap, Risiken und nächste Schritte ohne PM-Overhead.',
  },
  Unternehmen: {
    lead: 'Du steuerst mehrere Streams — Überblick zuerst.',
    muted: 'Rollen, Governance und ein gemeinsamer Workspace-Graph.',
  },
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
