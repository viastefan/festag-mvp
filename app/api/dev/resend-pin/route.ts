/**
 * POST /api/dev/resend-pin
 * Rotates a one-time invite PIN for developers still in setup, and re-mails credentials.
 * Never rotates a completed personal PIN.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { sendDevCredentialsEmail } from '@/lib/email/send'
import { genDevPin } from '@/lib/dev-provision'
import { checkAuthRateLimit } from '@/lib/auth-rate-limit'
import {
  assertSameOriginOrNoOrigin,
  authErrorJson,
  getClientIp,
  normalizeEmail,
  normalizeUsername,
  rateLimitResponse,
} from '@/lib/auth-request'

export const runtime = 'nodejs'

const RESEND_LIMIT = { max: 4, windowMs: 15 * 60 * 1000 }

export async function POST(req: NextRequest) {
  const csrf = assertSameOriginOrNoOrigin(req)
  if (csrf) return csrf

  const body = await req.json().catch(() => ({}))
  const username = normalizeUsername(body?.username)
  const emailHint = normalizeEmail(body?.email)

  if (!username && !emailHint) {
    return authErrorJson(400, 'missing_identity', 'Benutzername oder E-Mail nötig.')
  }

  const ip = getClientIp(req)
  const ipGate = checkAuthRateLimit(`dev-resend:ip:${ip}`, RESEND_LIMIT)
  if (!ipGate.ok) return rateLimitResponse(ipGate.retryAfterSec)
  const idGate = checkAuthRateLimit(`dev-resend:id:${username || emailHint}`, RESEND_LIMIT)
  if (!idGate.ok) return rateLimitResponse(idGate.retryAfterSec)

  const service = getServiceClient()
  if (!service) return authErrorJson(503, 'service_unavailable')
  const sb = service as any

  let query = sb
    .from('profiles')
    .select('id,email,full_name,dev_username,dev_pin_setup_required,role,approval_status')
    .limit(1)
  if (username) query = query.eq('dev_username', username)
  else query = query.ilike('email', emailHint)

  const { data: profile } = await query.maybeSingle()

  // Generic success — do not leak account existence for missing / wrong identity.
  const genericOk = NextResponse.json({
    ok: true,
    sent: true,
    message: 'Wenn ein Konto existiert, wurde ein neuer PIN Code gesendet.',
  })

  if (!profile?.id || !profile.dev_username) {
    return genericOk
  }

  if (!profile.dev_pin_setup_required) {
    return authErrorJson(
      409,
      'already_setup',
      'Dieses Konto ist bereits eingerichtet. Nutze deinen persönlichen PIN.',
    )
  }

  const pin = genDevPin()
  const { error: updErr } = await sb
    .from('profiles')
    .update({
      dev_pin: pin,
      dev_pin_setup_required: true,
    })
    .eq('id', profile.id)
    .eq('dev_pin_setup_required', true)

  if (updErr) return authErrorJson(500, 'update_failed')

  const to = profile.email || emailHint
  if (!to) {
    return authErrorJson(
      400,
      'no_email',
      'Keine E-Mail am Konto hinterlegt. Bitte den Einladenden kontaktieren.',
    )
  }

  const base = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
  const mail = await sendDevCredentialsEmail({
    to,
    devName: profile.full_name,
    username: profile.dev_username,
    pin,
    loginUrl: `${base}/dev/login?register=1&prefill=${encodeURIComponent(profile.dev_username)}&welcome=1`,
    fromName: 'Festag',
  }).catch((e) => ({ ok: false as const, error: String(e?.message || e) }))

  if (!mail.ok) {
    // PIN was rotated — report send failure so caller can retry / support.
    return authErrorJson(502, 'mail_failed', 'PIN wurde erneuert, Versand fehlgeschlagen. Bitte erneut versuchen.')
  }

  return NextResponse.json({
    ok: true,
    sent: true,
    message: 'Neuer PIN Code wurde an deine E-Mail gesendet.',
  })
}
