import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveRiskAudience } from '@/lib/risks/audience'
import { computeSeverity } from '@/lib/risks/severity'
import { projectHealth } from '@/lib/risks/health'
import { sanitizeRiskForAudience, sanitizeSignalsForAudience } from '@/lib/risks/present'
import {
  PROBABILITY_BY_LEVEL,
  RISK_OPEN_STATUS_LIST,
  isValidRiskCategory,
  isValidRiskLevel,
  isValidRiskStatus,
  type Risk,
  type RiskCreateInput,
  type RiskSignal,
} from '@/lib/risks/types'
import { isMissingTableError, safeTableRows } from '@/lib/supabase/safe-table'

export const runtime = 'nodejs'

/**
 * GET /api/risks
 *   Risks for the projects the user can reach, in their audience's framing.
 *   Query: project_id?, status?, open=1, severity?, category?, limit?
 *
 * POST /api/risks
 *   Manual risk creation. Severity is computed, never taken from the client.
 */
export async function GET(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const params = new URL(req.url).searchParams
  const projectId = params.get('project_id')
  const status = params.get('status')
  const severity = params.get('severity')
  const category = params.get('category')
  const onlyOpen = params.get('open') === '1'
  const limit = Math.min(Number(params.get('limit') || 100), 300)

  let q = (supa as any)
    .from('risks')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (projectId) q = q.eq('project_id', projectId)
  if (status && isValidRiskStatus(status)) q = q.eq('status', status)
  if (severity && isValidRiskLevel(severity)) q = q.eq('severity', severity)
  if (category && isValidRiskCategory(category)) q = q.eq('category', category)
  if (onlyOpen) q = q.in('status', RISK_OPEN_STATUS_LIST)

  const { data, error } = await q
  if (error) {
    if (isMissingTableError(error)) {
      // Migration not applied yet — the UI shows its empty state, not an error.
      return NextResponse.json({
        risks: [], count: 0, open_count: 0, critical_count: 0,
        table_ready: false, hint: 'Migration ausführen: supabase db push',
      })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const audience = await resolveRiskAudience(supa, user.id)
  const rows = (data ?? []) as Risk[]
  const open = rows.filter(r => RISK_OPEN_STATUS_LIST.includes(r.status))

  // Die Einschätzung hängt nicht am gewählten Filter: sie zählt immer alle
  // offenen Risiken des Ausschnitts, sonst sähe „Erledigt" nach heiler Welt aus.
  let healthQuery = (supa as any)
    .from('risks')
    .select('id,severity,probability,category,status,title,client_title')
    .in('status', RISK_OPEN_STATUS_LIST)
    .limit(300)
  if (projectId) healthQuery = healthQuery.eq('project_id', projectId)
  const health = projectHealth(await safeTableRows<Risk>(healthQuery))

  // The flow's "Warum diese Empfehlung?" sheet needs the evidence with the
  // list, so it doesn't have to fetch each risk separately.
  let signalsByRisk: Record<string, RiskSignal[]> | undefined
  if (params.get('with_signals') === '1' && rows.length) {
    const signals = await safeTableRows<RiskSignal>(
      (supa as any)
        .from('risk_signals')
        .select('*')
        .in('risk_id', rows.map(r => r.id))
        .order('weight', { ascending: false }),
    )
    const visible = sanitizeSignalsForAudience(signals, audience)
    signalsByRisk = {}
    for (const s of visible) (signalsByRisk[s.risk_id] ||= []).push(s)
  }

  return NextResponse.json({
    risks: rows.map(r => sanitizeRiskForAudience(r, audience)),
    signals: signalsByRisk,
    health,
    audience,
    count: rows.length,
    open_count: open.length,
    critical_count: open.filter(r => r.severity === 'critical').length,
    table_ready: true,
  })
}

export async function POST(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as RiskCreateInput
  if (!body.project_id || !body.title?.trim()) {
    return NextResponse.json({ error: 'project_id and title required' }, { status: 400 })
  }

  const { data: project, error: projectErr } = await (supa as any)
    .from('projects')
    .select('id,workspace_id,target_date')
    .eq('id', body.project_id)
    .maybeSingle()
  if (projectErr) return NextResponse.json({ error: projectErr.message }, { status: 500 })
  if (!project) return NextResponse.json({ error: 'project not found' }, { status: 404 })

  const impact = isValidRiskLevel(body.impact) ? body.impact : 'medium'
  const probability = typeof body.probability === 'number'
    ? Math.min(1, Math.max(0, body.probability))
    : PROBABILITY_BY_LEVEL[body.probability_level ?? 'medium']

  const daysUntilDeadline = project.target_date
    ? (new Date(project.target_date).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    : null

  const { severity } = computeSeverity({
    probability,
    impact,
    daysUntilDeadline,
    dependentCount: body.task_ids?.length ?? 0,
  })

  const { data, error } = await (supa as any)
    .from('risks')
    .insert({
      project_id: body.project_id,
      workspace_id: project.workspace_id ?? null,
      title: body.title.trim(),
      description: body.description ?? null,
      category: isValidRiskCategory(body.category) ? body.category : 'delivery',
      probability,
      impact,
      severity,
      // A person reporting a risk is the strongest signal there is.
      confidence: 0.9,
      status: isValidRiskStatus(body.status) ? body.status : 'active',
      source: body.source === 'developer' || body.source === 'client' ? body.source : 'manual',
      potential_delay_days: body.potential_delay_days ?? null,
      recommendation: body.recommendation ?? null,
      owner_id: body.owner_id ?? user.id,
      decision_id: body.decision_id ?? null,
      detected_at: new Date().toISOString(),
      last_signal_at: new Date().toISOString(),
      signal_count: 1,
      created_by: user.id,
      created_by_tagro: false,
    })
    .select('*')
    .maybeSingle()

  if (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json(
        { error: 'risks table missing', hint: 'supabase db push' },
        { status: 503 },
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // The reporter's own words are the first piece of evidence.
  await (supa as any).from('risk_signals').insert({
    risk_id: data.id,
    source_type: 'manual',
    dedupe_key: `manual:${data.id}`,
    label: 'Manuell gemeldet',
    detail: body.description ?? null,
    weight: 0.5,
    occurred_at: new Date().toISOString(),
  })

  if (body.task_ids?.length) {
    await (supa as any).from('risk_links').upsert(
      body.task_ids.map(id => ({
        risk_id: data.id, target_kind: 'task', target_id: id, link_kind: 'affects',
      })),
      { onConflict: 'risk_id,target_kind,target_id,link_kind', ignoreDuplicates: true },
    )
  }

  return NextResponse.json({ risk: data }, { status: 201 })
}
