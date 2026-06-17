import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DECISION_OPEN_STATUS_LIST } from '@/lib/decisions/types'

export const runtime = 'nodejs'

/**
 * GET /api/dev/decisions
 * Lists decisions across projects the dev can access.
 */
export async function GET() {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: pa } = await (supa as any)
    .from('project_assignments')
    .select('project_id')
    .eq('user_id', user.id)
    .eq('active', true)

  const assignedIds = ((pa as any[]) ?? []).map(r => r.project_id).filter(Boolean)

  const { data: owned } = await (supa as any)
    .from('projects')
    .select('id')
    .or(`user_id.eq.${user.id},client_id.eq.${user.id}`)

  const projectIds = Array.from(new Set([
    ...assignedIds,
    ...((owned as any[]) ?? []).map(p => p.id),
  ]))

  if (!projectIds.length) {
    return NextResponse.json({ decisions: [], projects: [], open_count: 0 })
  }

  const { data: decisions, error } = await (supa as any)
    .from('decisions')
    .select('id,project_id,title,client_title,status,urgency,response_type,decision_type,requested_for,created_by,source_task_id,created_at,updated_at,decided_at,tagro_delegation_reason')
    .in('project_id', projectIds)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: projects } = await (supa as any)
    .from('projects')
    .select('id,title,color')
    .in('id', projectIds)

  const rows = (decisions as any[]) ?? []
  const openCount = rows.filter(d => DECISION_OPEN_STATUS_LIST.includes(d.status)).length

  return NextResponse.json({
    decisions: rows,
    projects: projects ?? [],
    open_count: openCount,
  })
}
