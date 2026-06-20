import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/** POST /api/linear/link { project_id, team_id, team_key?, team_name? } */
export async function POST(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as {
    project_id?: string
    team_id?: string
    team_key?: string
    team_name?: string
  }

  if (!body.project_id || !body.team_id) {
    return NextResponse.json({ error: 'project_id and team_id required' }, { status: 400 })
  }

  const { data: project } = await (supa as any)
    .from('projects')
    .select('id')
    .eq('id', body.project_id)
    .maybeSingle()
  if (!project) return NextResponse.json({ error: 'project_not_found' }, { status: 404 })

  const { data, error } = await (supa as any)
    .from('linear_project_links')
    .upsert({
      user_id: user.id,
      project_id: body.project_id,
      team_id: body.team_id,
      team_key: body.team_key ?? null,
      team_name: body.team_name ?? null,
      active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'project_id,team_id' })
    .select('id,project_id,team_id,team_key,team_name,active,created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, link: data })
}

/** DELETE /api/linear/link { project_id, team_id } */
export async function DELETE(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as { project_id?: string; team_id?: string }
  if (!body.project_id || !body.team_id) {
    return NextResponse.json({ error: 'project_id and team_id required' }, { status: 400 })
  }

  await (supa as any)
    .from('linear_project_links')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('project_id', body.project_id)
    .eq('team_id', body.team_id)

  return NextResponse.json({ ok: true })
}
