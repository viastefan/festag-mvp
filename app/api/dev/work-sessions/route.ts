import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Work sessions = lightweight task timer.
 *
 *   GET  /api/dev/work-sessions               → list my recent sessions
 *   POST /api/dev/work-sessions  { taskId, note? }
 *        → starts a new session. DB trigger auto-closes any open one.
 *   PATCH /api/dev/work-sessions { sessionId, note?, end?: true }
 *        → updates note and/or stops the session.
 */

export async function GET(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const url = new URL(req.url)
  const taskId = url.searchParams.get('taskId')
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 20), 100)
  const openOnly = url.searchParams.get('open') === '1'

  let q = supabase
    .from('dev_work_sessions')
    .select('id,task_id,project_id,started_at,ended_at,duration_seconds,note,source')
    .eq('developer_id', user.id)
    .order('started_at', { ascending: false })
    .limit(limit)
  if (taskId) q = q.eq('task_id', taskId)
  if (openOnly) q = q.is('ended_at', null)
  const { data } = await q
  return NextResponse.json({ sessions: data ?? [] })
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const taskId = body?.taskId ? String(body.taskId) : null
  const note = body?.note ? String(body.note).slice(0, 500) : null
  if (!taskId) return NextResponse.json({ error: 'task_id_required' }, { status: 400 })

  const { data: task } = await supabase
    .from('tasks').select('id,project_id').eq('id', taskId).maybeSingle()
  const projectId = (task as any)?.project_id ?? null

  const { data, error } = await supabase
    .from('dev_work_sessions')
    .insert({
      developer_id: user.id,
      task_id: taskId,
      project_id: projectId,
      note,
      source: 'manual',
    })
    .select('*').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // bump task activity
  await supabase.from('tasks').update({
    last_dev_action_at: new Date().toISOString(),
    dev_status: 'in_progress',
  }).eq('id', taskId).then(() => null, () => null)

  return NextResponse.json({ ok: true, session: data })
}

export async function PATCH(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const sessionId = body?.sessionId ? String(body.sessionId) : null
  const end = !!body?.end
  const note = typeof body?.note === 'string' ? String(body.note).slice(0, 500) : undefined
  if (!sessionId) return NextResponse.json({ error: 'session_id_required' }, { status: 400 })

  const { data: existing } = await supabase
    .from('dev_work_sessions')
    .select('id,developer_id,started_at,ended_at,task_id')
    .eq('id', sessionId).maybeSingle()
  if (!existing) return NextResponse.json({ error: 'session_not_found' }, { status: 404 })
  if ((existing as any).developer_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const update: Record<string, any> = {}
  if (note !== undefined) update.note = note
  if (end) {
    update.ended_at = new Date().toISOString()
    const startMs = new Date((existing as any).started_at).getTime()
    update.duration_seconds = Math.max(0, Math.round((Date.now() - startMs) / 1000))
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true, session: existing })
  }

  const { data, error } = await supabase
    .from('dev_work_sessions').update(update).eq('id', sessionId)
    .select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, session: data })
}
