/**
 * POST /api/dev/register — complete first-time Dev setup.
 * Verifies the one-time invite PIN, sets workspace name + personal PIN,
 * then mints a long-lived session cookie.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { DEV_TOKEN_COOKIE, DEV_TOKEN_TTL_MS, signDevToken } from '@/lib/dev-auth'

export const runtime = 'nodejs'

function normalizeWorkspaceName(raw: string): string {
  return String(raw || '').replace(/\s+/g, ' ').trim().slice(0, 64)
}

function normalizePin(raw: string): string {
  return String(raw || '').replace(/\D/g, '').slice(0, 6)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const username = String(body?.username || '').trim().toLowerCase()
  const invitePin = normalizePin(body?.invite_pin || body?.pin || '')
  const workspaceName = normalizeWorkspaceName(body?.workspace_name || '')
  const newPin = normalizePin(body?.new_pin || '')

  if (!username || !invitePin) {
    return NextResponse.json({ ok: false, error: 'missing_credentials' }, { status: 400 })
  }
  if (!workspaceName || workspaceName.length < 2) {
    return NextResponse.json({ ok: false, error: 'workspace_name_required', message: 'Bitte einen Workspace-Namen eingeben.' }, { status: 400 })
  }
  if (newPin.length !== 6) {
    return NextResponse.json({ ok: false, error: 'pin_invalid', message: 'Bitte einen 6-stelligen persönlichen PIN wählen.' }, { status: 400 })
  }
  if (newPin === invitePin) {
    return NextResponse.json({
      ok: false,
      error: 'pin_reuse',
      message: 'Wähle einen neuen PIN — nicht denselben wie den Einladungs-Code.',
    }, { status: 400 })
  }

  const service = getServiceClient()
  if (!service) return NextResponse.json({ ok: false, error: 'service_unavailable' }, { status: 503 })
  const sb = service as any

  const { data, error } = await sb.rpc('verify_dev_pin', {
    username_input: username,
    pin_input: invitePin,
  })
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 401 })
  const row: any = Array.isArray(data) ? data[0] : data
  if (!row?.user_id) return NextResponse.json({ ok: false, error: 'invalid_credentials' }, { status: 401 })

  if (!row.setup_required) {
    // Already registered — treat as normal login with personal PIN instead.
    return NextResponse.json({
      ok: false,
      error: 'already_registered',
      message: 'Dieses Konto ist bereits eingerichtet. Melde dich mit deinem persönlichen PIN an.',
    }, { status: 409 })
  }

  const { data: taken } = await sb
    .from('profiles')
    .select('id')
    .neq('id', row.user_id)
    .ilike('dev_workspace_name', workspaceName)
    .maybeSingle()
  if (taken?.id) {
    return NextResponse.json({
      ok: false,
      error: 'workspace_taken',
      message: 'Dieser Workspace-Name ist bereits vergeben.',
    }, { status: 409 })
  }

  const { error: updateError } = await sb.from('profiles').update({
    dev_workspace_name: workspaceName,
    full_name: workspaceName,
    first_name: workspaceName.split(/\s+/)[0] || workspaceName,
    dev_pin: newPin,
    dev_pin_setup_required: false,
  }).eq('id', row.user_id)

  if (updateError) {
    if (String(updateError.message || '').toLowerCase().includes('idx_profiles_dev_workspace')) {
      return NextResponse.json({
        ok: false,
        error: 'workspace_taken',
        message: 'Dieser Workspace-Name ist bereits vergeben.',
      }, { status: 409 })
    }
    return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 })
  }

  const token = signDevToken(String(row.user_id), String(row.user_role || 'dev'))
  if (!token) return NextResponse.json({ ok: false, error: 'signing_unavailable' }, { status: 503 })

  const session = {
    user_id: row.user_id,
    user_email: row.user_email,
    user_role: row.user_role,
    user_name: workspaceName,
    workspace_name: workspaceName,
    expires: Date.now() + DEV_TOKEN_TTL_MS,
  }

  const res = NextResponse.json({ ok: true, session, username })
  res.cookies.set(DEV_TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(DEV_TOKEN_TTL_MS / 1000),
  })
  return res
}
