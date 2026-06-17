import { NextRequest, NextResponse } from 'next/server'
import { assertDevRole, devAccessibleProjectIds, devDefaultProjectId, resolveDevApiContext } from '@/lib/dev-api'
import { getServiceClient } from '@/lib/supabase/service'
import { runDecisionPipeline } from '@/lib/decisions'
import type { DecisionSignal } from '@/lib/decisions'
import { DECISION_SAMPLE_SEEDS } from '@/lib/decisions/sample-seeds'

export const runtime = 'nodejs'
export const maxDuration = 120

/**
 * POST /api/dev/decisions/seed
 *
 * Provisional sample decisions for the signed-in dev/owner account.
 * Uses the real decision pipeline + optional Tagro field enrichment.
 *
 * Body: { project_id?: string; force?: boolean }
 *   force — delete existing sample-tagged rows and re-seed
 */
export async function POST(req: NextRequest) {
  const ctx = await resolveDevApiContext(req)
  if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const isDev = await assertDevRole(ctx.db, ctx.user.id)
  if (!isDev) return NextResponse.json({ error: 'not_a_developer' }, { status: 403 })

  const user = ctx.user
  const body = (await req.json().catch(() => ({}))) as { project_id?: string; force?: boolean }
  const db = getServiceClient() ?? ctx.db

  let projectId = body.project_id || null
  if (!projectId) {
    projectId = await devDefaultProjectId(ctx.db, user.id)
  }
  if (!projectId) {
    return NextResponse.json({ error: 'no_project_found' }, { status: 400 })
  }

  const accessible = await devAccessibleProjectIds(ctx.db, user.id)
  if (!accessible.includes(projectId)) {
    return NextResponse.json({ error: 'project_forbidden' }, { status: 403 })
  }

  const { data: proj } = await (ctx.db as any)
    .from('projects')
    .select('id,title,user_id,client_id')
    .eq('id', projectId)
    .maybeSingle()
  if (!proj) return NextResponse.json({ error: 'project_not_found' }, { status: 404 })

  const requestedFor = proj.client_id || proj.user_id || user.id

  if (body.force) {
    await (db as any)
      .from('decisions')
      .delete()
      .eq('project_id', projectId)
      .eq('source', 'dev_request')
      .ilike('internal_description', '%[festag-sample]%')
  } else {
    const { count } = await (db as any)
      .from('decisions')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .ilike('internal_description', '%[festag-sample]%')
    if ((count ?? 0) > 0) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: 'already_seeded',
        project_id: projectId,
        count,
      })
    }
  }

  const created: Array<{ id: string; title: string; status: string }> = []

  for (const seed of DECISION_SAMPLE_SEEDS) {
    const question = `${seed.question} [festag-sample]`
    const signal: DecisionSignal = {
      kind: 'dev_request',
      projectId,
      authorUserId: user.id,
      question,
      suggestedOptions: seed.suggested_options,
      suggestedResponseType: seed.suggested_response_type,
      suggestedDecisionType: seed.suggested_decision_type,
      urgency: seed.urgency,
    }

    let outcome
    try {
      outcome = await runDecisionPipeline(db as any, signal, {
        requestedFor,
        createdBy: user.id,
      })
    } catch (err: any) {
      return NextResponse.json({
        error: 'pipeline_failed',
        detail: err?.message,
        created,
      }, { status: 500 })
    }

    const decision =
      outcome.status === 'created' ? outcome.result.decision
      : outcome.status === 'refreshed' ? outcome.existing
      : null

    if (!decision) continue

    const patch: Record<string, unknown> = {}
    if (seed.tagro) {
      patch.tagro_reasoning = seed.tagro.tagro_reasoning
      patch.tagro_recommendation_reason = seed.tagro.tagro_recommendation_reason ?? seed.tagro.tagro_reasoning
      patch.tagro_run_at = new Date().toISOString()
      patch.tagro_confidence_in_framing = 0.82
      if (seed.tagro.recommended_option) {
        patch.recommended_option = seed.tagro.recommended_option
      }
    }

    if (seed.presetDecided) {
      patch.status = 'decided'
      patch.decided_by = requestedFor
      patch.decided_at = new Date(Date.now() - 86400000).toISOString()
      patch.response_value = { selected_option_id: seed.presetDecided.selected_option_id }
      patch.selected_option = seed.presetDecided.selected_option_id
      patch.rationale = seed.presetDecided.rationale ?? null
    }

    if (Object.keys(patch).length > 0) {
      await (db as any).from('decisions').update(patch).eq('id', decision.id)
    }

    created.push({
      id: decision.id,
      title: decision.client_title || decision.title,
      status: seed.presetDecided ? 'decided' : decision.status,
    })
  }

  return NextResponse.json({
    ok: true,
    project_id: projectId,
    project_title: proj.title,
    requested_for: requestedFor,
    created,
    client_url: '/decisions?demo=0',
  })
}
