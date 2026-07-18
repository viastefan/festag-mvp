/**
 * POST /api/dev/session — PIN login.
 * If the invite PIN is still one-time (setup required), returns needs_register
 * without minting a session so the client can finish workspace + personal PIN.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { DEV_TOKEN_COOKIE, DEV_TOKEN_TTL_MS, signDevToken } from '@/lib/dev-auth'

export const runtime = 'nodejs'

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
  if (!token) return NextResponse.json({ ok: false, error: 'signing_unavailable' }, { status: 503 })

  const session = sessionPayload(row)
  const res = NextResponse.json({ ok: true, needs_register: false, session, username })
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
