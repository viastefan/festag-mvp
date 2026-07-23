/**
 * POST /api/auth/password-reset/request
 * Generates a Supabase recovery link and sends it via Festag IONOS mail.
 * Always returns a generic success when the email shape is valid (no account leak).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { sendPasswordResetEmail } from '@/lib/email/send'
import { checkAuthRateLimit } from '@/lib/auth-rate-limit'
import {
  assertSameOriginOrNoOrigin,
  authErrorJson,
  getClientIp,
  normalizeEmail,
  rateLimitResponse,
} from '@/lib/auth-request'

export const runtime = 'nodejs'

const LIMIT = { max: 5, windowMs: 15 * 60 * 1000 }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  const csrf = assertSameOriginOrNoOrigin(req)
  if (csrf) return csrf

  const body = await req.json().catch(() => ({}))
  const email = normalizeEmail(body?.email)

  if (!email || !EMAIL_RE.test(email)) {
    return authErrorJson(400, 'invalid_email', 'Bitte eine gültige E-Mail-Adresse eingeben.')
  }

  const ip = getClientIp(req)
  const ipGate = checkAuthRateLimit(`pw-reset:ip:${ip}`, LIMIT)
  if (!ipGate.ok) return rateLimitResponse(ipGate.retryAfterSec)
  const emailGate = checkAuthRateLimit(`pw-reset:email:${email}`, LIMIT)
  if (!emailGate.ok) return rateLimitResponse(emailGate.retryAfterSec)

  const genericOk = NextResponse.json({
    ok: true,
    sent: true,
    message: 'Wenn ein Konto existiert, wurde ein Reset-Link gesendet.',
  })

  const service = getServiceClient()
  if (!service) {
    // Soft-fail without leaking infra state to the client.
    console.error('[password-reset] service client unavailable')
    return genericOk
  }

  const base = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
  const redirectTo = `${base}/auth/callback?next=${encodeURIComponent('/auth/reset-password')}`

  try {
    const { data, error } = await service.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    })

    if (error || !data) {
      // Unknown / missing user → still generic ok (anti-enumeration).
      return genericOk
    }

    const hashed =
      (data as any)?.properties?.hashed_token ||
      (data as any)?.hashed_token ||
      null
    const actionLink =
      (data as any)?.properties?.action_link ||
      (data as any)?.action_link ||
      null

    // Prefer our scanner-safe callback with token_hash + explicit confirm click.
    let resetUrl: string | null = null
    if (hashed) {
      const params = new URLSearchParams({
        token_hash: String(hashed),
        type: 'recovery',
        next: '/auth/reset-password',
      })
      resetUrl = `${base}/auth/callback?${params.toString()}`
    } else if (actionLink) {
      resetUrl = String(actionLink)
    }

    if (!resetUrl) return genericOk

    const mail = await sendPasswordResetEmail({
      to: email,
      resetUrl,
    }).catch((e) => ({ ok: false as const, error: String(e?.message || e) }))

    if (!mail.ok) {
      console.error('[password-reset] mail failed:', (mail as any).error)
      return authErrorJson(502, 'mail_failed', '')
    }

    return genericOk
  } catch (e: any) {
    console.error('[password-reset] unexpected:', e?.message || e)
    return genericOk
  }
}
