import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

async function resolveJiraSite(supa: any, userId: string): Promise<string | null> {
  const { data: conn } = await supa
    .from('user_connectors')
    .select('config,status')
    .eq('user_id', userId)
    .eq('connector_id', 'jira')
    .maybeSingle()
  return (conn as any)?.config?.site || process.env.JIRA_SITE || null
}

/** POST /api/jira/link */
export async function POST(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as {
    project_id?: string
    jira_project_id?: string
    jira_project_key?: string
    jira_project_name?: string
    jira_site?: string
  }

  if (!body.project_id || !body.jira_project_id) {
    return NextResponse.json({ error: 'project_id and jira_project_id required' }, { status: 400 })
  }

  const site = body.jira_site || await resolveJiraSite(supa, user.id)
  if (!site) return NextResponse.json({ error: 'jira_site_missing' }, { status: 400 })

  const { data: project } = await (supa as any)
    .from('projects')
    .select('id')
    .eq('id', body.project_id)
    .maybeSingle()
  if (!project) return NextResponse.json({ error: 'project_not_found' }, { status: 404 })

  const { data, error } = await (supa as any)
    .from('jira_project_links')
    .upsert({
      user_id: user.id,
      project_id: body.project_id,
      jira_site: site.replace(/^https?:\/\//i, '').replace(/\/+$/, ''),
      jira_project_id: body.jira_project_id,
      jira_project_key: body.jira_project_key ?? null,
      jira_project_name: body.jira_project_name ?? null,
      active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'project_id,jira_site,jira_project_id' })
    .select('id,project_id,jira_project_id,jira_project_key,jira_project_name,jira_site,active,created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, link: data })
}

/** DELETE /api/jira/link */
export async function DELETE(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as {
    project_id?: string
    jira_project_id?: string
    jira_site?: string
  }
  if (!body.project_id || !body.jira_project_id) {
    return NextResponse.json({ error: 'project_id and jira_project_id required' }, { status: 400 })
  }

  let q = (supa as any)
    .from('jira_project_links')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('project_id', body.project_id)
    .eq('jira_project_id', body.jira_project_id)
  if (body.jira_site) q = q.eq('jira_site', body.jira_site)
  await q

  return NextResponse.json({ ok: true })
}
