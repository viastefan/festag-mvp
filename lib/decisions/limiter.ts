// ─────────────────────────────────────────────────────────────────────────────
// Decision Engine — Anti-Spam Limiter
//
// Caps Tagro-auto-generated decisions per project per day. Without this,
// noisy signal sources (status reports, scope drift, risk reclassification)
// could pile decisions on the client faster than they can read them. Trust
// Layer dies if the client tunes out.
//
// Rules:
//   - Default cap: 3 auto-decisions per project per UTC day.
//   - Bypass when urgency = 'critical'.
//   - Bypass when source kind = 'dev_request' (explicit human request,
//     not Tagro's own initiative — humans set the cadence here).
//   - Configurable via env DECISION_AUTOLIMIT_PER_DAY for ops tuning.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import type { DecisionIntent } from './intents'

const DEFAULT_LIMIT = 3

function getLimit(): number {
  const raw = process.env.DECISION_AUTOLIMIT_PER_DAY
  if (!raw) return DEFAULT_LIMIT
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_LIMIT
}

export type LimiterResult =
  | { allowed: true; reason: 'bypass_critical' | 'bypass_dev_request' | 'within_limit'; usedToday: number; limit: number }
  | { allowed: false; reason: 'limit_reached'; usedToday: number; limit: number }

export async function checkAutoDecisionLimit(
  supa: SupabaseClient<any>,
  intent: DecisionIntent,
): Promise<LimiterResult> {
  // Bypasses: explicit human request or critical urgency.
  if (intent.origin.kind === 'dev_request') {
    return { allowed: true, reason: 'bypass_dev_request', usedToday: 0, limit: getLimit() }
  }
  if (intent.urgency === 'critical') {
    return { allowed: true, reason: 'bypass_critical', usedToday: 0, limit: getLimit() }
  }

  const limit = getLimit()
  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)

  const { count, error } = await supa
    .from('decisions')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', intent.projectId)
    .eq('created_by_tagro', true)
    .gte('created_at', startOfDay.toISOString())

  if (error) {
    // Be conservative on DB errors — fail open and let the create attempt
    // surface the real problem. Logging happens at the caller.
    return { allowed: true, reason: 'within_limit', usedToday: 0, limit }
  }

  const used = count ?? 0
  if (used >= limit) {
    return { allowed: false, reason: 'limit_reached', usedToday: used, limit }
  }
  return { allowed: true, reason: 'within_limit', usedToday: used, limit }
}
