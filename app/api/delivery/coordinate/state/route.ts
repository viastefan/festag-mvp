import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDevUserFromRequest } from '@/lib/dev-auth'
import { getServiceClient } from '@/lib/supabase/service'
import { getCoordinationState } from '@/lib/delivery/coordination-bridge'

export const runtime = 'nodejs'

/**
 * GET /api/delivery/coordinate/state?projectId=…&taskId=…
 *
 * Returns the coordination timeline for a project or specific task.
 */
export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId') || ''
  const taskId = req.nextUrl.searchParams.get('taskId') || null

  if (!projectId) {
    return NextResponse.json({ error: 'project_id_required' }, { status: 400 })
  }

  const supa = createClient()
  const { data: { user: cookieUser } } = await supa.auth.getUser()
  const user = cookieUser ?? getDevUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: project } = await supa
    .from('projects')
    .select('id, user_id, client_id')
    .eq('id', projectId)
    .maybeSingle()
  if (!project) return NextResponse.json({ error: 'project_not_found' }, { status: 404 })

  const sb = getServiceClient() ?? supa
  const state = await getCoordinationState(sb as any, { projectId, taskId })

  return NextResponse.json({ state })
}
