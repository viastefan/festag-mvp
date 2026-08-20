/**
 * Project Health — read and write path.
 *
 * Health is computed by trusted server code only (service role); the tables
 * grant no client writes. Like the Learning Engine, refreshing health is
 * best-effort: it must never throw into a user action, because a failed
 * measurement is not a failed decision.
 */

import { collectHealthInput } from './collect'
import { computeProjectHealth, diffHealth } from './engine'
import type { HealthFactor, HealthFactorId, ProjectHealth } from './types'

type ServiceClient = { from: (table: string) => any }

const HEALTH_COLUMNS =
  'project_id, health_score, health_band, health_factors, health_confidence, health_cause, health_computed_at'

/** Map a stored row back into the engine's shape. Returns null when never computed. */
function rowToHealth(row: any): ProjectHealth | null {
  if (!row || row.health_computed_at == null) return null
  return {
    projectId: row.project_id,
    score: typeof row.health_score === 'number' ? row.health_score : null,
    band: row.health_band || 'healthy',
    factors: Array.isArray(row.health_factors) ? (row.health_factors as HealthFactor[]) : [],
    confidence: typeof row.health_confidence === 'number' ? row.health_confidence : 0,
    cause: (row.health_cause as HealthFactorId | null) ?? null,
    computedAt: row.health_computed_at,
  }
}

/** Read the stored health for one project without recomputing. */
export async function readProjectHealth(
  service: ServiceClient,
  projectId: string,
): Promise<ProjectHealth | null> {
  try {
    const { data } = await service
      .from('project_intelligence')
      .select(HEALTH_COLUMNS)
      .eq('project_id', projectId)
      .maybeSingle()
    return rowToHealth(data)
  } catch {
    return null
  }
}

/** Read stored health for many projects at once — used by the overview. */
export async function readProjectHealthMap(
  service: ServiceClient,
  projectIds: string[],
): Promise<Map<string, ProjectHealth>> {
  const out = new Map<string, ProjectHealth>()
  if (projectIds.length === 0) return out
  try {
    const { data } = await service
      .from('project_intelligence')
      .select(HEALTH_COLUMNS)
      .in('project_id', projectIds)
    for (const row of data || []) {
      const h = rowToHealth(row)
      if (h) out.set(h.projectId, h)
    }
  } catch {
    // Health is additive — the overview still renders without it.
  }
  return out
}

/**
 * Recompute health for one project and store it.
 *
 * Idempotent: running it twice on unchanged data writes the same row and
 * records no second delta, because `diffHealth` returns null when the score
 * did not move.
 */
export async function refreshProjectHealth(
  service: ServiceClient,
  projectId: string,
): Promise<ProjectHealth | null> {
  try {
    const previous = await readProjectHealth(service, projectId)
    const input = await collectHealthInput(service, projectId)
    const next = computeProjectHealth(input)

    await service.from('project_intelligence').upsert(
      {
        project_id: projectId,
        health_score: next.score,
        health_band: next.band,
        health_factors: next.factors,
        health_confidence: next.confidence,
        health_cause: next.cause,
        health_computed_at: next.computedAt,
        updated_at: next.computedAt,
      },
      { onConflict: 'project_id' },
    )

    const delta = diffHealth(previous, next)
    if (delta) {
      await service.from('project_health_deltas').insert({
        project_id: projectId,
        previous: delta.previous,
        next: delta.next,
        why: delta.why,
        factors_touched: delta.factorsTouched,
        at: delta.at,
      })
    }

    return next
  } catch {
    // Measurement must never break the action that triggered it.
    return null
  }
}

/** The recent cause chain for a project, newest first. */
export async function readHealthHistory(
  service: ServiceClient,
  projectId: string,
  limit = 10,
): Promise<Array<{ previous: number | null; next: number | null; why: string; at: string }>> {
  try {
    const { data } = await service
      .from('project_health_deltas')
      .select('previous, next, why, at')
      .eq('project_id', projectId)
      .order('at', { ascending: false })
      .limit(limit)
    return (data || []) as Array<{
      previous: number | null
      next: number | null
      why: string
      at: string
    }>
  } catch {
    return []
  }
}
