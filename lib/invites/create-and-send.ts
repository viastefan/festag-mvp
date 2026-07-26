/**
 * Shared email-first team invite create + mail.
 * Used by /api/invites/send and /api/onboarding/invites.
 */

import { randomBytes } from 'crypto'
import { sendInviteAcceptEmail, sendInviteEmail } from '@/lib/email/send'
import { genDevPin } from '@/lib/dev-provision'
import { normalizeEmail } from '@/lib/auth-request'
import { getServiceClient } from '@/lib/supabase/service'
import { isValidInviteEmail, sanitizeInvitedName } from '@/lib/invites/safe'

export type InviteLegacyRole = 'dev' | 'client' | 'collaborator' | 'admin'

export function parseInviteRole(role: unknown, allowAdmin = false): InviteLegacyRole {
  const allowed: InviteLegacyRole[] = allowAdmin
    ? ['dev', 'client', 'collaborator', 'admin']
    : ['dev', 'client', 'collaborator']
  return allowed.includes(role as InviteLegacyRole) ? (role as InviteLegacyRole) : 'collaborator'
}

export async function createAndSendTeamInvite(opts: {
  email: string
  role?: unknown
  /** Only true when the inviter is a workspace owner/admin. */
  allowAdminRole?: boolean
  invitedName?: string | null
  accessMode?: string | null
  projectId?: string | null
  teamId?: string | null
  fromUserId: string
  /** Block inviting the inviter’s own address. */
  fromEmail?: string | null
  fromName?: string | null
  origin: string
  /** User-scoped Supabase client — used when service role is missing. */
  userClient?: { from: (table: string) => any }
}): Promise<{
  ok: boolean
  inviteId: string | null
  mailSent: boolean
  flow: 'accept-first' | 'direct-pin'
  reused?: boolean
  mailError?: string
  error?: string
}> {
  const email = normalizeEmail(opts.email)
  if (!isValidInviteEmail(email)) {
    return { ok: false, inviteId: null, mailSent: false, flow: 'accept-first', error: 'invalid_email' }
  }

  const selfEmail = normalizeEmail(opts.fromEmail || '')
  if (selfEmail && selfEmail === email) {
    return { ok: false, inviteId: null, mailSent: false, flow: 'accept-first', error: 'self_invite' }
  }

  const safeRole = parseInviteRole(opts.role, Boolean(opts.allowAdminRole))
  const safeMode = ['open', 'closed', 'team', 'company'].includes(String(opts.accessMode || ''))
    ? String(opts.accessMode)
    : 'open'
  const invitedName = sanitizeInvitedName(opts.invitedName)
  const projectId =
    typeof opts.projectId === 'string' && /^[0-9a-f-]{36}$/i.test(opts.projectId)
      ? opts.projectId
      : null
  const teamId =
    typeof opts.teamId === 'string' && /^[0-9a-f-]{36}$/i.test(opts.teamId)
      ? opts.teamId
      : null

  const svc = getServiceClient()
  const db = svc || opts.userClient
  if (!db) {
    return {
      ok: false,
      inviteId: null,
      mailSent: false,
      flow: 'accept-first',
      error: 'db_unavailable',
    }
  }

  // Reuse a pending invite to the same address from this inviter (avoid spam duplicates).
  try {
    const { data: existing } = await db
      .from('team_invites')
      .select('id,token,accept_token,status,expires_at')
      .eq('email', email)
      .eq('invited_by', opts.fromUserId)
      .eq('status', 'pending')
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing?.id) {
      const expired = existing.expires_at
        ? new Date(existing.expires_at).getTime() < Date.now()
        : false
      if (!expired) {
        const reuseToken = existing.accept_token || existing.token
        if (reuseToken) {
          const acceptUrl = `${opts.origin}/invite/${reuseToken}`
          const fromName = opts.fromName?.trim() || 'Festag'
          const mailResult = await sendInviteAcceptEmail({
            to: email,
            invitedName,
            role: safeRole,
            fromName,
            acceptUrl,
            ccFounder: true,
          })
          return {
            ok: true,
            inviteId: existing.id,
            mailSent: mailResult.ok,
            flow: 'accept-first',
            reused: true,
            mailError: mailResult.ok ? undefined : ('error' in mailResult ? mailResult.error : undefined),
          }
        }
      }
    }
  } catch (err) {
    console.warn('[createAndSendTeamInvite] duplicate check failed', err)
  }

  const acceptToken = randomBytes(32).toString('hex')
  const directPin = process.env.FESTAG_INVITE_DIRECT_PIN === '1'
  const pin = directPin ? genDevPin() : null

  const row = {
    email,
    role: safeRole,
    kind: safeRole === 'client' ? 'client' : 'contributor',
    invited_by: opts.fromUserId,
    invited_name: invitedName,
    access_mode: safeMode,
    project_id: projectId,
    team_id: teamId,
    tenant_id: opts.fromUserId,
    // Same value in both columns so /invite/[token] and accept_invite RPC resolve.
    token: acceptToken,
    accept_token: acceptToken,
    pin,
    pin_sent_at: directPin && pin ? new Date().toISOString() : null,
    status: 'pending',
    expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  }

  const { data: ins, error } = await db.from('team_invites').insert(row).select('id').single()
  if (error) {
    console.error('[createAndSendTeamInvite] insert error:', error)
    return {
      ok: false,
      inviteId: null,
      mailSent: false,
      flow: directPin ? 'direct-pin' : 'accept-first',
      error: error.message,
    }
  }

  const inviteId = (ins as { id?: string } | null)?.id ?? null
  if (!inviteId) {
    return {
      ok: false,
      inviteId: null,
      mailSent: false,
      flow: directPin ? 'direct-pin' : 'accept-first',
      error: 'insert_failed',
    }
  }

  const acceptUrl = `${opts.origin}/invite/${acceptToken}`
  const fromName = opts.fromName?.trim() || 'Festag'

  let mailResult: { ok: boolean; error?: string }
  if (directPin && pin) {
    mailResult = await sendInviteEmail({
      to: email,
      invitedName,
      role: safeRole,
      fromName,
      pin,
      acceptUrl: `${opts.origin}/login?invite=${inviteId}&email=${encodeURIComponent(email)}`,
      ccFounder: true,
    })
  } else {
    mailResult = await sendInviteAcceptEmail({
      to: email,
      invitedName,
      role: safeRole,
      fromName,
      acceptUrl,
      ccFounder: true,
    })
  }

  // Invite row exists even if mail fails — caller can retry / share link.
  return {
    ok: true,
    inviteId,
    mailSent: mailResult.ok,
    flow: directPin ? 'direct-pin' : 'accept-first',
    mailError: mailResult.ok ? undefined : mailResult.error,
  }
}
