/**
 * Load up to 3 client-visible proof capsules from evidence + project assets.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { clampProofLabel, type ProofCapsule } from '@/lib/proof/types'

export async function loadClientProofCapsules(
  sb: SupabaseClient<any>,
  projectIds: string[],
  limit = 3,
): Promise<ProofCapsule[]> {
  if (!projectIds.length || limit <= 0) return []

  const out: ProofCapsule[] = []

  const { data: evidence } = await sb
    .from('evidence')
    .select('id,title,evidence_type,proof_strength,url,created_at,project_id')
    .in('project_id', projectIds)
    .eq('client_visible', true)
    .in('proof_strength', ['strong', 'verified', 'medium'])
    .order('created_at', { ascending: false })
    .limit(8)

  for (const row of (evidence as any[]) ?? []) {
    if (out.length >= limit) break
    const label = clampProofLabel(row.title || row.evidence_type || 'Beleg')
    if (!label) continue
    out.push({
      id: `ev-${row.id}`,
      label,
      kind: 'proof',
      occurredAt: row.created_at ?? null,
      href: row.url || null,
      strength: row.proof_strength ?? null,
    })
  }

  if (out.length >= limit) return out.slice(0, limit)

  const { data: assets } = await sb
    .from('project_assets')
    .select('id,title,status,created_at,project_id,external_url,preview_url')
    .in('project_id', projectIds)
    .in('visibility', ['client_visible', 'white_label_visible'])
    .neq('status', 'archived')
    .order('created_at', { ascending: false })
    .limit(6)

  for (const row of (assets as any[]) ?? []) {
    if (out.length >= limit) break
    const label = clampProofLabel(row.title || 'Lieferung')
    if (!label) continue
    out.push({
      id: `dl-${row.id}`,
      label,
      kind: 'deliverable',
      occurredAt: row.created_at ?? null,
      href: row.external_url || row.preview_url || null,
      strength: row.status === 'approved' ? 'verified' : 'strong',
    })
  }

  return out.slice(0, limit)
}
