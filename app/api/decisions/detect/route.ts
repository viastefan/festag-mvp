import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runDecisionPipeline } from '@/lib/decisions'
import type { DecisionSignal } from '@/lib/decisions'

export const runtime = 'nodejs'

/**
 * POST /api/decisions/detect
 *
 * Internal hook for background sources to feed signals into the engine.
 * Called by:
 *   - Status report generator (status_report kind)
 *   - Task save / blocker save (blocker, vague_task)
 *   - Risk reclassifier (risk_threshold)
 *   - Scope drift detector (scope_drift)
 *
 * The endpoint accepts a full DecisionSignal in the body and dispatches it
 * to runDecisionPipeline. Anti-spam limiter and duplicate detector run
 * inside the pipeline.
 *
 * Authorization: any authenticated user with project access. RLS on the
 * decisions table handles the actual data fence; this endpoint trusts the
 * caller to have membership.
 *
 * Body: { signal: DecisionSignal, requested_for?: string, owner_review?: boolean }
 */

type Body = {
  signal?: DecisionSignal
  requested_for?: string
  owner_review?: boolean
}

const ALLOWED_KINDS = new Set([
  'vague_task',
  'blocker',
  'dev_request',
  'scope_drift',
  'risk_threshold',
  'status_report',
])

export async function POST(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const b = (await req.json().catch(() => ({}))) as Body
  const signal = b.signal
  if (!signal || typeof signal !== 'object') {
    return NextResponse.json({ error: 'signal required' }, { status: 400 })
  }
  if (!ALLOWED_KINDS.has(signal.kind as string)) {
    return NextResponse.json({ error: 'unknown signal.kind', allowed: Array.from(ALLOWED_KINDS) }, { status: 400 })
  }
  if (!(signal as any).projectId) {
    return NextResponse.json({ error: 'signal.projectId required' }, { status: 400 })
  }

  // Project access check — light-touch, RLS enforces the rest.
  const { data: proj } = await (supa as any).from('projects')
    .select('id,user_id,client_id').eq('id', (signal as any).projectId).maybeSingle()
  if (!proj) return NextResponse.json({ error: 'project not found or no access' }, { status: 404 })

  // For dev_request signals, stamp the author if missing.
  if (signal.kind === 'dev_request' && !signal.authorUserId) {
    (signal as any).authorUserId = user.id
  }

  let requestedFor = b.requested_for || null
  if (!requestedFor) requestedFor = proj.client_id || proj.user_id || null

  try {
    const outcome = await runDecisionPipeline(supa as any, signal, {
      requestedFor,
      createdBy: signal.kind === 'dev_request' ? user.id : null,
      ownerReviewBeforePublish: !!b.owner_review,
    })
    return NextResponse.json({ outcome })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'pipeline_failed' }, { status: 500 })
  }
}
