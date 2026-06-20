import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isClientVisibleTask, resolveClientVisibleStatus } from '@/lib/tasks/client-view'

export const runtime = 'nodejs'

const TASK_SELECT = [
  'id', 'title', 'project_id', 'priority', 'client_visible', 'client_visible_status',
  'client_status', 'dev_status', 'status', 'latest_client_update', 'tagro_client_summary',
  'customer_update', 'latest_dev_update', 'task_type', 'group_key', 'source', 'audience',
  'progress', 'due_date', 'updated_at', 'created_at', 'completed_at',
].join(',')

/**
 * GET /api/client/tasks?projectId=
 *
 * Client-safe task list — shaped fields only, hides internal-only rows.
 */
export async function GET(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const url = new URL(req.url)
    const projectId = url.searchParams.get('projectId')

    let q = (supabase as any)
      .from('tasks')
      .select(TASK_SELECT)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(120)

    if (projectId && projectId !== 'all') {
      q = q.eq('project_id', projectId)
    }

    const [{ data: tasks, error: taskErr }, { data: projects, error: projErr }] = await Promise.all([
      q,
      (supabase as any).from('projects').select('id,title,color').order('title'),
    ])

    if (taskErr) return NextResponse.json({ error: taskErr.message }, { status: 500 })
    if (projErr) return NextResponse.json({ error: projErr.message }, { status: 500 })

    const visible = ((tasks as any[]) ?? []).filter(isClientVisibleTask).map((row) => ({
      ...row,
      client_visible_status: resolveClientVisibleStatus(row),
    }))

    return NextResponse.json({
      tasks: visible,
      projects: projects ?? [],
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 })
  }
}
