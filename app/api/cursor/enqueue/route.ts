import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDevUserFromRequest } from '@/lib/dev-auth'
import { cursorConfigured } from '@/lib/cursor/cloud-agent-client'
import { dispatchCursorJob, enqueueCursorJob } from '@/lib/cursor/worker'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * POST /api/cursor/enqueue
 * Body: { taskId, autoCreatePR?: boolean, dispatch?: boolean }
 *
 * Tagro-Task → Cursor Cloud Agent. Requires linked GitHub repo on project
 * or FESTAG_CURSOR_DEFAULT_REPO_URL in env.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user: cookieUser } } = await supabase.auth.getUser()
    const user = cookieUser ?? getDevUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const taskId = String(body?.taskId || '')
    if (!taskId) return NextResponse.json({ error: 'task_id_required' }, { status: 400 })

    const autoCreatePR = body?.autoCreatePR !== false
    const shouldDispatch = body?.dispatch !== false

    const job = await enqueueCursorJob(supabase as any, { taskId, userId: user.id, autoCreatePR })

    if (shouldDispatch && cursorConfigured()) {
      try {
        const dispatched = await dispatchCursorJob(supabase as any, job.id)
        return NextResponse.json({ ok: true, job: dispatched, dispatched: true })
      } catch (e: any) {
        return NextResponse.json({
          ok: true,
          job,
          dispatched: false,
          dispatchError: e?.message || 'dispatch_failed',
        })
      }
    }

    return NextResponse.json({
      ok: true,
      job,
      dispatched: false,
      message: cursorConfigured() ? 'queued' : 'queued_cursor_key_missing',
    })
  } catch (e: any) {
    const msg = e?.message || 'server_error'
    const status = msg === 'no_repo_linked' ? 422 : msg === 'task_not_found' ? 404 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
