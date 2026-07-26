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
import { cacheDeletePrefix, cacheGet, cacheSet } from '@/lib/short-ttl-cache'

export type WorkspaceNameAvailability =
  | { ok: true; available: true; name: string; slug: string }
  | { ok: true; available: false; name: string; slug: string; reason: string }

export type CheckWorkspaceNameOpts = {
  /** Exclude an existing workspaces.id (rename flows). */
  excludeWorkspaceId?: string | null
  /** Exclude a profile id when claiming/updating that profile's dev workspace name. */
  excludeProfileId?: string | null
  /** Skip process-local TTL cache (writes / critical paths). */
  bypassCache?: boolean
}

/** Positives must be short — uniqueness races resolved by DB unique indexes. */
const CACHE_TTL_AVAILABLE_MS = 3_000
/** Negatives are stable until someone renames away (rare). */
const CACHE_TTL_TAKEN_MS = 45_000
const CACHE_PREFIX = 'ws-name:'

function cacheKey(
  name: string,
  slug: string,
  excludeWorkspaceId: string,
  excludeProfileId: string,
): string {
  return `${CACHE_PREFIX}${slug}|${name.toLowerCase()}|${excludeWorkspaceId}|${excludeProfileId}`
}

/** Call after successfully claiming a workspace name so soft-positive cache cannot linger. */
export function invalidateWorkspaceNameCache(_nameOrSlug?: string): void {
  // Small process-local map — wipe all name keys after a claim (safest vs key variants).
  cacheDeletePrefix(CACHE_PREFIX)
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
  const key = cacheKey(name, slug, excludeWorkspaceId, excludeProfileId)

  if (!opts.bypassCache) {
    const cached = cacheGet<WorkspaceNameAvailability>(key)
    if (cached) return cached
  }

  // Exact ILIKE (no wildcards) = case-insensitive equality; escape meta chars.
  const ilikePattern = name.replace(/[%_]/g, '\\$&')

  // One RTT: slug unique index + name lower index + profiles.dev_workspace unique index.
  const [bySlugRes, byNameRes, byDevNameRes] = await Promise.all([
    sb.from('workspaces').select('id').eq('slug', slug).maybeSingle(),
    sb.from('workspaces').select('id, name').ilike('name', ilikePattern).limit(5),
    sb
      .from('profiles')
      .select('id, dev_workspace_name')
      .not('dev_workspace_name', 'is', null)
      .ilike('dev_workspace_name', ilikePattern)
      .limit(5),
  ])

  const bySlug = bySlugRes.data
  if (bySlug && bySlug.id !== excludeWorkspaceId) {
    const result: WorkspaceNameAvailability = {
      ok: true,
      available: false,
      name,
      slug,
      reason: 'Dieser Workspace-Name ist bereits vergeben.',
    }
    if (!opts.bypassCache) cacheSet(key, result, CACHE_TTL_TAKEN_MS)
    return result
  }

  const nameHit = (byNameRes.data || []).find(
    (row: { id: string; name: string }) =>
      row.id !== excludeWorkspaceId &&
      normalizeWorkspaceName(row.name).toLowerCase() === name.toLowerCase(),
  )
  if (nameHit) {
    const result: WorkspaceNameAvailability = {
      ok: true,
      available: false,
      name,
      slug,
      reason: 'Dieser Workspace-Name ist bereits vergeben.',
    }
    if (!opts.bypassCache) cacheSet(key, result, CACHE_TTL_TAKEN_MS)
    return result
  }

  const devHit = (byDevNameRes.data || []).find(
    (row: { id: string; dev_workspace_name: string | null }) => {
      if (row.id === excludeProfileId) return false
      const existing = normalizeWorkspaceName(row.dev_workspace_name || '')
      return existing.toLowerCase() === name.toLowerCase()
    },
  )
  if (devHit) {
    const result: WorkspaceNameAvailability = {
      ok: true,
      available: false,
      name,
      slug,
      reason: 'Dieser Workspace-Name ist bereits vergeben.',
    }
    if (!opts.bypassCache) cacheSet(key, result, CACHE_TTL_TAKEN_MS)
    return result
  }

  const result: WorkspaceNameAvailability = { ok: true, available: true, name, slug }
  if (!opts.bypassCache) cacheSet(key, result, CACHE_TTL_AVAILABLE_MS)
  return result
}
