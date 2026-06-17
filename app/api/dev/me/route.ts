import { NextResponse } from 'next/server'
import { resolveDevApiContext, assertDevRole } from '@/lib/dev-api'

export const runtime = 'nodejs'

/**
 * GET /api/dev/me
 *
 * Unified dev identity for browser pages. Works for GitHub OAuth devs
 * (Supabase session) and PIN pool devs (festag_dev_token cookie).
 */
export async function GET(req: Request) {
  const ctx = await resolveDevApiContext(req)
  if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const isDev = await assertDevRole(ctx.db, ctx.user.id)
  if (!isDev) return NextResponse.json({ error: 'not_a_developer' }, { status: 403 })

  const { data: profile } = await (ctx.db as any)
    .from('profiles')
    .select('id,full_name,email,role,approval_status,avatar_url')
    .eq('id', ctx.user.id)
    .maybeSingle()

  return NextResponse.json({
    user: {
      id: ctx.user.id,
      role: profile?.role ?? ctx.user.role ?? 'dev',
      full_name: profile?.full_name ?? null,
      email: profile?.email ?? null,
      approval_status: profile?.approval_status ?? null,
      avatar_url: profile?.avatar_url ?? null,
    },
    auth: {
      kind: ctx.hasSupabaseSession ? 'supabase' : 'pin',
    },
  })
}
