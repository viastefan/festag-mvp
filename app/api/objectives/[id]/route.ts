import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  isValidObjectiveStatus,
  type ObjectiveUpdateInput,
} from '@/lib/objectives/types'
import { computeObjectiveProgress, enrichObjective } from '@/lib/objectives/progress'

export const runtime = 'nodejs'

type RouteParams = { params: Promise<{ id: string }> }

/** PATCH /api/objectives/[id] */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as ObjectiveUpdateInput
  const patch: Record<string, unknown> = {}

  if (body.title !== undefined) patch.title = String(body.title).trim().slice(0, 240)
  if (body.description !== undefined) patch.description = body.description?.slice(0, 4000) || null
  if (body.target_date !== undefined) patch.target_date = body.target_date || null
  if (body.owner !== undefined) patch.owner = body.owner || null
  if (body.status !== undefined && isValidObjectiveStatus(body.status)) patch.status = body.status
  if (body.progress_pct !== undefined) {
    patch.progress_pct = Math.max(0, Math.min(100, Number(body.progress_pct) || 0))
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'no fields to update' }, { status: 400 })
  }

  const { data, error } = await (supa as any)
    .from('objectives')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const counts = await computeObjectiveProgress(supa as any, id)
  return NextResponse.json({ objective: enrichObjective(data, counts) })
}

/** DELETE /api/objectives/[id] */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { error } = await (supa as any).from('objectives').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
