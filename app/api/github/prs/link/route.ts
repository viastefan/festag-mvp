import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/github/prs/link
 * Body: { prId: string, taskId: string | null }
 */
export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const prId   = String(body?.prId || '')
    const taskId = body?.taskId == null ? null : String(body.taskId)
    if (!prId) return NextResponse.json({ error: 'pr_id_required' }, { status: 400 })

    const update = taskId
      ? { task_id: taskId, linked_by: user.id, linked_at: new Date().toISOString() }
      : { task_id: null, linked_by: null, linked_at: null }

    const { data, error } = await supabase
      .from('github_pull_requests')
      .update(update)
      .eq('id', prId)
      .select('id,task_id,pr_number,state,merged,title,project_id')
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!data) return NextResponse.json({ error: 'pr_not_found' }, { status: 404 })

    if (taskId) {
      await supabase.from('tasks').update({
        last_dev_action_at: new Date().toISOString(),
      }).eq('id', taskId).then(() => null, () => null)
    }
    return NextResponse.json({ ok: true, pr: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 })
  }
}
