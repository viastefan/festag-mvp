import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cursorConfigured } from '@/lib/cursor/cloud-agent-client'
import { dispatchCursorJob, refreshRunningCursorJobs } from '@/lib/cursor/worker'

export const runtime = 'nodejs'
export const maxDuration = 60

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://xsdkoepwuvpuroijjain.supabase.co'

/**
 * GET /api/cron/cursor-worker
 *
 * 1. Dispatches queued cursor_agent_jobs (up to 5)
 * 2. Polls running jobs for terminal status
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization') || ''
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    }
  }

  if (!cursorConfigured()) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'cursor_not_configured' })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ ok: false, error: 'service_key_missing' }, { status: 500 })

  const sb = createServiceClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: queued } = await sb
    .from('cursor_agent_jobs')
    .select('id')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(5)

  const dispatched: string[] = []
  const dispatchErrors: Array<{ id: string; error: string }> = []

  for (const row of (queued as any[]) ?? []) {
    try {
      await dispatchCursorJob(sb, row.id)
      dispatched.push(row.id)
    } catch (e: any) {
      dispatchErrors.push({ id: row.id, error: e?.message || 'dispatch_failed' })
    }
  }

  const refreshed = await refreshRunningCursorJobs(sb, 20)

  return NextResponse.json({
    ok: true,
    dispatched: dispatched.length,
    dispatchErrors,
    refreshed: refreshed.length,
  })
}
