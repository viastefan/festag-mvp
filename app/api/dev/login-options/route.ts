/**
 * GET /api/dev/login-options?username=
 * Returns which auth methods to show for a remembered/known developer.
 * Linked providers come from profile flags (source of truth after OAuth link).
 * GitHub also falls back to github_username / github_connected_at for legacy rows.
 *
 * Enumeration-softened: unknown usernames look like cold starts (no extra fields).
 * Rate-limited by IP + username. Soft-cached in-process (~20s).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { checkAuthRateLimit } from '@/lib/auth-rate-limit'
import {
  authErrorJson,
  getClientIp,
  normalizeUsername,
  rateLimitResponse,
} from '@/lib/auth-request'
import { cacheGet, cacheSet } from '@/lib/short-ttl-cache'
import { loginOptionsCacheKey } from '@/lib/dev-login-options-cache'

export const runtime = 'nodejs'

const OPTS_LIMIT = { max: 60, windowMs: 15 * 60 * 1000 }
const CACHE_TTL_MS = 20_000

const empty = {
  ok: true,
  found: false,
  setup_required: false,
  workspace_name: null as string | null,
  google: false,
  github: false,
  apple: false,
  email: false,
}

type OptsPayload = typeof empty & { found: boolean }

export async function GET(req: NextRequest) {
  const username = normalizeUsername(req.nextUrl.searchParams.get('username'))
  if (!username) {
    return NextResponse.json(empty)
  }

  const ip = getClientIp(req)
  const ipGate = checkAuthRateLimit(`dev-opts:ip:${ip}`, OPTS_LIMIT)
  if (!ipGate.ok) return rateLimitResponse(ipGate.retryAfterSec)
  const uGate = checkAuthRateLimit(`dev-opts:u:${username}`, { max: 30, windowMs: OPTS_LIMIT.windowMs })
  if (!uGate.ok) return rateLimitResponse(uGate.retryAfterSec)

  const cacheKey = loginOptionsCacheKey(username)
  const cached = cacheGet<OptsPayload>(cacheKey)
  if (cached) {
    const res = NextResponse.json(cached)
    res.headers.set('Cache-Control', 'private, max-age=10')
    res.headers.set('X-Festag-Cache', 'hit')
    return res
  }

  const service = getServiceClient()
  if (!service) return authErrorJson(503, 'service_unavailable')
  const sb = service as any

  // Single indexed lookup — provider flags live on the profile (no auth.admin RTT).
  const { data: profile } = await sb
    .from('profiles')
    .select(
      'id,email,dev_workspace_name,dev_pin_setup_required,dev_google_linked,dev_github_linked,dev_apple_linked,dev_email_linked,github_username,github_connected_at,provider',
    )
    .eq('dev_username', username)
    .limit(1)
    .maybeSingle()

  const payload: OptsPayload = !profile?.id
    ? { ...empty }
    : {
        ok: true,
        found: true,
        setup_required: !!profile.dev_pin_setup_required,
        workspace_name: profile.dev_workspace_name || null,
        google: !!profile.dev_google_linked || profile.provider === 'google',
        github:
          !!profile.dev_github_linked
          || !!profile.github_username
          || !!profile.github_connected_at
          || profile.provider === 'github',
        apple: !!profile.dev_apple_linked || profile.provider === 'apple',
        email: !!profile.dev_email_linked || (!!profile.email && String(profile.email).includes('@') && !!profile.dev_username),
      }

  cacheSet(cacheKey, payload, CACHE_TTL_MS)
  const res = NextResponse.json(payload)
  res.headers.set('Cache-Control', 'private, max-age=10')
  res.headers.set('X-Festag-Cache', 'miss')
  return res
}
