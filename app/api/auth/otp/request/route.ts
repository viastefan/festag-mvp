/**
 * POST /api/auth/otp/request
 * Generates a Supabase magiclink/signup OTP via admin.generateLink (no Supabase mailer)
 * and sends the Festag transactional HTML via IONOS — same look as Dev credentials mail.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { sendAuthOtpEmail } from '@/lib/email/send'
import { checkAuthRateLimit } from '@/lib/auth-rate-limit'
import {
  assertSameOriginOrNoOrigin,
  authErrorJson,
  getClientIp,
  normalizeEmail,
  rateLimitResponse,
} from '@/lib/auth-request'

export const runtime = 'nodejs'

const LIMIT = { max: 8, windowMs: 15 * 60 * 1000 }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Kind = 'login' | 'signup'

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
  const email = normalizeEmail(body?.email)
  const kind: Kind = body?.kind === 'signup' ? 'signup' : 'login'
  const nextPath = String(body?.next || (kind === 'signup' ? '/onboarding' : '/dashboard')).slice(0, 200)
  const pendingWorkspace =
    typeof body?.pendingWorkspaceName === 'string'
      ? body.pendingWorkspaceName.trim().slice(0, 80)
      : ''

  if (!email || !EMAIL_RE.test(email)) {
    return authErrorJson(400, 'invalid_email', 'Bitte eine gültige E-Mail-Adresse eingeben.')
  }

  const ip = getClientIp(req)
  const ipGate = checkAuthRateLimit(`auth-otp:ip:${ip}`, LIMIT)
  if (!ipGate.ok) return rateLimitResponse(ipGate.retryAfterSec)
  const emailGate = checkAuthRateLimit(`auth-otp:email:${email}`, LIMIT)
  if (!emailGate.ok) return rateLimitResponse(emailGate.retryAfterSec)

  const service = getServiceClient()
  if (!service) {
    console.error('[auth-otp] service client unavailable')
    return authErrorJson(503, 'service_unavailable', 'Anmeldung vorübergehend nicht möglich.')
  }

  const base = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
  const redirectTo = `${base}/auth/callback?next=${encodeURIComponent(nextPath)}`
  const linkType = kind === 'signup' ? 'signup' : 'magiclink'

  try {
    const { data, error } = await service.auth.admin.generateLink({
      type: linkType,
      email,
      options: {
        redirectTo,
        data: pendingWorkspace ? { pending_workspace_name: pendingWorkspace } : undefined,
      },
    })

    if (error || !data) {
      const msg = String(error?.message || 'generate_link_failed')
      const lower = msg.toLowerCase()
      if (lower.includes('rate') || lower.includes('security purposes') || lower.includes('only request')) {
        return rateLimitResponse(30)
      }
      console.error('[auth-otp] generateLink:', msg)
      return authErrorJson(400, 'otp_failed', msg)
    }

    const emailOtp = pickProp(data, 'email_otp')
    const hashed = pickProp(data, 'hashed_token')
    const actionLink = pickProp(data, 'action_link')

    if (!emailOtp) {
      console.error('[auth-otp] missing email_otp in generateLink response')
      return authErrorJson(502, 'otp_failed', 'Anmeldecode konnte nicht erzeugt werden.')
    }

    const otpType = kind === 'signup' ? 'signup' : 'email'
    let actionUrl: string
    if (hashed) {
      const params = new URLSearchParams({
        token_hash: hashed,
        type: otpType,
        next: nextPath,
      })
      actionUrl = `${base}/auth/callback?${params.toString()}`
    } else if (actionLink) {
      actionUrl = actionLink
    } else {
      actionUrl = redirectTo
    }

    const mail = await sendAuthOtpEmail({
      to: email,
      kind,
      code: emailOtp,
      actionUrl,
    }).catch((e) => ({ ok: false as const, error: String(e?.message || e) }))

    if (!mail.ok) {
      console.error('[auth-otp] mail failed:', (mail as { error?: string }).error)
      return authErrorJson(
        502,
        'mail_failed',
        'E-Mail-Versand vorübergehend nicht möglich. Bitte gleich erneut versuchen.',
      )
    }

    return NextResponse.json({ ok: true, sent: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[auth-otp] unexpected:', msg)
    return authErrorJson(500, 'otp_failed', 'Anmeldung vorübergehend nicht möglich.')
  }
}
