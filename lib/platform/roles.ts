/**
 * Festag project roles — product constitution SSOT.
 *
 * Experiences are created through roles + permissions on one platform.
 * Do not invent parallel “Client App” / “Developer App” role systems.
 *
 * Legacy maps (profiles.role, workspace_member_role, executor strings)
 * should converge here over time — see `legacyProfileRoleToProjectRoles`.
 */

export const PROJECT_ROLES = [
  'project_owner',
  'admin',
  'member',
  'client',
  'developer',
  'designer',
  'viewer',
] as const

export type ProjectRole = (typeof PROJECT_ROLES)[number]

export const PROJECT_ROLE_LABELS: Record<ProjectRole, string> = {
  project_owner: 'Project Owner',
  admin: 'Admin',
  member: 'Member',
  client: 'Client',
  developer: 'Developer',
  designer: 'Designer',
  viewer: 'Viewer',
}

/** Creator of a project is always Project Owner until transferred. */
export const DEFAULT_CREATOR_ROLE: ProjectRole = 'project_owner'

/** Roles that typically see execution depth (code, deploys, internal tasks). */
export const EXECUTION_DEPTH_ROLES: ReadonlySet<ProjectRole> = new Set([
  'project_owner',
  'admin',
  'member',
  'developer',
  'designer',
])

/** Roles that typically see calm client-facing summaries by default. */
export const CLIENT_LENS_ROLES: ReadonlySet<ProjectRole> = new Set([
  'client',
  'viewer',
])

export function isProjectRole(value: unknown): value is ProjectRole {
  return (
    typeof value === 'string' &&
    (PROJECT_ROLES as readonly string[]).includes(value)
  )
}

/**
 * Map legacy `profiles.role` / portal strings toward constitution roles.
 * Platform-wide profile roles are migration debt — prefer project membership.
 */
export function legacyProfileRoleToProjectRoles(
  profileRole: string | null | undefined,
): ProjectRole[] {
  const r = (profileRole || '').toLowerCase().trim()
  switch (r) {
    case 'project_owner':
    case 'owner':
      return ['project_owner']
    case 'admin':
      return ['admin']
    case 'dev':
    case 'developer':
    case 'pending_developer':
      return ['developer']
    case 'collaborator':
    case 'client':
      return ['client']
    case 'designer':
      return ['designer']
    case 'viewer':
      return ['viewer']
    case 'member':
      return ['member']
    default:
      return ['member']
  }
}

/**
 * Map legacy workspace_member_role / project_members strings → ProjectRole.
 */
export function legacyMembershipRoleToProjectRole(
  role: string | null | undefined,
): ProjectRole {
  const r = (role || '').toLowerCase().trim()
  if (
    r === 'owner' ||
    r === 'project_owner' ||
    r === 'festag_project_owner' ||
    r === 'client_owner' ||
    r === 'agency_owner' ||
    r === 'primary_owner'
  ) {
    return 'project_owner'
  }
  if (r === 'admin' || r === 'agency_admin' || r === 'white_label_manager') {
    return 'admin'
  }
  if (
    r === 'developer' ||
    r === 'dev' ||
    r === 'festag_developer' ||
    r === 'reviewer'
  ) {
    return 'developer'
  }
  if (r === 'designer') return 'designer'
  if (
    r === 'client' ||
    r === 'client_approver' ||
    r === 'approver'
  ) {
    return 'client'
  }
  if (r === 'viewer' || r === 'client_viewer') return 'viewer'
  if (r === 'member' || r === 'finance' || r === 'project_manager') {
    return 'member'
  }
  return isProjectRole(r) ? r : 'member'
}

export function hasExecutionDepth(roles: readonly ProjectRole[]): boolean {
  return roles.some((role) => EXECUTION_DEPTH_ROLES.has(role))
}

export function hasClientLens(roles: readonly ProjectRole[]): boolean {
  return roles.some((role) => CLIENT_LENS_ROLES.has(role))
}
