import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import {
  inviteKindToMembership,
  joinCompletionRedirect,
  joinProjectHref,
} from '@/lib/platform/join'

export const runtime = 'nodejs'

/**
 * POST /api/invites/join — accept team invite into the shared project graph.
 *
 * Ensures project_members + workspace_members (for RLS), then sends the user
 * to Join Project (`/join`) for name + avatar — not Build onboarding.
 *
 * Body: { token }
 */
export async function POST(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'not-authenticated' }, { status: 401 })

  const { token } = (await req.json().catch(() => ({}))) as { token?: string }
  if (!token) return NextResponse.json({ error: 'missing-token' }, { status: 400 })

  const svc = getServiceClient()
  if (!svc) return NextResponse.json({ error: 'service-key-missing' }, { status: 500 })

  const { data: inv } = await svc
    .from('team_invites')
    .select('id,kind,role,status,expires_at,project_id,accepted_by')
    .eq('token', token)
    .maybeSingle()

  if (!inv) return NextResponse.json({ error: 'invite-not-found' }, { status: 404 })

  const alreadyMine = inv.status === 'accepted' && inv.accepted_by === user.id
  const expired = inv.expires_at ? new Date(inv.expires_at).getTime() < Date.now() : false
  if (!alreadyMine && (inv.status !== 'pending' || expired)) {
    return NextResponse.json({ error: 'invite-expired' }, { status: 410 })
  }

  const kind = (inv.kind as 'contributor' | 'client') || (inv.role === 'client' ? 'client' : 'contributor')
  const membership = inviteKindToMembership(kind)

  await svc.from('profiles').upsert({ id: user.id }, { onConflict: 'id' })

  let workspaceId: string | null = null
  if (inv.project_id) {
    const { data: proj } = await svc
      .from('projects')
      .select('workspace_id, assigned_dev')
      .eq('id', inv.project_id)
      .maybeSingle()
    workspaceId = (proj as { workspace_id?: string } | null)?.workspace_id ?? null

    await svc.from('project_members').upsert(
      {
        project_id: inv.project_id,
        user_id: user.id,
        role: membership.projectMemberRole,
      },
      { onConflict: 'project_id,user_id', ignoreDuplicates: true },
    )

    await svc.from('project_assignments').upsert(
      {
        project_id: inv.project_id,
        user_id: user.id,
        role_on_project: membership.assignmentRole,
        assigned_by: user.id,
        active: true,
      },
      { onConflict: 'project_id,user_id' },
    )

    if (membership.projectMemberRole === 'dev' && proj && !(proj as { assigned_dev?: string }).assigned_dev) {
      await svc.from('projects').update({ assigned_dev: user.id }).eq('id', inv.project_id)
    }
  }

  // Workspace membership unlocks RLS that keys off is_workspace_member.
  if (workspaceId) {
    await svc.from('workspace_members').upsert(
      {
        workspace_id: workspaceId,
        user_id: user.id,
        role: membership.workspaceRole,
      },
      { onConflict: 'workspace_id,user_id', ignoreDuplicates: true },
    )
  }

  // Soft profile role sync — do not downgrade owners/admins.
  const { data: prof } = await svc
    .from('profiles')
    .select('role,approval_status,full_name,avatar_url')
    .eq('id', user.id)
    .maybeSingle()
  const cur = (prof as { role?: string } | null)?.role
  if (kind === 'client') {
    if (!cur || cur === 'client') {
      await svc.from('profiles').update({ role: 'client' }).eq('id', user.id)
    }
  } else if (cur !== 'dev' && cur !== 'admin' && cur !== 'project_owner') {
    await svc.from('profiles').update({
      role: 'dev',
      approval_status: (prof as { approval_status?: string } | null)?.approval_status ?? 'approved',
    }).eq('id', user.id)
  }

  if (!alreadyMine) {
    await svc
      .from('team_invites')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: user.id,
      })
      .eq('id', inv.id)
  }

  const hasName = Boolean((prof as { full_name?: string } | null)?.full_name?.trim())
  const { data: onboarding } = await svc
    .from('onboarding_state')
    .select('completed_at')
    .eq('user_id', user.id)
    .maybeSingle()
  const onboarded = Boolean((onboarding as { completed_at?: string } | null)?.completed_at)

  // Already finished Join/Build — open the project immediately.
  if (hasName && onboarded) {
    return NextResponse.json({
      ok: true,
      kind,
      projectId: inv.project_id,
      redirect: joinCompletionRedirect(inv.project_id),
    })
  }

  return NextResponse.json({
    ok: true,
    kind,
    projectId: inv.project_id,
    redirect: joinProjectHref({ token, projectId: inv.project_id }),
  })
}
