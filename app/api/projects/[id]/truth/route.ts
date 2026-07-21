import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildProjectTruth } from '@/lib/trust/project-truth'

export const runtime = 'nodejs'

/**
 * GET /api/projects/[id]/truth — curated Project Truth timeline + readiness.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await params
  if (!projectId) return NextResponse.json({ error: 'project_id_required' }, { status: 400 })

  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: project } = await sb
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .maybeSingle()
  if (!project) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const truth = await buildProjectTruth(sb as any, projectId)
  if (!truth) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  return NextResponse.json({ ok: true, truth })
}
