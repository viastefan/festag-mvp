import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDevUserFromRequest } from '@/lib/dev-auth'
import { dispatchCursorJob, refreshCursorJob } from '@/lib/cursor/worker'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * POST /api/cursor/dispatch
 * Body: { jobId } — dispatch queued job or refresh running job.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user: cookieUser } } = await supabase.auth.getUser()
    const user = cookieUser ?? getDevUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const jobId = String(body?.jobId || '')
    if (!jobId) return NextResponse.json({ error: 'job_id_required' }, { status: 400 })

    const { data: job } = await supabase.from('cursor_agent_jobs').select('status').eq('id', jobId).maybeSingle()
    if (!job) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    const updated = (job as any).status === 'queued'
      ? await dispatchCursorJob(supabase as any, jobId)
      : await refreshCursorJob(supabase as any, jobId)

    return NextResponse.json({ ok: true, job: updated })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 })
  }
}
