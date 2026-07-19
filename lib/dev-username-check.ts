/**
 * Lean Dev username existence lookup — indexed eq on profiles.dev_username.
 * Shared by GET /api/dev/check-username (and cache invalidation with login-options).
 */
import { cacheDelete, cacheDeletePrefix, cacheGet, cacheSet } from '@/lib/short-ttl-cache'
import { normalizeUsername } from '@/lib/auth-request'

const PREFIX = 'dev-user-check:'
const FOUND_TTL_MS = 20_000
const MISS_TTL_MS = 8_000

export function usernameCheckCacheKey(username: string): string {
  return `${PREFIX}${normalizeUsername(username)}`
}

export function invalidateDevUsernameCheckCache(username?: string | null): void {
  const u = normalizeUsername(username)
  if (u) cacheDelete(usernameCheckCacheKey(u))
  else cacheDeletePrefix(PREFIX)
}

export type DevUsernameCheckResult = {
  ok: true
  found: boolean
  username: string
}

/**
 * Single-column indexed probe. Prefer this over selecting provider flags
 * when the UI only needs existence (fractions of a second hot path).
 */
export async function lookupDevUsernameExists(
  sb: { from: (table: string) => any },
  rawUsername: string,
): Promise<DevUsernameCheckResult | { ok: false; reason: string }> {
  const username = normalizeUsername(rawUsername)
  if (!username || username.length < 2) {
    return { ok: false, reason: 'username_invalid' }
  }

  const cacheKey = usernameCheckCacheKey(username)
  const cached = cacheGet<DevUsernameCheckResult>(cacheKey)
  if (cached) return cached

  const { data, error } = await sb
    .from('profiles')
    .select('id')
    .eq('dev_username', username)
    .limit(1)
    .maybeSingle()

  if (error) {
    return { ok: false, reason: 'lookup_failed' }
  }

  const payload: DevUsernameCheckResult = {
    ok: true,
    found: !!data?.id,
    username,
  }
  cacheSet(cacheKey, payload, payload.found ? FOUND_TTL_MS : MISS_TTL_MS)
  return payload
}
