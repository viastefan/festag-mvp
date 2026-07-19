/**
 * GET /api/dev/check-username?username=
 *
 * Fast Dev-login username existence check (indexed profiles.dev_username).
 * Returns only { found } — no email / providers (enumeration limited to username).
 * Rate-limited by IP + username. Soft-cached in-process.
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
import { lookupDevUsernameExists } from '@/lib/dev-username-check'

export const runtime = 'nodejs'

const CHECK_LIMIT = { max: 60, windowMs: 60 * 1000 }

export async function GET(req: NextRequest) {
  const username = normalizeUsername(req.nextUrl.searchParams.get('username'))
  if (!username || username.length < 2) {
    return NextResponse.json({
      ok: true,
      found: false,
      username: username || '',
      invalid: true,
    })
  }

  const ip = getClientIp(req)
  const ipGate = checkAuthRateLimit(`dev-user-check:ip:${ip}`, CHECK_LIMIT)
  if (!ipGate.ok) return rateLimitResponse(ipGate.retryAfterSec)
  const uGate = checkAuthRateLimit(`dev-user-check:u:${username}`, {
    max: 40,
    windowMs: CHECK_LIMIT.windowMs,
  })
  if (!uGate.ok) return rateLimitResponse(uGate.retryAfterSec)

  const service = getServiceClient()
  if (!service) return authErrorJson(503, 'service_unavailable')

  const result = await lookupDevUsernameExists(service as any, username)
  if (!result.ok) {
    return authErrorJson(503, result.reason, 'Prüfung gerade nicht möglich.')
  }

  const res = NextResponse.json({
    ok: true,
    found: result.found,
    username: result.username,
  })
  res.headers.set('Cache-Control', 'private, max-age=5')
  return res
}
