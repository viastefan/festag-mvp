/**
 * GET /api/dev/login-options?username=
 * Returns which auth methods to show for a remembered/known developer.
 * Linked providers come from profile flags (and auth.identities when available).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const username = String(req.nextUrl.searchParams.get('username') || '').trim().toLowerCase()
  if (!username) {
    return NextResponse.json({
      ok: true,
      found: false,
      setup_required: false,
      workspace_name: null,
      google: false,
      github: false,
      apple: false,
    })
  }

  const service = getServiceClient()
  if (!service) return NextResponse.json({ ok: false, error: 'service_unavailable' }, { status: 503 })
  const sb = service as any

  const { data: profile } = await sb
    .from('profiles')
    .select('id,email,dev_username,dev_workspace_name,dev_pin_setup_required,dev_google_linked,dev_github_linked,dev_apple_linked')
    .eq('dev_username', username)
    .maybeSingle()

  if (!profile?.id) {
    return NextResponse.json({
      ok: true,
      found: false,
      setup_required: false,
      workspace_name: null,
      google: false,
      github: false,
      apple: false,
    })
  }

  let google = !!profile.dev_google_linked
  let github = !!profile.dev_github_linked
  let apple = !!profile.dev_apple_linked

  // Best-effort: enrich from auth.identities when service role can read them.
  try {
    const { data: userData } = await sb.auth.admin.getUserById(profile.id)
    const identities = userData?.user?.identities || []
    for (const id of identities) {
      const provider = String(id?.provider || '')
      if (provider === 'google') google = true
      if (provider === 'github') github = true
      if (provider === 'apple') apple = true
    }
  } catch { /* identities unavailable — flags only */ }

  return NextResponse.json({
    ok: true,
    found: true,
    setup_required: !!profile.dev_pin_setup_required,
    workspace_name: profile.dev_workspace_name || null,
    email: profile.email || null,
    google,
    github,
    // Only expose Apple when truly linked (no Sign-In wire-up yet for cold starts).
    apple,
  })
}
