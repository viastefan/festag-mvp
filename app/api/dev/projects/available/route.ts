import { NextResponse } from 'next/server'
import { getDevUserFromRequest } from '@/lib/dev-auth'
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
export async function GET(req: Request) {
  const supa = createClient()
  const { data: { user: cookieUser } } = await supa.auth.getUser()
  // PIN-Dev fallback: kein Supabase-Cookie, aber signierter Dev-Token.
  const user = cookieUser ?? getDevUserFromRequest(req)
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
    .select('id,title,description,scope_summary,color,status,project_type,delivery_model,created_at,user_id,workspace_id,client_id,budget_min,budget_max,budget_currency')
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

  // Resolve workspace + client names so the dev panel can show which workspace
  // and client each project belongs to (the workspace model — see
  // docs/email-and-workspace-model.md). Batched: one query per lookup table.
  const workspaceIds = Array.from(new Set((projects ?? []).map((p: any) => p.workspace_id).filter(Boolean)))
  const clientIds = Array.from(new Set((projects ?? []).map((p: any) => p.client_id).filter(Boolean)))
  const workspaceName = new Map<string, string>()
  const clientName = new Map<string, string>()
  if (workspaceIds.length) {
    const { data: ws } = await (service as any).from('workspaces').select('id,name').in('id', workspaceIds)
    ;(ws ?? []).forEach((w: any) => workspaceName.set(w.id, w.name))
  }
  if (clientIds.length) {
    const { data: cp } = await (service as any).from('profiles').select('id,full_name,email').in('id', clientIds)
    ;(cp ?? []).forEach((c: any) => clientName.set(c.id, c.full_name || c.email || null))
  }

  // Proposals: filter out projects that already have an active proposal.
  // The project_proposals table may not exist yet (feature not migrated) —
  // gracefully fall back to empty arrays so the pool still renders.
  let proposalProjectIds = new Set<string>()
  let projectsWithActiveProposal = new Set<string>()
  let pendingProposals: any[] = []
  try {
    const { data: myProposals } = ids.length ? await (service as any)
      .from('project_proposals')
      .select('project_id,status')
      .eq('dev_id', user.id)
      .in('project_id', ids)
      .in('status', ['proposed', 'budget_clarification', 'accepted']) : { data: [] as any[] }
    proposalProjectIds = new Set((myProposals ?? []).map((p: any) => p.project_id))

    const { data: activeProposals } = ids.length ? await (service as any)
      .from('project_proposals')
      .select('project_id')
      .in('project_id', ids)
      .in('status', ['proposed', 'budget_clarification', 'accepted']) : { data: [] as any[] }
    projectsWithActiveProposal = new Set((activeProposals ?? []).map((p: any) => p.project_id))

    const { data: pp } = await (service as any)
      .from('project_proposals')
      .select('id,project_id,status,dev_proposed_price,dev_clarification_translated,client_response_translated,role_on_project,is_team_lead,created_at,expires_at')
      .eq('dev_id', user.id)
      .in('status', ['proposed', 'budget_clarification'])
      .order('created_at', { ascending: false })
    pendingProposals = pp ?? []
  } catch {}

  console.log('[dev/projects/available] user:', user.id, 'profile:', profile?.role, 'totalProjects:', (projects ?? []).length, 'mineCount:', mineIds.size, 'proposalsBlocked:', projectsWithActiveProposal.size)
  for (const p of (projects ?? []).slice(0, 5)) {
    console.log('[dev/projects/available] project:', p.id, 'model:', p.delivery_model, 'status:', p.status)
  }

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
      workspace_name: p.workspace_id ? (workspaceName.get(p.workspace_id) ?? null) : null,
      client_name: p.client_id ? (clientName.get(p.client_id) ?? null) : null,
      budget_min: p.budget_min,
      budget_max: p.budget_max,
      budget_currency: p.budget_currency,
    }
    if (mineIds.has(p.id)) { mine.push(shape); continue }
    const model = p.delivery_model ?? 'festag_delivery'
    if (model === 'festag_delivery' && !projectsWithActiveProposal.has(p.id)) {
      available.push(shape)
    }
  }

  return NextResponse.json({ available, mine, pendingProposals: pendingProposals ?? [] })
}
