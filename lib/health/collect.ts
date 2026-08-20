/**
 * Project Health — gather the engine's input from real rows.
 *
 * This is the only file that knows about table shapes. The engine stays pure,
 * the API stays thin, and the queries here deliberately mirror the ones
 * app/api/workspaces/overview/route.ts already uses, so one project is never
 * counted two different ways in two places.
 */

import { DECISION_OPEN_STATUS_LIST, DECISION_TERMINAL_STATUS_LIST } from '@/lib/decisions/types'
import { deriveAcceptance, scoreDecisionRow, type DecisionRow } from '@/lib/intelligence/derive'
import type { HealthInput } from './types'

type ServiceClient = { from: (table: string) => any }

/** Issue severities that count as critical — same rule as the overview API. */
const CRITICAL_SEVERITIES = new Set(['critical', 'high'])
/** Issue statuses that count as open — same rule as the overview API. */
const OPEN_ISSUE_STATUSES = ['open', 'in_progress', 'triage']
/** Task statuses that count as delivered — same rule as the overview API. */
const DONE_TASK_STATUSES = new Set(['done', 'completed', 'closed', 'cancelled', 'erledigt'])

const isPast = (value: unknown, now: number): boolean => {
  if (!value || typeof value !== 'string') return false
  const t = Date.parse(value)
  return !Number.isNaN(t) && t < now
}

/**
 * Build the engine input for one project.
 *
 * Decision quality is read from `decision_outcomes` — the stored result of the
 * Learning Engine — so health and the learning history can never disagree.
 * When a project has terminal decisions that were never scored (outcomes are
 * only written when a decision is applied), we score them here with the very
 * same pure functions the write path uses, rather than silently reporting
 * "not measurable".
 */
export async function collectHealthInput(
  service: ServiceClient,
  projectId: string,
  now: number = Date.now(),
): Promise<HealthInput> {
  const [outcomeRes, openDecRes, termDecRes, taskRes, issueRes] = await Promise.all([
    service
      .from('decision_outcomes')
      .select('decision_id, category, outcome_score')
      .eq('project_id', projectId)
      .limit(500),
    service
      .from('decisions')
      .select('id, due_date')
      .eq('project_id', projectId)
      .in('status', DECISION_OPEN_STATUS_LIST as unknown as string[])
      .limit(200),
    service
      .from('decisions')
      .select(
        'id, decision_type, recommended_option, selected_option, status, superseded_by, decided_at, due_at, created_by_tagro',
      )
      .eq('project_id', projectId)
      .in('status', DECISION_TERMINAL_STATUS_LIST as unknown as string[])
      .limit(500),
    service
      .from('tasks')
      .select('id, status, due_date')
      .eq('project_id', projectId)
      .limit(500),
    service
      .from('issues')
      .select('id, severity, status')
      .eq('project_id', projectId)
      .in('status', OPEN_ISSUE_STATUSES)
      .limit(500),
  ])

  const terminal = (termDecRes?.data || []) as Array<DecisionRow>

  // ── Decision quality ───────────────────────────────────────────────────
  const stored = (outcomeRes?.data || []) as Array<{
    decision_id: string
    category: string | null
    outcome_score: number | null
  }>

  const scoredById = new Map<string, { category: string; score: number }>()
  for (const row of stored) {
    if (typeof row.outcome_score !== 'number') continue
    scoredById.set(row.decision_id, {
      category: row.category || 'general',
      score: row.outcome_score,
    })
  }
  // Fill gaps with the same pure scoring the write path applies.
  for (const row of terminal) {
    if (scoredById.has(row.id)) continue
    const s = scoreDecisionRow(row)
    scoredById.set(row.id, { category: s.category, score: s.score })
  }
  const decisionOutcomes = [...scoredById.values()]

  // ── Decision flow ──────────────────────────────────────────────────────
  const openDecisions = (openDecRes?.data || []) as Array<{ due_date?: string | null }>
  const overdueDecisions = openDecisions.filter((d) => isPast(d.due_date, now)).length

  // ── Delivery ───────────────────────────────────────────────────────────
  const tasks = (taskRes?.data || []) as Array<{
    status?: string | null
    due_date?: string | null
  }>
  let tasksDone = 0
  let tasksOverdue = 0
  for (const t of tasks) {
    const done = DONE_TASK_STATUSES.has(String(t.status || '').toLowerCase())
    if (done) tasksDone += 1
    else if (isPast(t.due_date, now)) tasksOverdue += 1
  }

  // ── Stability ──────────────────────────────────────────────────────────
  const issues = (issueRes?.data || []) as Array<{ severity?: string | null }>
  const criticalIssues = issues.filter((i) =>
    CRITICAL_SEVERITIES.has(String(i.severity || '').toLowerCase()),
  ).length

  // ── Tagro efficiency ───────────────────────────────────────────────────
  // Only resolved decisions can be judged: an open proposal has no verdict yet.
  const tagroRows = terminal.filter((d) => d.created_by_tagro)
  const tagroAcceptedClean = tagroRows.filter(
    (d) => deriveAcceptance(d) === 'accepted' && !d.superseded_by,
  ).length

  return {
    projectId,
    decisionOutcomes,
    openDecisions: openDecisions.length,
    overdueDecisions,
    tasksTotal: tasks.length,
    tasksDone,
    tasksOverdue,
    openIssues: issues.length,
    criticalIssues,
    tagroProposed: tagroRows.length,
    tagroAcceptedClean,
  }
}
