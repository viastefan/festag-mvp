import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { DECISION_OPEN_STATUS_LIST, DECISION_TERMINAL_STATUS_LIST } from '@/lib/decisions/types'
import { buildProjectIntelligence, scoreDecisionRow, type DecisionRow } from '@/lib/intelligence'
import { readProjectHealthMap } from '@/lib/health/persist'
import { mapDecisionRowToOverview, rankDecisionsForCanvas } from '@/lib/overview/decision-canvas'
import {
  listWorkspacesForUser,
  resolveActiveWorkspaceId,
} from '@/lib/workspace/resolve'
import { readActiveWorkspaceIdFromCookie } from '@/lib/active-workspace'

export const runtime = 'nodejs'

import { signCovers } from '@/lib/projects/cover'

export type WorkspaceOverviewProject = {
  id: string
  title: string
  phase: string | null
  progress: number
  health: 'healthy' | 'watch' | 'risk' | 'blocked'
  status: string | null
  nextMilestone: string | null
  /** Signierter Link auf das Titelbild. Null, wenn keines gesetzt ist. */
  coverUrl: string | null
}

export type WorkspaceOverviewTask = {
  id: string
  title: string
  status: string | null
  projectId: string | null
  projectTitle: string
  updatedAt: string | null
}

export type WorkspaceOverviewDecisionOption = {
  id: string
  label: string
  hint: string | null
  recommended: boolean
  handoffSteps?: unknown
}

/** Rich decision focus for Decision Canvas — not a thin list row. */
export type WorkspaceOverviewDecision = {
  id: string
  title: string
  summary: string | null
  projectId: string | null
  projectTitle: string
  urgency: string | null
  dueDate: string | null
  responseType: string | null
  decisionType: string | null
  recommendedOptionId: string | null
  recommendationReason: string | null
  tagroReasoning: string | null
  options: WorkspaceOverviewDecisionOption[]
  reasons: string[]
  explainSteps: Array<{ n: number; label: string }>
  needsSuggestion?: boolean
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
 * Optional `?workspaceId=` (or cookie) selects the active workspace.
 */
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const service = getServiceClient() || supabase
  const preferred =
    req.nextUrl.searchParams.get('workspaceId') ||
    readActiveWorkspaceIdFromCookie(req.headers.get('cookie'))

  const activeId = await resolveActiveWorkspaceId(service as any, user.id, null, preferred)

  let workspace: { id: string; name: string; domain: string } | null = null

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

  if (activeId) {
    const { data: ws } = await service
      .from('workspaces')
      .select('id, name, slug')
      .eq('id', activeId)
      .is('deleted_at', null)
      .maybeSingle()
    if (ws?.id) {
      workspace = {
        id: ws.id,
        name: String(ws.name || 'Workspace'),
        domain: toDomain(String(ws.name || ''), ws.slug),
      }
    }
  }

  if (!workspace) {
    return NextResponse.json({ ok: true, workspace: null, workspaces: [] })
  }

  /* Soft-claim orphan projects — never block the overview response. */
  void Promise.resolve(
    service
      .from('projects')
      .update({ workspace_id: workspace.id })
      .eq('user_id', user.id)
      .is('workspace_id', null),
  ).catch(() => undefined)

  let projectsRaw: any[] = []
  {
    /* cover_path steht bewusst nur in der Primaerabfrage. Faellt sie aus —
       weil die Cover-Migration auf dieser Datenbank noch nicht liegt —, greift
       das bestehende Fallback ohne die Spalte: dann fehlen die Titelbilder,
       aber die Uebersicht steht. Eine neue Spalte darf keine Seite umlegen. */
    const primary = await service
      .from('projects')
      .select('id, title, status, updated_at, cover_path')
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

  const [
    decRes,
    issueRes,
    taskRes,
    mileRes,
    feedRes,
    membersRes,
    reportRes,
    workspacesList,
  ] = await Promise.all([
    projectIds.length > 0
      ? service
          .from('decisions')
          .select(
            'id, title, client_title, client_summary, project_id, urgency, due_date, created_at, status, response_type, decision_type, recommended_option, tagro_recommendation_reason, tagro_reasoning, impact_summary, options_json',
          )
          .in('project_id', projectIds)
          .in('status', DECISION_OPEN_STATUS_LIST as unknown as string[])
          .order('created_at', { ascending: false })
          .limit(40)
      : Promise.resolve({ data: [] as any[] }),
    projectIds.length > 0
      ? service
          .from('issues')
          .select('id, project_id, severity, status')
          .in('project_id', projectIds)
          .in('status', ['open', 'in_progress', 'triage'])
      : Promise.resolve({ data: [] as any[] }),
    projectIds.length > 0
      ? service
          .from('tasks')
          .select('id, project_id, title, status, updated_at')
          .in('project_id', projectIds)
          .order('updated_at', { ascending: false })
          .limit(80)
      : Promise.resolve({ data: [] as any[] }),
    projectIds.length > 0
      ? service
          .from('milestones')
          .select('id, project_id, title, due_date, status')
          .in('project_id', projectIds)
          .order('due_date', { ascending: true })
      : Promise.resolve({ data: [] as any[] }),
    projectIds.length > 0
      ? service
          .from('activity_feed')
          .select('id, title, message, kind, event_type, type, body, created_at, project_id')
          .in('project_id', projectIds)
          .order('created_at', { ascending: false })
          .limit(40)
      : Promise.resolve({ data: [] as any[] }),
    service
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', workspace.id)
      .limit(24),
    projectIds.length > 0
      ? service
          .from('status_reports')
          .select(
            'id, project_id, summary, completed_work_json, current_work_json, next_steps_json, decisions_needed_json, created_at',
          )
          .in('project_id', projectIds)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null as any }),
    listWorkspacesForUser(service as any, user.id),
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

  // Measured health for these projects, if it has ever been computed.
  const healthByProject = await readProjectHealthMap(service as any, projectIds)

  /**
   * Project health for the overview cards.
   *
   * Prefers the measured, persisted health (lib/health) so this list, the
   * project view and Control Status never disagree about the same project.
   * The counting heuristic below stays as the fallback for projects that have
   * not been measured yet — it is a weaker answer, not a competing one.
   */
  function deriveHealth(projectId: string): WorkspaceOverviewProject['health'] {
    const measured = healthByProject.get(projectId)
    if (measured?.score != null) return measured.band

    const critical = criticalByProject.get(projectId) || 0
    const openDec = openDecisionsByProject.get(projectId) || 0
    if (critical >= 2) return 'blocked'
    if (critical >= 1) return 'risk'
    if (openDec >= 1) return 'watch'
    return 'healthy'
  }

  /* Ein Roundtrip fuer alle Titelbilder statt einer pro Projekt. Bei
     vierundzwanzig Projekten ist das der Unterschied zwischen einer Abfrage
     und vierundzwanzig. */
  const coverUrls = await signCovers(
    service as any,
    projectsRaw.map((p: any) => String(p.cover_path || '')).filter(Boolean),
  )

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
      coverUrl: coverUrls.get(String(p.cover_path || '')) || null,
    }
  })

  const titleById = new Map(projects.map((p) => [p.id, p.title]))

  const DONE_TASK = new Set(['done', 'completed', 'closed', 'cancelled', 'erledigt'])
  const openTasks: WorkspaceOverviewTask[] = []
  for (const t of tasks || []) {
    const st = String(t.status || '').toLowerCase()
    if (DONE_TASK.has(st)) continue
    const title = typeof t.title === 'string' ? t.title.trim() : ''
    if (!title) continue
    openTasks.push({
      id: t.id,
      title,
      status: typeof t.status === 'string' ? t.status : null,
      projectId: t.project_id || null,
      projectTitle: (t.project_id && titleById.get(t.project_id)) || 'Projekt',
      updatedAt: t.updated_at || null,
    })
    if (openTasks.length >= 40) break
  }

  /* Load options for the top open decisions — Decision Canvas needs real labels */
  const rankedDecisions = rankDecisionsForCanvas(decisions || [])
  const topDecisionIds = rankedDecisions.slice(0, 8).map((d: any) => d.id as string)
  const optionsByDecision = new Map<string, any[]>()
  if (topDecisionIds.length > 0) {
    const { data: optRows } = await service
      .from('decision_options')
      .select(
        'id, decision_id, ordinal, external_id, label, client_label, description, implications_json, recommended_by_tagro',
      )
      .in('decision_id', topDecisionIds)
      .order('ordinal', { ascending: true })
    for (const row of optRows || []) {
      const list = optionsByDecision.get(row.decision_id) || []
      list.push(row)
      optionsByDecision.set(row.decision_id, list)
    }
  }

  const pendingDecisions: WorkspaceOverviewDecision[] = rankedDecisions
    .slice(0, 8)
    .map((d: any) => {
      const enriched = mapDecisionRowToOverview({
        decision: d,
        optionRows: optionsByDecision.get(d.id) || [],
        projectTitle: (d.project_id && titleById.get(d.project_id)) || 'Projekt',
      })

      return {
        id: enriched.id,
        title: enriched.title,
        summary: enriched.summary,
        projectId: enriched.projectId,
        projectTitle: enriched.projectTitle,
        urgency: enriched.urgency,
        dueDate: enriched.dueDate,
        responseType: enriched.responseType,
        decisionType: enriched.decisionType,
        recommendedOptionId: enriched.recommendedOptionId,
        recommendationReason: enriched.recommendationReason,
        tagroReasoning: enriched.tagroReasoning,
        options: enriched.options.map((o) => ({
          id: o.id,
          label: o.label,
          hint: o.hint,
          recommended: o.recommended,
        })),
        reasons: enriched.reasons,
        explainSteps: enriched.explainSteps,
        needsSuggestion: enriched.needsSuggestion,
      }
    })

  let activity: WorkspaceOverviewActivity[] = (feedRes.data || []).map((row: any) => ({
    id: row.id,
    title: String(row.title || row.message || row.kind || row.event_type || row.type || 'Activity'),
    body: typeof row.body === 'string' ? row.body : typeof row.message === 'string' ? row.message : null,
    createdAt: row.created_at,
    projectTitle: row.project_id ? titleById.get(row.project_id) || null : null,
  }))

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

  const members = membersRes.data
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

  const report = reportRes.data
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

  if (!briefing && projects.length > 0) {
    const top = projects[0]
    const lines = [
      top.phase ? `Aktuelle Phase: ${formatPhase(top.phase)}.` : null,
      top.progress > 0 ? `Dein Projekt steht bei ${top.progress}%.` : 'Das Projekt ist bereit, weiterzugehen.',
      top.nextMilestone ? `Nächster Meilenstein: ${top.nextMilestone}.` : null,
      pendingDecisions.length > 0
        ? pendingDecisions.length === 1
          ? 'Eine Entscheidung wartet noch auf deine Freigabe.'
          : `${pendingDecisions.length} Entscheidungen warten noch auf deine Freigabe.`
        : 'Wir haben aktuell keine weiteren Sorgen.',
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
      ? 'Heute läuft alles planmäßig. Leg dein erstes Projekt an.'
      : pendingDecisions.length > 0
        ? 'Heute läuft alles planmäßig. Eine Entscheidung wartet auf deine Freigabe.'
        : healthyCount === projects.length
          ? 'Heute läuft alles planmäßig.'
          : `${workspace.name} bewegt sich — halte den Fokus.`

  const workspaces = workspacesList.map((w) => ({
    id: w.id,
    name: w.name,
    slug: w.slug,
    isPersonal: w.isPersonal,
    role: w.role,
  }))

  /* Project Intelligence — what Tagro learned from decisions that finished.
     Scored from real columns; stays empty until decisions actually resolve. */
  const resolved = projectIds.length > 0
    ? (
        await service
          .from('decisions')
          .select(
            'id, decision_type, recommended_option, selected_option, status, superseded_by, decided_at, due_at, created_by_tagro',
          )
          .in('project_id', projectIds)
          .in('status', DECISION_TERMINAL_STATUS_LIST as unknown as string[])
          .order('decided_at', { ascending: false })
          .limit(200)
      ).data || []
    : []

  const scored = resolved.map((row) => {
    const outcome = scoreDecisionRow(row as DecisionRow)
    return { decisionId: outcome.decisionId, category: outcome.category, score: outcome.score }
  })

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const autoDecidedToday = resolved.filter(
    (r) => r.created_by_tagro && r.decided_at && new Date(r.decided_at) >= startOfDay,
  ).length

  const intelligence = buildProjectIntelligence({
    decisions: scored,
    autoDecidedToday,
    openQuestions: pendingDecisions.length,
  })

  return NextResponse.json({
    ok: true,
    workspace,
    workspaces,
    summary: {
      activeProjects: projects.length,
      pendingDecisions: pendingDecisions.length,
      teamMembers: team.length || 1,
      nextMilestone,
      calmLine,
    },
    briefing,
    projects,
    tasks: openTasks,
    decisions: pendingDecisions,
    activity,
    team,
    intelligence,
  })
}

function formatPhase(raw: string): string {
  const s = raw.replace(/_/g, ' ').trim()
  if (!s) return raw
  return s.charAt(0).toUpperCase() + s.slice(1)
}
