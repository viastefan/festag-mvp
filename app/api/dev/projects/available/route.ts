import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

/**
 * GET /api/dev/projects/available
 *
 * Returns two lists for the dev panel project pool:
 *   - available: projects the dev is not yet on
 *   - mine:      projects the dev is already assigned to (active rows)
 *
 * RLS would gate a dev from reading projects they're not on, so we route
 * the read through the service client and apply the visibility logic in
 * application code (dev role check + active assignment check).
 */
export async function GET() {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const service = getServiceClient()
  if (!service) {
    return NextResponse.json({ error: 'service unavailable' }, { status: 503 })
  }

  const { data: profile } = await (service as any)
    .from('profiles')
    .select('role,approval_status')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile || (profile.role !== 'dev' && profile.role !== 'admin' && profile.role !== 'project_owner')) {
    return NextResponse.json({ error: 'not a developer' }, { status: 403 })
  }

  // Recent intake/planning/active projects — what a dev would plausibly pick up.
  const { data: projects } = await (service as any)
    .from('projects')
    .select('id,title,description,scope_summary,color,status,project_type,created_at,user_id')
    .neq('status', 'archived')
    .order('created_at', { ascending: false })
    .limit(80)

  const ids = (projects ?? []).map((p: any) => p.id)
  const { data: myActive } = ids.length ? await (service as any)
    .from('project_assignments')
    .select('project_id,role_on_project,created_at')
    .eq('user_id', user.id)
    .eq('active', true)
    .in('project_id', ids) : { data: [] as any[] }

  const mineIds = new Set((myActive ?? []).map((row: any) => row.project_id))

  // Lightweight assignment counts — useful for the "1 Dev dabei" chip.
  const { data: assignCounts } = ids.length ? await (service as any)
    .from('project_assignments')
    .select('project_id')
    .in('project_id', ids)
    .eq('active', true) : { data: [] as any[] }
  const countByProject = new Map<string, number>()
  ;(assignCounts ?? []).forEach((row: any) => {
    countByProject.set(row.project_id, (countByProject.get(row.project_id) ?? 0) + 1)
  })

  const available: any[] = []
  const mine: any[] = []
  for (const p of (projects ?? [])) {
    const shape = {
      id: p.id,
      title: p.title,
      description: p.description,
      scope_summary: p.scope_summary,
      color: p.color,
      status: p.status,
      project_type: p.project_type,
      created_at: p.created_at,
      assigned_count: countByProject.get(p.id) ?? 0,
    }
    if (mineIds.has(p.id)) mine.push(shape)
    else available.push(shape)
  }

  return NextResponse.json({ available, mine })
}
