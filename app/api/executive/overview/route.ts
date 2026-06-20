import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildExecutiveOverview } from '@/lib/executive/build-overview'

export const runtime = 'nodejs'

/**
 * GET /api/executive/overview
 * CEO / executive snapshot — progress, risks, velocity, forecast.
 * No raw task lists; interpretation-first.
 */
export async function GET() {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  try {
    const overview = await buildExecutiveOverview(supa as any, user.id)
    return NextResponse.json({ overview })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'overview_failed' }, { status: 500 })
  }
}
