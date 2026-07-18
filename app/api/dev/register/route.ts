/**
 * POST /api/dev/register — complete first-time Dev setup.
 * Verifies the one-time invite PIN, sets workspace name + personal PIN,
 * then mints a long-lived session cookie.
 *
 * Idempotent: if already registered, refuses without wiping the personal PIN.
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
import { normalizeWorkspaceName } from '@/lib/pending-workspace'
import {
  checkWorkspaceNameAvailability,
  invalidateWorkspaceNameCache,
} from '@/lib/workspace-name-availability'

export const runtime = 'nodejs'

const REG_LIMIT = { max: 12, windowMs: 15 * 60 * 1000, maxFails: 8, lockMs: 15 * 60 * 1000 }

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
  let username = normalizeUsername(body?.username)
  const invitePin = normalizePin(body?.invite_pin || body?.pin || '')
  const workspaceName = normalizeWorkspaceName(body?.workspace_name || '')
  const newPin = normalizePin(body?.new_pin || '')

  if (!invitePin) {
    return authErrorJson(400, 'missing_credentials')
  }
  if (!workspaceName || workspaceName.length < 2) {
    return authErrorJson(400, 'workspace_name_required', 'Bitte einen Workspace-Namen eingeben.')
  }
  if (!isValidDevPin(invitePin) || !isValidDevPin(newPin)) {
    return authErrorJson(400, 'pin_invalid', 'Bitte einen 6-stelligen persönlichen PIN wählen.')
  }
  if (newPin === invitePin) {
    return authErrorJson(
      400,
      'pin_reuse',
      'Wähle einen neuen PIN — nicht denselben wie den Einladungs-Code.',
    )
  }

  const ip = getClientIp(req)
  const ipGate = checkAuthRateLimit(`dev-register:ip:${ip}`, REG_LIMIT)
  if (!ipGate.ok) return rateLimitResponse(ipGate.retryAfterSec, ipGate.reason === 'locked')

  const service = getServiceClient()
  if (!service) return authErrorJson(503, 'service_unavailable')
  const sb = service as any

  // Invite PIN is authoritative for first-time setup. Prefer the unique
  // setup account that still holds this one-time PIN — covers missing AND
  // wrong prefill usernames from mail links.
  {
    const { data: byPin } = await sb
      .from('profiles')
      .select('dev_username')
      .eq('dev_pin', invitePin)
      .eq('dev_pin_setup_required', true)
      .limit(2)
    const rows = Array.isArray(byPin) ? byPin : byPin ? [byPin] : []
    if (rows.length === 1 && rows[0]?.dev_username) {
      username = normalizeUsername(rows[0].dev_username)
    }
  }

  if (!username || username.length < 2) {
    return authErrorJson(
      400,
      'missing_credentials',
      'Bitte den Einladungslink aus der Mail öffnen oder den 6-stelligen Einladungs-PIN eingeben.',
    )
  }

  const userGate = checkAuthRateLimit(`dev-register:u:${username}`, REG_LIMIT)
  if (!userGate.ok) return rateLimitResponse(userGate.retryAfterSec, userGate.reason === 'locked')

  const { data, error } = await sb.rpc('verify_dev_pin', {
    username_input: username,
    pin_input: invitePin,
  })
  if (error) {
    recordAuthFailure(`dev-register:u:${username}`, REG_LIMIT)
    recordAuthFailure(`dev-register:ip:${ip}`, REG_LIMIT)
    return authErrorJson(401, 'invalid_credentials')
  }
  const row: any = Array.isArray(data) ? data[0] : data
  if (!row?.user_id) {
    recordAuthFailure(`dev-register:u:${username}`, REG_LIMIT)
    recordAuthFailure(`dev-register:ip:${ip}`, REG_LIMIT)
    return authErrorJson(401, 'invalid_credentials')
  }

  if (!row.setup_required) {
    // Already registered — never overwrite personal PIN / workspace.
    return authErrorJson(
      409,
      'already_registered',
      'Dieses Konto ist bereits eingerichtet. Melde dich mit deinem persönlichen PIN an.',
    )
  }

  // Same global uniqueness as client register (`/api/workspaces/check-name`).
  const availability = await checkWorkspaceNameAvailability(sb, workspaceName, {
    excludeProfileId: String(row.user_id),
    bypassCache: true,
  })
  if (!availability.available) {
    return authErrorJson(
      409,
      'workspace_taken',
      availability.reason || 'Dieser Workspace-Name ist bereits vergeben.',
    )
  }
  const claimedName = availability.name

  const { error: updateError } = await sb
    .from('profiles')
    .update({
      dev_workspace_name: claimedName,
      full_name: claimedName,
      first_name: claimedName.split(/\s+/)[0] || claimedName,
      dev_pin: newPin,
      dev_pin_setup_required: false,
    })
    .eq('id', row.user_id)
    .eq('dev_pin_setup_required', true) // race-safe: never clobber a completed setup

  if (updateError) {
    if (String(updateError.message || '').toLowerCase().includes('idx_profiles_dev_workspace')) {
      return authErrorJson(409, 'workspace_taken', 'Dieser Workspace-Name ist bereits vergeben.')
    }
    return authErrorJson(500, 'update_failed')
  }

  invalidateWorkspaceNameCache(claimedName)

  clearAuthFailures(`dev-register:u:${username}`)
  clearAuthFailures(`dev-register:ip:${ip}`)

  const token = signDevToken(String(row.user_id), String(row.user_role || 'dev'))
  if (!token) return authErrorJson(503, 'signing_unavailable')

  const session = {
    user_id: row.user_id,
    user_email: row.user_email,
    user_role: row.user_role,
    user_name: claimedName,
    workspace_name: claimedName,
    expires: Date.now() + DEV_TOKEN_TTL_MS,
  }

  const res = NextResponse.json({ ok: true, session, username })
  res.cookies.set(DEV_TOKEN_COOKIE, token, cookieOpts(Math.floor(DEV_TOKEN_TTL_MS / 1000)))
  return res
}
