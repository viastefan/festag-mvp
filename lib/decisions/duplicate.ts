// ─────────────────────────────────────────────────────────────────────────────
// Decision Engine — Duplicate detection
//
// Prevents two open decisions for the same underlying question. Mirrors the
// pattern in lib/tagro/deduplication.ts for tasks.
//
// Match policy:
//   - Same project_id.
//   - Status in the open set (drafted / pending_client / awaiting_clarification
//     / legacy open / waiting_for_client / in_progress).
//   - Title-Jaccard similarity ≥ DUPLICATE_THRESHOLD (default 0.62) on either
//     the internal title or the client title.
//   - Decision type compatible (same or both clarification).
//
// On match, callers SHOULD update the existing decision (e.g., refresh
// urgency, append a new origin to its audit trail) rather than creating a
// new row. The persistence layer handles that.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import type { DecisionIntent } from './intents'
import type { DecisionRow, DecisionStatus } from './types'

const DUPLICATE_THRESHOLD = 0.62
const OPEN_STATES_FOR_DUPLICATES: DecisionStatus[] = [
  'drafted',
  'pending_client',
  'awaiting_clarification',
  'open',
  'waiting_for_client',
  'in_progress',
]

function normalize(value: string): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9äöüß\s-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function jaccard(a: string, b: string): number {
  const left = new Set(normalize(a).split(' ').filter((w) => w.length > 2))
  const right = new Set(normalize(b).split(' ').filter((w) => w.length > 2))
  if (!left.size || !right.size) return 0
  let overlap = 0
  left.forEach((w) => { if (right.has(w)) overlap += 1 })
  return overlap / Math.max(left.size, right.size)
}

export async function findDuplicateOpenDecision(
  supa: SupabaseClient<any>,
  intent: DecisionIntent,
): Promise<DecisionRow | null> {
  if (!intent.projectId || !intent.rawTitle?.trim()) return null

  const { data } = await supa
    .from('decisions')
    .select('*')
    .eq('project_id', intent.projectId)
    .in('status', OPEN_STATES_FOR_DUPLICATES)
    .order('created_at', { ascending: false })
    .limit(60)

  const candidates = (data as DecisionRow[] | null) ?? []
  const probeTitle = intent.rawTitle
  for (const row of candidates) {
    const typesCompatible =
      !row.decision_type ||
      row.decision_type === intent.decisionType ||
      row.decision_type === 'clarification' ||
      intent.decisionType === 'clarification'
    if (!typesCompatible) continue

    const titles = [
      row.internal_title,
      row.client_title,
      row.title, // legacy column, still populated
    ].filter((t): t is string => !!t)

    if (titles.some((t) => jaccard(probeTitle, t) >= DUPLICATE_THRESHOLD)) {
      return row
    }
  }
  return null
}
