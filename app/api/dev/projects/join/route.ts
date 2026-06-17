import { NextRequest, NextResponse } from 'next/server'
import { getDevUserFromRequest } from '@/lib/dev-auth'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { fanOutProposalAccepted } from '@/lib/inbox/proposal-accepted'

export const runtime = 'nodejs'

function appBaseUrl(req: NextRequest): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin ?? 'https://festag.io'
}

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
export async function POST(req: NextRequest) {
  const supa = createClient()
  const { data: { user: cookieUser } } = await supa.auth.getUser()
  // PIN-Dev fallback: kein Supabase-Cookie, aber signierter Dev-Token.
  const user = cookieUser ?? getDevUserFromRequest(req)
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
    .select('id,title,user_id,assigned_dev,color')
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

  // ── Client fan-out: only on the FIRST acceptance of a Festag-directed
  //    project. We guard on the legacy single-dev column having just been
  //    claimed above, so re-joins or multi-dev pools don't re-celebrate.
  const isFirstAccept = !project.assigned_dev
  const clientId: string | null = project.user_id && project.user_id !== user.id ? project.user_id : null
  const devAvatar = profile?.avatar_url || profile?.github_avatar_url || null
  const projectTitle: string = project.title || 'Dein Projekt'

  if (clientId) {
    if (isFirstAccept) {
      await fanOutProposalAccepted({
        sb: service,
        projectId,
        projectTitle,
        devId: user.id,
        devDisplayName: displayName,
        devAvatar,
        clientId,
        projectColor: project.color,
        baseUrl: appBaseUrl(req),
      })
    } else {
      // Re-join: celebration notification only (no duplicate welcome fan-out).
      await (service as any).from('notifications').insert({
        user_id: clientId,
        project_id: projectId,
        audience: 'client',
        kind: 'dev_accepted',
        type: 'dev_accepted',
        title: 'Dein Projekt hat einen Entwickler',
        body: `${displayName} übernimmt „${projectTitle}".`,
        message: `${displayName} übernimmt „${projectTitle}".`,
        read: false,
        payload: {
          dev_id: user.id,
          dev_name: displayName,
          dev_avatar: devAvatar,
          project_id: projectId,
          project_title: projectTitle,
          project_color: project.color || '#5B647D',
          celebrate: true,
        },
      })
    }
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
