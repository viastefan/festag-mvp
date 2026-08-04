import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { createAndSendTeamInvite } from '@/lib/invites/create-and-send'
import { isValidInviteEmail } from '@/lib/invites/safe'
import { normalizeEmail } from '@/lib/auth-request'
import {
  isProjectInviteRole,
  projectRoleToInviteLegacy,
  PROJECT_INVITE_ROLE_LABELS,
  type ProjectInviteRole,
} from '@/lib/platform/workspace-setup'

export const runtime = 'nodejs'

/**
 * POST /api/invites/project
 * Invite by Festag username (@handle) or email into a project with a ProjectRole.
 *
 * Body: { projectId, role, username? | email?, invitedName? }
 */
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const projectId = String(body?.projectId || '').trim()
  const roleRaw = body?.role
  const username = String(body?.username || '').replace(/^@+/, '').trim()
  const emailRaw = normalizeEmail(body?.email || '')

  if (!projectId || !/^[0-9a-f-]{36}$/i.test(projectId)) {
    return NextResponse.json({ error: 'project_required' }, { status: 400 })
  }
  if (!isProjectInviteRole(roleRaw)) {
    return NextResponse.json({ error: 'role_required' }, { status: 400 })
  }
  const role = roleRaw as ProjectInviteRole

  const service = getServiceClient() || supabase

  const { data: project } = await service
    .from('projects')
    .select('id, title, workspace_id, user_id')
    .eq('id', projectId)
    .maybeSingle()

  if (!project?.id) {
    return NextResponse.json({ error: 'project_not_found' }, { status: 404 })
  }

  const canInvite =
    project.user_id === user.id ||
    (await service
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        const r = String(data?.role || '').toLowerCase()
        return ['project_owner', 'owner', 'admin', 'member'].includes(r)
      }))

  if (!canInvite) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  let workspaceName = ''
  if (project.workspace_id) {
    const { data: ws } = await service
      .from('workspaces')
      .select('name')
      .eq('id', project.workspace_id)
      .maybeSingle()
    workspaceName = typeof ws?.name === 'string' ? ws.name : ''
  }

  const { data: inviterProfile } = await service
    .from('profiles')
    .select('full_name, first_name, last_name, email')
    .eq('id', user.id)
    .maybeSingle()

  const fromName =
    (typeof inviterProfile?.full_name === 'string' && inviterProfile.full_name.trim()) ||
    [inviterProfile?.first_name, inviterProfile?.last_name].filter(Boolean).join(' ').trim() ||
    inviterProfile?.email ||
    'Festag'

  let inviteeEmail = emailRaw
  let inviteeUserId: string | null = null
  let invitedName = String(body?.invitedName || '').trim() || null

  if (username) {
    const { data: profile } = await service
      .from('profiles')
      .select('id, email, full_name, first_name, last_name, dev_username')
      .ilike('dev_username', username)
      .maybeSingle()

    if (!profile?.id) {
      return NextResponse.json(
        { error: 'user_not_found', message: 'Kein Festag-Nutzer mit diesem @Namen.' },
        { status: 404 },
      )
    }
    if (profile.id === user.id) {
      return NextResponse.json({ error: 'self_invite' }, { status: 400 })
    }
    inviteeUserId = profile.id
    inviteeEmail = normalizeEmail(profile.email || '')
    invitedName =
      invitedName ||
      (typeof profile.full_name === 'string' && profile.full_name.trim()) ||
      [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() ||
      profile.dev_username ||
      null
  }

  if (!inviteeEmail || !isValidInviteEmail(inviteeEmail)) {
    return NextResponse.json(
      { error: 'email_required', message: 'E-Mail oder gültiger @Nutzername erforderlich.' },
      { status: 400 },
    )
  }

  const origin = req.headers.get('origin') ?? new URL(req.url).origin
  const legacyRole = projectRoleToInviteLegacy(role)

  const result = await createAndSendTeamInvite({
    email: inviteeEmail,
    role: legacyRole,
    allowAdminRole: role === 'project_owner',
    invitedName,
    projectId,
    fromUserId: user.id,
    fromEmail: inviterProfile?.email || user.email,
    fromName,
    origin,
    userClient: service as any,
  })

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error || 'invite_failed',
        message:
          result.error === 'self_invite'
            ? 'Du kannst dich nicht selbst einladen.'
            : 'Einladung konnte nicht gesendet werden.',
      },
      { status: 400 },
    )
  }

  const roleLabel = PROJECT_INVITE_ROLE_LABELS[role]
  const projectTitle = project.title || 'Projekt'

  /* Notify invitee (existing account) */
  if (inviteeUserId) {
    await service.from('notifications').insert({
      user_id: inviteeUserId,
      type: 'project',
      kind: 'project_invite',
      audience: 'user',
      title: 'Neue Projekteinladung',
      message: `${fromName} hat dich zu ${projectTitle} eingeladen.`,
      body: `${fromName} hat dich zu ${projectTitle} eingeladen · Rolle ${roleLabel}.`,
      project_id: projectId,
      link: '/overview',
      payload: {
        inviteId: result.inviteId,
        projectId,
        projectTitle,
        workspaceName,
        role,
        invitedBy: fromName,
      },
      read: false,
    })
  }

  /* Calm confirmation for inviter */
  await service.from('notifications').insert({
    user_id: user.id,
    type: 'project',
    kind: 'invite_sent',
    audience: 'user',
    title: 'Einladung gesendet',
    message: invitedName
      ? `${invitedName} wurde zu ${projectTitle} eingeladen.`
      : `${inviteeEmail} wurde zu ${projectTitle} eingeladen.`,
    body: invitedName
      ? `${invitedName} wurde zu ${projectTitle} eingeladen.`
      : `${inviteeEmail} wurde zu ${projectTitle} eingeladen.`,
    project_id: projectId,
    link: '/overview',
    payload: {
      inviteId: result.inviteId,
      projectId,
      role,
      email: inviteeEmail,
      username: username || null,
    },
    read: false,
  })

  return NextResponse.json({
    ok: true,
    inviteId: result.inviteId,
    mailSent: result.mailSent,
    reused: result.reused || false,
  })
}
