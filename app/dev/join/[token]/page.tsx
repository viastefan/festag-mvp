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

import { createClient } from '@/lib/supabase/server'
import DevJoinClient from './DevJoinClient'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ token: string }>
}

export default async function DevJoinPage({ params }: Props) {
  const { token } = await params

  // Validate token on the server — never trust client-provided tokens.
  const supabase = await createClient()
  const { data: invite, error } = await supabase
    .from('developer_invites')
    .select('id, invited_email, inviter_name, inviter_email, workspace_name, role, message, expires_at, used_at')
    .eq('token', token)
    .maybeSingle()

  // Determine invite state.
  const now = new Date()

  let state: 'valid' | 'expired' | 'used' | 'invalid' = 'invalid'
  if (!error && invite) {
    if (invite.used_at) {
      state = 'used'
    } else if (new Date(invite.expires_at) < now) {
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
