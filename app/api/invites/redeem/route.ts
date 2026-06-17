import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

/**
 * Stufe 3 — PIN-Einlösung.
 *   User loggt sich ein (oder ist eingeloggt) und gibt PIN ein.
 *   Server prüft, markiert Invite redeemed, legt seat (status=reserved) an.
 *
 * Body: { email, pin }
 *
 * Voraussetzung: User ist authentifiziert (sonst 401).
 *   → Frontend sollte vorher Auto-Signup mit der Invite-Email triggern,
 *     oder Login erfordern.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, pin } = await req.json()
    if (!email || !pin) {
      return NextResponse.json({ error: 'missing-fields' }, { status: 400 })
    }

    const sbAuth = createClient()
    const { data: { user } } = await sbAuth.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'not-authenticated' }, { status: 401 })
    }

    const sb = getServiceClient()
    if (!sb) {
      return NextResponse.json({ error: 'service-key-missing' }, { status: 500 })
    }

    const { data, error } = await sb.rpc('redeem_invite_pin', {
      p_email:   email,
      p_pin:     String(pin).trim(),
      p_user_id: user.id,
    })
    if (error || !data || !data.length) {
      return NextResponse.json({ error: error?.message ?? 'invalid-pin' }, { status: 400 })
    }

    const row = data[0] as { invite_id: string; tenant_id: string; role: string; team_id: string|null }

    // Profil-Rolle synchronisieren (nur wenn noch keine Rolle gesetzt)
    await sb.from('profiles').upsert({
      id:   user.id,
      role: row.role === 'collaborator' ? 'client' : row.role,
    }, { onConflict: 'id' })

    return NextResponse.json({
      ok:        true,
      tenantId:  row.tenant_id,
      role:      row.role,
      teamId:    row.team_id,
      redirect:  row.role === 'dev' ? '/dev'
              :  row.role === 'admin' ? '/master-control'
              :  '/dashboard',
    })
  } catch (e: any) {
    console.error('[invites/redeem] error:', e)
    return NextResponse.json({ error: e?.message ?? 'unknown' }, { status: 500 })
  }
}
