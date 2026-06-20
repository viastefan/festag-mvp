import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildTeamWorkload } from '@/lib/teams/build-workload'

export const runtime = 'nodejs'

/** GET /api/teams/workload — team capacity snapshot for Team Panel */
export async function GET() {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  try {
    const overview = await buildTeamWorkload(supa as any)
    return NextResponse.json({ overview })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'workload_failed' }, { status: 500 })
  }
}
