/**
 * Workspace resolution — one Workspace is the source of truth.
 *
 * Prefer project → owned personal → any owned → membership.
 * @see docs/festag-workspace-portal-system.md
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export async function resolveWorkspaceIdForProject(
  sb: SupabaseClient<any>,
  projectId: string,
): Promise<string | null> {
  const { data } = await sb
    .from('projects')
    .select('workspace_id')
    .eq('id', projectId)
    .maybeSingle()
  return (data as { workspace_id?: string | null } | null)?.workspace_id ?? null
}

/** All workspace ids the user owns or belongs to. */
export async function resolveWorkspaceIdsForUser(
  sb: SupabaseClient<any>,
  userId: string,
): Promise<string[]> {
  const ids = new Set<string>()

  const [{ data: owned }, { data: memberships }] = await Promise.all([
    sb.from('workspaces').select('id').eq('primary_owner_id', userId).is('deleted_at', null),
    sb.from('workspace_members').select('workspace_id').eq('user_id', userId),
  ])

  for (const row of (owned as { id: string }[] | null) ?? []) {
    if (row.id) ids.add(row.id)
  }
  for (const row of (memberships as { workspace_id: string }[] | null) ?? []) {
    if (row.workspace_id) ids.add(row.workspace_id)
  }

  return Array.from(ids)
}

/**
 * Active / default workspace for UI and routing.
 * Preferred id (if member) → project → personal owned → any owned → first membership.
 */
export async function resolveActiveWorkspaceId(
  sb: SupabaseClient<any>,
  userId: string,
  projectId?: string | null,
  preferredWorkspaceId?: string | null,
): Promise<string | null> {
  if (preferredWorkspaceId) {
    const allowed = await resolveWorkspaceIdsForUser(sb, userId)
    if (allowed.includes(preferredWorkspaceId)) return preferredWorkspaceId
  }

  if (projectId) {
    const fromProject = await resolveWorkspaceIdForProject(sb, projectId)
    if (fromProject) return fromProject
  }

  const { data: personal } = await sb
    .from('workspaces')
    .select('id')
    .eq('primary_owner_id', userId)
    .eq('is_personal', true)
    .is('deleted_at', null)
    .maybeSingle()
  if (personal?.id) return personal.id

  const { data: owned } = await sb
    .from('workspaces')
    .select('id')
    .eq('primary_owner_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (owned?.id) return owned.id

  const { data: membership } = await sb
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()
  if (membership?.workspace_id) {
    const { data: stillActive } = await sb
      .from('workspaces')
      .select('id')
      .eq('id', membership.workspace_id)
      .is('deleted_at', null)
      .maybeSingle()
    if (stillActive?.id) return stillActive.id
  }
  return null
}

export type WorkspaceListItem = {
  id: string
  name: string
  slug: string | null
  isPersonal: boolean
  role: 'owner' | 'member'
}

/** All workspaces the user owns or belongs to, newest last. */
export async function listWorkspacesForUser(
  sb: SupabaseClient<any>,
  userId: string,
): Promise<WorkspaceListItem[]> {
  const byId = new Map<string, WorkspaceListItem>()

  const { data: owned } = await sb
    .from('workspaces')
    .select('id, name, slug, is_personal, created_at, metadata')
    .eq('primary_owner_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  for (const row of (owned as any[] | null) ?? []) {
    if (!row?.id) continue
    byId.set(row.id, {
      id: row.id,
      name: String(row.name || 'Workspace'),
      slug: row.slug ?? null,
      isPersonal: Boolean(row.is_personal),
      role: 'owner',
    })
  }

  const { data: memberships } = await sb
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', userId)

  const memberIds = ((memberships as any[] | null) ?? [])
    .map((m) => m.workspace_id as string)
    .filter((id) => id && !byId.has(id))

  if (memberIds.length > 0) {
    const { data: memberWs } = await sb
      .from('workspaces')
      .select('id, name, slug, is_personal')
      .in('id', memberIds)
      .is('deleted_at', null)
    for (const row of (memberWs as any[] | null) ?? []) {
      if (!row?.id) continue
      byId.set(row.id, {
        id: row.id,
        name: String(row.name || 'Workspace'),
        slug: row.slug ?? null,
        isPersonal: Boolean(row.is_personal),
        role: 'member',
      })
    }
  }

  return Array.from(byId.values())
}

/** Member user ids for a workspace (owner + workspace_members). */
export async function resolveWorkspaceMemberIds(
  sb: SupabaseClient<any>,
  workspaceId: string,
): Promise<string[]> {
  const ids = new Set<string>()

  const { data: ws } = await sb
    .from('workspaces')
    .select('primary_owner_id')
    .eq('id', workspaceId)
    .maybeSingle()
  if ((ws as { primary_owner_id?: string } | null)?.primary_owner_id) {
    ids.add((ws as { primary_owner_id: string }).primary_owner_id)
  }

  const { data: members } = await sb
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId)

  for (const row of (members as { user_id: string }[] | null) ?? []) {
    if (row.user_id) ids.add(row.user_id)
  }

  return Array.from(ids)
}
