/**
 * Soft-cache keys for GET /api/dev/login-options.
 * Invalidate after register / resend / OAuth claim so setup_required and
 * linked-provider flags do not linger for the TTL window.
 */
import { cacheDelete, cacheDeletePrefix } from '@/lib/short-ttl-cache'
import { normalizeUsername } from '@/lib/auth-request'

const PREFIX = 'dev-opts:'

export function loginOptionsCacheKey(username: string): string {
  return `${PREFIX}${normalizeUsername(username)}`
}

export function invalidateDevLoginOptionsCache(username?: string | null): void {
  const u = normalizeUsername(username)
  if (u) cacheDelete(loginOptionsCacheKey(u))
  else cacheDeletePrefix(PREFIX)
}
