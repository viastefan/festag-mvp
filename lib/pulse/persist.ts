/**
 * Persist / load Delivery Pulse snapshots.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { DeliveryPulse, PulseScope } from '@/lib/pulse/types'

export async function saveDeliveryPulse(
  sb: SupabaseClient<any>,
  userId: string,
  pulse: DeliveryPulse,
  workspaceId?: string | null,
): Promise<void> {
  try {
    await (sb as any).from('delivery_pulses').insert({
      user_id: userId,
      workspace_id: workspaceId || null,
      project_id: pulse.projectId,
      scope: pulse.scope,
      progress: pulse.progress,
      risk: pulse.risk,
      next_step: pulse.next_step,
      health: pulse.health,
      confidence: pulse.confidence,
      proof_capsules: pulse.proof,
      source: pulse.source,
      generated_at: pulse.generatedAt,
    })
  } catch {
    /* table may not be migrated yet — pulse still works in-memory */
  }
}

export async function loadLatestDeliveryPulse(
  sb: SupabaseClient<any>,
  userId: string,
  opts: { scope: PulseScope; projectId?: string | null },
): Promise<DeliveryPulse | null> {
  try {
    let q = (sb as any)
      .from('delivery_pulses')
      .select(
        'progress,risk,next_step,health,confidence,proof_capsules,source,generated_at,project_id,scope',
      )
      .eq('user_id', userId)
      .eq('scope', opts.scope)
      .order('generated_at', { ascending: false })
      .limit(1)

    if (opts.scope === 'project' && opts.projectId) {
      q = q.eq('project_id', opts.projectId)
    } else if (opts.scope === 'overall') {
      q = q.is('project_id', null)
    }

    const { data } = await q.maybeSingle()
    if (!data) return null

    return {
      progress: String(data.progress),
      risk: String(data.risk),
      next_step: String(data.next_step),
      health: data.health,
      confidence: Number(data.confidence) || 0.5,
      proof: Array.isArray(data.proof_capsules) ? data.proof_capsules : [],
      scope: data.scope,
      projectId: data.project_id,
      projectTitle: null,
      source: data.source === 'tagro' ? 'tagro' : 'cached',
      generatedAt: data.generated_at,
    }
  } catch {
    return null
  }
}
