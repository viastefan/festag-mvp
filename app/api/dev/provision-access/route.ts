import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { getServiceClient } from '@/lib/supabase/service'
import { provisionDevAccess } from '@/lib/dev-provision'
import { checkAuthRateLimit } from '@/lib/auth-rate-limit'
import {
  authErrorJson,
  getClientIp,
  isValidDevPin,
  normalizeEmail,
  normalizePin,
  normalizeUsername,
  rateLimitResponse,
} from '@/lib/auth-request'

export const runtime = 'nodejs'

/**
 * POST /api/dev/provision-access
 *
 * One-off bootstrap for PIN dev login. Protected by CRON_SECRET.
 *
 * Body: {
 *   username, pin?, email?, fullName?, role?,
 *   rotatePin?: boolean  — required to overwrite an existing PIN
 * }
 *
 * Never returns the PIN unless rotatePin/pin was explicitly requested
 * for a fresh invite (avoids accidental secret leaks on idempotent calls).
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || ''
  if (!secret) return authErrorJson(403, 'forbidden')
  try {
    const a = Buffer.from(auth)
    const b = Buffer.from(secret)
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return authErrorJson(403, 'forbidden')
    }
  } catch {
    return authErrorJson(403, 'forbidden')
  }

  const ipGate = checkAuthRateLimit(`dev-provision:ip:${getClientIp(req)}`, {
    max: 10,
    windowMs: 60 * 60 * 1000,
  })
  if (!ipGate.ok) return rateLimitResponse(ipGate.retryAfterSec)

  const service = getServiceClient()
  if (!service) return authErrorJson(503, 'service_unavailable')

  const body = await req.json().catch(() => ({}))
  const username = normalizeUsername(body?.username)
  if (!username || username.length < 2) {
    return authErrorJson(400, 'missing_username')
  }

  const rotatePin = !!body?.rotatePin || !!body?.pin
  const pinRaw = body?.pin != null ? normalizePin(body.pin) : undefined
  if (pinRaw != null && pinRaw.length > 0 && !isValidDevPin(pinRaw)) {
    return authErrorJson(400, 'pin_invalid', 'PIN muss genau 6 Ziffern haben.')
  }

  try {
    const result = await provisionDevAccess(service, {
      username,
      pin: pinRaw && isValidDevPin(pinRaw) ? pinRaw : undefined,
      email: body?.email ? normalizeEmail(body.email) : null,
      fullName: body?.fullName ? String(body.fullName).trim().slice(0, 80) : null,
      role: body?.role === 'dev' || body?.role === 'project_owner' ? body.role : 'admin',
      rotatePin,
      setupRequired: rotatePin ? true : undefined,
    })
    const { pin, ...safe } = result
    return NextResponse.json({
      ok: true,
      ...safe,
      // Only echo PIN when we just minted/rotated it.
      ...(result.rotated ? { pin } : {}),
      loginUrl: '/dev/login',
    })
  } catch (e: any) {
    if (String(e?.message || e) === 'pin_invalid') {
      return authErrorJson(400, 'pin_invalid', 'PIN muss genau 6 Ziffern haben.')
    }
    return authErrorJson(500, 'provision_failed')
  }
}
