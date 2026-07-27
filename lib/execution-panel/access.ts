/**
 * Execution Panel access — shared gate for /dev shell and post-auth routing.
 */

export type ExecutionPanelProfileBits = {
  role: string | null
  approval_status?: string | null
}

const EXECUTION_PANEL_ROLES = new Set(['dev', 'admin', 'project_owner'])

export function isExecutionPanelPending(bits: ExecutionPanelProfileBits): boolean {
  const role = bits.role ?? null
  const approval = bits.approval_status ?? 'approved'
  return role === 'pending_developer' || approval === 'pending'
}

export function canAccessExecutionPanel(bits: ExecutionPanelProfileBits): boolean {
  const role = bits.role ?? null
  return role != null && EXECUTION_PANEL_ROLES.has(role)
}
