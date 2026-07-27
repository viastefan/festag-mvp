/**
 * Strict role resolution — comes ONLY from the profiles.role column.
 *
 * Decision (2026-05): no view-as override. Each role has its own account.
 *   - Client signs in to their client portal.
 *   - Dev signs in to their Execution Panel (/dev with PIN).
 *   - Founder/admin signs in to /master-control.
 *
 * Frontend never blends roles. If the user wants to test "client view",
 * they sign out and create / sign in to a separate client account.
 *
 * Execution Panel access (role + approval) lives in
 * `lib/execution-panel/access.ts` — use that for `/dev` gates.
 */
export type Role = 'client' | 'dev' | 'admin'

export function effectiveRole(actualRole: string | null | undefined): Role {
  if (actualRole === 'admin' || actualRole === 'dev' || actualRole === 'client') return actualRole
  return 'client'
}

export function isDevOrAdmin(role: string | null | undefined): boolean {
  const r = effectiveRole(role)
  return r === 'dev' || r === 'admin'
}

/** Roles that may open the Execution Panel (approval still required separately). */
export function isExecutionCapableRole(role: string | null | undefined): boolean {
  return role === 'dev' || role === 'admin' || role === 'project_owner'
}

export function isClient(role: string | null | undefined): boolean {
  return effectiveRole(role) === 'client'
}
