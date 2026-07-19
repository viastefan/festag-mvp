/**
 * POST /api/dev/login-email
 * Sends a magic-link / OTP email for a known Dev username without revealing the address.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServiceClient } from '@/lib/supabase/service'
import { checkAuthRateLimit } from '@/lib/auth-rate-limit'
import {
  assertSameOriginOrNoOrigin,
  authErrorJson,
  getClientIp,
  normalizeUsername,
  rateLimitResponse,
} from '@/lib/auth-request'
import { invalidateDevLoginOptionsCache } from '@/lib/dev-login-options-cache'

export const runtime = 'nodejs'

const LIMIT = { max: 6, windowMs: 15 * 60 * 1000 }

export async function POST(req: NextRequest) {
  const csrf = assertSameOriginOrNoOrigin(req)
  if (csrf) return csrf

  const body = await req.json().catch(() => ({}))
  const username = normalizeUsername(body?.username)
  if (!username) {
    return authErrorJson(400, 'username_required', 'Bitte einen Benutzernamen eingeben.')
  }

  const ip = getClientIp(req)
  const ipGate = checkAuthRateLimit(`dev-email:ip:${ip}`, LIMIT)
  if (!ipGate.ok) return rateLimitResponse(ipGate.retryAfterSec)
  const uGate = checkAuthRateLimit(`dev-email:u:${username}`, LIMIT)
  if (!uGate.ok) return rateLimitResponse(uGate.retryAfterSec)

  const generic = NextResponse.json({
    ok: true,
    sent: true,
    message: 'Wenn E-Mail verknüpft ist, wurde ein Anmeldelink gesendet.',
  })

  const service = getServiceClient()
  if (!service) return authErrorJson(503, 'service_unavailable')
  const sb = service as any

  const { data: profile } = await sb
    .from('profiles')
    .select('id,email,dev_email_linked,dev_pin_setup_required')
    .eq('dev_username', username)
    .limit(1)
    .maybeSingle()

  const email = String(profile?.email || '').trim().toLowerCase()
  const emailLinked = !!profile?.dev_email_linked || (email.includes('@'))
  if (!profile?.id || !emailLinked || !email.includes('@')) {
    return generic
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) return authErrorJson(503, 'service_unavailable')

  const origin = req.nextUrl.origin
  const anonClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { error } = await anonClient.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent('/dev')}`,
      shouldCreateUser: false,
    },
  })

  if (error) {
    return authErrorJson(400, 'email_send_failed', 'E-Mail-Anmeldung fehlgeschlagen. Bitte erneut versuchen.')
  }

  // Stamp linked flag for future login-options (best-effort).
  try {
    await sb
      .from('profiles')
      .update({ dev_email_linked: true, updated_at: new Date().toISOString() })
      .eq('id', profile.id)
    invalidateDevLoginOptionsCache(username)
  } catch { /* ignore */ }

  return generic
}
