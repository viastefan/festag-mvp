import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { DEFAULT_CREATOR_ROLE } from '@/lib/platform/roles'

export const runtime = 'nodejs'

/**
 * POST /api/workspaces/first-project
 * Body: { workspaceId, title, description? }
 *
 * Creates the first project in a workspace. Creator = project_owner.
 * Required after workspace creation — every workspace needs ≥1 project.
 */
export async function POST(req: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const workspaceId = String(body?.workspaceId || '').trim()
  const title = String(body?.title || '').trim()
  const description = String(body?.description || '').trim() || null

  if (!workspaceId || !/^[0-9a-f-]{36}$/i.test(workspaceId)) {
    return NextResponse.json({ error: 'workspace_required' }, { status: 400 })
  }
  if (!title) {
    return NextResponse.json({ error: 'title_required', message: 'Bitte einen Projektnamen eingeben.' }, { status: 400 })
  }
  if (title.length > 160) {
    return NextResponse.json({ error: 'title_too_long' }, { status: 400 })
  }

  const service = getServiceClient() || supabase

  const { data: ws } = await service
    .from('workspaces')
    .select('id, name, primary_owner_id')
    .eq('id', workspaceId)
    .maybeSingle()

  if (!ws?.id) {
    return NextResponse.json({ error: 'workspace_not_found' }, { status: 404 })
  }

  const isOwner = ws.primary_owner_id === user.id
  if (!isOwner) {
    const { data: member } = await service
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle()
    const role = String(member?.role || '').toLowerCase()
    if (!member || (role !== 'owner' && role !== 'admin')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
  }

  const { data: project, error } = await service
    .from('projects')
    .insert({
      user_id: user.id,
      workspace_id: workspaceId,
      title,
      description,
      status: 'planning',
      work_type: 'software',
    })
    .select('id, title, workspace_id')
    .single()

  if (error || !project?.id) {
    console.error('[first-project]', error)
    return NextResponse.json(
      { error: 'create_failed', message: 'Projekt konnte nicht erstellt werden.' },
      { status: 500 },
    )
  }

  await service.from('project_members').upsert(
    {
      project_id: project.id,
      user_id: user.id,
      role: DEFAULT_CREATOR_ROLE,
    },
    { onConflict: 'project_id,user_id' },
  )

  await service.from('notifications').insert({
    user_id: user.id,
    type: 'project',
    kind: 'project_created',
    audience: 'user',
    title: 'Projekt erstellt',
    message: `${title} ist bereit.`,
    body: `${title} ist bereit.`,
    project_id: project.id,
    link: `/overview`,
    payload: { workspaceId, projectId: project.id, title },
    read: false,
  })

  return NextResponse.json({
    ok: true,
    project: {
      id: project.id,
      title: project.title,
      workspaceId: project.workspace_id,
      workspaceName: ws.name,
    },
  })
}
