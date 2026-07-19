import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSb } from '@supabase/supabase-js'
import { sendSupportAckEmail, sendSupportNotifyEmail } from '@/lib/email/send'
import { checkAuthRateLimit } from '@/lib/auth-rate-limit'
import {
  getRecoverySupportStatus,
  recordRecoverySupport,
} from '@/lib/auth-recovery-support'
import {
  assertSameOriginOrNoOrigin,
  authErrorJson,
  getClientIp,
  normalizeEmail,
  rateLimitResponse,
} from '@/lib/auth-request'
import { getServiceClient } from '@/lib/supabase/service'
import { getSupabaseUrl } from '@/lib/supabase/env'

export const runtime = 'nodejs'

const LIMIT = { max: 8, windowMs: 15 * 60 * 1000 }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Support-Schnellnachricht. Speichert in support_messages, schickt
 *  - Bestätigung an User (Kontakt-E-Mail oder Auth-Session)
 *  - Notification an Founder
 *
 * Recovery (`kind: 'recovery'`): once-per-email until resolved in
 * `auth_recovery_support`. Password/PIN reset paths remain open.
 */
export async function POST(req: NextRequest) {
  const csrf = assertSameOriginOrNoOrigin(req)
  if (csrf) return csrf

  try {
    const body = await req.json().catch(() => ({}))
    const message = String(body?.message ?? '').trim()
    const page = typeof body?.page === 'string' ? body.page.slice(0, 200) : null
    const contactEmail = normalizeEmail(body?.email)
    const kind = String(body?.kind ?? '').toLowerCase() === 'recovery' ? 'recovery' : 'general'
    const deviceKey = typeof body?.deviceKey === 'string'
      ? body.deviceKey.trim().slice(0, 80)
      : ''

    if (!message) {
      return authErrorJson(400, 'message_required', 'Bitte eine Nachricht eingeben.')
    }
    if (contactEmail && !EMAIL_RE.test(contactEmail)) {
      return authErrorJson(400, 'invalid_email', 'Bitte eine gültige Kontakt-E-Mail eingeben.')
    }
    if (kind === 'recovery' && !contactEmail) {
      return authErrorJson(
        400,
        'email_required',
        'Für Zugangshilfe brauchen wir eine Kontakt-E-Mail.',
      )
    }

    const ip = getClientIp(req)
    const ipGate = checkAuthRateLimit(`support:ip:${ip}`, LIMIT)
    if (!ipGate.ok) return rateLimitResponse(ipGate.retryAfterSec)
    if (contactEmail) {
      const emailGate = checkAuthRateLimit(`support:email:${contactEmail}`, LIMIT)
      if (!emailGate.ok) return rateLimitResponse(emailGate.retryAfterSec)
    }

    const supabaseUrl = getSupabaseUrl()
    let userId: string | null = null
    let sessionEmail: string | null = null

    const auth = req.headers.get('authorization')
    if (auth) {
      const token = auth.replace(/^Bearer\s+/i, '')
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
      if (anon) {
        const sb = createSb(supabaseUrl, anon, { auth: { persistSession: false } })
        const { data: { user } } = await sb.auth.getUser(token)
        if (user) {
          userId = user.id
          sessionEmail = user.email ?? null
        }
      }
    }

    const replyEmail = contactEmail || sessionEmail
    const service = getServiceClient()

    if (kind === 'recovery' && contactEmail && service) {
      const status = await getRecoverySupportStatus(service, contactEmail, deviceKey || null)
      if (status.alreadySent) {
        return authErrorJson(
          409,
          'already_sent',
          'Anfrage bereits gesendet. Wir melden uns bei dir.',
          { alreadySent: true, createdAt: status.createdAt ?? null },
        )
      }
    }

    if (service) {
      try {
        await service.from('support_messages').insert({
          user_id: userId,
          email: replyEmail,
          message,
          page,
        })
      } catch {
        /* best-effort persist */
      }
    }

    if (kind === 'recovery' && contactEmail && service) {
      const recorded = await recordRecoverySupport(service, {
        email: contactEmail,
        message,
        page,
        deviceKey: deviceKey || null,
        userId,
      })
      if (!recorded.ok && 'alreadySent' in recorded && recorded.alreadySent) {
        return authErrorJson(
          409,
          'already_sent',
          'Anfrage bereits gesendet. Wir melden uns bei dir.',
          { alreadySent: true, createdAt: recorded.createdAt ?? null },
        )
      }
    }

    const [ack, notify] = await Promise.all([
      replyEmail
        ? sendSupportAckEmail({ to: replyEmail, message, page: page ?? undefined })
        : Promise.resolve({ ok: false as const, error: 'no-user-email', skipped: true }),
      sendSupportNotifyEmail({
        fromEmail: replyEmail,
        message,
        page: page ?? undefined,
        userId,
      }),
    ])

    if (!notify.ok && !ack.ok && !service) {
      return authErrorJson(502, 'send_failed', 'Anfrage konnte gerade nicht zugestellt werden.')
    }

    return NextResponse.json({
      ok: true,
      ackSent: ack.ok,
      notifySent: notify.ok,
      alreadySent: false,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'unknown' }, { status: 500 })
  }
}
