import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enrichProjectIssues } from '@/lib/tagro/issue-intelligence'

export const runtime = 'nodejs'

/**
 * POST /api/issues/intelligence
 * Body: { project_id: string }
 *
 * Runs Tagro interpretation on open issues for one project.
 */
export async function POST(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as { project_id?: string }
  if (!body.project_id) {
    return NextResponse.json({ error: 'project_id required' }, { status: 400 })
  }

  const { data: project } = await (supa as any)
    .from('projects')
    .select('id,title')
    .eq('id', body.project_id)
    .maybeSingle()

  if (!project) return NextResponse.json({ error: 'project not found' }, { status: 404 })

  const result = await enrichProjectIssues(supa as any, body.project_id, {
    projectTitle: project.title,
  })

  return NextResponse.json({
    ok: true,
    updated: result.updated,
    intelligence: result.intelligence,
  })
}
