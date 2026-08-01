/**
 * Login identity gate — Benutzer (workspace path) + E-Mail must belong together.
 * Used when a remembered `/name` is shown on login and the user submits an email.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  normalizeWorkspaceName,
  slugifyWorkspaceName,
} from '@/lib/pending-workspace'

export type LoginIdentityMatch =
  | { ok: true }
  | { ok: false; reason: 'identity_mismatch' | 'workspace_unknown' | 'user_unknown' }

/**
 * True when `email` owns or is a member of the workspace named by `workspaceName`.
 * Also accepts profiles.dev_workspace_name as a claimed login path (pre-bootstrap).
 */
export async function emailMatchesLoginWorkspace(
  sb: SupabaseClient<any>,
  email: string,
  workspaceName: string,
): Promise<LoginIdentityMatch> {
  const name = normalizeWorkspaceName(workspaceName)
  const slug = slugifyWorkspaceName(name)
  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!name || !slug || !normalizedEmail) {
    return { ok: false, reason: 'identity_mismatch' }
  }

  const ilikePattern = name.replace(/[%_]/g, '\\$&')

  const { data: profile } = await sb
    .from('profiles')
    .select('id, email, dev_workspace_name')
    .ilike('email', normalizedEmail)
    .limit(1)
    .maybeSingle()

  if (!profile?.id) {
    return { ok: false, reason: 'user_unknown' }
  }

  const claimedDev = normalizeWorkspaceName(profile.dev_workspace_name || '')
  if (
    claimedDev &&
    (claimedDev.toLowerCase() === name.toLowerCase() ||
      slugifyWorkspaceName(claimedDev) === slug)
  ) {
    return { ok: true }
  }

  const [bySlug, byName] = await Promise.all([
    sb.from('workspaces').select('id, primary_owner_id, slug, name').eq('slug', slug).maybeSingle(),
    sb
      .from('workspaces')
      .select('id, primary_owner_id, slug, name')
      .ilike('name', ilikePattern)
      .limit(5),
  ])

  const nameHit = (byName.data || []).find(
    (row: { id: string; name: string }) =>
      normalizeWorkspaceName(row.name).toLowerCase() === name.toLowerCase(),
  )
  const workspace = bySlug.data || nameHit || null
  if (!workspace?.id) {
    return { ok: false, reason: 'workspace_unknown' }
  }

  if (workspace.primary_owner_id === profile.id) {
    return { ok: true }
  }

  const { data: membership } = await sb
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspace.id)
    .eq('user_id', profile.id)
    .limit(1)
    .maybeSingle()

  if (membership?.user_id) {
    return { ok: true }
  }

  return { ok: false, reason: 'identity_mismatch' }
}
