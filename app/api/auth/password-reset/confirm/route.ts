/**
 * POST /api/auth/password-reset/confirm
 * Sets a new password for the currently authenticated recovery session.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAuthRateLimit } from '@/lib/auth-rate-limit'
import {
  assertSameOriginOrNoOrigin,
  authErrorJson,
  getClientIp,
  rateLimitResponse,
} from '@/lib/auth-request'

export const runtime = 'nodejs'

const LIMIT = { max: 8, windowMs: 15 * 60 * 1000 }
const MIN_LEN = 8

export async function POST(req: NextRequest) {
  const csrf = assertSameOriginOrNoOrigin(req)
  if (csrf) return csrf

  const body = await req.json().catch(() => ({}))
  const password = String(body?.password ?? '')
  const confirm = String(body?.confirm ?? body?.password_confirm ?? '')

  if (password.length < MIN_LEN) {
    return authErrorJson(400, 'password_too_short', 'Passwort muss mindestens 8 Zeichen haben.')
  }
  if (password !== confirm) {
    return authErrorJson(400, 'password_mismatch', 'Passwörter stimmen nicht überein.')
  }

  const ip = getClientIp(req)
  const ipGate = checkAuthRateLimit(`pw-confirm:ip:${ip}`, LIMIT)
  if (!ipGate.ok) return rateLimitResponse(ipGate.retryAfterSec)

  const supabase = createClient()
  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr || !user) {
    return authErrorJson(401, 'not_authenticated', 'Sitzung abgelaufen. Bitte den Reset-Link erneut öffnen.')
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    const msg = String(error.message || '').toLowerCase()
    if (msg.includes('same') || msg.includes('identical')) {
      return authErrorJson(400, 'same_password', 'Bitte ein neues Passwort wählen.')
    }
    return authErrorJson(400, 'update_failed', 'Passwort konnte nicht gespeichert werden.')
  }

  return NextResponse.json({ ok: true })
}
