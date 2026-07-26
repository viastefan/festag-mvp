import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAuthRateLimit } from '@/lib/auth-rate-limit'
import { getClientIp, rateLimitResponse } from '@/lib/auth-request'
import { polishOnboardingField } from '@/lib/tagro/onboarding-field-assist'

export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * POST /api/onboarding/tagro-field
 * Live Tagro assist for onboarding name / position / invite fields.
 *
 * body: { text, variant: 'name'|'position'|'invite', model?: '2.1'|'2.2', mode?: 'preview'|'apply' }
 */
export async function POST(req: NextRequest) {
  const ipGate = checkAuthRateLimit(`onboarding-tagro-field:ip:${getClientIp(req)}`, {
    max: 120,
    windowMs: 60 * 60 * 1000,
  })
  if (!ipGate.ok) return rateLimitResponse(ipGate.retryAfterSec)

  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, reason: 'unauthenticated' }, { status: 401 })
  }

  const userGate = checkAuthRateLimit(`onboarding-tagro-field:user:${user.id}`, {
    max: 90,
    windowMs: 60 * 60 * 1000,
  })
  if (!userGate.ok) return rateLimitResponse(userGate.retryAfterSec)

  try {
    let body: { text?: string; variant?: string; model?: string; mode?: string } = {}
    try {
      body = await req.json()
    } catch { /* empty */ }

    const result = await polishOnboardingField({
      text: body.text,
      variant: body.variant,
      model: body.model,
      mode: body.mode,
    })

    if (!result.ok) {
      const status =
        result.reason === 'text_required' || result.reason === 'variant_required'
          ? 400
          : 500
      return NextResponse.json({ ok: false, reason: result.reason }, { status })
    }

    return NextResponse.json({
      ok: true,
      description: result.description,
      tip: result.tip,
      variant: result.variant,
      model: result.model,
      mode: result.mode,
      changed: result.changed,
      cached: result.cached,
      provider: result.provider,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'failed'
    return NextResponse.json({ ok: false, reason: message }, { status: 500 })
  }
}
