import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { DECISION_OPEN_STATUS_LIST } from '@/lib/decisions/types'

export const runtime = 'nodejs'

export type WorkspaceOverviewProject = {
  id: string
  title: string
  phase: string | null
  progress: number
  health: 'healthy' | 'watch' | 'risk' | 'blocked'
  status: string | null
  nextMilestone: string | null
}

export type WorkspaceOverviewDecision = {
  id: string
  title: string
  projectId: string | null
  projectTitle: string
  urgency: string | null
  dueDate: string | null
}

export type WorkspaceOverviewActivity = {
  id: string
  title: string
  body: string | null
  createdAt: string
  projectTitle: string | null
}

export type WorkspaceOverviewMember = {
  id: string
  name: string
  avatarUrl: string | null
  role: string | null
}

/**
 * GET /api/workspaces/overview
 * Calm operational snapshot for the Festag OS Overview page.
 */
export async function GET() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const service = getServiceClient() || supabase

  let workspace: { id: string; name: string; domain: string } | null = null
  const { data: owned } = await service
    .from('workspaces')
    .select('id, name, slug')
    .eq('primary_owner_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  function toDomain(name: string, slug?: string | null): string {
    const s = (typeof slug === 'string' && slug.trim()) || name
    const cleaned = s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48)
    return cleaned ? `${cleaned}.festag.app` : 'dein-workspace.festag.app'
  }

  if (owned?.id) {
    workspace = {
      id: owned.id,
      name: String(owned.name || 'Workspace'),
      domain: toDomain(String(owned.name || ''), owned.slug),
    }
  } else {
    const { data: membership } = await service
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()
    if (membership?.workspace_id) {
      const { data: ws } = await service
        .from('workspaces')
        .select('id, name, slug')
        .eq('id', membership.workspace_id)
        .maybeSingle()
      if (ws?.id) {
        workspace = {
          id: ws.id,
          name: String(ws.name || 'Workspace'),
          domain: toDomain(String(ws.name || ''), ws.slug),
        }
      }
    }
  }

  if (!workspace) {
    return NextResponse.json({ ok: true, workspace: null })
  }

  let projectsRaw: any[] = []
  {
    const primary = await service
      .from('projects')
      .select('id, title, status, updated_at')
      .eq('workspace_id', workspace.id)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(24)
    if (!primary.error) {
      projectsRaw = primary.data || []
    } else {
      const fallback = await service
        .from('projects')
        .select('id, title, status, updated_at')
        .eq('workspace_id', workspace.id)
        .order('updated_at', { ascending: false })
        .limit(24)
      projectsRaw = fallback.data || []
    }
  }
  const projectIds = projectsRaw.map((p: any) => p.id as string)

  const openDecisionsByProject = new Map<string, number>()
  const criticalByProject = new Map<string, number>()
  const tasksDoneByProject = new Map<string, { done: number; total: number }>()
  const milestoneByProject = new Map<string, string>()

  if (projectIds.length > 0) {
    const [decRes, issueRes, taskRes, mileRes] = await Promise.all([
      service
        .from('decisions')
        .select('id, project_id, status')
        .in('project_id', projectIds)
        .in('status', DECISION_OPEN_STATUS_LIST as unknown as string[]),
      service
        .from('issues')
        .select('id, project_id, severity, status')
        .in('project_id', projectIds)
        .in('status', ['open', 'in_progress', 'triage']),
      service
        .from('tasks')
        .select('id, project_id, status')
        .in('project_id', projectIds),
      service
        .from('milestones')
        .select('id, project_id, title, due_date, status')
        .in('project_id', projectIds)
        .order('due_date', { ascending: true }),
    ])
    const decisions = decRes.data
    const issues = issueRes.data
    const tasks = taskRes.data
    const milestones = mileRes.data

    for (const d of decisions || []) {
      if (!d.project_id) continue
      openDecisionsByProject.set(
        d.project_id,
        (openDecisionsByProject.get(d.project_id) || 0) + 1,
      )
    }
    for (const issue of issues || []) {
      if (!issue.project_id) continue
      const sev = String(issue.severity || '').toLowerCase()
      if (sev === 'critical' || sev === 'high') {
        criticalByProject.set(
          issue.project_id,
          (criticalByProject.get(issue.project_id) || 0) + 1,
        )
      }
    }
    for (const t of tasks || []) {
      if (!t.project_id) continue
      const cur = tasksDoneByProject.get(t.project_id) || { done: 0, total: 0 }
      cur.total += 1
      const st = String(t.status || '').toLowerCase()
      if (st === 'done' || st === 'completed' || st === 'closed') cur.done += 1
      tasksDoneByProject.set(t.project_id, cur)
    }
    for (const m of milestones || []) {
      if (!m.project_id || milestoneByProject.has(m.project_id)) continue
      const st = String(m.status || '').toLowerCase()
      if (st === 'done' || st === 'completed') continue
      const title = typeof m.title === 'string' ? m.title.trim() : ''
      if (title) milestoneByProject.set(m.project_id, title)
    }
  }

  function deriveHealth(projectId: string): WorkspaceOverviewProject['health'] {
    const critical = criticalByProject.get(projectId) || 0
    const openDec = openDecisionsByProject.get(projectId) || 0
    if (critical >= 2) return 'blocked'
    if (critical >= 1) return 'risk'
    if (openDec >= 2) return 'watch'
    if (openDec >= 1) return 'watch'
    return 'healthy'
  }

  const projects: WorkspaceOverviewProject[] = projectsRaw.map((p: any) => {
    const taskStats = tasksDoneByProject.get(p.id)
    const fromTasks =
      taskStats && taskStats.total > 0
        ? Math.round((taskStats.done / taskStats.total) * 100)
        : null
    const progress =
      fromTasks ??
      (typeof p.progress === 'number' ? Math.max(0, Math.min(100, p.progress)) : 0)
    const phase =
      typeof p.phase === 'string'
        ? p.phase
        : typeof p.status === 'string'
          ? p.status
          : null
    return {
      id: p.id,
      title: String(p.title || 'Project'),
      phase,
      progress,
      health: deriveHealth(p.id),
      status: typeof p.status === 'string' ? p.status : null,
      nextMilestone: milestoneByProject.get(p.id) || null,
    }
  })

  const titleById = new Map(projects.map((p) => [p.id, p.title]))

  let pendingDecisions: WorkspaceOverviewDecision[] = []
  if (projectIds.length > 0) {
    const { data: decRows } = await service
      .from('decisions')
      .select('id, title, client_title, project_id, urgency, due_date, created_at')
      .in('project_id', projectIds)
      .in('status', DECISION_OPEN_STATUS_LIST as unknown as string[])
      .order('created_at', { ascending: false })
      .limit(8)

    pendingDecisions = (decRows || []).map((d: any) => ({
      id: d.id,
      title: String(d.client_title || d.title || 'Decision'),
      projectId: d.project_id || null,
      projectTitle: (d.project_id && titleById.get(d.project_id)) || 'Project',
      urgency: typeof d.urgency === 'string' ? d.urgency : null,
      dueDate: d.due_date || null,
    }))
  }

  let activity: WorkspaceOverviewActivity[] = []
  if (projectIds.length > 0) {
    const { data: feed } = await service
      .from('activity_feed')
      .select('*')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false })
      .limit(12)

    activity = (feed || []).map((row: any) => ({
      id: row.id,
      title: String(row.title || row.message || row.kind || row.event_type || row.type || 'Activity'),
      body: typeof row.body === 'string' ? row.body : typeof row.message === 'string' ? row.message : null,
      createdAt: row.created_at,
      projectTitle: row.project_id ? titleById.get(row.project_id) || null : null,
    }))
  }

  /* Soft fallback from work_signals if activity_feed empty */
  if (activity.length === 0 && projectIds.length > 0) {
    const { data: signals } = await service
      .from('work_signals')
      .select('id, content, type, created_at, project_id, tagro_classification_json')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false })
      .limit(12)
    activity = (signals || []).map((row: any) => {
      const cls = row.tagro_classification_json || {}
      const title =
        (typeof cls.internal_summary === 'string' && cls.internal_summary.trim()) ||
        (typeof cls.client_translation === 'string' && cls.client_translation.trim()) ||
        (typeof row.content === 'string' ? row.content.slice(0, 120) : '') ||
        row.type ||
        'Update'
      return {
        id: row.id,
        title: String(title),
        body: typeof row.content === 'string' ? row.content : null,
        createdAt: row.created_at,
        projectTitle: row.project_id ? titleById.get(row.project_id) || null : null,
      }
    })
  }

  const { data: members } = await service
    .from('workspace_members')
    .select('user_id, role')
    .eq('workspace_id', workspace.id)
    .limit(24)

  const memberIds = (members || []).map((m: any) => m.user_id as string).filter(Boolean)
  const roleByUser = new Map((members || []).map((m: any) => [m.user_id as string, m.role as string]))

  let team: WorkspaceOverviewMember[] = []
  if (memberIds.length > 0) {
    const { data: profiles } = await service
      .from('profiles')
      .select('id, full_name, first_name, last_name, email, avatar_url, profile_photo_url')
      .in('id', memberIds)

    team = (profiles || []).map((p: any) => {
      const name =
        (typeof p.full_name === 'string' && p.full_name.trim()) ||
        [p.first_name, p.last_name].filter(Boolean).join(' ').trim() ||
        (typeof p.email === 'string' ? p.email.split('@')[0] : 'Member')
      return {
        id: p.id,
        name,
        avatarUrl: p.avatar_url || p.profile_photo_url || null,
        role: roleByUser.get(p.id) || null,
      }
    })
  }

  /* Ensure current user appears even if membership row is missing */
  if (!team.some((m) => m.id === user.id)) {
    const { data: self } = await service
      .from('profiles')
      .select('id, full_name, first_name, last_name, email, avatar_url, profile_photo_url')
      .eq('id', user.id)
      .maybeSingle()
    if (self?.id) {
      const name =
        (typeof self.full_name === 'string' && self.full_name.trim()) ||
        [self.first_name, self.last_name].filter(Boolean).join(' ').trim() ||
        (typeof self.email === 'string' ? self.email.split('@')[0] : 'You')
      team = [
        {
          id: self.id,
          name,
          avatarUrl: self.avatar_url || self.profile_photo_url || null,
          role: 'owner',
        },
        ...team,
      ]
    }
  }

  /* Briefing — latest client-visible status report across workspace projects */
  let briefing: {
    projectTitle: string
    lines: string[]
    reportId: string | null
    projectId: string | null
  } | null = null

  if (projectIds.length > 0) {
    const { data: report } = await service
      .from('status_reports')
      .select(
        'id, project_id, summary, completed_work_json, current_work_json, next_steps_json, decisions_needed_json, created_at',
      )
      .in('project_id', projectIds)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (report) {
      const lines: string[] = []
      const pushJson = (raw: unknown) => {
        if (!Array.isArray(raw)) return
        for (const item of raw.slice(0, 3)) {
          if (typeof item === 'string' && item.trim()) lines.push(item.trim())
          else if (item && typeof item === 'object' && typeof (item as any).text === 'string') {
            lines.push(String((item as any).text).trim())
          } else if (item && typeof item === 'object' && typeof (item as any).title === 'string') {
            lines.push(String((item as any).title).trim())
          }
        }
      }
      if (typeof report.summary === 'string' && report.summary.trim()) {
        lines.push(report.summary.trim())
      }
      pushJson(report.completed_work_json)
      pushJson(report.current_work_json)
      pushJson(report.decisions_needed_json)
      pushJson(report.next_steps_json)

      if (lines.length > 0) {
        briefing = {
          projectTitle: titleById.get(report.project_id) || 'Project',
          lines: lines.filter(Boolean).slice(0, 5),
          reportId: report.id,
          projectId: report.project_id,
        }
      }
    }
  }

  if (!briefing && projects.length > 0) {
    const top = projects[0]
    const lines = [
      top.phase ? `Current phase: ${formatPhase(top.phase)}.` : null,
      top.progress > 0 ? `Progress at ${top.progress}%.` : 'Project is ready to move forward.',
      top.nextMilestone ? `Next milestone: ${top.nextMilestone}.` : null,
      pendingDecisions.length > 0
        ? `${pendingDecisions.length} decision${pendingDecisions.length === 1 ? '' : 's'} still need attention.`
        : 'No open decisions right now.',
    ].filter(Boolean) as string[]
    briefing = {
      projectTitle: top.title,
      lines,
      reportId: null,
      projectId: top.id,
    }
  }

  const nextMilestone =
    projects.find((p) => p.nextMilestone)?.nextMilestone ||
    null

  const healthyCount = projects.filter((p) => p.health === 'healthy').length
  const calmLine =
    projects.length === 0
      ? `Create your first project inside ${workspace.name}.`
      : healthyCount === projects.length
        ? `Everything inside ${workspace.name} is running smoothly.`
        : pendingDecisions.length > 0
          ? `${workspace.name} needs a few calm decisions today.`
          : `${workspace.name} is moving — keep momentum on active work.`

  return NextResponse.json({
    ok: true,
    workspace,
    summary: {
      activeProjects: projects.length,
      pendingDecisions: pendingDecisions.length,
      teamMembers: team.length || 1,
      nextMilestone,
      calmLine,
    },
    briefing,
    projects,
    decisions: pendingDecisions,
    activity,
    team,
  })
}

function formatPhase(raw: string): string {
  const s = raw.replace(/_/g, ' ').trim()
  if (!s) return raw
  return s.charAt(0).toUpperCase() + s.slice(1)
}
