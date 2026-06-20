import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { testSlackAuth } from '@/lib/slack/api'

export const runtime = 'nodejs'

/** POST /api/slack/link */
export async function POST(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as {
    project_id?: string
    channel_id?: string
    channel_name?: string
  }

  if (!body.project_id || !body.channel_id) {
    return NextResponse.json({ error: 'project_id and channel_id required' }, { status: 400 })
  }

  const { data: conn } = await (supa as any)
    .from('user_connectors')
    .select('config,status')
    .eq('user_id', user.id)
    .eq('connector_id', 'slack')
    .maybeSingle()

  const token = (conn as any)?.config?.token || process.env.SLACK_BOT_TOKEN
  if (!token) return NextResponse.json({ error: 'slack_not_connected' }, { status: 400 })

  let teamId: string | null = null
  let teamName: string | null = null
  try {
    const authTest = await testSlackAuth({ token })
    teamId = authTest.team?.id ?? null
    teamName = authTest.team?.name ?? null
  } catch {
    /* optional */
  }

  const { data: project } = await (supa as any)
    .from('projects')
    .select('id')
    .eq('id', body.project_id)
    .maybeSingle()
  if (!project) return NextResponse.json({ error: 'project_not_found' }, { status: 404 })

  const { data, error } = await (supa as any)
    .from('slack_channel_links')
    .upsert({
      user_id: user.id,
      project_id: body.project_id,
      channel_id: body.channel_id,
      channel_name: body.channel_name ?? null,
      team_id: teamId,
      team_name: teamName,
      active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'project_id,channel_id' })
    .select('id,project_id,channel_id,channel_name,team_name,active,created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, link: data })
}

/** DELETE /api/slack/link */
export async function DELETE(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as { project_id?: string; channel_id?: string }
  if (!body.project_id || !body.channel_id) {
    return NextResponse.json({ error: 'project_id and channel_id required' }, { status: 400 })
  }

  await (supa as any)
    .from('slack_channel_links')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('project_id', body.project_id)
    .eq('channel_id', body.channel_id)

  return NextResponse.json({ ok: true })
}
