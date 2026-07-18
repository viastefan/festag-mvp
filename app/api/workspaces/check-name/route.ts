import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { checkWorkspaceNameAvailability } from '@/lib/workspace-name-availability'
import { checkAuthRateLimit } from '@/lib/auth-rate-limit'
import { getClientIp, rateLimitResponse } from '@/lib/auth-request'

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
 * Uses process-local short TTL inside checkWorkspaceNameAvailability
 * (negatives ~45s, positives ~3s). Rate limit is sync fail-fast 429.
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
    if (!sb) {
      return NextResponse.json({ ok: false, reason: 'service_key_missing' } satisfies WorkspaceNameCheck, { status: 500 })
    }

    const result = await checkWorkspaceNameAvailability(sb, raw, {
      excludeWorkspaceId: excludeId || null,
      excludeProfileId: excludeProfileId || null,
    })
    const res = NextResponse.json(result satisfies WorkspaceNameCheck)
    // Soft browser hint only — do not CDN-cache personalized availability.
    res.headers.set('Cache-Control', 'private, max-age=3')
    return res
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, reason: e?.message || 'check_failed' } satisfies WorkspaceNameCheck,
      { status: 500 },
    )
  }
}
