// ─────────────────────────────────────────────────────────────────────────────
// Risk → Decision.
//
// A risk that needs a human call becomes a Decision in the existing decision
// engine — not a second, parallel approval mechanism. The risk keeps the
// evidence, the decision carries the question.
//
// @see lib/decisions/create.ts
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import { persistFramedDecision } from '@/lib/decisions/create'
import type { FramedDecision } from '@/lib/decisions/intents'
import { writeEvent } from '@/lib/risks/engine'
import { delayLabel } from '@/lib/risks/present'
import type { Risk, RiskLink } from '@/lib/risks/types'

const URGENCY_BY_SEVERITY: Record<Risk['severity'], 'low' | 'normal' | 'high' | 'critical'> = {
  low: 'low',
  medium: 'normal',
  high: 'high',
  critical: 'critical',
}

/**
 * Creates the decision this risk is asking for and links the two.
 * Returns null when the risk already has one — a risk never spawns a second
 * open decision for the same question.
 */
export async function createDecisionForRisk(
  supa: SupabaseClient<any, any, any>,
  risk: Risk,
  opts: { requestedFor?: string | null; createdBy?: string | null; links?: RiskLink[] } = {},
): Promise<{ decisionId: string } | null> {
  if (risk.decision_id) return null

  const recommendation = risk.recommendation?.trim() || 'Die empfohlene Maßnahme umsetzen'
  const consequence = delayLabel(risk.potential_delay_days)
  const clientTitle = risk.client_title || risk.title
  const taskLinks = (opts.links ?? []).filter(l => l.target_kind === 'task')

  const framed: FramedDecision = {
    intent: {
      projectId: risk.project_id,
      decisionType: 'risk_response',
      urgency: URGENCY_BY_SEVERITY[risk.severity],
      origin: {
        kind: 'risk_threshold',
        id: risk.id,
        reason: `Risiko ${risk.severity} — ${risk.title}`,
      },
      rawTitle: risk.title,
      rawQuestion: `${recommendation}?`,
      blocks: taskLinks.map(l => ({ kind: 'task' as const, id: l.target_id })),
      signal: {
        kind: 'risk_threshold',
        projectId: risk.project_id,
        riskDescription: risk.description || risk.title,
        severity: risk.severity === 'low' ? 'medium' : risk.severity,
      },
    },
    internalTitle: `Maßnahme zu: ${risk.title}`,
    internalDescription:
      `${risk.description || risk.title}\n\nEmpfehlung: ${recommendation}.`
      + (risk.recommendation_reason ? `\nBegründung: ${risk.recommendation_reason}` : ''),
    clientTitle: `${recommendation}?`,
    clientSummary:
      `${risk.client_summary || clientTitle}`
      + (consequence ? ` Ohne Maßnahme rechnen wir mit ${consequence}.` : ''),
    tagroReasoning:
      risk.recommendation_reason
      || 'Die vorliegenden Projektsignale sprechen für ein frühes Gegensteuern.',
    tagroRecommendationReason: risk.recommendation_reason ?? null,
    tagroConfidenceInFraming: risk.confidence ?? 0.6,
    decisionType: 'risk_response',
    responseType: 'binary',
    authority: 'client',
    delegateAllowed: risk.severity !== 'critical',
    urgency: URGENCY_BY_SEVERITY[risk.severity],
    reversibility: 'two_way_door',
    // Never silently decide a risk response for someone.
    autoResolveStrategy: 'escalate_only',
    deadlineHard: null,
    leadTimeDays: risk.severity === 'critical' ? 0 : 1,
    deliberationHours: null,
    costOfDelayPerDay: null,
    options: [
      {
        label: recommendation,
        clientLabel: recommendation,
        description: risk.recommendation_reason ?? undefined,
        implications: {
          time_delta_days: 0,
          // Acting now is what keeps the residual risk low.
          risk_delta: 'low',
        },
        recommendedByTagro: true,
      },
      {
        label: 'Risiko bewusst akzeptieren',
        clientLabel: 'So weitermachen und Risiko akzeptieren',
        description: consequence
          ? `Wir planen mit ${consequence} und ändern nichts am Vorgehen.`
          : 'Wir ändern nichts am Vorgehen und beobachten weiter.',
        implications: {
          time_delta_days: risk.potential_delay_days ?? undefined,
          risk_delta: risk.severity === 'critical' ? 'high' : 'medium',
        },
        recommendedByTagro: false,
      },
    ],
    model: 'heuristic',
    initialStatus: 'pending_client',
  }

  const result = await persistFramedDecision(framed, {
    requestedFor: opts.requestedFor ?? null,
    createdBy: opts.createdBy ?? null,
    userClient: supa,
  })

  const decisionId = result.decision.id

  await (supa as any)
    .from('risks')
    .update({ decision_id: decisionId, status: 'decision_required' })
    .eq('id', risk.id)

  await (supa as any).from('risk_links').upsert(
    [{ risk_id: risk.id, target_kind: 'decision', target_id: decisionId, link_kind: 'resolves' }],
    { onConflict: 'risk_id,target_kind,target_id,link_kind', ignoreDuplicates: true },
  )

  await writeEvent(supa, risk.id, {
    event_type: 'decision_created',
    actor_kind: 'tagro',
    actor_user_id: opts.createdBy ?? null,
    summary: `Entscheidung vorbereitet: ${recommendation}?`,
    payload: { decision_id: decisionId },
  })

  return { decisionId }
}
