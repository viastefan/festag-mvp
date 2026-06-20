import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildExecutiveDailyReport } from '@/lib/executive/build-daily-report'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * GET  /api/executive/daily-report — cached synthesis from overview + scheduled briefings
 * POST /api/executive/daily-report — fresh Tagro-generated daily report
 */
export async function GET() {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  try {
    const report = await buildExecutiveDailyReport(supa as any, user.id)
    return NextResponse.json({ report })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'daily_report_failed' }, { status: 500 })
  }
}

export async function POST(_req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  try {
    const report = await buildExecutiveDailyReport(supa as any, user.id, { generateWithTagro: true })
    return NextResponse.json({ report })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'daily_report_failed' }, { status: 500 })
  }
}
