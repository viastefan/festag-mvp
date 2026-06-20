import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDevUserFromRequest } from '@/lib/dev-auth'

export const runtime = 'nodejs'

/** GET /api/dev/deliverables?projectId= — project assets for dev upload/review */
export async function GET(req: Request) {
  const supa = createClient()
  const { data: { user: cookieUser } } = await supa.auth.getUser()
  const user = cookieUser ?? getDevUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const projectId = new URL(req.url).searchParams.get('projectId')

  const { data: assignments } = await supa
    .from('project_assignments')
    .select('project_id, projects(id,title,color)')
    .eq('user_id', user.id)
    .eq('active', true)

  const projects = ((assignments as any[]) ?? [])
    .map(a => a.projects)
    .filter(Boolean)

  let assetQuery = supa
    .from('project_assets')
    .select('id,title,kind,status,visibility,project_id,analysis_result,created_at,analyzed_at,external_url,storage_path')
    .order('created_at', { ascending: false })
    .limit(60)

  if (projectId) {
    assetQuery = assetQuery.eq('project_id', projectId)
  } else if (projects.length > 0) {
    assetQuery = assetQuery.in('project_id', projects.map((p: any) => p.id))
  } else {
    return NextResponse.json({ projects: [], assets: [] })
  }

  const { data: assets, error } = await assetQuery
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    projects,
    assets: (assets as any[]) ?? [],
  })
}
