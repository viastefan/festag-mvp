/**
 * POST /api/support/recovery-status
 * Returns whether this email (or device) already has an open recovery support request.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { getRecoverySupportStatus } from '@/lib/auth-recovery-support'
import { checkAuthRateLimit } from '@/lib/auth-rate-limit'
import {
  assertSameOriginOrNoOrigin,
  authErrorJson,
  getClientIp,
  normalizeEmail,
  rateLimitResponse,
} from '@/lib/auth-request'

export const runtime = 'nodejs'

const LIMIT = { max: 30, windowMs: 15 * 60 * 1000 }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  const csrf = assertSameOriginOrNoOrigin(req)
  if (csrf) return csrf

  const body = await req.json().catch(() => ({}))
  const email = normalizeEmail(body?.email)
  const deviceKey = typeof body?.deviceKey === 'string'
    ? body.deviceKey.trim().slice(0, 80)
    : ''

  if (email && !EMAIL_RE.test(email)) {
    return authErrorJson(400, 'invalid_email', 'Bitte eine gültige Kontakt-E-Mail eingeben.')
  }
  if (!email && !deviceKey) {
    return NextResponse.json({ ok: true, alreadySent: false })
  }

  const ip = getClientIp(req)
  const ipGate = checkAuthRateLimit(`recovery-status:ip:${ip}`, LIMIT)
  if (!ipGate.ok) return rateLimitResponse(ipGate.retryAfterSec)

  const service = getServiceClient()
  if (!service) {
    return NextResponse.json({ ok: true, alreadySent: false })
  }

  const status = await getRecoverySupportStatus(service, email, deviceKey || null)
  return NextResponse.json({
    ok: true,
    alreadySent: status.alreadySent,
    createdAt: status.createdAt ?? null,
  })
}
