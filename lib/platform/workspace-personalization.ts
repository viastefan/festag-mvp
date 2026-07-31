/**
 * Personalized workspace from Workspace Context (Identity + Integrations).
 * Tagro prepares modules / priorities — never a hardcoded identical dashboard.
 */

import type { WorkspaceUnderstanding } from '@/lib/platform/identity'
import { recommendIntegrationIds } from '@/lib/platform/integrations'

export type WorkspaceModuleId =
  | 'projects'
  | 'clients'
  | 'team'
  | 'roadmap'
  | 'reports'
  | 'invoices'
  | 'files'
  | 'reviews'
  | 'campaigns'
  | 'calendar'
  | 'analytics'
  | 'tagro'
  | 'meetings'
  | 'funding'
  | 'assets'

export type PersonalizedWorkspace = {
  modules: WorkspaceModuleId[]
  priorities: string[]
  suggestedIntegrations: string[]
  headline: string
  subtitle: string
}

const MODULE_LABELS: Record<WorkspaceModuleId, string> = {
  projects: 'Projekte',
  clients: 'Kunden',
  team: 'Team',
  roadmap: 'Roadmap',
  reports: 'Berichte',
  invoices: 'Rechnungen',
  files: 'Dateien',
  reviews: 'Reviews',
  campaigns: 'Kampagnen',
  calendar: 'Kalender',
  analytics: 'Analytics',
  tagro: 'Tagro',
  meetings: 'Meetings',
  funding: 'Funding',
  assets: 'Assets',
}

export function moduleLabel(id: WorkspaceModuleId): string {
  return MODULE_LABELS[id]
}

/**
 * Build the first personalized workspace layout from Tagro understanding.
 */
export function personalizeWorkspace(
  understanding: WorkspaceUnderstanding | null | undefined,
  context?: string | null,
): PersonalizedWorkspace {
  const type = (understanding?.companyType || understanding?.recommendedDashboard || '').toLowerCase()
  const industry = (understanding?.industry || '').toLowerCase()
  const role = (understanding?.role || '').toLowerCase()

  let modules: WorkspaceModuleId[] = ['projects', 'tagro', 'reports']
  let priorities: string[] = [
    'Lege dein erstes Projekt an',
    'Lade jemanden ein, der mitarbeitet',
  ]
  let headline = 'Dein Workspace ist bereit'
  let subtitle = 'Tagro hat aus deinem Kontext einen ruhigen Start vorbereitet.'

  if (type === 'agency' || /agenc|agentur/.test(context || '')) {
    modules = ['clients', 'projects', 'team', 'invoices', 'reports', 'tagro']
    priorities = [
      'Füge deinen ersten Kunden hinzu',
      'Verbinde GitHub, wenn du Software lieferst',
      'Lade dein Team ein',
    ]
    headline = 'Agentur-Workspace bereit'
    subtitle = 'Kunden, Projekte und Delivery — passend zu deiner Arbeit.'
  } else if (type === 'startup' || role === 'founder' || role === 'ceo') {
    modules = ['roadmap', 'projects', 'analytics', 'funding', 'tagro']
    priorities = [
      'Halte den nächsten Meilenstein fest',
      'Verbinde Produktquellen',
      'Teile Status mit Stakeholdern',
    ]
    headline = 'Founder-Workspace bereit'
    subtitle = 'Roadmap, Projekte und Klarheit — ohne Lärm.'
  } else if (role === 'designer' || industry === 'design' || type === 'design') {
    modules = ['assets', 'files', 'reviews', 'projects', 'tagro']
    priorities = [
      'Lade deine neuesten Designs hoch',
      'Verbinde Figma, wenn du bereit bist',
      'Öffne das erste Review',
    ]
    headline = 'Design-Workspace bereit'
    subtitle = 'Assets, Reviews und Projekte — für kreative Delivery.'
  } else if (role === 'marketing' || industry === 'marketing' || type === 'marketing') {
    modules = ['campaigns', 'calendar', 'analytics', 'projects', 'tagro']
    priorities = [
      'Plane die nächste Kampagne',
      'Verbinde Analytics, wenn sinnvoll',
      'Richte den Kalender aus',
    ]
    headline = 'Marketing-Workspace bereit'
    subtitle = 'Kampagnen, Kalender und Signal — bereit zum Start.'
  } else if (type === 'internal_product') {
    modules = ['roadmap', 'meetings', 'reports', 'projects', 'tagro']
    priorities = [
      'Setze den aktuellen Roadmap-Fokus',
      'Plane den nächsten Sync',
      'Veröffentliche einen ruhigen Status',
    ]
    headline = 'Produktteam-Workspace bereit'
    subtitle = 'Roadmap, Meetings und Berichte — für interne Delivery.'
  } else if (type === 'freelance' || role === 'freelancer') {
    modules = ['projects', 'clients', 'invoices', 'calendar', 'tagro']
    priorities = [
      'Lege dein aktives Kundenprojekt an',
      'Verbinde den Kalender, wenn hilfreich',
      'Halte Status in einem Satz klar',
    ]
    headline = 'Freelance-Workspace bereit'
    subtitle = 'Projekte und Kunden — leicht, fokussiert, deins.'
  } else if (industry === 'architecture_construction' || industry === 'events') {
    modules = ['projects', 'files', 'calendar', 'reports', 'tagro']
    priorities = [
      'Öffne das aktive Projekt',
      'Hänge zentrale Dateien an',
      'Richte Deadlines im Kalender aus',
    ]
    headline = 'Projekt-Workspace bereit'
    subtitle = 'Dateien, Kalender und Fortschritt — aus deinem Kontext.'
  }

  const fromUnderstanding = (understanding?.recommendedModules || [])
    .map((m) => m.toLowerCase() as WorkspaceModuleId)
    .filter((m) => m in MODULE_LABELS)

  if (fromUnderstanding.length) {
    modules = Array.from(new Set([...fromUnderstanding, ...modules])).slice(0, 6) as WorkspaceModuleId[]
  }

  return {
    modules,
    priorities,
    suggestedIntegrations: recommendIntegrationIds(understanding),
    headline,
    subtitle,
  }
}

/** Persist under workspaces.metadata.personalization */
export const WORKSPACE_PERSONALIZATION_KEY = 'personalization' as const

export function personalizationPatch(
  existingMeta: Record<string, unknown> | null | undefined,
  personalized: PersonalizedWorkspace,
): Record<string, unknown> {
  return {
    ...(existingMeta ?? {}),
    [WORKSPACE_PERSONALIZATION_KEY]: {
      ...personalized,
      preparedAt: new Date().toISOString(),
    },
  }
}

export function readPersonalization(metadata: unknown): PersonalizedWorkspace | null {
  if (!metadata || typeof metadata !== 'object') return null
  const raw = (metadata as Record<string, unknown>)[WORKSPACE_PERSONALIZATION_KEY]
  if (!raw || typeof raw !== 'object') return null
  const p = raw as PersonalizedWorkspace
  if (!Array.isArray(p.modules) || !p.headline) return null
  return p
}
