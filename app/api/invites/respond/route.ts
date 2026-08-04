import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { normalizeEmail } from '@/lib/auth-request'
import {
  inviteLegacyToProjectRole,
  formatInviteRoleLabel,
} from '@/lib/platform/workspace-setup'

export const runtime = 'nodejs'

/**
 * POST /api/invites/respond
 * Body: { inviteId, action: 'accept' | 'decline' }
 *
 * Logged-in accept/decline for pending team_invites addressed to the user.
 */
export async function POST(req: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const inviteId = String(body?.inviteId || '').trim()
  const action = String(body?.action || '').trim() as 'accept' | 'decline'

  if (!inviteId || !/^[0-9a-f-]{36}$/i.test(inviteId)) {
    return NextResponse.json({ error: 'invite_required' }, { status: 400 })
  }
  if (action !== 'accept' && action !== 'decline') {
    return NextResponse.json({ error: 'action_required' }, { status: 400 })
  }

  const service = getServiceClient() || supabase
  const email = normalizeEmail(user.email || '')

  const { data: invite } = await service
    .from('team_invites')
    .select('id, email, role, status, project_id, invited_by, expires_at')
    .eq('id', inviteId)
    .maybeSingle()

  if (!invite?.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  if (invite.status !== 'pending') {
    return NextResponse.json({ error: 'not_pending' }, { status: 409 })
  }
  if (email && normalizeEmail(invite.email || '') !== email) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'expired' }, { status: 410 })
  }

  const projectRole = inviteLegacyToProjectRole(invite.role)
  const roleLabel = formatInviteRoleLabel(invite.role)

  let projectTitle = 'Projekt'
  let workspaceId: string | null = null

  if (invite.project_id) {
    const { data: project } = await service
      .from('projects')
      .select('id, title, workspace_id')
      .eq('id', invite.project_id)
      .maybeSingle()
    projectTitle = typeof project?.title === 'string' ? project.title : projectTitle
    workspaceId = project?.workspace_id || null
  }

  const { data: accepter } = await service
    .from('profiles')
    .select('full_name, first_name, last_name, email')
    .eq('id', user.id)
    .maybeSingle()

  const accepterName =
    (typeof accepter?.full_name === 'string' && accepter.full_name.trim()) ||
    [accepter?.first_name, accepter?.last_name].filter(Boolean).join(' ').trim() ||
    accepter?.email ||
    'Jemand'

  if (action === 'decline') {
    await service
      .from('team_invites')
      .update({ status: 'declined', accepted_by: user.id })
      .eq('id', inviteId)

    if (invite.invited_by) {
      await service.from('notifications').insert({
        user_id: invite.invited_by,
        type: 'project',
        kind: 'invite_declined',
        audience: 'user',
        title: 'Einladung abgelehnt',
        message: `${accepterName} hat die Einladung zu ${projectTitle} abgelehnt.`,
        body: `${accepterName} hat die Einladung zu ${projectTitle} abgelehnt.`,
        project_id: invite.project_id,
        link: '/overview',
        payload: { inviteId, projectId: invite.project_id, action: 'decline' },
        read: false,
      })
    }

    return NextResponse.json({ ok: true, action: 'decline' })
  }

  /* Accept — join project (+ workspace when present) */
  if (invite.project_id) {
    await service.from('project_members').upsert(
      {
        project_id: invite.project_id,
        user_id: user.id,
        role: projectRole,
      },
      { onConflict: 'project_id,user_id' },
    )
  }

  if (workspaceId) {
    const { data: existing } = await service
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!existing) {
      await service.from('workspace_members').insert({
        workspace_id: workspaceId,
        user_id: user.id,
        role: 'member',
      })
    }
  }

  await service
    .from('team_invites')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      accepted_by: user.id,
    })
    .eq('id', inviteId)

  if (invite.invited_by) {
    await service.from('notifications').insert({
      user_id: invite.invited_by,
      type: 'project',
      kind: 'invite_accepted',
      audience: 'user',
      title: 'Einladung angenommen',
      message: `${accepterName} ist ${projectTitle} beigetreten.`,
      body: `${accepterName} ist ${projectTitle} beigetreten · ${roleLabel}.`,
      project_id: invite.project_id,
      link: '/overview',
      payload: {
        inviteId,
        projectId: invite.project_id,
        action: 'accept',
        role: projectRole,
      },
      read: false,
    })
  }

  await service.from('notifications').insert({
    user_id: user.id,
    type: 'project',
    kind: 'project_joined',
    audience: 'user',
    title: 'Projekt beigetreten',
    message: `Du bist ${projectTitle} beigetreten.`,
    body: `Du bist ${projectTitle} beigetreten · ${roleLabel}.`,
    project_id: invite.project_id,
    link: '/overview',
    payload: { inviteId, projectId: invite.project_id, role: projectRole },
    read: false,
  })

  return NextResponse.json({
    ok: true,
    action: 'accept',
    projectId: invite.project_id,
    workspaceId,
  })
}
