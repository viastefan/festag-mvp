/**
 * POST /api/dev/claim-oauth
 *
 * After Google / Apple / GitHub / email OAuth from /dev/login, stamp linked
 * provider flags on the approved PIN profile that matches the session email
 * (so login-options shows the right buttons), and ensure the session profile
 * can enter the Dev Panel.
 *
 * Also surfaces setup_required so the callback can finish invite register
 * instead of dropping a half-setup account into /dev.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { checkAuthRateLimit } from '@/lib/auth-rate-limit'
import {
  assertSameOriginOrNoOrigin,
  authErrorJson,
  getClientIp,
  normalizeEmail,
  normalizeUsername,
  rateLimitResponse,
} from '@/lib/auth-request'
import { invalidateDevLoginOptionsCache } from '@/lib/dev-login-options-cache'

export const runtime = 'nodejs'

const LIMIT = { max: 30, windowMs: 15 * 60 * 1000 }

const APPROVED_ROLES = new Set(['dev', 'admin', 'project_owner'])

type Provider = 'google' | 'github' | 'apple' | 'email'

function normalizeProvider(raw: unknown, fallback?: string | null): Provider | null {
  const p = String(raw || fallback || '').toLowerCase()
  if (p === 'google' || p === 'github' || p === 'apple' || p === 'email') return p
  return null
}

function linkedPatch(provider: Provider): Record<string, unknown> {
  const now = new Date().toISOString()
  const patch: Record<string, unknown> = { updated_at: now }
  if (provider === 'google') patch.dev_google_linked = true
  if (provider === 'github') patch.dev_github_linked = true
  if (provider === 'apple') patch.dev_apple_linked = true
  if (provider === 'email') patch.dev_email_linked = true
  return patch
}

export async function POST(req: NextRequest) {
  const csrf = assertSameOriginOrNoOrigin(req)
  if (csrf) return csrf

  const ip = getClientIp(req)
  const ipGate = checkAuthRateLimit(`dev-claim-oauth:ip:${ip}`, LIMIT)
  if (!ipGate.ok) return rateLimitResponse(ipGate.retryAfterSec)

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) return authErrorJson(401, 'no_session')

  const userGate = checkAuthRateLimit(`dev-claim-oauth:u:${user.id}`, LIMIT)
  if (!userGate.ok) return rateLimitResponse(userGate.retryAfterSec)

  const body = await req.json().catch(() => ({}))
  const provider =
    normalizeProvider(body?.provider, user.app_metadata?.provider as string | undefined) ||
    normalizeProvider(user.app_metadata?.provider)
  if (!provider) {
    return authErrorJson(400, 'provider_required', 'Unbekannter Login-Anbieter.')
  }

  const service = getServiceClient()
  if (!service) return authErrorJson(503, 'service_unavailable')
  const sb = service as any

  const email = normalizeEmail(user.email || body?.email || '')
  const meta = (user.user_metadata || {}) as Record<string, any>

  const { data: byId } = await sb
    .from('profiles')
    .select(
      'id,email,role,approval_status,dev_username,dev_pin_setup_required,dev_workspace_name,dev_google_linked,dev_github_linked,dev_apple_linked,dev_email_linked',
    )
    .eq('id', user.id)
    .maybeSingle()

  let pinProfile: any = null
  if (email) {
    const { data: byEmail } = await sb
      .from('profiles')
      .select(
        'id,email,role,approval_status,dev_username,dev_pin_setup_required,dev_workspace_name,dev_google_linked,dev_github_linked,dev_apple_linked,dev_email_linked',
      )
      .ilike('email', email)
      .not('dev_username', 'is', null)
      .in('role', ['dev', 'admin', 'project_owner'])
      .eq('approval_status', 'approved')
      .limit(2)
    const rows = Array.isArray(byEmail) ? byEmail : byEmail ? [byEmail] : []
    if (rows.length === 1) pinProfile = rows[0]
    else if (rows.length > 1) {
      pinProfile = rows.find((r: any) => r.id === user.id) || rows[0]
    }
  }

  // Prefer the approved PIN profile when email uniquely resolves one.
  const target = pinProfile?.id ? pinProfile : byId
  if (!target?.id) {
    // Brand-new OAuth account — leave callback's pending_developer upsert as source of truth.
    return NextResponse.json({
      ok: true,
      claimed: false,
      setup_required: false,
      needs_register: false,
      username: null,
      workspace_name: null,
    })
  }

  const patch = linkedPatch(provider)
  if (provider === 'github') {
    const ghUserId = meta.provider_id || meta.sub || null
    const ghIdNum = ghUserId != null ? Number(ghUserId) : NaN
    patch.provider = 'github'
    patch.github_user_id = Number.isFinite(ghIdNum) ? ghIdNum : null
    patch.github_username = meta.user_name || meta.preferred_username || null
    patch.github_avatar_url = meta.avatar_url || null
    patch.github_profile_url =
      meta.html_url || (meta.user_name ? `https://github.com/${meta.user_name}` : null)
    patch.github_email = meta.email || user.email || null
    patch.github_connected_at = new Date().toISOString()
    patch.dev_github_linked = true
  } else if (provider === 'google' || provider === 'apple') {
    patch.provider = provider
  }

  // Stamp linked flags on the PIN / target profile (login-options reads these).
  await sb.from('profiles').update(patch).eq('id', target.id)

  // Session profile may differ when OAuth created a second auth user for the same email.
  if (byId?.id && byId.id !== target.id) {
    const sessionPatch: Record<string, unknown> = { ...linkedPatch(provider), updated_at: new Date().toISOString() }
    if (APPROVED_ROLES.has(String(target.role)) && target.approval_status === 'approved') {
      // Let the OAuth session enter /dev with the same privileges as the PIN account.
      if (!APPROVED_ROLES.has(String(byId.role))) {
        sessionPatch.role = target.role
        sessionPatch.approval_status = 'approved'
      }
      if (!byId.dev_username && target.dev_username) {
        // Do not steal username uniqueness — only copy display hints.
        sessionPatch.full_name = target.dev_workspace_name || target.dev_username
      }
    }
    await sb.from('profiles').update(sessionPatch).eq('id', byId.id)
  } else if (!byId?.id) {
    // Session user has no profile yet — upsert with linked flags + PIN role when known.
    const upsert: Record<string, unknown> = {
      id: user.id,
      email: email || null,
      ...linkedPatch(provider),
    }
    if (APPROVED_ROLES.has(String(target.role)) && target.approval_status === 'approved') {
      upsert.role = target.role
      upsert.approval_status = 'approved'
    }
    await sb.from('profiles').upsert(upsert, { onConflict: 'id' })
  }

  const username = normalizeUsername(target.dev_username)
  if (username) invalidateDevLoginOptionsCache(username)

  const setupRequired = !!target.dev_pin_setup_required
  return NextResponse.json({
    ok: true,
    claimed: true,
    setup_required: setupRequired,
    needs_register: setupRequired,
    username: username || null,
    workspace_name: target.dev_workspace_name || null,
  })
}
