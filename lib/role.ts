/**
 * @deprecated Legacy platform profile roles (`profiles.role`).
 *
 * Product constitution: one platform, project-scoped roles + permissions.
 * New code should use `lib/platform/roles.ts` (`ProjectRole`).
 *
 * Historical decision (2026-05) treated Client / Dev / Admin as separate
 * accounts and shells. That is migration debt — do not deepen it.
 *
 * Execution Panel access still lives in `lib/execution-panel/access.ts`
 * until shells unify under role lenses.
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
