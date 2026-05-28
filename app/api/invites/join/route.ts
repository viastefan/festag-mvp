import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

/**
 * POST /api/invites/join — Link-first Beitritt (kein PIN).
 *
 * Der bereits eingeloggte (oder gerade frisch registrierte) User löst den
 * Token ein. Wir verdrahten den Zugang über project_members und markieren
 * die Einladung als angenommen. Der User behält sein EIGENES Konto/Workspace
 * — das Projekt wird nur zusätzlich sichtbar.
 *
 *   kind contributor → project_members.role = 'dev'   → Redirect /project/[id]
 *   kind client      → project_members.role = 'client' → Redirect /dashboard
 *
 * Body: { token }
 */
export async function POST(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'not-authenticated' }, { status: 401 })

  const { token } = (await req.json().catch(() => ({}))) as { token?: string }
  if (!token) return NextResponse.json({ error: 'missing-token' }, { status: 400 })

  const svc = getServiceClient()
  if (!svc) return NextResponse.json({ error: 'service-key-missing' }, { status: 500 })

  const { data: inv } = await svc
    .from('team_invites')
    .select('id,kind,role,status,expires_at,project_id,accepted_by')
    .eq('token', token)
    .maybeSingle()

  if (!inv) return NextResponse.json({ error: 'invite-not-found' }, { status: 404 })

  const alreadyMine = inv.status === 'accepted' && inv.accepted_by === user.id
  const expired = inv.expires_at ? new Date(inv.expires_at).getTime() < Date.now() : false
  if (!alreadyMine && (inv.status !== 'pending' || expired)) {
    return NextResponse.json({ error: 'invite-expired' }, { status: 410 })
  }

  const kind = (inv.kind as 'contributor' | 'client') || (inv.role === 'client' ? 'client' : 'contributor')
  const memberRole = kind === 'client' ? 'client' : 'dev'

  // Ensure a profile row exists for the FK on project_members.
  await svc.from('profiles').upsert({ id: user.id }, { onConflict: 'id' })

  if (inv.project_id) {
    await svc.from('project_members')
      .upsert(
        { project_id: inv.project_id, user_id: user.id, role: memberRole },
        { onConflict: 'project_id,user_id', ignoreDuplicates: true },
      )
  }

  // Clients are read-side. Only set the legacy profile role to 'client' when it
  // wouldn't downgrade an existing dev/admin account.
  if (kind === 'client') {
    const { data: prof } = await svc.from('profiles').select('role').eq('id', user.id).maybeSingle()
    const cur = (prof as any)?.role
    if (!cur || cur === 'client') {
      await svc.from('profiles').update({ role: 'client' }).eq('id', user.id)
    }
  }

  await svc.from('team_invites')
    .update({ status: 'accepted', accepted_at: new Date().toISOString(), accepted_by: user.id })
    .eq('id', inv.id)

  const redirect =
    kind === 'client'
      ? '/dashboard'
      : inv.project_id ? `/project/${inv.project_id}` : '/dashboard'

  return NextResponse.json({ ok: true, kind, redirect })
}
