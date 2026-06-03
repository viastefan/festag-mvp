import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

/**
 * GET /api/dev/clients
 *
 * The dev↔client connection (variant a): a developer is "connected" to every
 * client whose project they're actively assigned to. Once connected, the dev
 * can spin up further projects directly for that client (no new invite link).
 *
 * Returns the distinct connected clients: { id, name, email, projectCount }.
 */
export async function GET() {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const service = getServiceClient()
  if (!service) return NextResponse.json({ error: 'service unavailable' }, { status: 503 })
  const sb = service as any

  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = profile?.role
  if (role !== 'dev' && role !== 'admin' && role !== 'project_owner') {
    return NextResponse.json({ error: 'not a developer' }, { status: 403 })
  }

  // Projects the dev is actively assigned to → their owners are the clients.
  const { data: assigns } = await sb
    .from('project_assignments')
    .select('project_id')
    .eq('user_id', user.id)
    .eq('active', true)
  const projectIds = Array.from(new Set((assigns ?? []).map((a: any) => a.project_id).filter(Boolean)))
  if (!projectIds.length) return NextResponse.json({ clients: [] })

  const { data: projects } = await sb
    .from('projects')
    .select('id,user_id')
    .in('id', projectIds)

  const countByClient = new Map<string, number>()
  ;(projects ?? []).forEach((p: any) => {
    if (p.user_id && p.user_id !== user.id) {
      countByClient.set(p.user_id, (countByClient.get(p.user_id) ?? 0) + 1)
    }
  })
  const clientIds = Array.from(countByClient.keys())
  if (!clientIds.length) return NextResponse.json({ clients: [] })

  const { data: profiles } = await sb
    .from('profiles')
    .select('id,full_name,first_name,email')
    .in('id', clientIds)

  const clients = (profiles ?? []).map((c: any) => ({
    id: c.id,
    name: c.full_name?.trim() || c.first_name?.trim() || c.email?.split('@')[0] || 'Kunde',
    email: c.email ?? null,
    projectCount: countByClient.get(c.id) ?? 0,
  })).sort((a: any, b: any) => b.projectCount - a.projectCount)

  return NextResponse.json({ clients })
}
