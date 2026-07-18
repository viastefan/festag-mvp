/**
 * POST /api/dev/session — PIN login.
 * If the invite PIN is still one-time (setup required), returns needs_register
 * without minting a session so the client can finish workspace + personal PIN.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { DEV_TOKEN_COOKIE, DEV_TOKEN_TTL_MS, signDevToken } from '@/lib/dev-auth'
import { checkAuthRateLimit, clearAuthFailures, recordAuthFailure } from '@/lib/auth-rate-limit'
import {
  assertSameOriginOrNoOrigin,
  authErrorJson,
  getClientIp,
  isValidDevPin,
  normalizePin,
  normalizeUsername,
  rateLimitResponse,
} from '@/lib/auth-request'

export const runtime = 'nodejs'

const SESSION_LIMIT = { max: 20, windowMs: 15 * 60 * 1000, maxFails: 8, lockMs: 15 * 60 * 1000 }

function sessionPayload(row: any) {
  return {
    user_id: row.user_id,
    user_email: row.user_email,
    user_role: row.user_role,
    user_name: row.user_name || row.workspace_name || null,
    workspace_name: row.workspace_name || null,
    expires: Date.now() + DEV_TOKEN_TTL_MS,
  }
}

function cookieOpts(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production' || process.env.VERCEL === '1',
    path: '/',
    maxAge,
  }
}

export async function POST(req: NextRequest) {
  const csrf = assertSameOriginOrNoOrigin(req)
  if (csrf) return csrf

  const body = await req.json().catch(() => ({}))
  const username = normalizeUsername(body?.username)
  const pin = normalizePin(body?.pin)

  if (!username || username.length < 2 || !pin) {
    return authErrorJson(400, 'missing_credentials')
  }
  if (!isValidDevPin(pin)) {
    return authErrorJson(400, 'pin_invalid', 'PIN muss 6 Ziffern haben.')
  }

  const ip = getClientIp(req)
  const ipGate = checkAuthRateLimit(`dev-session:ip:${ip}`, SESSION_LIMIT)
  if (!ipGate.ok) return rateLimitResponse(ipGate.retryAfterSec, ipGate.reason === 'locked')
  const userGate = checkAuthRateLimit(`dev-session:u:${username}`, SESSION_LIMIT)
  if (!userGate.ok) return rateLimitResponse(userGate.retryAfterSec, userGate.reason === 'locked')

  const service = getServiceClient()
  if (!service) return authErrorJson(503, 'service_unavailable')

  const { data, error } = await (service as any).rpc('verify_dev_pin', {
    username_input: username,
    pin_input: pin,
  })

  if (error || !data) {
    recordAuthFailure(`dev-session:u:${username}`, SESSION_LIMIT)
    recordAuthFailure(`dev-session:ip:${ip}`, SESSION_LIMIT)
    return authErrorJson(401, 'invalid_credentials')
  }

  const row: any = Array.isArray(data) ? data[0] : data
  if (!row?.user_id) {
    recordAuthFailure(`dev-session:u:${username}`, SESSION_LIMIT)
    recordAuthFailure(`dev-session:ip:${ip}`, SESSION_LIMIT)
    return authErrorJson(401, 'invalid_credentials')
  }

  clearAuthFailures(`dev-session:u:${username}`)
  clearAuthFailures(`dev-session:ip:${ip}`)

  const setupRequired = !!row.setup_required

  // First-time invite PIN — must complete register before a long-lived session.
  if (setupRequired) {
    return NextResponse.json({
      ok: true,
      needs_register: true,
      username,
      session: null,
      profile: {
        user_id: row.user_id,
        user_email: row.user_email,
        workspace_name: row.workspace_name || null,
      },
    })
  }

  const token = signDevToken(String(row.user_id), String(row.user_role || 'dev'))
  if (!token) return authErrorJson(503, 'signing_unavailable')

  const session = sessionPayload(row)
  const res = NextResponse.json({ ok: true, needs_register: false, session, username })
  res.cookies.set(DEV_TOKEN_COOKIE, token, cookieOpts(Math.floor(DEV_TOKEN_TTL_MS / 1000)))
  return res
}

export async function DELETE(req: NextRequest) {
  const csrf = assertSameOriginOrNoOrigin(req)
  if (csrf) return csrf
  const res = NextResponse.json({ ok: true })
  res.cookies.set(DEV_TOKEN_COOKIE, '', cookieOpts(0))
  return res
}
