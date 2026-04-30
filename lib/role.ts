/**
 * Effective role: resolves the user's actual DB role + optional admin "view-as" override.
 * Admins can set localStorage 'festag_view_as' to 'client' or 'dev' to test the experience
 * of those roles (e.g. Stefan testing his own client account UI).
 */
export type Role = 'client' | 'dev' | 'admin'

export function getViewOverride(): Role | null {
  if (typeof window === 'undefined') return null
  const v = window.localStorage.getItem('festag_view_as')
  if (v === 'client' || v === 'dev' || v === 'admin') return v
  return null
}

export function effectiveRole(actualRole: string | null | undefined): Role {
  const actual = (actualRole === 'admin' || actualRole === 'dev' || actualRole === 'client') ? actualRole : 'client'
  if (actual !== 'admin') return actual
  return getViewOverride() ?? actual
}

export function isDevOrAdmin(role: string | null | undefined): boolean {
  const r = effectiveRole(role)
  return r === 'dev' || r === 'admin'
}
