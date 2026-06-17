import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runDecisionPipeline } from '@/lib/decisions'
import type { DecisionSignal } from '@/lib/decisions'
import type { DecisionType, DecisionUrgency, ResponseType } from '@/lib/decisions/types'

const URGENCIES = new Set<DecisionUrgency>(['low', 'normal', 'high', 'critical'])

export const runtime = 'nodejs'

/**
 * POST /api/decisions/request
 *
 * Engine-backed entry point. A developer (or project owner) asks Tagro to
 * frame and route a decision to the client. Wraps lib/decisions:
 *
 *   1. Builds a 'dev_request' DecisionSignal from the body.
 *   2. Calls runDecisionPipeline → detect → limit → duplicate → frame →
 *      persist (or refresh).
 *   3. Returns the resulting decision, including whether Tagro merged
 *      this request into an existing open decision.
 *
 * Body:
 *   {
 *     project_id      required
 *     task_id         optional — task this decision blocks
 *     question        required — what needs to be decided (dev language)
 *     suggested_options?     up to 4 strings
 *     suggested_response_type?  binary | single_choice | multi_choice | free_text
 *     suggested_decision_type?  one of DECISION_TYPES (defaults to 'direction')
 *     requested_for?   user id to route to; defaults to project client/owner
 *     owner_review?    if true, decision stays in 'drafted' until owner publishes
 *   }
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
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const b = (await req.json().catch(() => ({}))) as Body
  if (!b.project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 })
  if (!b.question || !b.question.trim()) return NextResponse.json({ error: 'question required' }, { status: 400 })

  // Resolve recipient. Default = project client; fallback = project owner.
  let requestedFor = b.requested_for || null
  if (!requestedFor) {
    const { data: proj } = await (supa as any).from('projects')
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

  try {
    const outcome = await runDecisionPipeline(supa as any, signal, {
      requestedFor,
      createdBy: user.id,
      ownerReviewBeforePublish: !!b.owner_review,
    })

    return NextResponse.json({ outcome })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'pipeline_failed' }, { status: 500 })
  }
}
