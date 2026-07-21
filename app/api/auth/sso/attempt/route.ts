import { NextRequest, NextResponse } from 'next/server'
import { extractSsoDomain } from '@/lib/auth-sso'
import { getServiceClient } from '@/lib/supabase/service'
import { findActiveSsoProvider } from '@/lib/sso/providers'
import { logSsoLoginAttempt } from '@/lib/sso/login-attempts'
import { checkAuthRateLimit } from '@/lib/auth-rate-limit'
import {
  assertSameOriginOrNoOrigin,
  getClientIp,
  rateLimitResponse,
} from '@/lib/auth-request'

export const runtime = 'nodejs'

const LIMIT = { max: 30, windowMs: 15 * 60 * 1000 }

type Outcome = 'started' | 'success' | 'failed' | 'domain_unknown'

/**
 * POST /api/auth/sso/attempt
 * Audit log for SSO start / success / failure (no secrets).
 */
export async function POST(req: NextRequest) {
  const csrf = assertSameOriginOrNoOrigin(req)
  if (csrf) return csrf

  const ip = getClientIp(req)
  const gate = checkAuthRateLimit(`sso-attempt:ip:${ip}`, LIMIT)
  if (!gate.ok) return rateLimitResponse(gate.retryAfterSec)

  const body = await req.json().catch(() => ({}))
  const domain = extractSsoDomain(body?.domain || body?.email || '')
  const outcome = String(body?.outcome || 'started') as Outcome
  const allowed: Outcome[] = ['started', 'success', 'failed', 'domain_unknown']
  if (!allowed.includes(outcome)) {
    return NextResponse.json({ ok: false, error: 'invalid_outcome' }, { status: 400 })
  }

  const svc = getServiceClient()
  if (!svc) {
    return NextResponse.json({ ok: false, error: 'service_unavailable' }, { status: 503 })
  }

  let providerId: string | null = null
  if (domain) {
    const provider = await findActiveSsoProvider(svc, domain)
    providerId = provider?.id ?? null
    if (outcome === 'domain_unknown' && provider) {
      // Domain is known — normalize to started/failed instead.
    }
  }

  await logSsoLoginAttempt(svc, {
    domain,
    emailHint: typeof body?.email === 'string' ? body.email : null,
    userId: typeof body?.userId === 'string' ? body.userId : null,
    providerId,
    outcome: domain && outcome === 'domain_unknown' && providerId ? 'started' : outcome,
    errorMessage: typeof body?.error === 'string' ? body.error : null,
    ipAddress: ip,
    userAgent: req.headers.get('user-agent'),
  })

  return NextResponse.json({ ok: true })
}
