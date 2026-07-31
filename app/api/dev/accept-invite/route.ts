/**
 * POST /api/dev/accept-invite
 *
 * Accepts a developer invite token.
 *
 * Security:
 *   • Re-validates token server-side (even though the Server Component
 *     already validated it — defence in depth).
 *   • Marks the token as used atomically (used_at + used_by).
 *   • Returns whether the user is new (→ onboarding) or existing (→ login).
 *
 * Body: { token: string }
 * Response: { isNewUser: boolean } | { error: string }
 */

import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { assertSameOriginOrNoOrigin } from '@/lib/auth-request'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import {
  inferRelationshipFromWorkspaceMode,
  isDevRelationshipKind,
} from '@/lib/dev/relationship'

export const runtime = 'nodejs'

const PROFILE_ROLE: Record<string, string> = {
  developer: 'dev',
  designer: 'dev',
  reviewer: 'dev',
  admin: 'admin',
}
const WORKSPACE_ROLE: Record<string, string> = {
  developer: 'developer',
  designer: 'member',
  reviewer: 'reviewer',
  admin: 'admin',
}

function validToken(token: unknown): token is string {
  return typeof token === 'string' && /^[0-9a-f]{64}$/.test(token)
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function POST(req: NextRequest) {
  const csrf = assertSameOriginOrNoOrigin(req)
  if (csrf) return csrf

  const body = await req.json().catch(() => null)
  const token: unknown = body?.token

  if (!validToken(token)) {
    return NextResponse.json({ error: 'Ungültiger Token.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const service = getServiceClient()
  if (!service) {
    return NextResponse.json({ error: 'Einladungen sind momentan nicht verfügbar.' }, { status: 503 })
  }

  const { data: invite, error: fetchErr } = await service
    .from('developer_invites')
    .select('id, inviter_id, invited_email, workspace_id, role, relationship_kind, workspace_mode, expires_at, used_at, revoked_at')
    .eq('token_hash', hashToken(token))
    .maybeSingle()

  if (fetchErr || !invite) {
    return NextResponse.json({ error: 'Einladung nicht gefunden.' }, { status: 404 })
  }

  if (invite.used_at) {
    return NextResponse.json({ error: 'Diese Einladung wurde bereits verwendet.' }, { status: 409 })
  }

  if (invite.revoked_at) {
    return NextResponse.json({ error: 'Diese Einladung wurde zurückgezogen.' }, { status: 410 })
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Diese Einladung ist abgelaufen.' }, { status: 410 })
  }

  // Never consume an invite before authentication. The auth flow returns to
  // this same URL and the user explicitly accepts again.
  if (!user) {
    const returnTo = `/join?token=${encodeURIComponent(String(token))}&source=developer`
    return NextResponse.json({
      needsAuth: true,
      authHref: `/register?devInvite=${token}&email=${encodeURIComponent(invite.invited_email)}&returnTo=${encodeURIComponent(returnTo)}`,
    })
  }

  if ((user.email ?? '').trim().toLowerCase() !== invite.invited_email) {
    return NextResponse.json({
      error: `Diese Einladung gehört zu ${invite.invited_email}. Bitte melde dich mit dieser Adresse an.`,
    }, { status: 403 })
  }

  const now = new Date().toISOString()
  const { data: claimed, error: claimError } = await service
    .from('developer_invites')
    .update({ used_at: now, used_by: user.id })
    .eq('id', invite.id)
    .is('used_at', null)
    .is('revoked_at', null)
    .gt('expires_at', now)
    .select('id')
    .maybeSingle()

  if (claimError || !claimed) {
    return NextResponse.json({ error: 'Die Einladung wurde bereits verwendet oder ist abgelaufen.' }, { status: 409 })
  }

  const workspaceRole = WORKSPACE_ROLE[invite.role] ?? 'developer'
  const relationshipKind = isDevRelationshipKind(invite.relationship_kind)
    ? invite.relationship_kind
    : inferRelationshipFromWorkspaceMode(invite.workspace_mode)

  const { error: memberError } = await service
    .from('workspace_members')
    .upsert({
      workspace_id: invite.workspace_id,
      user_id: user.id,
      role: workspaceRole,
      invited_email: invite.invited_email,
      invited_by: invite.inviter_id,
      joined_at: now,
      relationship_kind: relationshipKind,
    }, { onConflict: 'workspace_id,user_id' })

  const { data: existingProfile } = await service
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle()

  const invitedProfileRole = PROFILE_ROLE[invite.role] ?? 'dev'
  const protectedRole = ['admin', 'project_owner'].includes(String(existingProfile?.role ?? ''))
  // Workspace linkage lives in workspace_members — profiles has no workspace_id.
  // Invite relationship becomes home posture (invite wins over cold-start).
  const profilePatch = {
    email: user.email ?? invite.invited_email,
    approval_status: 'approved',
    dev_relationship: relationshipKind,
    ...(protectedRole ? {} : { role: invitedProfileRole }),
    updated_at: now,
  }
  const profileResult = existingProfile
    ? await service.from('profiles').update(profilePatch).eq('id', user.id)
    : await service.from('profiles').insert({ id: user.id, ...profilePatch })

  if (memberError || profileResult.error) {
    // Do not burn the one-time link when membership provisioning fails.
    await service
      .from('developer_invites')
      .update({ used_at: null, used_by: null })
      .eq('id', invite.id)
      .eq('used_by', user.id)
    console.error('[accept-invite] provisioning failed', memberError ?? profileResult.error)
    return NextResponse.json({ error: 'Workspace-Zugang konnte nicht eingerichtet werden.' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    redirectTo: `/join?token=${encodeURIComponent(String(token))}&source=developer`,
    relationshipKind,
  })
}
