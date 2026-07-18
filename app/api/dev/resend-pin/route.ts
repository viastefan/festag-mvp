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
  isValidDevPin,
  normalizeEmail,
  normalizePin,
  normalizeUsername,
  rateLimitResponse,
} from '@/lib/auth-request'

export const runtime = 'nodejs'

const RESEND_LIMIT = { max: 4, windowMs: 15 * 60 * 1000 }

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
  const invitePin = normalizePin(body?.invite_pin || body?.pin || '')

  if (!username && !emailHint && !isValidDevPin(invitePin)) {
    return authErrorJson(
      400,
      'missing_identity',
      'Benutzername, E-Mail oder Einladungs-PIN nötig.',
    )
  }

  const ip = getClientIp(req)
  const ipGate = checkAuthRateLimit(`dev-resend:ip:${ip}`, RESEND_LIMIT)
  if (!ipGate.ok) return rateLimitResponse(ipGate.retryAfterSec)
  const idGate = checkAuthRateLimit(
    `dev-resend:id:${username || emailHint || invitePin}`,
    RESEND_LIMIT,
  )
  if (!idGate.ok) return rateLimitResponse(idGate.retryAfterSec)

  const service = getServiceClient()
  if (!service) return authErrorJson(503, 'service_unavailable')
  const sb = service as any

  // Generic success — do not leak account existence for missing / wrong identity.
  const genericOk = NextResponse.json({
    ok: true,
    sent: true,
    message: 'Wenn ein Konto existiert, wurde ein neuer PIN Code gesendet.',
  })

  // Parallel identity probes when multiple hints are present (one RTT).
  const [byUser, byPin, byEmail] = await Promise.all([
    username
      ? sb.from('profiles').select(PROFILE_COLS).eq('dev_username', username).limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
    isValidDevPin(invitePin)
      ? sb
          .from('profiles')
          .select(PROFILE_COLS)
          .eq('dev_pin', invitePin)
          .eq('dev_pin_setup_required', true)
          .limit(2)
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
    const pinRows = Array.isArray(byPin.data) ? byPin.data : byPin.data ? [byPin.data] : []
    if (pinRows.length === 1 && pinRows[0]?.dev_username) {
      profile = pinRows[0] as ProfileRow
    } else {
      const emailRow = byEmail.data as ProfileRow | null
      if (emailRow?.id && emailRow.dev_username) profile = emailRow
    }
  }

  if (!profile?.id || !profile.dev_username) {
    return genericOk
  }

  username = normalizeUsername(profile.dev_username)

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
    username: profile.dev_username,
    message: 'Neuer PIN Code wurde an deine E-Mail gesendet.',
  })
}
