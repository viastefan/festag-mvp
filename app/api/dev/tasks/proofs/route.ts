import { NextResponse } from 'next/server'
import { getDevUserFromRequest } from '@/lib/dev-auth'
import { createClient } from '@/lib/supabase/server'
import { emitTaskEvent } from '@/lib/sync/bus'

/**
 * Task proofs — list / add / remove.
 *
 *   GET    /api/dev/tasks/proofs?taskId=…
 *   POST   /api/dev/tasks/proofs  { taskId, proofType, url?, description?, metadata? }
 *   DELETE /api/dev/tasks/proofs  { proofId }
 *
 * RLS allows any developer assigned to the project (or admin) to read and
 * own-create proofs. Deletion is restricted to the creator + admins.
 */

export async function GET(req: Request) {
  const supabase = createClient()
  const { data: { user: cookieUser } } = await supabase.auth.getUser()
  // PIN-Dev fallback: kein Supabase-Cookie, aber signierter Dev-Token.
  const user = cookieUser ?? getDevUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const url = new URL(req.url)
  const taskId = url.searchParams.get('taskId')
  if (!taskId) return NextResponse.json({ error: 'task_id_required' }, { status: 400 })

  const { data } = await supabase
    .from('task_proofs')
    .select('id,task_id,added_by,proof_type,url,file_path,description,metadata,source,source_ref,created_at')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
  return NextResponse.json({ proofs: data ?? [] })
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user: cookieUser } } = await supabase.auth.getUser()
  // PIN-Dev fallback: kein Supabase-Cookie, aber signierter Dev-Token.
  const user = cookieUser ?? getDevUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const taskId    = String(body?.taskId || '')
  const proofType = String(body?.proofType || '')
  const url       = body?.url ? String(body.url).slice(0, 600) : null
  const filePath  = body?.filePath ? String(body.filePath).slice(0, 400) : null
  const description = body?.description ? String(body.description).slice(0, 1200) : null
  const metadata = body?.metadata && typeof body.metadata === 'object' ? body.metadata : {}
  if (!taskId || !proofType) return NextResponse.json({ error: 'task_and_type_required' }, { status: 400 })

  const { data: task } = await supabase.from('tasks').select('id,title,project_id').eq('id', taskId).maybeSingle()

  const { data, error } = await supabase
    .from('task_proofs')
    .insert({
      task_id: taskId,
      project_id: (task as any)?.project_id ?? null,
      added_by: user.id,
      proof_type: proofType,
      url, file_path: filePath, description, metadata,
      source: 'manual',
    })
    .select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await emitTaskEvent(supabase as any, 'proof_added', {
    taskId,
    projectId: (task as any)?.project_id ?? null,
    actorId: user.id,
    actorKind: 'human',
    taskTitle: (task as any)?.title ?? '',
    payload: { proof_type: proofType, has_url: !!url, has_file: !!filePath },
  })

  // touch task
  await supabase.from('tasks').update({
    last_dev_action_at: new Date().toISOString(),
  }).eq('id', taskId).then(() => null, () => null)

  return NextResponse.json({ ok: true, proof: data })
}

export async function DELETE(req: Request) {
  const supabase = createClient()
  const { data: { user: cookieUser } } = await supabase.auth.getUser()
  // PIN-Dev fallback: kein Supabase-Cookie, aber signierter Dev-Token.
  const user = cookieUser ?? getDevUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const proofId = String(body?.proofId || '')
  if (!proofId) return NextResponse.json({ error: 'proof_id_required' }, { status: 400 })

  const { data: existing } = await supabase
    .from('task_proofs').select('id,task_id,project_id,proof_type,added_by').eq('id', proofId).maybeSingle()
  if (!existing) return NextResponse.json({ error: 'proof_not_found' }, { status: 404 })

  const { error } = await supabase.from('task_proofs').delete().eq('id', proofId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await supabase.from('task_activity_logs').insert({
    task_id: (existing as any).task_id,
    project_id: (existing as any).project_id,
    actor_id: user.id,
    actor_kind: 'human',
    event: 'proof_removed',
    metadata: { proof_type: (existing as any).proof_type },
    visible_to_client: false,
  }).then(() => null, () => null)

  return NextResponse.json({ ok: true })
}
