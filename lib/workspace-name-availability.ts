/**
 * Shared workspace-name uniqueness (client register + Dev setup).
 * Checks slug/name on `workspaces` and `profiles.dev_workspace_name` globally.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  normalizeWorkspaceName,
  slugifyWorkspaceName,
} from '@/lib/pending-workspace'
import { RESERVED_SLUGS } from '@/lib/workspace-slug'

export type WorkspaceNameAvailability =
  | { ok: true; available: true; name: string; slug: string }
  | { ok: true; available: false; name: string; slug: string; reason: string }

export type CheckWorkspaceNameOpts = {
  /** Exclude an existing workspaces.id (rename flows). */
  excludeWorkspaceId?: string | null
  /** Exclude a profile id when claiming/updating that profile's dev workspace name. */
  excludeProfileId?: string | null
}

/**
 * Validate + uniqueness check. Does not write or delete.
 */
export async function checkWorkspaceNameAvailability(
  sb: SupabaseClient<any>,
  raw: string,
  opts: CheckWorkspaceNameOpts = {},
): Promise<WorkspaceNameAvailability> {
  const name = normalizeWorkspaceName(raw)
  if (!name) {
    return {
      ok: true,
      available: false,
      name: '',
      slug: '',
      reason: 'Bitte einen Workspace-Namen eingeben.',
    }
  }
  if (name.length < 2) {
    return {
      ok: true,
      available: false,
      name,
      slug: '',
      reason: 'Der Name muss mindestens 2 Zeichen haben.',
    }
  }

  const slug = slugifyWorkspaceName(name)
  if (!slug || slug.length < 2) {
    return {
      ok: true,
      available: false,
      name,
      slug: '',
      reason: 'Bitte einen Namen mit Buchstaben oder Zahlen verwenden.',
    }
  }
  if (RESERVED_SLUGS.has(slug)) {
    return {
      ok: true,
      available: false,
      name,
      slug,
      reason: 'Dieser Name ist reserviert. Bitte wähle einen anderen.',
    }
  }

  const excludeWorkspaceId = opts.excludeWorkspaceId || ''
  const excludeProfileId = opts.excludeProfileId || ''
  const ilikePattern = name.replace(/[%_]/g, '\\$&')

  const { data: bySlug } = await sb
    .from('workspaces')
    .select('id, name, slug')
    .eq('slug', slug)
    .maybeSingle()

  if (bySlug && bySlug.id !== excludeWorkspaceId) {
    return {
      ok: true,
      available: false,
      name,
      slug,
      reason: 'Dieser Workspace-Name ist bereits vergeben.',
    }
  }

  const { data: byName } = await sb
    .from('workspaces')
    .select('id, name, slug')
    .ilike('name', ilikePattern)
    .limit(5)

  const nameHit = (byName || []).find(
    (row: { id: string; name: string }) =>
      row.id !== excludeWorkspaceId &&
      normalizeWorkspaceName(row.name).toLowerCase() === name.toLowerCase(),
  )
  if (nameHit) {
    return {
      ok: true,
      available: false,
      name,
      slug,
      reason: 'Dieser Workspace-Name ist bereits vergeben.',
    }
  }

  const { data: byDevName } = await sb
    .from('profiles')
    .select('id, dev_workspace_name')
    .not('dev_workspace_name', 'is', null)
    .ilike('dev_workspace_name', ilikePattern)
    .limit(5)

  const devHit = (byDevName || []).find(
    (row: { id: string; dev_workspace_name: string | null }) => {
      if (row.id === excludeProfileId) return false
      const existing = normalizeWorkspaceName(row.dev_workspace_name || '')
      return existing.toLowerCase() === name.toLowerCase()
    },
  )
  if (devHit) {
    return {
      ok: true,
      available: false,
      name,
      slug,
      reason: 'Dieser Workspace-Name ist bereits vergeben.',
    }
  }

  return { ok: true, available: true, name, slug }
}
