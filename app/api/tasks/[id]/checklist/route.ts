import { NextResponse } from 'next/server'
import { isContextError, loadTaskContext } from '@/lib/tasks/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * The acceptance checklist — what "finished" concretely means for this task.
 *   POST   { label }               add an item
 *   PATCH  { itemId, done }        tick it off
 *   DELETE ?itemId=                remove it
 */

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ctx = await loadTaskContext(params.id)
  if (isContextError(ctx)) return ctx.response
  const { writer, task, access, user } = ctx
  if (!access.canEdit) return NextResponse.json({ error: 'not_allowed' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const label = String(body.label ?? '').trim()
  if (!label) return NextResponse.json({ error: 'label_required' }, { status: 400 })

  const { data: existing } = await (writer as any)
    .from('task_checklist_items').select('position').eq('task_id', task.id)
    .order('position', { ascending: false }).limit(1).maybeSingle()

  const { data, error } = await (writer as any).from('task_checklist_items').insert({
    task_id: task.id,
    label: label.slice(0, 300),
    position: ((existing?.position as number) ?? -1) + 1,
    created_by: user.id,
  }).select('id,label,done,done_at,position').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, item: data })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await loadTaskContext(params.id)
  if (isContextError(ctx)) return ctx.response
  const { writer, task, access, user } = ctx
  if (!access.canEdit) return NextResponse.json({ error: 'not_allowed' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const itemId = String(body.itemId ?? '').trim()
  if (!itemId) return NextResponse.json({ error: 'item_required' }, { status: 400 })
  const done = Boolean(body.done)

  const { data, error } = await (writer as any).from('task_checklist_items')
    .update({ done, done_at: done ? new Date().toISOString() : null, done_by: done ? user.id : null })
    .eq('id', itemId).eq('task_id', task.id)
    .select('id,label,done,done_at,position').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, item: data })
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const ctx = await loadTaskContext(params.id)
  if (isContextError(ctx)) return ctx.response
  const { writer, task, access } = ctx
  if (!access.canEdit) return NextResponse.json({ error: 'not_allowed' }, { status: 403 })

  const itemId = new URL(req.url).searchParams.get('itemId')
  if (!itemId) return NextResponse.json({ error: 'item_required' }, { status: 400 })

  const { error } = await (writer as any).from('task_checklist_items')
    .delete().eq('id', itemId).eq('task_id', task.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
