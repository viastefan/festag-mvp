/**
 * Tagro Intelligence — write path.
 *
 * Turns resolved decisions into stored outcomes and a project-level profile.
 * Called after a decision reaches a terminal state; never throws into the
 * request path, because learning must never block a user action.
 */

import { DECISION_TERMINAL_STATUS_LIST } from '@/lib/decisions/types'
import { deriveAcceptance, scoreDecisionRow } from './derive'
import { scoreProjectWisdom, adaptConfidence } from './scoring'
import type { DecisionRow } from './derive'

type ServiceClient = {
  from: (table: string) => any
}

const SELECT_COLUMNS =
  'id, project_id, decision_type, recommended_option, selected_option, status, superseded_by, decided_at, due_at, created_by_tagro'

/**
 * Re-score every resolved decision of a project and refresh its profile.
 * Idempotent: re-running produces the same rows.
 */
export async function recordProjectIntelligence(
  service: ServiceClient,
  projectId: string,
): Promise<{ ok: boolean; scored: number; wisdomScore: number | null }> {
  try {
    const { data, error } = await service
      .from('decisions')
      .select(SELECT_COLUMNS)
      .eq('project_id', projectId)
      .in('status', DECISION_TERMINAL_STATUS_LIST as unknown as string[])
      .limit(500)

    if (error || !data?.length) {
      return { ok: !error, scored: 0, wisdomScore: null }
    }

    const rows = data as Array<DecisionRow & { project_id: string }>
    const outcomes = rows.map((row) => {
      const scored = scoreDecisionRow(row)
      return {
        decision_id: row.id,
        project_id: row.project_id,
        category: scored.category,
        acceptance: deriveAcceptance(row),
        reverted: Boolean(row.superseded_by),
        outcome_score: scored.score,
        parts_json: scored.parts,
        summary: scored.summary,
        updated_at: new Date().toISOString(),
      }
    })

    await service
      .from('decision_outcomes')
      .upsert(outcomes, { onConflict: 'decision_id' })

    const wisdom = scoreProjectWisdom(
      rows.map((row, i) => ({
        decisionId: row.id,
        category: outcomes[i].category,
        score: outcomes[i].outcome_score,
      })),
    )

    const confidence = adaptConfidence({
      prior: 80,
      outcomes: outcomes.map((o) => o.outcome_score),
    })

    await service.from('project_intelligence').upsert(
      {
        project_id: projectId,
        wisdom_score: wisdom.score,
        decision_count: wisdom.decisionCount,
        confidence,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'project_id' },
    )

    return { ok: true, scored: outcomes.length, wisdomScore: wisdom.score }
  } catch {
    // Learning is best-effort — a failure here must not surface to the user.
    return { ok: false, scored: 0, wisdomScore: null }
  }
}
