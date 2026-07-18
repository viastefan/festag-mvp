/**
 * POST /api/dev/resend-pin
 * Rotates a one-time invite PIN for developers still in setup, and re-mails credentials.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { sendDevCredentialsEmail } from '@/lib/email/send'
import { genDevPin } from '@/lib/dev-provision'

export const runtime = 'nodejs'

const RATE = new Map<string, { n: number; t: number }>()

function rateOk(key: string, max = 4, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now()
  const row = RATE.get(key)
  if (!row || now - row.t > windowMs) {
    RATE.set(key, { n: 1, t: now })
    return true
  }
  if (row.n >= max) return false
  row.n += 1
  return true
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const username = String(body?.username || '').trim().toLowerCase()
  const emailHint = String(body?.email || '').trim().toLowerCase()

  if (!username && !emailHint) {
    return NextResponse.json({ ok: false, error: 'missing_identity', message: 'Benutzername oder E-Mail nötig.' }, { status: 400 })
  }

  const rateKey = `pin:${username || emailHint}:${req.headers.get('x-forwarded-for') || 'local'}`
  if (!rateOk(rateKey)) {
    return NextResponse.json({
      ok: false,
      error: 'rate_limited',
      message: 'Zu viele Anfragen. Bitte später erneut versuchen.',
    }, { status: 429 })
  }

  const service = getServiceClient()
  if (!service) return NextResponse.json({ ok: false, error: 'service_unavailable' }, { status: 503 })
  const sb = service as any

  let query = sb
    .from('profiles')
    .select('id,email,full_name,dev_username,dev_pin_setup_required,role,approval_status')
  if (username) query = query.eq('dev_username', username)
  else query = query.ilike('email', emailHint)

  const { data: profile } = await query.maybeSingle()
  if (!profile?.id || !profile.dev_username) {
    // Do not leak account existence.
    return NextResponse.json({
      ok: true,
      sent: true,
      message: 'Wenn ein Konto existiert, wurde ein neuer PIN Code gesendet.',
    })
  }

  if (!profile.dev_pin_setup_required) {
    return NextResponse.json({
      ok: false,
      error: 'already_setup',
      message: 'Dieses Konto ist bereits eingerichtet. Nutze deinen persönlichen PIN.',
    }, { status: 409 })
  }

  const pin = genDevPin()
  await sb.from('profiles').update({
    dev_pin: pin,
    dev_pin_setup_required: true,
  }).eq('id', profile.id)

  const to = profile.email || emailHint
  if (!to) {
    return NextResponse.json({
      ok: false,
      error: 'no_email',
      message: 'Keine E-Mail am Konto hinterlegt. Bitte den Einladenden kontaktieren.',
    }, { status: 400 })
  }

  const base = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
  await sendDevCredentialsEmail({
    to,
    devName: profile.full_name,
    username: profile.dev_username,
    pin,
    loginUrl: `${base}/dev/login?register=1&prefill=${encodeURIComponent(profile.dev_username)}&welcome=1`,
    fromName: 'Festag',
  }).catch(() => {})

  return NextResponse.json({
    ok: true,
    sent: true,
    message: 'Neuer PIN Code wurde an deine E-Mail gesendet.',
  })
}
