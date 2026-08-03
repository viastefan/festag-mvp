/**
 * Workspace Creation Wizard — Phase 2 SSOT.
 *
 * Surface: sequential popup slider on Festag OS (`WorkspaceCreateWizardModal`).
 * Flow: Name → How will you use this? → Creating… → Welcome → Overview
 * No module picker in the wizard. Templates configure defaults; Modules live in Settings later.
 * First workspace is free. Additional workspaces require the Workspace Plan.
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
    title: 'Build for Clients',
    description: 'Build software for clients with your team.',
    /** Quiet defaults — never shown as checkboxes in the wizard. */
    seedModules: ['Projects', 'Tasks', 'Team', 'GitHub', 'Architecture', 'Documents', 'Tagro'],
  },
  {
    id: 'agency',
    workspaceType: 'agency' as const satisfies WorkspaceType,
    title: 'Run an Agency',
    description: 'Manage multiple clients and software projects.',
    seedModules: ['Projects', 'CRM', 'Billing', 'Clients', 'Documents', 'Team', 'Tagro'],
  },
  {
    id: 'product',
    workspaceType: 'startup' as const satisfies WorkspaceType,
    title: 'Build a Product',
    description: 'Build and scale your own product.',
    seedModules: ['Projects', 'Tasks', 'Roadmap', 'Team', 'Documents', 'Analytics', 'Tagro'],
  },
  {
    id: 'internal',
    workspaceType: 'company' as const satisfies WorkspaceType,
    title: 'Internal Team',
    description: 'Manage internal digital products and teams.',
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
  if (!slug) return 'your-workspace.festag.app'
  return `${slug}.festag.app`
}

export const WORKSPACE_CREATION_COPY = {
  nameTitle: "Let's create your first workspace.",
  nameLabel: 'Workspace Name',
  namePlaceholder: 'Aerobay',
  useTitle: 'How will this workspace be used?',
  creatingTitle: 'Creating your workspace…',
  creatingLines: ['Projects', 'Tagro', 'Members'] as const,
  welcomePrefix: 'Welcome to',
  continue: 'Continue',
  customizeLater: 'Customize later',
  /** Plan gate H1: bright lead + muted rest (one glassy title, no Zwischenüberschrift). */
  additionalTitle: 'Additional workspaces',
  additionalBody: 'are available with the Workspace Plan (€19/month).',
  additionalBack: 'Back to Overview',
} as const

export const WORKSPACE_PLAN = {
  id: 'workspace',
  priceMonthlyEur: 19,
  /** First owned workspace is always free. */
  firstWorkspaceFree: true,
} as const
