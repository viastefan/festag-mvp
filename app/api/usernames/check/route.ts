import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { checkAuthRateLimit } from '@/lib/auth-rate-limit'
import { getClientIp, rateLimitResponse } from '@/lib/auth-request'
import { normalizeWorkspaceName } from '@/lib/pending-workspace'

export const runtime = 'nodejs'

const CHECK_LIMIT = { max: 40, windowMs: 60 * 1000 }

export type UsernameCheck =
  | { ok: true; available: true; name: string }
  | { ok: true; available: false; name: string; reason: string }
  | { ok: false; reason: string }

/**
 * GET /api/usernames/check?name=stefan&excludeProfileId=
 * Live uniqueness for profiles.dev_username (personal Festag handle).
 */
export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const gate = checkAuthRateLimit(`username-check:ip:${ip}`, CHECK_LIMIT)
    if (!gate.ok) return rateLimitResponse(gate.retryAfterSec)

    const raw = normalizeWorkspaceName(req.nextUrl.searchParams.get('name') || '')
    const excludeProfileId = (req.nextUrl.searchParams.get('excludeProfileId') || '').trim()

    if (!raw || raw.length < 2) {
      return NextResponse.json({
        ok: true,
        available: false,
        name: raw,
        reason: 'Mindestens 2 Zeichen.',
      } satisfies UsernameCheck)
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(raw)) {
      return NextResponse.json({
        ok: true,
        available: false,
        name: raw,
        reason: 'Nur Buchstaben, Zahlen, Punkt, Unterstrich oder Bindestrich.',
      } satisfies UsernameCheck)
    }

    const sb = getServiceClient()
    if (!sb) {
      return NextResponse.json(
        { ok: false, reason: 'check_unavailable' } satisfies UsernameCheck,
        { status: 503 },
      )
    }

    let q = sb
      .from('profiles')
      .select('id')
      .ilike('dev_username', raw)
      .limit(1)
    if (excludeProfileId) q = q.neq('id', excludeProfileId)
    const { data, error } = await q.maybeSingle()
    if (error) {
      return NextResponse.json(
        { ok: false, reason: error.message || 'check_failed' } satisfies UsernameCheck,
        { status: 500 },
      )
    }
    if (data?.id) {
      return NextResponse.json({
        ok: true,
        available: false,
        name: raw,
        reason: 'Bereits vergeben',
      } satisfies UsernameCheck)
    }

    const res = NextResponse.json({
      ok: true,
      available: true,
      name: raw,
    } satisfies UsernameCheck)
    res.headers.set('Cache-Control', 'private, max-age=3')
    return res
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, reason: e?.message || 'check_failed' } satisfies UsernameCheck,
      { status: 500 },
    )
  }
}
