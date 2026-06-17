/**
 * /api/dev/session — PIN login session bridge.
 *
 * POST { username, pin } → verifies via the verify_dev_pin RPC and, on
 * success, sets the httpOnly festag_dev_token cookie so every dev API
 * route can identify the developer (PIN logins have no Supabase auth
 * session — see lib/dev-auth.ts for the full story).
 *
 * DELETE → clears the cookie (logout).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { DEV_TOKEN_COOKIE, DEV_TOKEN_TTL_MS, signDevToken } from '@/lib/dev-auth'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const username = String(body?.username || '').trim().toLowerCase()
  const pin = String(body?.pin || '').trim()
  if (!username || !pin) {
    return NextResponse.json({ ok: false, error: 'missing_credentials' }, { status: 400 })
  }

  const service = getServiceClient()
  if (!service) return NextResponse.json({ ok: false, error: 'service_unavailable' }, { status: 503 })

  const { data, error } = await (service as any).rpc('verify_dev_pin', {
    username_input: username,
    pin_input: pin,
  })
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 401 })
  const row: any = Array.isArray(data) ? data[0] : data
  if (!row?.user_id) return NextResponse.json({ ok: false, error: 'invalid_credentials' }, { status: 401 })

  const token = signDevToken(String(row.user_id), String(row.user_role || 'dev'))
  if (!token) return NextResponse.json({ ok: false, error: 'signing_unavailable' }, { status: 503 })

  const res = NextResponse.json({
    ok: true,
    session: {
      user_id: row.user_id,
      user_email: row.user_email,
      user_role: row.user_role,
      expires: Date.now() + DEV_TOKEN_TTL_MS,
    },
  })
  res.cookies.set(DEV_TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(DEV_TOKEN_TTL_MS / 1000),
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(DEV_TOKEN_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}
