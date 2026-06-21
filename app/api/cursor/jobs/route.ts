import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDevUserFromRequest } from '@/lib/dev-auth'
import { refreshCursorJob } from '@/lib/cursor/worker'

export const runtime = 'nodejs'

/**
 * GET /api/cursor/jobs?taskId=…
 * Latest cursor jobs for a task (newest first).
 */
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user: cookieUser } } = await supabase.auth.getUser()
  const user = cookieUser ?? getDevUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const taskId = req.nextUrl.searchParams.get('taskId')
  if (!taskId) return NextResponse.json({ error: 'task_id_required' }, { status: 400 })

  const { data: jobs, error } = await supabase
    .from('cursor_agent_jobs')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const latest = (jobs as any[])?.[0]
  if (latest && latest.status === 'running' && latest.cursor_agent_id && latest.cursor_run_id) {
    try {
      const refreshed = await refreshCursorJob(supabase as any, latest.id)
      return NextResponse.json({ jobs: [refreshed, ...((jobs as any[]) ?? []).slice(1)] })
    } catch { /* return stale */ }
  }

  return NextResponse.json({ jobs: jobs ?? [] })
}
