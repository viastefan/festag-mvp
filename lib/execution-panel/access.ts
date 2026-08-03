/**
 * Execution Panel access — single source of truth for `/dev/*`.
 *
 * Client Portal and Developer Portal (Execution Panel) are two perspectives
 * of the same Workspace — never separate products or duplicated data.
 *
 * Workspace modes (delivery / team / agency) are GTM surfaces.
 * Access is role + approval based; mode shapes defaults, entry points, and
 * delivery options.
 *
 * @see docs/festag-workspace-portal-system.md
 * @see docs/leqra-festag-operating-architecture.md
 */

import type { ClientDeliveryModel } from '@/lib/projects/delivery-bridge'
import type { PortalWorkspaceMode } from '@/lib/portal-nav'

/** Roles that may enter the Execution Panel once approved. */
export const EXECUTION_PANEL_ROLES = new Set([
  'dev',
  'admin',
  'project_owner',
])

export type ExecutionProfileBits = {
  role?: string | null
  approval_status?: string | null
}

/** @deprecated Use ExecutionProfileBits */
export type ExecutionPanelProfileBits = ExecutionProfileBits

export function isExecutionPanelRole(role: string | null | undefined): boolean {
  return !!role && EXECUTION_PANEL_ROLES.has(role)
}

/** Approved executor — may use `/dev` shell and `/api/dev/*`. */
export function canAccessExecutionPanel(profile: ExecutionProfileBits | null | undefined): boolean {
  if (!profile) return false
  if (!isExecutionPanelRole(profile.role)) return false
  const approval = profile.approval_status ?? 'approved'
  if (approval === 'pending' || profile.role === 'pending_developer') return false
  if (approval === 'rejected' || approval === 'blocked') return false
  return true
}

/** Waiting room — shell may open `/dev/pending`, APIs stay closed. */
export function isExecutionPanelPending(profile: ExecutionProfileBits | null | undefined): boolean {
  if (!profile) return false
  return profile.role === 'pending_developer' || profile.approval_status === 'pending'
}

/**
 * Show portal → Execution Panel entry (workspace menu, project CTA).
 * All approved exec roles in every workspace mode — Delivery clients never
 * see this because their role is `client`.
 */
export function showExecutionPanelPortalEntry(
  profile: ExecutionProfileBits | null | undefined,
  _workspaceMode?: PortalWorkspaceMode | string | null,
): boolean {
  return canAccessExecutionPanel(profile)
}

/**
 * After onboarding, where should an approved exec land?
 * Product UI is Festag OS Overview. `/dev` remains for explicit execution roles.
 */
export function defaultPostAuthPathForExecution(
  profile: ExecutionProfileBits,
  workspaceMode?: PortalWorkspaceMode | string | null,
): '/dev' | '/overview' {
  if (!canAccessExecutionPanel(profile)) return '/overview'
  if (profile.role === 'dev' || profile.role === 'admin') return '/dev'
  if (profile.role === 'project_owner' && workspaceMode === 'team') return '/dev'
  return '/overview'
}

/** Preferred New-Project delivery models ordered for a workspace mode. */
export function deliveryModelsForWorkspaceMode(
  mode: PortalWorkspaceMode | string | null | undefined,
): ClientDeliveryModel[] {
  switch (mode) {
    case 'team':
      return ['team_internal', 'assign_existing_dev', 'invite_new_dev', 'festag_delivery']
    case 'agency':
      return ['invite_new_dev', 'assign_existing_dev', 'team_internal', 'festag_delivery']
    case 'delivery':
    default:
      return ['festag_delivery', 'assign_existing_dev', 'invite_new_dev', 'team_internal']
  }
}

export function defaultDeliveryModelForWorkspaceMode(
  mode: PortalWorkspaceMode | string | null | undefined,
): ClientDeliveryModel {
  return deliveryModelsForWorkspaceMode(mode)[0]
}
