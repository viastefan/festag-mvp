import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendInvitePinEmail } from '@/lib/email/send'

const SUPABASE_URL = 'https://xsdkoepwuvpuroijjain.supabase.co'

export const runtime = 'nodejs'

/**
 * Stufe 2 des Invite-Flows:
 *   Empfänger klickt im Mail-Acceptance-Link → /invite/[token] → diese Route.
 *   Server markiert Invite als accepted, generiert 6-stelligen PIN,
 *   sendet 2. Mail mit dem PIN.
 *
 * Body: { token }
 */
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'invalid-token' }, { status: 400 })
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      return NextResponse.json({ error: 'service-key-missing' }, { status: 500 })
    }

    const sb = createClient(SUPABASE_URL, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // RPC accept_invite returns { invite_id, email, role, tenant_id, pin, expires_at }
    const { data, error } = await sb.rpc('accept_invite', { p_token: token })
    if (error || !data || !data.length) {
      return NextResponse.json({ error: error?.message ?? 'invite-not-found' }, { status: 404 })
    }

    const row = data[0] as { invite_id: string; email: string; role: 'dev'|'client'|'collaborator'|'admin'; tenant_id: string; pin: string; expires_at: string }

    // Invite holen für invited_name
    const { data: inv } = await sb.from('team_invites')
      .select('invited_name')
      .eq('id', row.invite_id)
      .single()

    const origin    = req.headers.get('origin') ?? new URL(req.url).origin
    const redeemUrl = `${origin}/redeem?email=${encodeURIComponent(row.email)}`

    const result = await sendInvitePinEmail({
      to:          row.email,
      invitedName: (inv as any)?.invited_name ?? null,
      role:        row.role,
      pin:         row.pin,
      redeemUrl,
    })

    return NextResponse.json({
      ok:        true,
      email:     row.email,
      mailSent:  result.ok,
      mailError: result.ok ? undefined : ('error' in result ? result.error : undefined),
      // PIN nur ausliefern, wenn Mail nicht ging — sonst nicht im Browser leaken.
      pin:       result.ok ? undefined : row.pin,
    })
  } catch (e: any) {
    console.error('[invites/accept] error:', e)
    return NextResponse.json({ error: e?.message ?? 'unknown' }, { status: 500 })
  }
}
