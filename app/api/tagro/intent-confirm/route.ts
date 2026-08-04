import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { DEFAULT_CREATOR_ROLE } from '@/lib/platform/roles'
import { createTagroClientTask, ensureProjectAccess } from '@/lib/tagro/task-actions'
import { resolveActiveWorkspaceId } from '@/lib/workspace/resolve'
import {
  isProjectInviteRole,
  projectRoleToInviteLegacy,
  type ProjectInviteRole,
} from '@/lib/platform/workspace-setup'
import { createAndSendTeamInvite } from '@/lib/invites/create-and-send'
import { isValidInviteEmail } from '@/lib/invites/safe'
import { normalizeEmail } from '@/lib/auth-request'
import type {
  EstimatedScope,
  InviteDraftRole,
  ProjectDraft,
  TaskDraft,
  TaskPriority,
} from '@/lib/tagro/intent-intake'

export const runtime = 'nodejs'

type ConfirmKind = 'project' | 'task' | 'invite' | 'briefing'

/**
 * POST /api/tagro/intent-confirm
 * Human-confirmed draft → write to the project graph.
 * Body: { kind, project?, task?, invite? }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'no_session' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const kind = String(body?.kind || '').trim() as ConfirmKind
    const service = getServiceClient() || supabase

    if (kind === 'project') {
      return confirmProject(service, user.id, body?.project, body?.workspaceId || body?.workspace_id)
    }
    if (kind === 'task') {
      return confirmTask(service, user.id, body?.task)
    }
    if (kind === 'invite') {
      const origin = req.headers.get('origin') ?? new URL(req.url).origin
      return confirmInvite(service, user.id, user.email, body?.invite, origin)
    }
    if (kind === 'briefing') {
      return NextResponse.json({ ok: true, action: 'open_overview' })
    }

    return NextResponse.json({ ok: false, error: 'kind_required' }, { status: 400 })
  } catch (error: any) {
    console.error('[intent-confirm]', error)
    const message = error?.message || 'intent_confirm_failed'
    const status = message === 'project_access_denied' ? 403 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}

async function resolveWorkspaceId(
  sb: any,
  userId: string,
  preferredWorkspaceId?: string | null,
): Promise<string | null> {
  const preferred = String(preferredWorkspaceId || '').trim() || null
  try {
    return await resolveActiveWorkspaceId(sb, userId, null, preferred)
  } catch {
    /* fall through */
  }

  if (preferred && /^[0-9a-f-]{36}$/i.test(preferred)) return preferred

  const owned = await sb
    .from('workspaces')
    .select('id')
    .eq('primary_owner_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (owned.data?.id) return owned.data.id

  const member = await sb
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()
  return member.data?.workspace_id || null
}

async function confirmProject(
  sb: any,
  userId: string,
  draftRaw: Partial<ProjectDraft> | null,
  preferredWorkspaceId?: string | null,
) {
  const name = String(draftRaw?.name || '').trim().slice(0, 160)
  const summary = String(draftRaw?.summary || '').trim().slice(0, 2000)
  const features = Array.isArray(draftRaw?.features)
    ? draftRaw!.features.map(String).filter(Boolean).slice(0, 12)
    : []
  const scope = (['small', 'medium', 'large'] as EstimatedScope[]).includes(
    draftRaw?.estimatedScope as EstimatedScope,
  )
    ? (draftRaw!.estimatedScope as EstimatedScope)
    : 'medium'

  if (!name) {
    return NextResponse.json({ ok: false, error: 'name_required' }, { status: 400 })
  }

  const workspaceId = await resolveWorkspaceId(sb, userId, preferredWorkspaceId)
  const descriptionParts = [summary]
  if (features.length) descriptionParts.push(`Features: ${features.join(', ')}`)
  descriptionParts.push(`Estimated scope: ${scope}`)

  const insert: Record<string, unknown> = {
    user_id: userId,
    title: name,
    description: descriptionParts.filter(Boolean).join('\n\n') || null,
    status: 'planning',
    work_type: 'software',
  }
  if (workspaceId) insert.workspace_id = workspaceId

  const { data: project, error } = await sb
    .from('projects')
    .insert(insert)
    .select('id, title, workspace_id')
    .single()

  if (error || !project?.id) {
    console.error('[intent-confirm project]', error)
    return NextResponse.json({ ok: false, error: 'create_failed' }, { status: 500 })
  }

  await sb.from('project_members').upsert(
    {
      project_id: project.id,
      user_id: userId,
      role: DEFAULT_CREATOR_ROLE,
    },
    { onConflict: 'project_id,user_id' },
  )

  // Seed calm feature tasks from the draft — still human-confirmed via project create.
  for (const feature of features.slice(0, 6)) {
    const { error: taskErr } = await sb.from('tasks').insert({
      project_id: project.id,
      title: feature,
      description: `Detected from Tagro draft for ${name}.`,
      status: 'suggested',
      priority: 'medium',
      created_by: userId,
      source: 'tagro_intent',
      client_visible: true,
    })
    if (taskErr) {
      // Non-blocking — project already exists
      console.warn('[intent-confirm] feature seed skipped', taskErr.message)
    }
  }

  await sb.from('notifications').insert({
    user_id: userId,
    type: 'project',
    kind: 'project_created',
    audience: 'user',
    title: 'Projekt erstellt',
    message: `${name} ist bereit.`,
    body: `${name} ist bereit.`,
    project_id: project.id,
  }).then(() => null).catch(() => null)

  // Fire-and-forget classify
  try {
    const origin = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
    if (origin) {
      const base = origin.startsWith('http') ? origin : `https://${origin}`
      void fetch(`${base}/api/projects/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, description: summary }),
      }).catch(() => null)
    }
  } catch {
    /* ignore */
  }

  return NextResponse.json({
    ok: true,
    project: { id: project.id, title: project.title },
  })
}

async function confirmTask(sb: any, userId: string, draftRaw: Partial<TaskDraft> | null) {
  const projectId = String(draftRaw?.projectId || '').trim()
  const title = String(draftRaw?.title || '').trim().slice(0, 160)
  const description = String(draftRaw?.description || '').trim().slice(0, 4000)
  const priority = (['low', 'medium', 'high', 'critical'] as TaskPriority[]).includes(
    draftRaw?.priority as TaskPriority,
  )
    ? (draftRaw!.priority as TaskPriority)
    : 'medium'
  const kind = draftRaw?.kind === 'bug' ? 'bug' : 'feature'

  if (!projectId) {
    return NextResponse.json({ ok: false, error: 'project_required' }, { status: 400 })
  }
  if (!title) {
    return NextResponse.json({ ok: false, error: 'title_required' }, { status: 400 })
  }

  await ensureProjectAccess(sb, projectId, userId)

  const task = await createTagroClientTask({
    sb,
    actorId: userId,
    projectId,
    proposal: {
      suggested_title: title,
      suggested_description: description || title,
      client_summary: description || title,
      priority,
      possible_dev_interpretation: kind === 'bug' ? 'Bug fix' : 'Feature request',
      open_questions: [],
      risks: kind === 'bug' ? ['Needs reproduction on the reported device/browser.'] : [],
      confidence_score: 0.8,
    },
    originalText: description || title,
    labels: [kind === 'bug' ? 'bug' : 'feature'],
  })

  return NextResponse.json({ ok: true, task })
}

async function confirmInvite(
  sb: any,
  userId: string,
  userEmail: string | undefined,
  draftRaw: any,
  origin: string,
) {
  const projectId = String(draftRaw?.projectId || '').trim()
  const username = String(draftRaw?.username || '').replace(/^@+/, '').trim()
  const email = normalizeEmail(draftRaw?.email || '')
  const roleRaw = draftRaw?.role as InviteDraftRole

  if (!projectId) {
    return NextResponse.json({ ok: false, error: 'project_required' }, { status: 400 })
  }
  if (!username && !email) {
    return NextResponse.json({ ok: false, error: 'target_required' }, { status: 400 })
  }

  // Workspace owner invites stay project-scoped as project_owner for now
  // (workspace ownership transfer is a separate OS flow).
  let role: ProjectInviteRole = 'developer'
  if (roleRaw === 'workspace_owner' || roleRaw === 'project_owner') role = 'project_owner'
  else if (isProjectInviteRole(roleRaw)) role = roleRaw
  else if (roleRaw === 'viewer') role = 'viewer'

  const { data: project } = await sb
    .from('projects')
    .select('id, title, workspace_id, user_id')
    .eq('id', projectId)
    .maybeSingle()

  if (!project?.id) {
    return NextResponse.json({ ok: false, error: 'project_not_found' }, { status: 404 })
  }

  const canInvite =
    project.user_id === userId ||
    (await sb
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }: any) => {
        const r = String(data?.role || '').toLowerCase()
        return ['project_owner', 'owner', 'admin', 'member'].includes(r)
      }))

  if (!canInvite) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
  }

  const { data: inviterProfile } = await sb
    .from('profiles')
    .select('full_name, first_name, last_name, email')
    .eq('id', userId)
    .maybeSingle()

  const fromName =
    (typeof inviterProfile?.full_name === 'string' && inviterProfile.full_name.trim()) ||
    [inviterProfile?.first_name, inviterProfile?.last_name].filter(Boolean).join(' ').trim() ||
    inviterProfile?.email ||
    userEmail ||
    'Festag'

  let inviteEmail = email
  let invitedName: string | null = username || null

  if (username) {
    const { data: profile } = await sb
      .from('profiles')
      .select('id, email, full_name, first_name, last_name, dev_username')
      .ilike('dev_username', username)
      .maybeSingle()
    if (!profile?.id) {
      return NextResponse.json({ ok: false, error: 'user_not_found' }, { status: 404 })
    }
    if (profile.id === userId) {
      return NextResponse.json({ ok: false, error: 'self_invite' }, { status: 400 })
    }
    inviteEmail = normalizeEmail(profile.email || inviteEmail)
    invitedName =
      (typeof profile.full_name === 'string' && profile.full_name.trim()) ||
      [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() ||
      profile.dev_username ||
      username
  }

  if (!isValidInviteEmail(inviteEmail)) {
    return NextResponse.json({ ok: false, error: 'invalid_email' }, { status: 400 })
  }

  const result = await createAndSendTeamInvite({
    email: inviteEmail,
    role: projectRoleToInviteLegacy(role),
    allowAdminRole: role === 'project_owner',
    invitedName,
    projectId,
    fromUserId: userId,
    fromEmail: inviterProfile?.email || userEmail,
    fromName,
    origin,
    userClient: sb,
  })

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error || 'invite_failed' },
      { status: 400 },
    )
  }

  return NextResponse.json({
    ok: true,
    invite: result,
    role,
  })
}
