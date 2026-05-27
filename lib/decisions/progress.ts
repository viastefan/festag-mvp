// ─────────────────────────────────────────────────────────────────────────────
// Decision Engine — Progress drag
//
// Formula from the Festag Decision Engine spec:
//
//   P(project) = Σ (task.weight × status_factor(task))
//              ─────────────────────────────────────────
//                       Σ task.weight
//              × (1 − decision_drag(project))
//              × (1 − blocker_drag(project))
//
//   decision_drag = α · count(open decisions)
//                 + β · count(overdue hard deadlines)
//
// The drag never reaches 1.0 — capped so projects with many open
// decisions still register some progress, just dampened. The dampening
// is visible to the client without inducing panic.
//
// Defaults: α=0.05, β=0.15, max_drag=0.40. Tunable via env.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'

const OPEN_STATUSES = [
  'drafted',
  'pending_client',
  'awaiting_clarification',
  'open',
  'waiting_for_client',
  'in_progress',
] as const

function getCoefficients() {
  const alpha = Number.parseFloat(process.env.DECISION_DRAG_ALPHA || '0.05')
  const beta = Number.parseFloat(process.env.DECISION_DRAG_BETA || '0.15')
  const maxDrag = Number.parseFloat(process.env.DECISION_DRAG_MAX || '0.40')
  return {
    alpha: Number.isFinite(alpha) && alpha >= 0 ? alpha : 0.05,
    beta: Number.isFinite(beta) && beta >= 0 ? beta : 0.15,
    maxDrag: Number.isFinite(maxDrag) && maxDrag > 0 && maxDrag < 1 ? maxDrag : 0.40,
  }
}

export type DecisionDrag = {
  openCount: number
  overdueCount: number
  criticalCount: number
  dragFactor: number     // ∈ [0, maxDrag]
  multiplier: number     // 1 − dragFactor, applied to raw progress
}

/**
 * Compute the decision drag factor for a project.
 *
 * `overdueCount` counts open decisions whose `deadline_hard` has passed.
 * `criticalCount` is informational only — it doesn't add to drag directly
 * (those decisions get bypass-priority via the limiter, not extra drag),
 * but UI surfaces use it for the "X kritische Entscheidung offen" label.
 */
export async function computeDecisionDrag(
  supa: SupabaseClient<any>,
  projectId: string,
): Promise<DecisionDrag> {
  if (!projectId) {
    return { openCount: 0, overdueCount: 0, criticalCount: 0, dragFactor: 0, multiplier: 1 }
  }

  const { data, error } = await supa
    .from('decisions')
    .select('id,status,urgency,deadline_hard')
    .eq('project_id', projectId)
    .in('status', OPEN_STATUSES as unknown as string[])

  if (error || !data) {
    // Fail open — caller doesn't surface a drag they can't trust.
    return { openCount: 0, overdueCount: 0, criticalCount: 0, dragFactor: 0, multiplier: 1 }
  }

  const now = Date.now()
  let openCount = 0
  let overdueCount = 0
  let criticalCount = 0

  for (const row of data as Array<{ status: string; urgency: string; deadline_hard: string | null }>) {
    openCount += 1
    if (row.urgency === 'critical') criticalCount += 1
    if (row.deadline_hard) {
      const dl = new Date(row.deadline_hard).getTime()
      if (Number.isFinite(dl) && dl < now) overdueCount += 1
    }
  }

  const { alpha, beta, maxDrag } = getCoefficients()
  const raw = alpha * openCount + beta * overdueCount
  const dragFactor = Math.min(Math.max(raw, 0), maxDrag)
  const multiplier = Number((1 - dragFactor).toFixed(3))

  return { openCount, overdueCount, criticalCount, dragFactor, multiplier }
}

/**
 * Convenience: apply the drag to a raw progress percentage (0..1 or 0..100).
 * Detects scale automatically.
 */
export function applyDecisionDrag(rawProgress: number, drag: DecisionDrag): number {
  if (!Number.isFinite(rawProgress)) return 0
  const scaleTo100 = rawProgress > 1
  const normalized = scaleTo100 ? rawProgress / 100 : rawProgress
  const dampened = Math.max(0, Math.min(1, normalized * drag.multiplier))
  return scaleTo100 ? Math.round(dampened * 100) : Number(dampened.toFixed(3))
}
