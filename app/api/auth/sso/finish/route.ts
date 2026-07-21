import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getServiceClient } from '@/lib/supabase/service'
import { getSupabaseUrl } from '@/lib/supabase/env'
import {
  emailDomain,
  findActiveSsoProvider,
  provisionSsoWorkspaceMember,
  ssoProfilePatch,
} from '@/lib/sso/providers'
import { logSsoLoginAttempt } from '@/lib/sso/login-attempts'
import { isSsoProvider } from '@/lib/auth-sso'
import { getClientIp } from '@/lib/auth-request'

export const runtime = 'nodejs'

const SUPABASE_URL = getSupabaseUrl()
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

/**
 * POST /api/auth/sso/finish
 * After SAML callback — sync profile, optional workspace JIT join, audit success.
 */
export async function POST(req: NextRequest) {
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

  const providerName = user.app_metadata?.provider as string | undefined
  if (!isSsoProvider(providerName)) {
    return NextResponse.json({ ok: false, reason: 'not_sso' }, { status: 400 })
  }

  const svc = getServiceClient()
  if (!svc) {
    return NextResponse.json({ ok: false, reason: 'service_unavailable' }, { status: 503 })
  }

  const domain = emailDomain(user.email)
  const orgProvider = domain ? await findActiveSsoProvider(svc, domain) : null

  const profilePatch = ssoProfilePatch(user)
  const { data: existing } = await svc
    .from('profiles')
    .select('id,role')
    .eq('id', user.id)
    .maybeSingle()

  if (!existing?.role) {
    ;(profilePatch as Record<string, unknown>).role = 'client'
  }

  await svc.from('profiles').upsert(profilePatch, { onConflict: 'id' })

  let workspaceJoined = false
  if (orgProvider) {
    const join = await provisionSsoWorkspaceMember({
      sb: svc,
      userId: user.id,
      provider: orgProvider,
    })
    workspaceJoined = join.joined

    if (join.joined) {
      await svc.from('onboarding_state').upsert({
        user_id: user.id,
        workspace_done: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
    }
  }

  await logSsoLoginAttempt(svc, {
    domain,
    emailHint: user.email,
    userId: user.id,
    providerId: orgProvider?.id ?? null,
    outcome: 'success',
    ipAddress: getClientIp(req),
    userAgent: req.headers.get('user-agent'),
  })

  return NextResponse.json({
    ok: true,
    workspaceJoined,
    domain,
    displayName: orgProvider?.display_name || domain,
  })
}
