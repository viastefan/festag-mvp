import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { checkWorkspaceNameAvailability } from '@/lib/workspace-name-availability'
import { checkAuthRateLimit } from '@/lib/auth-rate-limit'
import { getClientIp, rateLimitResponse } from '@/lib/auth-request'

export const runtime = 'nodejs'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://xsdkoepwuvpuroijjain.supabase.co'

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
 */
export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const gate = checkAuthRateLimit(`ws-check-name:ip:${ip}`, CHECK_LIMIT)
    if (!gate.ok) return rateLimitResponse(gate.retryAfterSec)

    const raw = req.nextUrl.searchParams.get('name') || ''
    const excludeId = req.nextUrl.searchParams.get('excludeId') || ''
    const excludeProfileId = req.nextUrl.searchParams.get('excludeProfileId') || ''

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      return NextResponse.json({ ok: false, reason: 'service_key_missing' } satisfies WorkspaceNameCheck, { status: 500 })
    }
    const sb = createServiceClient(SUPABASE_URL, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const result = await checkWorkspaceNameAvailability(sb, raw, {
      excludeWorkspaceId: excludeId || null,
      excludeProfileId: excludeProfileId || null,
    })
    return NextResponse.json(result satisfies WorkspaceNameCheck)
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, reason: e?.message || 'check_failed' } satisfies WorkspaceNameCheck,
      { status: 500 },
    )
  }
}
