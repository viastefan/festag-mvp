import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runRiskDetection } from '@/lib/risks/engine'
import { safeTableRows } from '@/lib/supabase/safe-table'

export const runtime = 'nodejs'

/** Never sweep more than this many projects in one request. */
const MAX_PROJECTS = 5

/**
 * POST /api/risks/detect
 *
 * Runs the detection engine. With `project_id` it analyses that project,
 * otherwise the user's most recently updated active projects.
 *
 * Detection is idempotent: running it twice in a row changes nothing beyond
 * the evidence timestamps, so the dashboard can call it on load.
 */
export async function POST(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({} as any))
  const projectId = typeof body.project_id === 'string' ? body.project_id : null

  let projectIds: string[] = []
  if (projectId) {
    projectIds = [projectId]
  } else {
    // RLS already restricts this to projects the user can see.
    const rows = await safeTableRows<any>(
      (supa as any)
        .from('projects')
        .select('id,updated_at')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(MAX_PROJECTS),
    )
    projectIds = rows.map(r => r.id)
  }

  if (!projectIds.length) {
    return NextResponse.json({ runs: [], created: 0, updated: 0, resolved: 0 })
  }

  const runs = []
  for (const id of projectIds.slice(0, MAX_PROJECTS)) {
    try {
      const result = await runRiskDetection(supa, id, { actorUserId: user.id, enrich: true })
      runs.push({ project_id: id, ...result, risks: undefined })
    } catch (err) {
      // One broken project must not take the whole sweep down.
      runs.push({ project_id: id, error: (err as Error).message })
    }
  }

  return NextResponse.json({
    runs,
    created: runs.reduce((n, r: any) => n + (r.created ?? 0), 0),
    updated: runs.reduce((n, r: any) => n + (r.updated ?? 0), 0),
    resolved: runs.reduce((n, r: any) => n + (r.resolved ?? 0), 0),
  })
}
