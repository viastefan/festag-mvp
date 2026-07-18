/**
 * GET /api/dev/login-options?username=
 * Returns which auth methods to show for a remembered/known developer.
 * Linked providers come from profile flags (and auth.identities when available).
 *
 * Enumeration-softened: unknown usernames look like cold starts (no extra fields).
 * Rate-limited by IP + username.
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

export const runtime = 'nodejs'

const OPTS_LIMIT = { max: 60, windowMs: 15 * 60 * 1000 }

const empty = {
  ok: true,
  found: false,
  setup_required: false,
  workspace_name: null as string | null,
  google: false,
  github: false,
  apple: false,
}

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

  const service = getServiceClient()
  if (!service) return authErrorJson(503, 'service_unavailable')
  const sb = service as any

  const { data: profile } = await sb
    .from('profiles')
    .select('id,dev_username,dev_workspace_name,dev_pin_setup_required,dev_google_linked,dev_github_linked,dev_apple_linked')
    .eq('dev_username', username)
    .limit(1)
    .maybeSingle()

  if (!profile?.id) {
    return NextResponse.json(empty)
  }

  let google = !!profile.dev_google_linked
  let github = !!profile.dev_github_linked
  let apple = !!profile.dev_apple_linked

  // Best-effort: enrich from auth.identities when service role can read them.
  try {
    const { data: userData } = await sb.auth.admin.getUserById(profile.id)
    const identities = userData?.user?.identities || []
    for (const id of identities) {
      const provider = String(id?.provider || '')
      if (provider === 'google') google = true
      if (provider === 'github') github = true
      if (provider === 'apple') apple = true
    }
  } catch { /* identities unavailable — flags only */ }

  return NextResponse.json({
    ok: true,
    found: true,
    setup_required: !!profile.dev_pin_setup_required,
    workspace_name: profile.dev_workspace_name || null,
    // Email deliberately omitted — reduces account enumeration surface.
    google,
    github,
    apple,
  })
}
