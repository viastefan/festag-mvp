/**
 * OKM fact persistence — upsert / list workspace Operational DNA.
 * Always gate writes with readAdaptiveIntelligenceSettings first.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { OkmDomain, OkmFactDraft, OperationalDnaKind } from '@/lib/intelligence/okm'
import { isMissingTableError } from '@/lib/supabase/safe-table'

export type OkmFactRow = {
  id: string
  workspace_id: string
  fact_key: string
  domain: OkmDomain
  dna_kind: OperationalDnaKind | null
  claim: string
  confidence: number
  observation_count: number
  evidence_json: unknown
  source: OkmFactDraft['source']
  subject_user_id: string | null
  last_observed_at: string
  created_at: string
  updated_at: string
}

export type OkmUpsertInput = OkmFactDraft & {
  workspaceId: string
  factKey: string
  /** Cap evidence ids stored per fact (privacy + size). */
  maxEvidence?: number
  subjectUserId?: string | null
}

function mergeEvidence(existing: unknown, incoming: string[] | undefined, max: number): string[] {
  const prev = Array.isArray(existing)
    ? existing.filter((x): x is string => typeof x === 'string')
    : []
  const next = [...incoming ?? []]
  const merged = Array.from(new Set([...prev, ...next]))
  return merged.slice(-max)
}

function bumpConfidence(prev: number, observations: number): number {
  // Slow climb toward 0.92 — never claim certainty from a single event.
  const base = Math.max(0.25, Math.min(0.92, prev))
  const step = Math.min(0.08, 0.02 + observations * 0.004)
  return Math.min(0.92, Number((base + step).toFixed(3)))
}

/** Load Adaptive Intelligence settings from workspaces.metadata.settings. */
export async function loadWorkspaceAdaptiveSettings(
  db: SupabaseClient,
  workspaceId: string,
): Promise<Record<string, unknown>> {
  const { data } = await (db as any)
    .from('workspaces')
    .select('metadata')
    .eq('id', workspaceId)
    .maybeSingle()
  const meta = (data?.metadata ?? {}) as Record<string, unknown>
  const settings = (meta.settings ?? {}) as Record<string, unknown>
  return settings
}

export async function upsertOkmFact(
  db: SupabaseClient,
  input: OkmUpsertInput,
): Promise<OkmFactRow | null> {
  const maxEvidence = input.maxEvidence ?? 24
  const claim = input.claim.trim().slice(0, 280)
  if (!claim || !input.factKey.trim()) return null

  const { data: existing, error: existingErr } = await (db as any)
    .from('okm_facts')
    .select('*')
    .eq('workspace_id', input.workspaceId)
    .eq('fact_key', input.factKey)
    .maybeSingle()

  if (existingErr) {
    if (isMissingTableError(existingErr)) return null
    throw new Error(existingErr.message)
  }

  const now = new Date().toISOString()

  if (existing) {
    const observation_count = Number(existing.observation_count || 1) + 1
    const evidence_json = mergeEvidence(existing.evidence_json, input.evidenceIds, maxEvidence)
    const confidence = bumpConfidence(Number(existing.confidence || 0.4), observation_count)
    const { data, error } = await (db as any)
      .from('okm_facts')
      .update({
        claim,
        domain: input.domain,
        dna_kind: input.dnaKind ?? existing.dna_kind ?? null,
        confidence,
        observation_count,
        evidence_json,
        source: input.source,
        subject_user_id: input.subjectUserId ?? existing.subject_user_id ?? null,
        last_observed_at: now,
        updated_at: now,
      })
      .eq('id', existing.id)
      .select('*')
      .single()
    if (error) {
      if (isMissingTableError(error)) return null
      throw new Error(error.message)
    }
    return data as OkmFactRow
  }

  const { data, error } = await (db as any)
    .from('okm_facts')
    .insert({
      workspace_id: input.workspaceId,
      fact_key: input.factKey,
      domain: input.domain,
      dna_kind: input.dnaKind ?? null,
      claim,
      confidence: Math.min(0.55, Math.max(0.3, input.confidence)),
      observation_count: 1,
      evidence_json: (input.evidenceIds ?? []).slice(0, maxEvidence),
      source: input.source,
      subject_user_id: input.subjectUserId ?? null,
      last_observed_at: now,
      updated_at: now,
    })
    .select('*')
    .single()
  if (error) {
    if (isMissingTableError(error)) return null
    throw new Error(error.message)
  }
  return data as OkmFactRow
}

export async function listOkmFacts(
  db: SupabaseClient,
  workspaceId: string,
  opts?: { domain?: OkmDomain; limit?: number },
): Promise<OkmFactRow[]> {
  let q = (db as any)
    .from('okm_facts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('confidence', { ascending: false })
    .limit(opts?.limit ?? 40)
  if (opts?.domain) q = q.eq('domain', opts.domain)
  const { data, error } = await q
  if (error) {
    if (isMissingTableError(error)) return []
    throw new Error(error.message)
  }
  return (data ?? []) as OkmFactRow[]
}
