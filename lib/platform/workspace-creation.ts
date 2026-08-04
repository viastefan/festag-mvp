/**
 * Workspace Creation Wizard — Phase 2 SSOT.
 *
 * Surface: single calm form on Festag OS (`WorkspaceCreateWizardModal`).
 * Flow: Name + Nutzung → Creating… → Welcome → Overview
 * First project opens later via darkened NewProjectModal (Tagro), not in this wizard.
 * No module picker in the wizard. Templates configure defaults; Modules live in Settings later.
 * First workspace is free. Additional workspaces require the Workspace Plan.
 * Titles: one AuthGlassyHero (lead + muted rest). Never a support <p> under the H1.
 *
 * @see docs/festag-os-workspace-phases.md
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

/** Live subdomain preview under the name field. */
export function workspaceSubdomainPreview(rawName: string): string {
  const slug = slugifyWorkspaceName(rawName)
  if (!slug) return 'dein-workspace.festag.app'
  return `${slug}.festag.app`
}

export const WORKSPACE_CREATION_COPY = {
  /** One glassy H1: dark lead + muted rest. No separate support <p>. */
  nameTitle: 'Erstelle deinen Workspace.',
  nameTitleRest: 'Wähle einen Namen und wie du ihn nutzen willst.',
  nameLabel: 'Workspace-Name',
  namePlaceholder: 'Aerobay',
  useTitle: 'Wofür wird dieser Workspace genutzt?',
  /** Quiet plan note under the name field — never a second title. */
  hobbyHint: 'Im Hobby-Plan ist 1 Workspace gratis.',
  creatingTitle: 'Workspace wird erstellt…',
  creatingLines: ['Projekte', 'Tagro', 'Mitglieder'] as const,
  welcomePrefix: 'Willkommen bei',
  welcomeReady: 'Dein Workspace ist bereit.',
  continue: 'Weiter',
  customizeLater: 'Später anpassen',
  /** Plan gate H1: bright lead + muted rest (one glassy title, no Zwischenüberschrift). */
  additionalTitle: 'Zusätzliche Workspaces',
  additionalBody: 'sind mit dem Workspace-Plan verfügbar (€19/Monat).',
  additionalBack: 'Zurück zur Übersicht',
} as const

/** Two visual groups on the create form — not one tall stack of four. */
export const WORKSPACE_USE_CASE_GROUPS = [
  {
    id: 'client-work',
    cases: ['clients', 'agency'] as const satisfies readonly WorkspaceUseCaseId[],
  },
  {
    id: 'own-product',
    cases: ['product', 'internal'] as const satisfies readonly WorkspaceUseCaseId[],
  },
] as const

export const WORKSPACE_PLAN = {
  id: 'workspace',
  priceMonthlyEur: 19,
  /** First owned workspace is always free (Hobby). */
  firstWorkspaceFree: true,
  hobbyPlanLabel: 'Hobby',
} as const
