import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { extractSsoDomain } from '@/lib/auth-sso'
import { getServiceClient } from '@/lib/supabase/service'
import { getSupabaseUrl } from '@/lib/supabase/env'
import { createSsoSetupRequest } from '@/lib/sso/requests'
import { findActiveSsoProvider } from '@/lib/sso/providers'
import { sendMail, getFounderMail } from '@/lib/email/client'
import { checkAuthRateLimit } from '@/lib/auth-rate-limit'
import {
  assertSameOriginOrNoOrigin,
  getClientIp,
  rateLimitResponse,
} from '@/lib/auth-request'

export const runtime = 'nodejs'

const SUPABASE_URL = getSupabaseUrl()
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const LIMIT = { max: 8, windowMs: 60 * 60 * 1000 }

/**
 * POST /api/auth/sso/request
 * Workspace owner/admin requests Firmen-SSO setup for a domain (no self-serve IdP).
 */
export async function POST(req: NextRequest) {
  const csrf = assertSameOriginOrNoOrigin(req)
  if (csrf) return csrf

  const ip = getClientIp(req)
  const gate = checkAuthRateLimit(`sso-req:ip:${ip}`, LIMIT)
  if (!gate.ok) return rateLimitResponse(gate.retryAfterSec)

  const cookieStore = cookies()
  const sbCookie = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(_cookies: { name: string; value: string; options: CookieOptions }[]) { /* read-only */ },
    },
  })

  const { data: { user } } = await sbCookie.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, reason: 'no_session' }, { status: 401 })
  }

  const userGate = checkAuthRateLimit(`sso-req:u:${user.id}`, LIMIT)
  if (!userGate.ok) return rateLimitResponse(userGate.retryAfterSec)

  const body = await req.json().catch(() => ({}))
  const domain = extractSsoDomain(body?.domain || user.email || '')
  if (!domain) {
    return NextResponse.json({ ok: false, reason: 'invalid_domain', message: 'Bitte eine Firmendomain angeben (z. B. firma.de).' }, { status: 400 })
  }

  const svc = getServiceClient()
  if (!svc) {
    return NextResponse.json({ ok: false, reason: 'service_unavailable' }, { status: 503 })
  }

  const existing = await findActiveSsoProvider(svc, domain)
  if (existing) {
    return NextResponse.json({
      ok: true,
      alreadyActive: true,
      message: `SSO für ${existing.display_name || domain} ist bereits aktiv.`,
      domain: existing.domain,
    })
  }

  const workspaceId = typeof body?.workspaceId === 'string' ? body.workspaceId : null
  const workspaceName = typeof body?.workspaceName === 'string' ? body.workspaceName : null
  const idpHint = typeof body?.idpHint === 'string' ? body.idpHint.trim().slice(0, 120) : null
  const notes = typeof body?.notes === 'string' ? body.notes.trim().slice(0, 800) : null

  const created = await createSsoSetupRequest(svc, {
    domain,
    workspaceId,
    workspaceName,
    requestedBy: user.id,
    contactEmail: user.email ?? null,
    idpHint,
    notes,
  })

  if (!created.ok) {
    return NextResponse.json({ ok: false, reason: created.reason }, { status: 500 })
  }

  const founder = getFounderMail()
  if (founder) {
    await sendMail({
      to: founder,
      subject: `Festag SSO-Anfrage: ${domain}`,
      html: `
        <p>Neue Firmen-SSO Anfrage</p>
        <ul>
          <li><strong>Domain:</strong> ${domain}</li>
          <li><strong>Workspace:</strong> ${workspaceName || '—'} ${workspaceId ? `(${workspaceId})` : ''}</li>
          <li><strong>Kontakt:</strong> ${user.email || '—'}</li>
          <li><strong>IdP:</strong> ${idpHint || '—'}</li>
          <li><strong>Notiz:</strong> ${notes || '—'}</li>
        </ul>
        <p>Freischalten: Supabase SAML + /internal-admin → SSO → status=active</p>
      `,
    }).catch(() => null)
  }

  return NextResponse.json({
    ok: true,
    alreadyActive: false,
    request: created.request,
    message: 'Anfrage gespeichert. Wir melden uns zur Freischaltung.',
  })
}
