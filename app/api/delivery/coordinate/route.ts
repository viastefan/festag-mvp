import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDevUserFromRequest } from '@/lib/dev-auth'
import { assertDevRole, devAccessibleProjectIds, resolveDevApiContext } from '@/lib/dev-api'
import { getServiceClient } from '@/lib/supabase/service'
import {
  devProposeOptions,
  intakeClientRequest,
} from '@/lib/delivery/coordination-bridge'

export const runtime = 'nodejs'

type Body = {
  action?: 'intake_client_request' | 'dev_propose'
  projectId?: string
  taskId?: string
  title?: string
  description?: string
  priority?: 'critical' | 'high' | 'medium' | 'low'
  workType?: string
  question?: string
  suggestedOptions?: string[]
  recommendation?: string
  urgency?: 'low' | 'normal' | 'high' | 'critical'
  source?: 'client_portal' | 'email_capture' | 'tagro' | 'status_report'
}

/**
 * POST /api/delivery/coordinate
 *
 * Unified entry for the Delivery Coordination bridge:
 *   - intake_client_request — client sends a change request (e.g. visitenkarten)
 *   - dev_propose — developer proposes options for client decision
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Body
  const action = body.action

  if (!action) {
    return NextResponse.json({ error: 'action_required' }, { status: 400 })
  }

  const sb = getServiceClient() ?? createClient()

  if (action === 'intake_client_request') {
    const supa = createClient()
    const { data: { user } } = await supa.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const projectId = String(body.projectId || '')
    const title = String(body.title || '').trim()
    if (!projectId || !title) {
      return NextResponse.json({ error: 'project_and_title_required' }, { status: 400 })
    }

    const { data: project } = await supa
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .maybeSingle()
    if (!project) return NextResponse.json({ error: 'project_not_found' }, { status: 404 })

    try {
      const result = await intakeClientRequest(sb as any, {
        projectId,
        title,
        description: body.description ?? null,
        priority: body.priority,
        workType: body.workType ?? null,
        actorId: user.id,
        source: body.source ?? 'client_portal',
      })
      return NextResponse.json({ ok: true, ...result })
    } catch (e: any) {
      return NextResponse.json({ error: e?.message ?? 'intake_failed' }, { status: 500 })
    }
  }

  if (action === 'dev_propose') {
    const ctx = await resolveDevApiContext(req)
    const user = ctx?.user ?? getDevUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const db = ctx?.db ?? sb
    const isDev = await assertDevRole(db as any, user.id)
    if (!isDev) return NextResponse.json({ error: 'not_a_developer' }, { status: 403 })

    const projectId = String(body.projectId || '')
    const question = String(body.question || '').trim()
    if (!projectId || !question) {
      return NextResponse.json({ error: 'project_and_question_required' }, { status: 400 })
    }

    const accessible = await devAccessibleProjectIds(db as any, user.id)
    if (!accessible.includes(projectId)) {
      return NextResponse.json({ error: 'project_forbidden' }, { status: 403 })
    }

    try {
      const result = await devProposeOptions(sb as any, {
        projectId,
        taskId: body.taskId ?? null,
        question,
        suggestedOptions: Array.isArray(body.suggestedOptions)
          ? body.suggestedOptions.filter((x): x is string => typeof x === 'string')
          : undefined,
        recommendation: body.recommendation ?? null,
        urgency: body.urgency,
        actorId: user.id,
      })
      return NextResponse.json({ ok: true, ...result })
    } catch (e: any) {
      return NextResponse.json({ error: e?.message ?? 'propose_failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 })
}
