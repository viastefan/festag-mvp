import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { propagateDecisionApply } from '@/lib/decisions/apply-propagation'
import { extractOkmFromDecidedDecision } from '@/lib/intelligence/extract-decision-patterns'

export const runtime = 'nodejs'

/**
 * POST /api/decisions/:id/apply
 *
 * Propagates a decided decision into the project. Idempotent.
 */

export async function POST(_req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: d } = await (supa as any).from('decisions')
    .select('id,project_id,status,decision_type,authority,response_type,response_value,reversibility')
    .eq('id', ctx.params.id).maybeSingle()
  if (!d) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const { data: proj } = await (supa as any).from('projects')
    .select('user_id,client_id').eq('id', d.project_id).maybeSingle()
  const isOwner = proj?.user_id === user.id
  const isClient = proj?.client_id === user.id
  if (!isOwner && !isClient) {
    return NextResponse.json({ error: 'not allowed' }, { status: 403 })
  }

  try {
    const result = await propagateDecisionApply(supa as any, ctx.params.id, user.id)
    const applied = result.decision as typeof d & { status?: string }
    if (!result.already_applied) {
      const okmDb = getServiceClient() ?? supa
      void extractOkmFromDecidedDecision(okmDb as any, {
        id: applied?.id ?? d.id,
        project_id: applied?.project_id ?? d.project_id,
        decision_type: applied?.decision_type ?? d.decision_type,
        authority: applied?.authority ?? d.authority,
        response_type: applied?.response_type ?? d.response_type,
        response_value: applied?.response_value ?? d.response_value,
        status: applied?.status ?? 'applied',
        reversibility: applied?.reversibility ?? d.reversibility,
      })
    }
    return NextResponse.json({
      decision: result.decision,
      propagated: result.propagated,
      already_applied: result.already_applied ?? false,
    })
  } catch (err: any) {
    if (err?.message === 'not_decided') {
      return NextResponse.json({ error: 'decision must be decided before apply', current_status: d.status }, { status: 400 })
    }
    return NextResponse.json({ error: err?.message ?? 'apply_failed' }, { status: 500 })
  }
}
