import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildDeliveryPulse } from '@/lib/pulse/build'
import { loadLatestDeliveryPulse, saveDeliveryPulse } from '@/lib/pulse/persist'
import type { PulseScope } from '@/lib/pulse/types'
import { checkAuthRateLimit } from '@/lib/auth-rate-limit'
import {
  assertSameOriginOrNoOrigin,
  getClientIp,
  rateLimitResponse,
} from '@/lib/auth-request'

export const runtime = 'nodejs'

const REFRESH_COOLDOWN_MS = 45_000
const lastRefresh = new Map<string, number>()

/**
 * GET  /api/pulse?scope=overall|project&projectId=
 * POST /api/pulse { scope?, projectId?, force?, refine? }
 *
 * Returns a Delivery Pulse — exactly three calm lines for client/CEO clarity.
 */
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const scope = (url.searchParams.get('scope') === 'project' ? 'project' : 'overall') as PulseScope
  const projectId = url.searchParams.get('projectId')

  const cached = await loadLatestDeliveryPulse(supabase, user.id, {
    scope,
    projectId,
  })
  if (cached) {
    const age = Date.now() - Date.parse(cached.generatedAt)
    if (Number.isFinite(age) && age < 10 * 60 * 1000) {
      return NextResponse.json({ ok: true, pulse: cached, cached: true })
    }
  }

  const pulse = await buildDeliveryPulse(supabase, user.id, {
    scope,
    projectId,
    refineWithTagro: false,
  })
  await saveDeliveryPulse(supabase, user.id, pulse)
  return NextResponse.json({ ok: true, pulse, cached: false })
}

export async function POST(req: NextRequest) {
  const csrf = assertSameOriginOrNoOrigin(req)
  if (csrf) return csrf

  const ipGate = checkAuthRateLimit(`pulse:ip:${getClientIp(req)}`, {
    max: 30,
    windowMs: 15 * 60 * 1000,
  })
  if (!ipGate.ok) return rateLimitResponse(ipGate.retryAfterSec)

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const scope = (body?.scope === 'project' ? 'project' : 'overall') as PulseScope
  const projectId = typeof body?.projectId === 'string' ? body.projectId : null
  const force = Boolean(body?.force)
  const refine = body?.refine !== false

  const key = `${user.id}:${scope}:${projectId || 'all'}`
  const prev = lastRefresh.get(key) ?? 0
  if (!force && Date.now() - prev < REFRESH_COOLDOWN_MS) {
    const cached = await loadLatestDeliveryPulse(supabase, user.id, { scope, projectId })
    if (cached) {
      return NextResponse.json({
        ok: true,
        pulse: cached,
        cached: true,
        cooldownMs: REFRESH_COOLDOWN_MS - (Date.now() - prev),
      })
    }
  }

  const pulse = await buildDeliveryPulse(supabase, user.id, {
    scope,
    projectId,
    refineWithTagro: refine,
  })
  lastRefresh.set(key, Date.now())
  await saveDeliveryPulse(supabase, user.id, pulse)
  return NextResponse.json({ ok: true, pulse, cached: false })
}
