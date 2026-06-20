import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

/**
 * GET|POST /api/decisions/tick
 *
 * The decision engine heartbeat. Invokes the deterministic `decisions_tick()`
 * RPC (20260613_decision_engine_v2_orchestration.sql) which:
 *   - recomputes due_at + urgency for every open decision,
 *   - promotes queued decisions when a slot frees (open-decision cap),
 *   - sends reminders honouring the first-nudge delay, quiet hours, and the
 *     per-tier cadence,
 *   - escalates to the owner after N silent reminders,
 *   - auto-resolves at the deadline ONLY where the classification permits
 *     (two-way door, tagro_default, non-compliance, recommendation present).
 *
 * Idempotent and safe to call frequently — all timing guards live in SQL.
 * Vercel Hobby allows only daily crons (see vercel.json); use pg_cron or an
 * external scheduler for sub-daily ticks. When CRON_SECRET is set, requires
 * `Authorization: Bearer <CRON_SECRET>`.
 */
async function handle(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const service = getServiceClient()
  if (!service) return NextResponse.json({ error: 'service_unavailable' }, { status: 503 })

  const { data, error } = await (service as any).rpc('decisions_tick')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? { ok: true })
}

export const GET = handle
export const POST = handle
