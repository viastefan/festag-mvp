import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { checkAuthRateLimit, clearAuthFailures, recordAuthFailure } from '@/lib/auth-rate-limit'
import {
  getClientIp,
  normalizeEmail,
  normalizePin,
  rateLimitResponse,
} from '@/lib/auth-request'

export const runtime = 'nodejs'

/**
 * Stufe 3 — PIN-Einlösung.
 *   User loggt sich ein (oder ist eingeloggt) und gibt PIN ein.
 *   Server prüft, markiert Invite redeemed, legt seat (status=reserved) an.
 *
 * Body: { email, pin }
 *
 * Voraussetzung: User ist authentifiziert (sonst 401).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = normalizeEmail(body?.email)
    const pin = normalizePin(body?.pin)
    if (!email || !pin) {
      return NextResponse.json({ error: 'missing-fields' }, { status: 400 })
    }

    const ip = getClientIp(req)
    const ipGate = checkAuthRateLimit(`invite-redeem:ip:${ip}`, {
      max: 30,
      windowMs: 15 * 60 * 1000,
      maxFails: 10,
      lockMs: 15 * 60 * 1000,
    })
    if (!ipGate.ok) return rateLimitResponse(ipGate.retryAfterSec, ipGate.reason === 'locked')

    const sbAuth = createClient()
    const { data: { user } } = await sbAuth.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'not-authenticated' }, { status: 401 })
    }

    const sb = getServiceClient()
    if (!sb) {
      return NextResponse.json({ error: 'service-key-missing' }, { status: 500 })
    }

    const { data, error } = await sb.rpc('redeem_invite_pin', {
      p_email:   email,
      p_pin:     pin,
      p_user_id: user.id,
    })
    if (error || !data || !data.length) {
      recordAuthFailure(`invite-redeem:ip:${ip}`)
      return NextResponse.json({ error: 'invalid-pin' }, { status: 400 })
    }

    clearAuthFailures(`invite-redeem:ip:${ip}`)
    const row = data[0] as { invite_id: string; tenant_id: string; role: string; team_id: string|null }

    await sb.from('profiles').upsert({
      id:   user.id,
      role: row.role === 'collaborator' ? 'client' : row.role,
    }, { onConflict: 'id' })

    return NextResponse.json({
      ok:        true,
      tenantId:  row.tenant_id,
      role:      row.role,
      teamId:    row.team_id,
      redirect:  row.role === 'dev' ? '/dev'
              :  row.role === 'admin' ? '/master-control'
              :  '/dashboard',
    })
  } catch {
    console.error('[invites/redeem] error')
    return NextResponse.json({ error: 'unknown' }, { status: 500 })
  }
}
