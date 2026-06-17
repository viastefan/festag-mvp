import { NextRequest, NextResponse } from 'next/server'
import { assertDevRole, devAccessibleProjectIds, resolveDevApiContext } from '@/lib/dev-api'
import { getServiceClient } from '@/lib/supabase/service'
import { runDecisionPipeline } from '@/lib/decisions'
import type { DecisionSignal } from '@/lib/decisions'
import type { DecisionType, DecisionUrgency, ResponseType } from '@/lib/decisions/types'

const URGENCIES = new Set<DecisionUrgency>(['low', 'normal', 'high', 'critical'])

export const runtime = 'nodejs'

/**
 * POST /api/decisions/request
 *
 * Engine-backed entry point. A developer (or project owner) asks Tagro to
 * frame and route a decision to the client.
 */

type Body = {
  project_id?: string
  task_id?: string
  question?: string
  suggested_options?: unknown
  suggested_response_type?: ResponseType
  suggested_decision_type?: DecisionType
  urgency?: DecisionUrgency
  requested_for?: string
  owner_review?: boolean
}

export async function POST(req: NextRequest) {
  const ctx = await resolveDevApiContext(req)
  if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const isDev = await assertDevRole(ctx.db, ctx.user.id)
  if (!isDev) return NextResponse.json({ error: 'not_a_developer' }, { status: 403 })

  const user = ctx.user
  const b = (await req.json().catch(() => ({}))) as Body
  if (!b.project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 })
  if (!b.question || !b.question.trim()) return NextResponse.json({ error: 'question required' }, { status: 400 })

  const accessible = await devAccessibleProjectIds(ctx.db, user.id)
  if (!accessible.includes(b.project_id)) {
    return NextResponse.json({ error: 'project_forbidden' }, { status: 403 })
  }

  let requestedFor = b.requested_for || null
  if (!requestedFor) {
    const { data: proj } = await (ctx.db as any).from('projects')
      .select('user_id,client_id').eq('id', b.project_id).maybeSingle()
    requestedFor = proj?.client_id || proj?.user_id || null
  }

  const suggestedOptions = Array.isArray(b.suggested_options)
    ? (b.suggested_options as unknown[]).filter((x): x is string => typeof x === 'string' && x.trim().length > 0).slice(0, 4)
    : undefined

  const urgency = b.urgency && URGENCIES.has(b.urgency) ? b.urgency : undefined

  const signal: DecisionSignal = {
    kind: 'dev_request',
    projectId: b.project_id,
    taskId: b.task_id,
    authorUserId: user.id,
    question: b.question.trim().slice(0, 4000),
    suggestedOptions,
    suggestedResponseType: b.suggested_response_type,
    suggestedDecisionType: b.suggested_decision_type,
    urgency,
  }

  const pipelineDb = getServiceClient() ?? ctx.db

  try {
    const outcome = await runDecisionPipeline(pipelineDb as any, signal, {
      requestedFor,
      createdBy: user.id,
      ownerReviewBeforePublish: !!b.owner_review,
    })

    return NextResponse.json({ outcome })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'pipeline_failed' }, { status: 500 })
  }
}
