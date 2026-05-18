import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Task checklist — list / add / toggle / remove.
 *
 *   GET    /api/dev/tasks/checklist?taskId=…
 *   POST   /api/dev/tasks/checklist { taskId, label }
 *   PATCH  /api/dev/tasks/checklist { itemId, done?, label? }
 *   DELETE /api/dev/tasks/checklist { itemId }
 *
 * RLS protects against cross-project edits.
 */

export async function GET(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const url = new URL(req.url)
  const taskId = url.searchParams.get('taskId')
  if (!taskId) return NextResponse.json({ error: 'task_id_required' }, { status: 400 })

  const { data } = await supabase
    .from('task_checklist_items')
    .select('id,task_id,position,label,done,done_at,done_by,created_at')
    .eq('task_id', taskId)
    .order('position', { ascending: true })
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const taskId = String(body?.taskId || '')
  const label  = String(body?.label || '').trim()
  if (!taskId || !label) return NextResponse.json({ error: 'task_and_label_required' }, { status: 400 })

  const { data: maxRow } = await supabase
    .from('task_checklist_items').select('position').eq('task_id', taskId)
    .order('position', { ascending: false }).limit(1).maybeSingle()
  const nextPosition = ((maxRow as any)?.position ?? 0) + 1

  const { data, error } = await supabase
    .from('task_checklist_items')
    .insert({ task_id: taskId, position: nextPosition, label, created_by: user.id })
    .select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, item: data })
}

export async function PATCH(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const itemId = String(body?.itemId || '')
  if (!itemId) return NextResponse.json({ error: 'item_id_required' }, { status: 400 })

  const patch: Record<string, any> = {}
  if (typeof body.done === 'boolean') {
    patch.done = body.done
    patch.done_at = body.done ? new Date().toISOString() : null
    patch.done_by = body.done ? user.id : null
  }
  if (typeof body.label === 'string' && body.label.trim().length > 0) {
    patch.label = body.label.trim().slice(0, 240)
  }
  if (typeof body.position === 'number') {
    patch.position = body.position
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true })
  }

  const { data, error } = await supabase
    .from('task_checklist_items').update(patch).eq('id', itemId)
    .select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if ('done' in patch && (data as any)?.task_id) {
    await supabase.from('task_activity_logs').insert({
      task_id: (data as any).task_id,
      project_id: null,
      actor_id: user.id,
      actor_kind: 'human',
      event: 'checklist_toggled',
      metadata: { item: (data as any).label, done: patch.done },
      visible_to_client: false,
    }).then(() => null, () => null)
  }
  return NextResponse.json({ ok: true, item: data })
}

export async function DELETE(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const itemId = String(body?.itemId || '')
  if (!itemId) return NextResponse.json({ error: 'item_id_required' }, { status: 400 })

  const { error } = await supabase.from('task_checklist_items').delete().eq('id', itemId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
