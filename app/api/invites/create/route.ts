import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

/**
 * POST /api/invites/create — Link-first Einladung.
 *
 * Erzeugt eine team_invites-Zeile (echte Spalten: token, kind, role,
 * project_id …) und gibt einen Beitritts-Link zurück. KEINE E-Mail, KEIN
 * PIN — der Host kopiert den Link und teilt ihn selbst. Genau ein Flow:
 *
 *   kind = 'contributor'  → Mitwirkende:  bekommt Dev-/Projektzugang (role dev)
 *   kind = 'client'       → Kunde:        landet im Client-Panel (role client)
 *
 * Body: { kind, projectId?, email?, invitedName? }
 * Antwort: { ok, token, url }
 *
 * Der Eingeladene erstellt über den Link sein EIGENES Konto (eigenes
 * Onboarding) — kein Workspace-Zwang. Das zugewiesene Projekt ist nach
 * dem Beitritt sofort sichtbar (project_members).
 */

type Body = {
  kind?: 'contributor' | 'client'
  projectId?: string | null
  email?: string | null
  invitedName?: string | null
}

export async function POST(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const b = (await req.json().catch(() => ({}))) as Body
  const kind: 'contributor' | 'client' = b.kind === 'client' ? 'client' : 'contributor'
  const role = kind === 'client' ? 'client' : 'dev'
  const email = (b.email || '').trim().toLowerCase() || null
  const invitedName = (b.invitedName || '').trim() || null
  const projectId = b.projectId || null

  // If a project is assigned, the inviter must actually own/lead it. We read
  // through the user-bound (RLS) client so we only allow projects they can see,
  // then double-check ownership.
  if (projectId) {
    const { data: proj } = await (supa as any)
      .from('projects')
      .select('id,user_id,workspace_id')
      .eq('id', projectId)
      .maybeSingle()
    if (!proj) {
      return NextResponse.json({ error: 'project_not_found' }, { status: 404 })
    }
    let allowed = proj.user_id === user.id
    if (!allowed && proj.workspace_id) {
      const { data: ws } = await (supa as any)
        .from('workspaces')
        .select('id')
        .eq('id', proj.workspace_id)
        .eq('primary_owner_id', user.id)
        .maybeSingle()
      allowed = !!ws
    }
    if (!allowed) {
      const { data: mem } = await (supa as any)
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .maybeSingle()
      allowed = mem?.role === 'lead'
    }
    if (!allowed) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const svc = getServiceClient()
  if (!svc) return NextResponse.json({ error: 'service-key-missing' }, { status: 500 })

  const token = randomBytes(24).toString('hex')
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await svc.from('team_invites').insert({
    token,
    email,
    role,
    kind,
    invited_by: user.id,
    invited_name: invitedName,
    access_mode: 'closed',
    project_id: projectId,
    status: 'pending',
    expires_at: expiresAt,
  })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const origin = req.headers.get('origin') ?? new URL(req.url).origin
  return NextResponse.json({ ok: true, token, url: `${origin}/invite/${token}` })
}
