import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { sendWelcomeEmail, sendGettingStartedEmail } from '@/lib/email/send'

export const runtime = 'nodejs'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://xsdkoepwuvpuroijjain.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

function appBaseUrl(req: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    req.nextUrl.origin ??
    'https://festag.io'
  )
}

/**
 * POST /api/onboarding/welcome-emails
 *
 * Sends the two onboarding emails (warm welcome + "how everything works")
 * to a newly registered user. Idempotent: guarded by
 * profiles.welcome_emails_sent_at, so repeated calls send at most once.
 *
 * Called from the onboarding completion step alongside seed-memory. No
 * body required — the user is derived from the session cookie.
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const sbCookie = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(_c: { name: string; value: string; options: CookieOptions }[]) { /* read-only */ },
      },
    })
    const { data: { user } } = await sbCookie.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, reason: 'no_session' }, { status: 401 })

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) return NextResponse.json({ ok: false, reason: 'service_key_missing' }, { status: 500 })
    const sb = createServiceClient(SUPABASE_URL, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: profile } = await sb
      .from('profiles')
      .select('first_name,full_name,welcome_emails_sent_at')
      .eq('id', user.id)
      .maybeSingle()

    // Already sent → nothing to do (idempotent).
    if (profile?.welcome_emails_sent_at) {
      return NextResponse.json({ ok: true, skipped: 'already_sent' })
    }

    const to = user.email
    if (!to) return NextResponse.json({ ok: false, reason: 'no_email' })

    const firstName =
      (profile?.first_name as string | null)?.trim() ||
      ((profile?.full_name as string | null)?.trim().split(/\s+/)[0] ?? null)

    const base = appBaseUrl(req)
    const dashUrl = `${base}/dashboard`

    // Claim the guard FIRST to avoid double-sends under concurrent calls.
    await sb.from('profiles')
      .update({ welcome_emails_sent_at: new Date().toISOString() })
      .eq('id', user.id)

    const [welcome, started] = await Promise.all([
      sendWelcomeEmail({ to, firstName, appUrl: dashUrl }),
      sendGettingStartedEmail({ to, firstName, appUrl: dashUrl }),
    ])

    // If the transport isn't configured (dev), release the guard so a real
    // environment can send later.
    if ((welcome as any).skipped || (started as any).skipped) {
      await sb.from('profiles')
        .update({ welcome_emails_sent_at: null })
        .eq('id', user.id)
      return NextResponse.json({ ok: false, skipped: 'transport_unconfigured' })
    }

    return NextResponse.json({ ok: true, welcome, started })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'welcome_failed' }, { status: 500 })
  }
}
