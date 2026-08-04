import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { normalizeEmail } from '@/lib/auth-request'
import { formatInviteRoleLabel } from '@/lib/platform/workspace-setup'

export const runtime = 'nodejs'

/**
 * GET /api/invites/pending
 * Pending project invitations for the signed-in user (matched by email).
 */
export async function GET() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const email = normalizeEmail(user.email || '')
  if (!email) return NextResponse.json({ invites: [] })

  const service = getServiceClient() || supabase

  const { data: rows } = await service
    .from('team_invites')
    .select('id, email, role, status, project_id, invited_by, invited_name, created_at, expires_at, kind')
    .eq('email', email)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(40)

  const invites = []
  for (const row of rows || []) {
    const expired = row.expires_at ? new Date(row.expires_at).getTime() < Date.now() : false
    if (expired) continue

    let projectTitle = ''
    let workspaceName = ''
    let workspaceId: string | null = null

    if (row.project_id) {
      const { data: project } = await service
        .from('projects')
        .select('id, title, workspace_id')
        .eq('id', row.project_id)
        .maybeSingle()
      projectTitle = typeof project?.title === 'string' ? project.title : ''
      workspaceId = project?.workspace_id || null
      if (workspaceId) {
        const { data: ws } = await service
          .from('workspaces')
          .select('name')
          .eq('id', workspaceId)
          .maybeSingle()
        workspaceName = typeof ws?.name === 'string' ? ws.name : ''
      }
    }

    let invitedByName = 'Jemand'
    if (row.invited_by) {
      const { data: inviter } = await service
        .from('profiles')
        .select('full_name, first_name, last_name, email')
        .eq('id', row.invited_by)
        .maybeSingle()
      invitedByName =
        (typeof inviter?.full_name === 'string' && inviter.full_name.trim()) ||
        [inviter?.first_name, inviter?.last_name].filter(Boolean).join(' ').trim() ||
        inviter?.email ||
        'Jemand'
    }

    invites.push({
      id: row.id as string,
      projectId: row.project_id as string | null,
      projectTitle: projectTitle || 'Projekt',
      workspaceId,
      workspaceName: workspaceName || 'Workspace',
      invitedBy: invitedByName,
      role: row.role as string,
      roleLabel: formatInviteRoleLabel(row.role),
      createdAt: row.created_at as string,
    })
  }

  return NextResponse.json({ invites })
}
