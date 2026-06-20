import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getConnector } from '@/lib/connectors'
import { enrichProjectIssues } from '@/lib/tagro/issue-intelligence'

export const runtime = 'nodejs'

/**
 * POST /api/issues/sync
 * Body: { project_id?: string, source?: 'github', enrich?: boolean }
 *
 * Pulls issues from connected external tools into Festag.
 * Defaults to all accessible projects with linked GitHub repos.
 */
export async function POST(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as {
    project_id?: string
    source?: 'github'
    enrich?: boolean
  }

  const source = body.source === 'github' ? 'github' : 'github'
  const enrich = body.enrich !== false

  let projectIds: string[] = []
  if (body.project_id) {
    projectIds = [body.project_id]
  } else {
    const { data: repos } = await (supa as any)
      .from('github_repositories')
      .select('project_id')
      .eq('active', true)
      .not('project_id', 'is', null)
    projectIds = Array.from(new Set(((repos as any[]) ?? []).map(r => r.project_id).filter(Boolean)))
  }

  if (projectIds.length === 0) {
    return NextResponse.json({ ok: true, synced: [], message: 'no_linked_repos' })
  }

  const { data: conn } = await (supa as any)
    .from('github_connections')
    .select('access_token_encrypted')
    .eq('developer_id', user.id)
    .maybeSingle()
  const token = (conn as any)?.access_token_encrypted as string | undefined

  const connector = getConnector(source)
  const synced = []

  for (const projectId of projectIds) {
    const { data: project } = await (supa as any)
      .from('projects')
      .select('id,workspace_id,title')
      .eq('id', projectId)
      .maybeSingle()
    if (!project) continue

    const result = await connector.sync({
      sb: supa as any,
      projectId,
      workspaceId: project.workspace_id,
      userId: user.id,
      token,
      enrich: false,
    })

    let intelligence = null
    let enriched = 0
    if (enrich) {
      const r = await enrichProjectIssues(supa as any, projectId, { projectTitle: project.title })
      enriched = r.updated
      intelligence = {
        project_summary: r.intelligence.project_summary,
        confidence: r.intelligence.confidence,
      }
    }

    synced.push({ project_id: projectId, ...result, enriched, intelligence })
  }

  return NextResponse.json({ ok: true, synced })
}
