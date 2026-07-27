/**
 * POST /api/dev/create-invite
 *
 * Creates a developer invite, emails the invitee (IONOS), and returns the
 * one-time link for manual sharing as fallback.
 *
 * Body: { email: string, role?: string, message?: string, workspaceId?: string }
 * Response: { link: string, expiresAt: string, emailSent: boolean }
 */

import { createHash, randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { checkAuthRateLimit } from '@/lib/auth-rate-limit'
import {
  assertSameOriginOrNoOrigin,
  getClientIp,
  normalizeEmail,
  rateLimitResponse,
} from '@/lib/auth-request'
import { sendDeveloperInviteEmail } from '@/lib/email/send'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

const INVITE_ROLES = ['developer', 'designer', 'reviewer', 'admin'] as const
type InviteRole = typeof INVITE_ROLES[number]
const MANAGER_ROLES = ['owner', 'admin', 'project_manager', 'agency_owner', 'agency_admin']
const RATE_LIMIT = { max: 12, windowMs: 60 * 60 * 1000 }

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function POST(req: NextRequest) {
  const csrf = assertSameOriginOrNoOrigin(req)
  if (csrf) return csrf

  const gate = checkAuthRateLimit(`dev-invite:create:${getClientIp(req)}`, RATE_LIMIT)
  if (!gate.ok) return rateLimitResponse(gate.retryAfterSec)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle()

  const body = await req.json().catch(() => null)
  const email = normalizeEmail(body?.email)
  const requestedRole = String(body?.role ?? 'developer').trim()
  const role: InviteRole = (INVITE_ROLES as readonly string[]).includes(requestedRole)
    ? requestedRole as InviteRole
    : 'developer'
  const message = String(body?.message ?? '').trim().slice(0, 500)
  const requestedWorkspaceId =
    typeof body?.workspaceId === 'string' && body.workspaceId.length > 0
      ? body.workspaceId
      : null

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Ungültige E-Mail-Adresse.' }, { status: 400 })
  }

  const service = getServiceClient()
  if (!service) {
    return NextResponse.json({ error: 'Einladungen sind momentan nicht verfügbar.' }, { status: 503 })
  }

  // Resolve the target workspace, then independently verify that the caller
  // manages it. A global profile role alone never grants cross-workspace access.
  let workspaceId = requestedWorkspaceId
  if (!workspaceId) {
    const { data: owned } = await service
      .from('workspaces')
      .select('id')
      .eq('primary_owner_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    workspaceId = owned?.id ?? null
  }
  if (!workspaceId) {
    const { data: membership } = await service
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .in('role', MANAGER_ROLES)
      .order('joined_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    workspaceId = membership?.workspace_id ?? null
  }

  if (!workspaceId) {
    return NextResponse.json({ error: 'Kein Workspace für die Einladung gefunden.' }, { status: 400 })
  }

  const [{ data: workspace }, { data: membership }] = await Promise.all([
    service
      .from('workspaces')
      .select('id, name, primary_owner_id')
      .eq('id', workspaceId)
      .maybeSingle(),
    service
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  const isOwner = workspace?.primary_owner_id === user.id
  const canManage = isOwner || MANAGER_ROLES.includes(String(membership?.role ?? ''))
  if (!workspace || !canManage) {
    return NextResponse.json({ error: 'Keine Berechtigung für diesen Workspace.' }, { status: 403 })
  }
  if (role === 'admin' && !isOwner && membership?.role !== 'admin') {
    return NextResponse.json({ error: 'Nur Owner oder Admins dürfen Admins einladen.' }, { status: 403 })
  }

  // Revoke older pending links for the same address before creating one fresh
  // single-use token.
  await service
    .from('developer_invites')
    .update({ revoked_at: new Date().toISOString() })
    .eq('workspace_id', workspace.id)
    .eq('invited_email', email)
    .is('used_at', null)
    .is('revoked_at', null)

  const token = randomBytes(32).toString('hex')
  const { data: invite, error: insertErr } = await service
    .from('developer_invites')
    .insert({
      token_hash: hashToken(token),
      inviter_id: user.id,
      inviter_name: profile?.full_name ?? user.email ?? null,
      inviter_email: user.email ?? null,
      workspace_id: workspace.id,
      workspace_name: workspace.name,
      invited_email: email,
      role,
      message: message || null,
    })
    .select('expires_at')
    .single()

  if (insertErr || !invite) {
    console.error('[create-invite]', insertErr)
    return NextResponse.json({ error: 'Einladung konnte nicht erstellt werden.' }, { status: 500 })
  }

  const origin = new URL(req.url).origin
  const link = `${origin}/dev/join/${token}`
  const inviterName = profile?.full_name ?? user.email ?? 'Festag'

  const mail = await sendDeveloperInviteEmail({
    to: email,
    inviterName,
    workspaceName: workspace.name,
    role,
    inviteUrl: link,
    expiresAt: invite.expires_at,
    message: message || null,
    ccFounder: true,
  })

  return NextResponse.json({
    link,
    expiresAt: invite.expires_at,
    emailSent: mail.ok,
    emailSkipped: Boolean(mail.ok === false && 'skipped' in mail && mail.skipped),
  })
}
