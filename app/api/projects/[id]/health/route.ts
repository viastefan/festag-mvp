import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { readHealthHistory, readProjectHealth, refreshProjectHealth } from '@/lib/health/persist'

export const runtime = 'nodejs'

/**
 * Project Health API.
 *
 *   GET  → stored health + recent cause chain
 *   POST → recompute now, then return the fresh result
 *
 * Reads go through the caller's RLS client so project access is enforced by
 * the database, not by this handler. Only the recompute uses the service role,
 * and only after the RLS read has proven the caller may see the project.
 */

async function assertCanSeeProject(supa: any, projectId: string): Promise<boolean> {
  const { data } = await supa.from('projects').select('id').eq('id', projectId).maybeSingle()
  return Boolean(data?.id)
}

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const {
    data: { user },
  } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const projectId = ctx.params.id
  if (!(await assertCanSeeProject(supa, projectId))) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const [health, history] = await Promise.all([
    readProjectHealth(supa as any, projectId),
    readHealthHistory(supa as any, projectId, 8),
  ])

  // `health: null` is a legitimate answer — the project has never been
  // measured. The surface must show "noch nicht messbar", never a zero.
  return NextResponse.json({ ok: true, health, history })
}

export async function POST(_req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const {
    data: { user },
  } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const projectId = ctx.params.id
  if (!(await assertCanSeeProject(supa, projectId))) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const service = getServiceClient()
  if (!service) {
    return NextResponse.json({ error: 'service_unavailable' }, { status: 503 })
  }

  const health = await refreshProjectHealth(service as any, projectId)
  if (!health) {
    return NextResponse.json({ error: 'compute_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, health })
}
