import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

/**
 * POST /api/dev/projects/join  { projectId }
 *
 * Auto-accept self-enrollment. The dev clicks "Eintragen" and is
 * immediately on the project — no admin in the loop. We mirror the
 * single-dev `projects.assigned_dev` field when it was still empty so
 * legacy queries that read that column keep working.
 *
 * Failure modes are conservative: missing project, not-a-dev, or
 * already-active assignment all return the existing assignment so the
 * client can render the same animation either way.
 */
export async function POST(req: Request) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const service = getServiceClient()
  if (!service) return NextResponse.json({ error: 'service unavailable' }, { status: 503 })

  const body = await req.json().catch(() => ({}))
  const projectId: string | undefined = body?.projectId
  if (!projectId) return NextResponse.json({ error: 'missing projectId' }, { status: 400 })

  const { data: profile } = await (service as any)
    .from('profiles')
    .select('role,approval_status,full_name,avatar_url,github_avatar_url,github_username,email')
    .eq('id', user.id)
    .maybeSingle()

  const role = profile?.role
  if (role !== 'dev' && role !== 'admin' && role !== 'project_owner') {
    return NextResponse.json({ error: 'not a developer' }, { status: 403 })
  }

  const { data: project } = await (service as any)
    .from('projects')
    .select('id,title,user_id,assigned_dev')
    .eq('id', projectId)
    .maybeSingle()
  if (!project) return NextResponse.json({ error: 'project not found' }, { status: 404 })

  const { data: assignment, error: aErr } = await (service as any)
    .from('project_assignments')
    .upsert({
      project_id: projectId,
      user_id: user.id,
      role_on_project: 'developer',
      assigned_by: user.id,
      active: true,
    }, { onConflict: 'project_id,user_id' })
    .select('id,project_id,user_id,role_on_project,active,created_at')
    .single()
  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 })

  // Keep the legacy single-dev column populated when no one's owned it yet.
  if (!project.assigned_dev) {
    await (service as any).from('projects').update({ assigned_dev: user.id }).eq('id', projectId)
  }

  // Audit log + notification to the project owner — calm, non-technical.
  const displayName = profile?.full_name
    || (profile?.github_username ? `@${profile.github_username}` : null)
    || profile?.email
    || 'Ein Developer'

  await (service as any).from('audit_logs').insert({
    actor_id: user.id,
    action: 'project_assignment.self_enroll',
    entity_type: 'project',
    entity_id: projectId,
    metadata: { role_on_project: 'developer' },
  })

  if (project.user_id && project.user_id !== user.id) {
    await (service as any).from('notifications').insert({
      user_id: project.user_id,
      project_id: projectId,
      audience: 'client',
      kind: 'dev_joined',
      type: 'dev_joined',
      title: 'Ein Developer ist deinem Projekt beigetreten',
      body: `${displayName} hat „${project.title}" übernommen.`,
      message: `${displayName} hat „${project.title}" übernommen.`,
      payload: { dev_id: user.id, project_id: projectId },
    })
  }

  return NextResponse.json({
    ok: true,
    assignment,
    project: { id: project.id, title: project.title },
    dev: {
      id: user.id,
      name: displayName,
      avatar: profile?.avatar_url || profile?.github_avatar_url || null,
    },
  })
}
