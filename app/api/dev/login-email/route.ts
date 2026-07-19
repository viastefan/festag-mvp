/**
 * POST /api/dev/login-email
 * Sends a magic-link / OTP email for a known Dev username without revealing the address.
 * Uses Festag IONOS HTML (same as /api/auth/otp/request) — not the Supabase Auth mailer.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { sendAuthOtpEmail } from '@/lib/email/send'
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

function pickProp(data: unknown, key: string): string | null {
  const root = data as Record<string, unknown> | null
  const props = (root?.properties as Record<string, unknown> | undefined) || root
  const v = props?.[key]
  return v == null ? null : String(v)
}

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

  const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
  const nextPath = '/dev'
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`

  const { data, error } = await service.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo },
  })

  if (error || !data) {
    console.error('[dev-login-email] generateLink:', error?.message)
    return authErrorJson(400, 'email_send_failed', 'E-Mail-Anmeldung fehlgeschlagen. Bitte erneut versuchen.')
  }

  const emailOtp = pickProp(data, 'email_otp')
  const hashed = pickProp(data, 'hashed_token')
  if (!emailOtp) {
    return authErrorJson(400, 'email_send_failed', 'E-Mail-Anmeldung fehlgeschlagen. Bitte erneut versuchen.')
  }

  const actionUrl = hashed
    ? `${origin}/auth/callback?${new URLSearchParams({
        token_hash: hashed,
        type: 'email',
        next: nextPath,
      }).toString()}`
    : redirectTo

  const mail = await sendAuthOtpEmail({
    to: email,
    kind: 'login',
    code: emailOtp,
    actionUrl,
  }).catch((e) => ({ ok: false as const, error: String(e?.message || e) }))

  if (!mail.ok) {
    console.error('[dev-login-email] mail failed:', (mail as { error?: string }).error)
    return authErrorJson(400, 'email_send_failed', 'E-Mail-Anmeldung fehlgeschlagen. Bitte erneut versuchen.')
  }

  try {
    await sb
      .from('profiles')
      .update({ dev_email_linked: true, updated_at: new Date().toISOString() })
      .eq('id', profile.id)
    invalidateDevLoginOptionsCache(username)
  } catch { /* ignore */ }

  return generic
}
