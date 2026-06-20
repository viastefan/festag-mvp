import type { SupabaseClient } from '@supabase/supabase-js'
import { ISSUE_OPEN_STATUSES } from '@/lib/issues/types'
import { DECISION_OPEN_STATUS_LIST } from '@/lib/decisions/types'
import { isObjectiveAtRisk } from '@/lib/objectives/types'
import type { ExecutiveHealth, ExecutiveOverview, ExecutiveProjectRow } from '@/lib/executive/types'

const OPEN_ISSUE_STATUSES = Array.from(ISSUE_OPEN_STATUSES)

function healthRank(h: ExecutiveHealth): number {
  return { blocked: 0, risk: 1, watch: 2, healthy: 3 }[h]
}

function worse(a: ExecutiveHealth, b: ExecutiveHealth): ExecutiveHealth {
  return healthRank(a) <= healthRank(b) ? a : b
}

function deriveProjectHealth(args: {
  criticalIssues: number
  blockerIssues: number
  openDecisions: number
  openIssues: number
}): ExecutiveHealth {
  if (args.blockerIssues > 0 || args.criticalIssues > 0) return 'blocked'
  if (args.openDecisions > 0 || args.openIssues >= 5) return 'risk'
  if (args.openIssues > 0) return 'watch'
  return 'healthy'
}

function deriveOverallHealth(projects: ExecutiveProjectRow[]): ExecutiveHealth {
  if (projects.length === 0) return 'healthy'
  return projects.reduce<ExecutiveHealth>(
    (acc, p) => worse(acc, p.health),
    'healthy',
  )
}

function buildHeadline(health: ExecutiveHealth, projects: ExecutiveProjectRow[]): string {
  if (projects.length === 0) return 'Noch keine Projekte im Überblick.'
  switch (health) {
    case 'blocked':
      return 'Mindestens ein Projekt ist blockiert.'
    case 'risk':
      return 'Es gibt Projekte mit erhöhtem Risiko.'
    case 'watch':
      return 'Alles läuft — ein paar Punkte im Blick behalten.'
    default:
      return 'Alles läuft planmäßig.'
  }
}

function buildSummary(projects: ExecutiveProjectRow[]): string {
  const withSummary = projects
    .map(p => p.summary?.trim())
    .filter(Boolean) as string[]

  if (withSummary.length > 0) return withSummary[0]

  const blocked = projects.filter(p => p.health === 'blocked')
  if (blocked.length > 0) {
    const p = blocked[0]
    return `${p.title}: ${p.critical_issues} kritische Issues, ${p.open_decisions} offene Entscheidungen.`
  }

  const totalIssues = projects.reduce((s, p) => s + p.open_issues, 0)
  const totalDecisions = projects.reduce((s, p) => s + p.open_decisions, 0)
  if (totalIssues === 0 && totalDecisions === 0) {
    return 'Keine offenen Issues oder Entscheidungen — Fortschritt ohne Unterbrechung.'
  }

  return `${totalIssues} offene Issues · ${totalDecisions} Entscheidungen über ${projects.length} Projekt${projects.length === 1 ? '' : 'e'}.`
}

function estimateForecast(projects: ExecutiveProjectRow[]): { min: number | null; max: number | null } {
  const blocked = projects.filter(p => p.health === 'blocked')
  if (blocked.length === 0) return { min: null, max: null }
  const weight = blocked.reduce((s, p) => s + p.critical_issues + p.open_decisions, 0)
  if (weight <= 0) return { min: 1, max: 3 }
  return { min: 2, max: Math.min(14, 2 + weight * 2) }
}

export async function buildExecutiveOverview(
  sb: SupabaseClient<any>,
  userId: string,
): Promise<ExecutiveOverview> {
  const { data: projs } = await sb
    .from('projects')
    .select('id,title,color,status,user_id,client_id')
    .or(`user_id.eq.${userId},client_id.eq.${userId}`)
    .order('updated_at', { ascending: false })
    .limit(50)

  const projects = (projs as any[]) ?? []
  const projectIds = projects.map(p => p.id)

  if (projectIds.length === 0) {
    return {
      health: 'healthy',
      headline: 'Noch keine Projekte im Überblick.',
      summary: 'Sobald Projekte laufen, zeigt Festag hier Fortschritt, Risiken und Forecast.',
      progress_pct: 0,
      open_issues: 0,
      critical_issues: 0,
      open_decisions: 0,
      active_objectives: 0,
      objectives_at_risk: 0,
      velocity_7d: 0,
      forecast_days_min: null,
      forecast_days_max: null,
      projects: [],
      generated_at: new Date().toISOString(),
    }
  }

  const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()

  const [{ data: issues }, { data: decisions }, { data: tasks }, { data: objectives }] = await Promise.all([
    sb.from('issues')
      .select('id,project_id,severity,issue_type,status,tagro_summary')
      .in('project_id', projectIds)
      .in('status', OPEN_ISSUE_STATUSES),
    sb.from('decisions')
      .select('id,project_id,status')
      .in('project_id', projectIds)
      .in('status', DECISION_OPEN_STATUS_LIST),
    sb.from('tasks')
      .select('id,project_id,status,updated_at,client_status,dev_status')
      .in('project_id', projectIds),
    sb.from('objectives')
      .select('id,project_id,status,target_date,progress_pct')
      .in('project_id', projectIds)
      .eq('status', 'active'),
  ])

  const issueRows = (issues as any[]) ?? []
  const decisionRows = (decisions as any[]) ?? []
  const taskRows = (tasks as any[]) ?? []
  const objectiveRows = (objectives as any[]) ?? []
  const objectives_at_risk = objectiveRows.filter(o => isObjectiveAtRisk(o)).length

  const rows: ExecutiveProjectRow[] = projects.map((p) => {
    const projIssues = issueRows.filter(i => i.project_id === p.id)
    const critical = projIssues.filter(i => i.severity === 'critical' || i.severity === 'high').length
    const blockers = projIssues.filter(i => i.issue_type === 'blocker').length
    const openDecisions = decisionRows.filter(d => d.project_id === p.id).length
    const projTasks = taskRows.filter(t => t.project_id === p.id)
    const isDone = (t: any) => ['done', 'completed'].includes(String(t.status ?? t.dev_status ?? t.client_status ?? ''))
    const done = projTasks.filter(isDone).length
    const open = projTasks.filter(t => !isDone(t)).length
    const progress_pct = projTasks.length > 0 ? Math.round((done / projTasks.length) * 100) : 0
    const velocity_7d = projTasks.filter(t => {
      if (!isDone(t)) return false
      const u = t.updated_at ? new Date(t.updated_at).getTime() : 0
      return u >= new Date(since7d).getTime()
    }).length

    const tagro = projIssues.find(i => i.tagro_summary?.trim())?.tagro_summary?.trim() ?? null

    return {
      id: p.id,
      title: p.title,
      color: p.color,
      health: deriveProjectHealth({
        criticalIssues: critical,
        blockerIssues: blockers,
        openDecisions,
        openIssues: projIssues.length,
      }),
      progress_pct,
      open_issues: projIssues.length,
      critical_issues: critical,
      open_decisions: openDecisions,
      velocity_7d,
      summary: tagro,
    }
  })

  const health = deriveOverallHealth(rows)
  const forecast = estimateForecast(rows)
  const totalDone = taskRows.filter(t => ['done', 'completed'].includes(String(t.status ?? ''))).length
  const totalTasks = taskRows.length
  const progress_pct = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0

  return {
    health,
    headline: buildHeadline(health, rows),
    summary: buildSummary(rows),
    progress_pct,
    open_issues: rows.reduce((s, r) => s + r.open_issues, 0),
    critical_issues: rows.reduce((s, r) => s + r.critical_issues, 0),
    open_decisions: rows.reduce((s, r) => s + r.open_decisions, 0),
    active_objectives: objectiveRows.length,
    objectives_at_risk,
    velocity_7d: rows.reduce((s, r) => s + r.velocity_7d, 0),
    forecast_days_min: forecast.min,
    forecast_days_max: forecast.max,
    projects: rows.sort((a, b) => healthRank(a.health) - healthRank(b.health)),
    generated_at: new Date().toISOString(),
  }
}
