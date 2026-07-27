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

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const token: string | undefined = body?.token

  if (!token || typeof token !== 'string' || token.length < 60) {
    return NextResponse.json({ error: 'Ungültiger Token.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Lookup invite — use exact token match.
  const { data: invite, error: fetchErr } = await supabase
    .from('developer_invites')
    .select('id, invited_email, workspace_id, workspace_name, role, expires_at, used_at')
    .eq('token', token)
    .maybeSingle()

  if (fetchErr || !invite) {
    return NextResponse.json({ error: 'Einladung nicht gefunden.' }, { status: 404 })
  }

  if (invite.used_at) {
    return NextResponse.json({ error: 'Diese Einladung wurde bereits verwendet.' }, { status: 409 })
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Diese Einladung ist abgelaufen.' }, { status: 410 })
  }

  // If the developer already has a Supabase session, mark the invite used
  // and update their profile role.
  if (user) {
    // Mark invite as used.
    await supabase
      .from('developer_invites')
      .update({ used_at: new Date().toISOString(), used_by: user.id })
      .eq('id', invite.id)

    // Upsert their profile as developer in this workspace.
    await supabase
      .from('profiles')
      .upsert({
        id:           user.id,
        role:         invite.role ?? 'developer',
        workspace_id: invite.workspace_id,
        approval_status: 'approved',
        updated_at:   new Date().toISOString(),
      }, { onConflict: 'id', ignoreDuplicates: false })

    return NextResponse.json({ isNewUser: false })
  }

  // No session → new developer. Mark invite as used (pre-accept) so the
  // token can't be replayed, then the dev goes through onboarding where
  // they create their Supabase account.
  await supabase
    .from('developer_invites')
    .update({ used_at: new Date().toISOString() })
    .eq('id', invite.id)

  return NextResponse.json({ isNewUser: true })
}
