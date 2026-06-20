import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeObjectiveProgress, enrichObjective, refreshObjectiveProgress } from '@/lib/objectives/progress'

export const runtime = 'nodejs'

type RouteParams = { params: Promise<{ id: string }> }

/** POST /api/objectives/[id]/tasks { task_ids: string[] } */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as { task_ids?: string[] }
  const taskIds = Array.isArray(body.task_ids) ? body.task_ids.filter(Boolean).slice(0, 30) : []
  if (taskIds.length === 0) {
    return NextResponse.json({ error: 'task_ids required' }, { status: 400 })
  }

  const links = taskIds.map(taskId => ({ objective_id: id, task_id: taskId }))
  const { error } = await (supa as any)
    .from('objective_task_links')
    .upsert(links, { onConflict: 'objective_id,task_id', ignoreDuplicates: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const objective = await refreshObjectiveProgress(supa as any, id)
  const counts = await computeObjectiveProgress(supa as any, id)

  return NextResponse.json({
    objective: objective ? enrichObjective(objective, counts) : null,
    linked: taskIds.length,
  })
}

/** DELETE /api/objectives/[id]/tasks?task_id= */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const taskId = new URL(req.url).searchParams.get('task_id')
  if (!taskId) return NextResponse.json({ error: 'task_id required' }, { status: 400 })

  const { error } = await (supa as any)
    .from('objective_task_links')
    .delete()
    .eq('objective_id', id)
    .eq('task_id', taskId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const objective = await refreshObjectiveProgress(supa as any, id)
  const counts = await computeObjectiveProgress(supa as any, id)

  return NextResponse.json({
    objective: objective ? enrichObjective(objective, counts) : null,
    ok: true,
  })
}
