import { NextRequest, NextResponse } from 'next/server'
import { extractSsoDomain } from '@/lib/auth-sso'
import { getServiceClient } from '@/lib/supabase/service'
import { findActiveSsoProvider } from '@/lib/sso/providers'
import { checkAuthRateLimit } from '@/lib/auth-rate-limit'
import { getClientIp, rateLimitResponse } from '@/lib/auth-request'

export const runtime = 'nodejs'

const LIMIT = { max: 40, windowMs: 15 * 60 * 1000 }

/**
 * GET /api/auth/sso/check?domain=acme.com
 * Public pre-flight — tells the login UI whether SSO is configured for a domain.
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const gate = checkAuthRateLimit(`sso-check:ip:${ip}`, LIMIT)
  if (!gate.ok) return rateLimitResponse(gate.retryAfterSec)

  const domain = extractSsoDomain(req.nextUrl.searchParams.get('domain') || '')
  if (!domain) {
    return NextResponse.json({
      ok: true,
      configured: false,
      reason: 'invalid_domain',
    })
  }

  const svc = getServiceClient()
  if (!svc) {
    return NextResponse.json({ ok: false, error: 'service_unavailable' }, { status: 503 })
  }

  const provider = await findActiveSsoProvider(svc, domain)
  if (!provider) {
    return NextResponse.json({
      ok: true,
      configured: false,
      domain,
    })
  }

  return NextResponse.json({
    ok: true,
    configured: true,
    domain: provider.domain,
    displayName: provider.display_name || provider.domain,
    providerId: provider.supabase_provider_id || null,
    hasWorkspaceJoin: Boolean(provider.workspace_id),
    enforceSso: Boolean(provider.enforce_sso),
  })
}
