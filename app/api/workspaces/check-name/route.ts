import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServiceClient } from '@/lib/supabase/service'
import { checkWorkspaceNameAvailability } from '@/lib/workspace-name-availability'
import { checkAuthRateLimit } from '@/lib/auth-rate-limit'
import { getClientIp, rateLimitResponse } from '@/lib/auth-request'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/env'

export const runtime = 'nodejs'

const CHECK_LIMIT = { max: 40, windowMs: 60 * 1000 }

export type WorkspaceNameCheck =
  | { ok: true; available: true; name: string; slug: string }
  | { ok: true; available: false; name: string; slug: string; reason: string }
  | { ok: false; reason: string }

/**
 * GET /api/workspaces/check-name?name=Acme
 *
 * Public availability check — workspace names must be globally unique (slug)
 * so client ↔ developer linking can resolve a single workspace.
 * Also blocks names already claimed as profiles.dev_workspace_name.
 *
 * Prefers service-role client; falls back to SECURITY DEFINER RPC via anon
 * when SUPABASE_SERVICE_ROLE_KEY is missing (e.g. Vercel misconfig).
 */
export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const gate = checkAuthRateLimit(`ws-check-name:ip:${ip}`, CHECK_LIMIT)
    if (!gate.ok) return rateLimitResponse(gate.retryAfterSec)

    const raw = req.nextUrl.searchParams.get('name') || ''
    const excludeId = req.nextUrl.searchParams.get('excludeId') || ''
    const excludeProfileId = req.nextUrl.searchParams.get('excludeProfileId') || ''

    const sb = getServiceClient()
    if (sb) {
      const result = await checkWorkspaceNameAvailability(sb, raw, {
        excludeWorkspaceId: excludeId || null,
        excludeProfileId: excludeProfileId || null,
      })
      const res = NextResponse.json(result satisfies WorkspaceNameCheck)
      res.headers.set('Cache-Control', 'private, max-age=3')
      return res
    }

    // No service role — use public RPC (SECURITY DEFINER, availability only).
    const anon = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data, error } = await anon.rpc('check_workspace_name_available', {
      p_name: raw,
      p_exclude_workspace_id: excludeId || null,
      p_exclude_profile_id: excludeProfileId || null,
    })
    if (error || !data || typeof data !== 'object') {
      return NextResponse.json(
        { ok: false, reason: error?.message || 'check_failed' } satisfies WorkspaceNameCheck,
        { status: 500 },
      )
    }
    const payload = data as WorkspaceNameCheck
    const res = NextResponse.json(payload)
    res.headers.set('Cache-Control', 'private, max-age=3')
    return res
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, reason: e?.message || 'check_failed' } satisfies WorkspaceNameCheck,
      { status: 500 },
    )
  }
}
