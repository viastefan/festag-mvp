/**
 * POST /api/dev/pin-reset/request
 * Recovery path for Dev Panel PINs:
 *  - setup still open → rotate invite PIN and re-mail (same as resend-pin)
 *  - already set up → rotate personal PIN and mail the new one
 * Always returns a generic success when identity shape is valid (anti-enumeration).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { sendDevCredentialsEmail, sendDevPinResetEmail } from '@/lib/email/send'
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
import { invalidateDevLoginOptionsCache } from '@/lib/dev-login-options-cache'

export const runtime = 'nodejs'

const LIMIT = { max: 4, windowMs: 15 * 60 * 1000 }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const PROFILE_COLS =
  'id,email,full_name,dev_username,dev_pin_setup_required,role,approval_status' as const

type ProfileRow = {
  id: string
  email: string | null
  full_name: string | null
  dev_username: string | null
  dev_pin_setup_required: boolean
}

export async function POST(req: NextRequest) {
  const csrf = assertSameOriginOrNoOrigin(req)
  if (csrf) return csrf

  const body = await req.json().catch(() => ({}))
  let username = normalizeUsername(body?.username)
  const emailHint = normalizeEmail(body?.email)

  if (!username && !emailHint) {
    return authErrorJson(
      400,
      'missing_identity',
      'Benutzername oder E-Mail nötig.',
    )
  }
  if (emailHint && !EMAIL_RE.test(emailHint)) {
    return authErrorJson(400, 'invalid_email', 'Bitte eine gültige E-Mail-Adresse eingeben.')
  }

  const ip = getClientIp(req)
  const ipGate = checkAuthRateLimit(`dev-pin-reset:ip:${ip}`, LIMIT)
  if (!ipGate.ok) return rateLimitResponse(ipGate.retryAfterSec)
  const idGate = checkAuthRateLimit(
    `dev-pin-reset:id:${username || emailHint}`,
    LIMIT,
  )
  if (!idGate.ok) return rateLimitResponse(idGate.retryAfterSec)

  const service = getServiceClient()
  if (!service) return authErrorJson(503, 'service_unavailable')
  const sb = service as any

  const genericOk = NextResponse.json({
    ok: true,
    sent: true,
    message: 'Wenn ein Konto existiert, wurde ein neuer PIN per E-Mail gesendet.',
  })

  const [byUser, byEmail] = await Promise.all([
    username
      ? sb.from('profiles').select(PROFILE_COLS).eq('dev_username', username).limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
    emailHint
      ? sb.from('profiles').select(PROFILE_COLS).ilike('email', emailHint).limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  let profile: ProfileRow | null = null
  const userRow = byUser.data as ProfileRow | null
  if (userRow?.id && userRow.dev_username) {
    profile = userRow
  } else {
    const emailRow = byEmail.data as ProfileRow | null
    if (emailRow?.id && emailRow.dev_username) profile = emailRow
  }

  if (!profile?.id || !profile.dev_username) {
    return genericOk
  }

  username = normalizeUsername(profile.dev_username)
  const pin = genDevPin()
  const setupRequired = !!profile.dev_pin_setup_required

  const { error: updErr } = await sb
    .from('profiles')
    .update({
      dev_pin: pin,
      // Keep setup flag as-is: invite flow stays invite; personal stays personal.
      dev_pin_setup_required: setupRequired,
    })
    .eq('id', profile.id)

  if (updErr) return authErrorJson(500, 'update_failed')

  invalidateDevLoginOptionsCache(username)

  const to = profile.email || emailHint
  if (!to) {
    return authErrorJson(
      400,
      'no_email',
      'Keine E-Mail am Konto hinterlegt. Bitte den Support kontaktieren.',
    )
  }

  const base = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
  const loginUrl = setupRequired
    ? `${base}/dev/login?register=1&prefill=${encodeURIComponent(profile.dev_username)}&welcome=1`
    : `${base}/dev/login?prefill=${encodeURIComponent(profile.dev_username)}`

  const mail = setupRequired
    ? await sendDevCredentialsEmail({
        to,
        devName: profile.full_name,
        username: profile.dev_username,
        pin,
        loginUrl,
        fromName: 'Festag',
      }).catch((e) => ({ ok: false as const, error: String(e?.message || e) }))
    : await sendDevPinResetEmail({
        to,
        devName: profile.full_name,
        username: profile.dev_username,
        pin,
        loginUrl,
      }).catch((e) => ({ ok: false as const, error: String(e?.message || e) }))

  if (!mail.ok) {
    console.error('[pin-reset] mail failed:', (mail as any).error)
    return authErrorJson(
      502,
      'mail_failed',
      'PIN wurde erneuert, Versand fehlgeschlagen. Bitte erneut versuchen.',
    )
  }

  return NextResponse.json({
    ok: true,
    sent: true,
    username: profile.dev_username,
    kind: setupRequired ? 'invite' : 'personal',
    message: setupRequired
      ? 'Neuer Einladungs-PIN wurde an deine E-Mail gesendet.'
      : 'Neuer persönlicher PIN wurde an deine E-Mail gesendet.',
  })
}
