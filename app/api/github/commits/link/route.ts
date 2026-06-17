import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/github/commits/link
 * Body: { commitId: string, taskId: string | null }
 *
 * Verknüpft (oder löst) einen Commit mit einer Task. RLS sorgt dafür,
 * dass nur Devs auf zugewiesenen Projekten bzw. Admins schreiben dürfen.
 */
export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const commitId = String(body?.commitId || '')
    const taskId   = body?.taskId == null ? null : String(body.taskId)
    if (!commitId) return NextResponse.json({ error: 'commit_id_required' }, { status: 400 })

    const update = taskId
      ? { task_id: taskId, linked_by: user.id, linked_at: new Date().toISOString(), task_match_confidence: 1.0 }
      : { task_id: null, linked_by: null, linked_at: null }

    const { data, error } = await supabase
      .from('github_commits')
      .update(update)
      .eq('id', commitId)
      .select('id,task_id,commit_sha,project_id,message')
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!data) return NextResponse.json({ error: 'commit_not_found' }, { status: 404 })

    if (taskId) {
      await supabase.from('tasks').update({
        last_dev_action_at: new Date().toISOString(),
      }).eq('id', taskId).then(() => null, () => null)
    }
    return NextResponse.json({ ok: true, commit: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 })
  }
}
