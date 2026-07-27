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
    sb.from('workspaces').select('id').eq('primary_owner_id', userId),
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
 * Personal owned first, then any owned, then first membership.
 */
export async function resolveActiveWorkspaceId(
  sb: SupabaseClient<any>,
  userId: string,
  projectId?: string | null,
): Promise<string | null> {
  if (projectId) {
    const fromProject = await resolveWorkspaceIdForProject(sb, projectId)
    if (fromProject) return fromProject
  }

  const { data: personal } = await sb
    .from('workspaces')
    .select('id')
    .eq('primary_owner_id', userId)
    .eq('is_personal', true)
    .maybeSingle()
  if (personal?.id) return personal.id

  const { data: owned } = await sb
    .from('workspaces')
    .select('id')
    .eq('primary_owner_id', userId)
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
  return membership?.workspace_id ?? null
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
