/**
 * /dev/join/[token] — Developer Invite Acceptance Page
 *
 * Server Component: validates the token against the DB before anything
 * renders on the client. The developer never sees a form to enter
 * credentials here — this is a "preview and accept" surface only.
 *
 * Security model:
 *   • Token is 64 hex chars (32 random bytes) — brute-force impossible.
 *   • Validated server-side; expired / used tokens get a clear error.
 *   • No password or credential input on this page → phishing moot.
 *   • The domain (festag.app/dev/join/…) is the only valid invite URL.
 *   • Sender identity + workspace shown so the dev can verify the invite.
 */

import { createHash } from 'crypto'
import { getServiceClient } from '@/lib/supabase/service'
import DevJoinClient from './DevJoinClient'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ token: string }>
}

export default async function DevJoinPage({ params }: Props) {
  const { token } = await params
  if (!/^[0-9a-f]{64}$/.test(token)) {
    return <DevJoinClient token={token} state="invalid" invite={null} />
  }

  // Invite records are not exposed through RLS. Only this trusted server
  // component can resolve the SHA-256 digest into preview-safe fields.
  const service = getServiceClient()
  if (!service) {
    return <DevJoinClient token={token} state="unavailable" invite={null} />
  }
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const { data: invite, error } = await service
    .from('developer_invites')
    .select('invited_email, inviter_name, inviter_email, workspace_name, role, message, expires_at, used_at, revoked_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  // Determine invite state.
  const now = new Date()

  let state: 'valid' | 'expired' | 'used' | 'invalid' = 'invalid'
  if (!error && invite) {
    if (invite.used_at) {
      state = 'used'
    } else if (invite.revoked_at || new Date(invite.expires_at) < now) {
      state = 'expired'
    } else {
      state = 'valid'
    }
  }

  const expiresIn = invite?.expires_at
    ? Math.round((new Date(invite.expires_at).getTime() - now.getTime()) / 1000 / 3600)
    : null

  return (
    <DevJoinClient
      token={token}
      state={state}
      invite={state === 'valid' ? {
        invitedEmail:   invite!.invited_email,
        inviterName:    invite!.inviter_name,
        inviterEmail:   invite!.inviter_email,
        workspaceName:  invite!.workspace_name,
        role:           invite!.role,
        message:        invite!.message,
        expiresInHours: expiresIn,
      } : null}
    />
  )
}
