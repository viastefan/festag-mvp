import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveRiskAudience } from '@/lib/risks/audience'
import { sanitizeRiskForAudience, sanitizeSignalsForAudience } from '@/lib/risks/present'
import { computeSeverity } from '@/lib/risks/severity'
import { writeEvent } from '@/lib/risks/engine'
import {
  isValidRiskCategory,
  isValidRiskLevel,
  isValidRiskStatus,
  type Risk,
  type RiskSignal,
  type RiskUpdateInput,
} from '@/lib/risks/types'
import { isMissingTableError, safeTableRows } from '@/lib/supabase/safe-table'

export const runtime = 'nodejs'

/**
 * GET /api/risks/[id]      the risk with its evidence, relations and history
 * PATCH /api/risks/[id]    edit the risk; severity is always recomputed
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data, error } = await (supa as any)
    .from('risks')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()

  if (error) {
    if (isMissingTableError(error)) return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const risk = data as Risk
  const audience = await resolveRiskAudience(supa, user.id)

  const [signals, links, events, project] = await Promise.all([
    safeTableRows<RiskSignal>((supa as any)
      .from('risk_signals').select('*').eq('risk_id', risk.id)
      .order('occurred_at', { ascending: false })),
    safeTableRows<any>((supa as any)
      .from('risk_links').select('*').eq('risk_id', risk.id)),
    safeTableRows<any>((supa as any)
      .from('risk_events').select('*').eq('risk_id', risk.id)
      .order('created_at', { ascending: false }).limit(50)),
    (supa as any).from('projects').select('id,title').eq('id', risk.project_id).maybeSingle(),
  ])

  // Affected tasks, resolved to titles so the detail view can name them.
  const taskIds = links.filter(l => l.target_kind === 'task').map(l => l.target_id)
  const tasks = taskIds.length
    ? await safeTableRows<any>((supa as any)
        .from('tasks').select('id,title,status,dev_status').in('id', taskIds))
    : []

  return NextResponse.json({
    risk: sanitizeRiskForAudience(risk, audience),
    signals: sanitizeSignalsForAudience(signals, audience),
    links,
    tasks,
    events,
    project: project?.data ?? null,
    audience,
  })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as RiskUpdateInput

  const { data: current } = await (supa as any)
    .from('risks').select('*').eq('id', params.id).maybeSingle()
  if (!current) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const patch: Record<string, unknown> = {}
  if (typeof body.title === 'string' && body.title.trim()) patch.title = body.title.trim()
  if (typeof body.description === 'string') patch.description = body.description
  if (typeof body.client_title === 'string') patch.client_title = body.client_title
  if (typeof body.client_summary === 'string') patch.client_summary = body.client_summary
  if (isValidRiskCategory(body.category)) patch.category = body.category
  if (isValidRiskLevel(body.impact)) patch.impact = body.impact
  if (typeof body.probability === 'number') {
    patch.probability = Math.min(1, Math.max(0, body.probability))
  }
  if (isValidRiskStatus(body.status)) patch.status = body.status
  if ('owner_id' in body) patch.owner_id = body.owner_id ?? null
  if ('potential_delay_days' in body) patch.potential_delay_days = body.potential_delay_days ?? null
  if ('potential_cost' in body) patch.potential_cost = body.potential_cost ?? null
  if (typeof body.recommendation === 'string') patch.recommendation = body.recommendation

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
  }

  // Severity is derived, never accepted from the caller.
  const impact = (patch.impact as Risk['impact']) ?? current.impact
  const probability = (patch.probability as number) ?? current.probability
  const { severity } = computeSeverity({ probability, impact })
  patch.severity = severity

  const { data, error } = await (supa as any)
    .from('risks').update(patch).eq('id', params.id).select('*').maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (severity !== current.severity) {
    await writeEvent(supa, params.id, {
      event_type: 'severity_changed',
      actor_kind: 'user',
      actor_user_id: user.id,
      summary: `Einstufung manuell auf ${severity} geändert.`,
      payload: { from: current.severity, to: severity },
    })
  }

  return NextResponse.json({ risk: data })
}
