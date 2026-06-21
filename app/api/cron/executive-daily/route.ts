import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { buildExecutiveDailyReport } from '@/lib/executive/build-daily-report'
import { persistExecutiveDailyReport } from '@/lib/executive/persist-daily-report'

export const runtime = 'nodejs'
export const maxDuration = 120

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://xsdkoepwuvpuroijjain.supabase.co'

function todayBerlin(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/**
 * GET /api/cron/executive-daily
 *
 * Weekday mornings: synthesize portfolio daily reports for project owners/clients
 * who do not yet have a report for today. No LLM — fast, deterministic overview.
 */
function isWeekdayBerlin(): boolean {
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Berlin', weekday: 'short' }).format(new Date())
  return wd !== 'Sat' && wd !== 'Sun'
}

export async function GET(req: NextRequest) {
  if (!isWeekdayBerlin()) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'weekend' })
  }

  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization') || ''
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    }
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ ok: false, error: 'service_key_missing' }, { status: 500 })
  }

  const sb = createServiceClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const today = todayBerlin()
  const { data: projects } = await sb
    .from('projects')
    .select('user_id,client_id')
    .is('deleted_at', null)
    .limit(500)

  const userIds = new Set<string>()
  for (const p of (projects as any[]) ?? []) {
    if (p.user_id) userIds.add(p.user_id)
    if (p.client_id) userIds.add(p.client_id)
  }

  const results: Array<{ user_id: string; ok: boolean; skipped?: boolean; error?: string }> = []

  for (const userId of userIds) {
    try {
      const { data: existing } = await sb
        .from('executive_daily_reports')
        .select('id,generated_at')
        .eq('user_id', userId)
        .gte('generated_at', `${today}T00:00:00`)
        .limit(1)

      if ((existing as any[])?.length) {
        results.push({ user_id: userId, ok: true, skipped: true })
        continue
      }

      const report = await buildExecutiveDailyReport(sb as any, userId)
      await persistExecutiveDailyReport(sb as any, userId, report)
      results.push({ user_id: userId, ok: true })
    } catch (e: any) {
      results.push({ user_id: userId, ok: false, error: e?.message || 'failed' })
    }
  }

  const created = results.filter(r => r.ok && !r.skipped).length
  const skipped = results.filter(r => r.skipped).length
  return NextResponse.json({ ok: true, users: userIds.size, created, skipped, results: results.slice(0, 20) })
}
