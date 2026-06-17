import { NextResponse } from 'next/server'
import { getDevUserFromRequest } from '@/lib/dev-auth'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const supa = createClient()
  const { data: { user: cookieUser } } = await supa.auth.getUser()
  const user = cookieUser ?? getDevUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const service = getServiceClient()
  if (!service) return NextResponse.json({ error: 'service_unavailable' }, { status: 503 })
  const sb = service as any

  const { data: profile } = await sb
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile || !['dev', 'admin', 'project_owner'].includes(profile.role)) {
    return NextResponse.json({ error: 'not_a_developer' }, { status: 403 })
  }

  const { data: proposals } = await sb
    .from('project_proposals')
    .select(`
      id, project_id, status, dev_proposed_price, dev_proposed_currency,
      dev_proposed_start_date, dev_proposed_duration_days,
      dev_clarification_raw, dev_clarification_translated,
      client_response_raw, client_response_translated,
      role_on_project, is_team_lead, expires_at,
      created_at, updated_at
    `)
    .eq('dev_id', user.id)
    .in('status', ['proposed', 'budget_clarification'])
    .order('created_at', { ascending: false })

  const projectIds = (proposals ?? []).map((p: any) => p.project_id)
  let projects: any[] = []
  if (projectIds.length) {
    const { data } = await sb
      .from('projects')
      .select('id,title,description,scope_summary,budget_min,budget_max,budget_currency,budget_note_translated,desired_start_date,status,project_type,delivery_model,user_id,client_id')
      .in('id', projectIds)
    projects = data ?? []
  }

  const clientIds = [...new Set(projects.map((p: any) => p.user_id || p.client_id).filter(Boolean))]
  let clients: any[] = []
  if (clientIds.length) {
    const { data } = await sb
      .from('profiles')
      .select('id,full_name,first_name,email,avatar_url')
      .in('id', clientIds)
    clients = data ?? []
  }

  const projectMap = Object.fromEntries(projects.map((p: any) => [p.id, p]))
  const clientMap = Object.fromEntries(clients.map((c: any) => [c.id, c]))

  const enriched = (proposals ?? []).map((prop: any) => {
    const project = projectMap[prop.project_id]
    const clientId = project?.user_id || project?.client_id
    const client = clientId ? clientMap[clientId] : null
    return {
      ...prop,
      project: project ? {
        id: project.id,
        title: project.title,
        description: project.description,
        scope_summary: project.scope_summary,
        budget_min: project.budget_min,
        budget_max: project.budget_max,
        budget_currency: project.budget_currency,
        budget_note: project.budget_note_translated,
        desired_start_date: project.desired_start_date,
        status: project.status,
        project_type: project.project_type,
        delivery_model: project.delivery_model,
      } : null,
      client: client ? {
        name: client.full_name || client.first_name || client.email,
        avatar: client.avatar_url,
      } : null,
    }
  })

  return NextResponse.json({ proposals: enriched })
}
