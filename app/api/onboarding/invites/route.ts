import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAuthRateLimit } from '@/lib/auth-rate-limit'
import {
  assertSameOriginOrNoOrigin,
  getClientIp,
  normalizeEmail,
  rateLimitResponse,
} from '@/lib/auth-request'
import {
  createAndSendTeamInvite,
  parseInviteRole,
  type InviteLegacyRole,
} from '@/lib/invites/create-and-send'
import { isValidInviteEmail, resolveInviteOrigin } from '@/lib/invites/safe'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_BATCH = 12

/**
 * POST /api/onboarding/invites
 * Batch email-first invites during hybrid onboarding (“Lade Mitglieder ein”).
 *
 * Body: { emails: string[], role?: InviteLegacyRole, teamChoice?: string }
 * Uses the signed-in user as inviter — never trusts client fromUserId.
 */
export async function POST(req: NextRequest) {
  const csrf = assertSameOriginOrNoOrigin(req)
  if (csrf) return csrf

  const ipGate = checkAuthRateLimit(`onboarding-invites:ip:${getClientIp(req)}`, {
    max: 10,
    windowMs: 60 * 60 * 1000,
  })
  if (!ipGate.ok) return rateLimitResponse(ipGate.retryAfterSec)

  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, reason: 'unauthenticated' }, { status: 401 })

  let body: { emails?: unknown; role?: unknown; teamChoice?: unknown } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid_json' }, { status: 400 })
  }

  const rawList = Array.isArray(body.emails)
    ? body.emails
    : typeof body.emails === 'string'
      ? String(body.emails).split(/[,;\s\n]+/)
      : []

  const emails = Array.from(
    new Set(
      rawList
        .map(e => normalizeEmail(e))
        .filter(isValidInviteEmail),
    ),
  ).slice(0, MAX_BATCH)

  if (emails.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, results: [] })
  }

  const userGate = checkAuthRateLimit(`onboarding-invites:user:${user.id}`, {
    max: 30,
    windowMs: 60 * 60 * 1000,
  })
  if (!userGate.ok) return rateLimitResponse(userGate.retryAfterSec)

  // Onboarding never grants admin via client role override.
  const role = resolveOnboardingRole(body.role, body.teamChoice)
  const origin = resolveInviteOrigin(req)
  const fromName =
    (user.user_metadata as { full_name?: string; name?: string } | null)?.full_name
    || (user.user_metadata as { name?: string } | null)?.name
    || user.email
    || 'Festag'

  const results: Array<{
    email: string
    ok: boolean
    inviteId: string | null
    mailSent: boolean
    reused?: boolean
    error?: string
  }> = []

  for (const email of emails) {
    const result = await createAndSendTeamInvite({
      email,
      role,
      allowAdminRole: false,
      fromUserId: user.id,
      fromEmail: user.email ?? null,
      fromName,
      origin,
      accessMode: 'open',
      userClient: supa as any,
    })
    results.push({
      email,
      ok: result.ok,
      inviteId: result.inviteId,
      mailSent: result.mailSent,
      reused: result.reused,
      error: result.error || result.mailError,
    })
  }

  const sent = results.filter(r => r.ok && r.mailSent).length
  const failed = results.filter(r => !r.ok).length
  return NextResponse.json({
    ok: failed === 0,
    sent,
    failed,
    total: emails.length,
    role,
    results,
  })
}

function resolveOnboardingRole(role: unknown, teamChoice: unknown): InviteLegacyRole {
  // Prefer teamChoice mapping over a client-supplied role (harder to escalate).
  switch (String(teamChoice || '')) {
    case 'existing_team':
      return 'dev'
    case 'clients_partners':
      return 'client'
    default:
      if (role != null) return parseInviteRole(role, false)
      return 'collaborator'
  }
}
