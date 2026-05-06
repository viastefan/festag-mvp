import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const SUPABASE_URL = 'https://xsdkoepwuvpuroijjain.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzZGtvZXB3dXZwdXJvaWpqYWluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyOTMyNTksImV4cCI6MjA5MTg2OTI1OX0.XL6nisBsFNkxCKAGKdYfdqsXGytEOrWPfBzxqjsPcRk'

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

    // Auth über SSR-Client (cookies)
    const cookieStore = cookies()
    const sbAuth = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() { /* read-only here */ },
      },
    })
    const { data: { user } } = await sbAuth.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'not-authenticated' }, { status: 401 })
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      return NextResponse.json({ error: 'service-key-missing' }, { status: 500 })
    }

    const sb = createClient(SUPABASE_URL, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

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
      // Routing-Hinweis fürs Frontend:
      redirect:  row.role === 'dev' ? '/dev'
              :  row.role === 'admin' ? '/master-control'
              :  '/dashboard',
    })
  } catch (e: any) {
    console.error('[invites/redeem] error:', e)
    return NextResponse.json({ error: e?.message ?? 'unknown' }, { status: 500 })
  }
}
