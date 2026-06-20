import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  isValidObjectiveStatus,
  type ObjectiveCreateInput,
  type ObjectiveUpdateInput,
} from '@/lib/objectives/types'
import { computeObjectiveProgress, enrichObjective } from '@/lib/objectives/progress'
import { isMissingTableError } from '@/lib/supabase/safe-table'

export const runtime = 'nodejs'

/** GET /api/objectives — list objectives for accessible projects */
export async function GET(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const params = new URL(req.url).searchParams
  const projectId = params.get('project_id')
  const status = params.get('status')
  const onlyActive = params.get('active') === '1'
  const limit = Math.min(Number(params.get('limit') || 100), 200)

  let q = (supa as any)
    .from('objectives')
    .select('*')
    .order('target_date', { ascending: true, nullsFirst: false })
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (projectId) q = q.eq('project_id', projectId)
  if (status && isValidObjectiveStatus(status)) q = q.eq('status', status)
  if (onlyActive) q = q.eq('status', 'active')

  const { data, error } = await q
  if (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json({
        objectives: [],
        count: 0,
        at_risk: 0,
        table_ready: false,
        hint: 'Migration ausführen: supabase db push',
      })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (data as any[]) ?? []
  const enriched = await Promise.all(rows.map(async (row) => {
    const counts = await computeObjectiveProgress(supa as any, row.id)
    return enrichObjective({ ...row, progress_pct: counts.progress_pct }, counts)
  }))

  const at_risk = enriched.filter(o => o.at_risk).length

  return NextResponse.json({
    objectives: enriched,
    count: enriched.length,
    at_risk,
  })
}

/** POST /api/objectives — create objective */
export async function POST(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as ObjectiveCreateInput
  if (!body.project_id || !body.title?.trim()) {
    return NextResponse.json({ error: 'project_id and title required' }, { status: 400 })
  }

  const { data: project, error: projectErr } = await (supa as any)
    .from('projects')
    .select('id,workspace_id')
    .eq('id', body.project_id)
    .maybeSingle()

  if (projectErr) return NextResponse.json({ error: projectErr.message }, { status: 500 })
  if (!project) return NextResponse.json({ error: 'project not found' }, { status: 404 })

  const status = isValidObjectiveStatus(body.status) ? body.status : 'active'

  const { data: objective, error } = await (supa as any)
    .from('objectives')
    .insert({
      project_id: body.project_id,
      workspace_id: project.workspace_id ?? null,
      title: body.title.trim().slice(0, 240),
      description: body.description?.slice(0, 4000) || null,
      target_date: body.target_date || null,
      status,
      owner: body.owner || user.id,
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const taskIds = Array.isArray(body.task_ids)
    ? body.task_ids.filter(Boolean).slice(0, 30)
    : []

  if (taskIds.length > 0) {
    const links = taskIds.map(taskId => ({
      objective_id: objective.id,
      task_id: taskId,
    }))
    await (supa as any).from('objective_task_links').insert(links)
  }

  const counts = await computeObjectiveProgress(supa as any, objective.id)
  if (counts.progress_pct > 0) {
    await (supa as any).from('objectives').update({ progress_pct: counts.progress_pct }).eq('id', objective.id)
    objective.progress_pct = counts.progress_pct
  }

  return NextResponse.json({
    objective: enrichObjective(objective, counts),
  })
}

export async function PATCH() {
  return NextResponse.json({ error: 'use /api/objectives/[id]' }, { status: 405 })
}

export type { ObjectiveUpdateInput }
