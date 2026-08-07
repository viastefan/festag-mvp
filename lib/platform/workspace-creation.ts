/**
 * Workspace Creation Wizard — Phase 2 SSOT.
 *
 * Surface: popup slider on Festag OS (`WorkspaceCreateWizardModal`).
 * Flow: Name → Nutzung (slides) → Creating… → Ready → Create first project (if zero projects)
 * First project is NOT a wizard slide — immediate follow-on after Ready (Architecture v3.7).
 * No module picker / invite in the wizard. Templates configure defaults; Modules in Settings later.
 * First workspace is free. Additional workspaces require the Workspace Plan.
 * Titles: one AuthGlassyHero (lead + muted rest). Never a support <p> under the H1.
 *
 * @see docs/festag-os-workspace-phases.md
 * @see docs/festag-create-project-flow.md
 * @see lib/workspace-create-open.ts
 */

import type { WorkspaceType } from '@/lib/platform/workspace'
import { slugifyWorkspaceName } from '@/lib/pending-workspace'

/** Action-oriented use cases — people choose a job, not a category label. */
export const WORKSPACE_USE_CASES = [
  {
    id: 'clients',
    workspaceType: 'personal' as const satisfies WorkspaceType,
    title: 'Für Kunden bauen',
    description: 'Software für Kunden mit deinem Team bauen.',
    /** Quiet defaults — never shown as checkboxes in the wizard. */
    seedModules: ['Projects', 'Tasks', 'Team', 'GitHub', 'Architecture', 'Documents', 'Tagro'],
  },
  {
    id: 'agency',
    workspaceType: 'agency' as const satisfies WorkspaceType,
    title: 'Agentur führen',
    description: 'Mehrere Kunden und Softwareprojekte managen.',
    seedModules: ['Projects', 'CRM', 'Billing', 'Clients', 'Documents', 'Team', 'Tagro'],
  },
  {
    id: 'product',
    workspaceType: 'startup' as const satisfies WorkspaceType,
    title: 'Produkt bauen',
    description: 'Dein eigenes Produkt bauen und skalieren.',
    seedModules: ['Projects', 'Tasks', 'Roadmap', 'Team', 'Documents', 'Analytics', 'Tagro'],
  },
  {
    id: 'internal',
    workspaceType: 'company' as const satisfies WorkspaceType,
    title: 'Internes Team',
    description: 'Interne digitale Produkte und Teams managen.',
    seedModules: ['Projects', 'Tasks', 'Team', 'Documents', 'Architecture', 'Meetings', 'Tagro'],
  },
] as const

export type WorkspaceUseCaseId = (typeof WORKSPACE_USE_CASES)[number]['id']

export type WorkspaceUseCase = (typeof WORKSPACE_USE_CASES)[number]

export function getWorkspaceUseCase(id: WorkspaceUseCaseId | null | undefined): WorkspaceUseCase | null {
  if (!id) return null
  return WORKSPACE_USE_CASES.find((c) => c.id === id) ?? null
}

const WORKSPACE_DOMAIN_PLACEHOLDER = 'dein-workspace.festag.app'

/** Canonical festag.app subdomain from a claimed workspace slug. */
export function workspaceDomainFromSlug(slug: string | null | undefined): string {
  const cleaned = String(slug || '')
    .trim()
    .toLowerCase()
    .replace(/^-+|-+$/g, '')
  if (!cleaned) return WORKSPACE_DOMAIN_PLACEHOLDER
  return `${cleaned}.festag.app`
}

/** Live subdomain preview while typing (client slugify — use confirmed slug after check-name). */
export function workspaceSubdomainPreview(rawName: string): string {
  return workspaceDomainFromSlug(slugifyWorkspaceName(rawName))
}

export const WORKSPACE_CREATION_COPY = {
  /** One glassy H1: dark lead + muted rest. No separate support <p>. */
  nameTitle: 'Erstelle deinen Workspace.',
  nameTitleRest: 'Wähle einen Namen — deine Domain entsteht live.',
  nameLabel: 'Workspace-Name',
  namePlaceholder: 'Wie soll dein Workspace heißen?',
  useTitle: 'Wofür wird dieser Workspace genutzt?',
  useSlideTitle: 'Wofür nutzt du ihn?',
  useSlideRest: 'Wähle, wie dieser Workspace arbeiten soll.',
  /** Explains live subdomain under the name — calm, not a Zwischenüberschrift. */
  domainLabel: 'Workspace-Domain',
  domainHint: 'Diese Domain läuft auf deinem Workspace — zum Teilen, Einladen und Verknüpfen.',
  creatingTitle: 'Workspace wird erstellt…',
  creatingLines: ['Projekte', 'Tagro', 'Mitglieder'] as const,
  welcomePrefix: 'Willkommen bei',
  welcomeReady: 'Dein Workspace ist bereit.',
  welcomeDomainLead: 'Erreichbar unter',
  continue: 'Weiter',
  customizeLater: 'Später anpassen',
  /** Plan gate H1: bright lead + muted rest (one glassy title, no Zwischenüberschrift). */
  additionalTitle: 'Zusätzliche Workspaces',
  additionalBody: 'sind mit dem Workspace-Plan verfügbar (€19/Monat).',
  additionalBack: 'Zurück zur Übersicht',
} as const

export const WORKSPACE_PLAN = {
  id: 'workspace',
  priceMonthlyEur: 19,
  /** First owned workspace is always free (Hobby). */
  firstWorkspaceFree: true,
  hobbyPlanLabel: 'Hobby',
} as const
