import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { sendSignupNotifyEmail } from '@/lib/email/send'
import { getServiceClient } from '@/lib/supabase/service'
import { getSupabaseUrl } from '@/lib/supabase/env'
import {
  assertSameOriginOrNoOrigin,
  normalizeEmail,
} from '@/lib/auth-request'

export const runtime = 'nodejs'

const SUPABASE_URL = getSupabaseUrl()
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const META_KEY = 'festag_signup_notify_at'
/** Only notify for accounts created in this window (covers OTP + OAuth handoff). */
const NEW_ACCOUNT_WINDOW_MS = 45 * 60 * 1000

/**
 * POST /api/auth/signup-notify
 *
 * Fire-and-forget after a new account signs in for the first time.
 * Emails the founder (FESTAG_MAIL_FOUNDER / stefandirnberger@viawen.com).
 * Idempotent via auth user_metadata.festag_signup_notify_at.
 */
export async function POST(req: NextRequest) {
  const csrf = assertSameOriginOrNoOrigin(req)
  if (csrf) return csrf

  try {
    const cookieStore = cookies()
    const sbCookie = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(_c: { name: string; value: string; options: CookieOptions }[]) { /* read-only */ },
      },
    })
    const { data: { user } } = await sbCookie.auth.getUser()
    if (!user?.email) {
      return NextResponse.json({ ok: false, reason: 'no_session' }, { status: 401 })
    }

    const meta = (user.user_metadata || {}) as Record<string, unknown>
    if (typeof meta[META_KEY] === 'string' && meta[META_KEY]) {
      return NextResponse.json({ ok: true, skipped: 'already_sent' })
    }

    const createdMs = user.created_at ? Date.parse(user.created_at) : NaN
    if (!Number.isFinite(createdMs) || Date.now() - createdMs > NEW_ACCOUNT_WINDOW_MS) {
      return NextResponse.json({ ok: true, skipped: 'not_new' })
    }

    const body = await req.json().catch(() => ({}))
    const workspaceName =
      typeof body?.workspaceName === 'string'
        ? body.workspaceName.replace(/\s+/g, '').trim().slice(0, 64)
        : (
            typeof meta.pending_workspace_name === 'string'
              ? String(meta.pending_workspace_name).replace(/\s+/g, '').trim().slice(0, 64)
              : ''
          )
    const method =
      typeof body?.method === 'string'
        ? body.method.trim().slice(0, 40)
        : String(user.app_metadata?.provider || 'email')

    const svc = getServiceClient()
    if (!svc) {
      return NextResponse.json({ ok: false, reason: 'service_unavailable' }, { status: 503 })
    }

    // Claim first — avoids double-sends under concurrent OTP + callback.
    const claimedAt = new Date().toISOString()
    const { error: claimErr } = await svc.auth.admin.updateUserById(user.id, {
      user_metadata: { ...meta, [META_KEY]: claimedAt },
    })
    if (claimErr) {
      return NextResponse.json({ ok: false, reason: 'claim_failed' }, { status: 500 })
    }

    const result = await sendSignupNotifyEmail({
      email: normalizeEmail(user.email) || user.email,
      userId: user.id,
      method,
      workspaceName: workspaceName || null,
      createdAt: user.created_at ?? null,
    })

    if ((result as { skipped?: boolean }).skipped) {
      await svc.auth.admin.updateUserById(user.id, {
        user_metadata: { ...meta, [META_KEY]: null },
      })
      return NextResponse.json({ ok: false, skipped: 'transport_unconfigured' })
    }

    if (!(result as { ok?: boolean }).ok) {
      await svc.auth.admin.updateUserById(user.id, {
        user_metadata: { ...meta, [META_KEY]: null },
      })
      return NextResponse.json({ ok: false, reason: 'send_failed' }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'signup_notify_failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
