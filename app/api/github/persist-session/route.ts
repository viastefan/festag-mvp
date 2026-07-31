/**
 * POST /api/github/persist-session
 *
 * After Supabase GitHub OAuth / linkIdentity, persist:
 *   • profiles.github_* + dev_github_linked
 *   • github_connections access token (for /api/github/sync etc.)
 *
 * Body: { accessToken?: string, refreshToken?: string, scope?: string }
 * Tokens come from session.provider_token (client) — Supabase does not
 * expose them on the server session helper.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { checkAuthRateLimit } from '@/lib/auth-rate-limit'
import {
  assertSameOriginOrNoOrigin,
  authErrorJson,
  getClientIp,
  rateLimitResponse,
} from '@/lib/auth-request'
import {
  buildGithubProfilePatch,
  hasGithubIdentity,
} from '@/lib/github/link-session'

export const runtime = 'nodejs'

const LIMIT = { max: 40, windowMs: 15 * 60 * 1000 }

export async function POST(req: NextRequest) {
  const csrf = assertSameOriginOrNoOrigin(req)
  if (csrf) return csrf

  const ipGate = checkAuthRateLimit(`gh-persist:ip:${getClientIp(req)}`, LIMIT)
  if (!ipGate.ok) return rateLimitResponse(ipGate.retryAfterSec)

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) return authErrorJson(401, 'no_session')

  const userGate = checkAuthRateLimit(`gh-persist:u:${user.id}`, LIMIT)
  if (!userGate.ok) return rateLimitResponse(userGate.retryAfterSec)

  if (!hasGithubIdentity(user)) {
    return NextResponse.json({
      ok: false,
      error: 'github_not_linked',
      message: 'Kein GitHub-Konto an dieser Session.',
    }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  const accessToken =
    typeof body?.accessToken === 'string' && body.accessToken.length > 8
      ? body.accessToken
      : null
  const refreshToken =
    typeof body?.refreshToken === 'string' && body.refreshToken.length > 8
      ? body.refreshToken
      : null
  const scope =
    typeof body?.scope === 'string' && body.scope.trim()
      ? body.scope.trim().slice(0, 500)
      : 'read:user user:email read:org repo'

  const service = getServiceClient()
  if (!service) return authErrorJson(503, 'service_unavailable')

  // Do not overwrite primary provider when GitHub is only a linked identity
  // (email/Google remains primary for login). Still stamp github_* fields.
  const patch = buildGithubProfilePatch(user, { setPrimaryProvider: false })
  const { error: profileErr } = await service
    .from('profiles')
    .upsert(patch, { onConflict: 'id' })

  if (profileErr) {
    console.error('[github/persist-session] profile', profileErr)
    return NextResponse.json({ ok: false, error: 'profile_update_failed' }, { status: 500 })
  }

  let connectionSaved = false
  if (accessToken) {
    const meta = patch as Record<string, any>
    const { error: connErr } = await service
      .from('github_connections')
      .upsert({
        developer_id: user.id,
        github_user_id: meta.github_user_id ?? null,
        github_username: meta.github_username ?? null,
        access_token_encrypted: accessToken,
        refresh_token_encrypted: refreshToken,
        scope,
        connected_at: new Date().toISOString(),
        revoked_at: null,
      }, { onConflict: 'developer_id' })

    if (connErr) {
      console.error('[github/persist-session] connection', connErr)
      return NextResponse.json({
        ok: true,
        profileSaved: true,
        connectionSaved: false,
        warning: 'token_persist_failed',
      })
    }
    connectionSaved = true
  }

  return NextResponse.json({
    ok: true,
    profileSaved: true,
    connectionSaved,
    githubUsername: (patch as any).github_username ?? null,
  })
}
