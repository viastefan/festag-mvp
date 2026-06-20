import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getConnector,
  IMPLEMENTED_CONNECTORS,
  type ImplementedConnectorSource,
} from '@/lib/connectors'
import { enrichProjectIssues } from '@/lib/tagro/issue-intelligence'

export const runtime = 'nodejs'
export const maxDuration = 60

type SyncSource = ImplementedConnectorSource | 'all'

async function resolveGitHubToken(supa: any, userId: string): Promise<string | undefined> {
  const { data: conn } = await supa
    .from('github_connections')
    .select('access_token_encrypted')
    .eq('developer_id', userId)
    .maybeSingle()
  return (conn as any)?.access_token_encrypted || process.env.GITHUB_PAT
}

async function resolveLinearToken(supa: any, userId: string): Promise<string | undefined> {
  const { data: conn } = await supa
    .from('user_connectors')
    .select('config,status')
    .eq('user_id', userId)
    .eq('connector_id', 'linear')
    .maybeSingle()
  if ((conn as any)?.status === 'connected') {
    return (conn as any)?.config?.token || process.env.LINEAR_API_KEY
  }
  return process.env.LINEAR_API_KEY
}

async function projectIdsForSource(
  supa: any,
  source: ImplementedConnectorSource,
  projectId?: string,
): Promise<string[]> {
  if (projectId) return [projectId]

  if (source === 'github') {
    const { data: repos } = await supa
      .from('github_repositories')
      .select('project_id')
      .eq('active', true)
      .not('project_id', 'is', null)
    return Array.from(new Set(((repos as any[]) ?? []).map(r => r.project_id).filter(Boolean)))
  }

  const { data: links } = await supa
    .from('linear_project_links')
    .select('project_id')
    .eq('active', true)
  return Array.from(new Set(((links as any[]) ?? []).map(r => r.project_id).filter(Boolean)))
}

/**
 * POST /api/issues/sync
 * Body: { project_id?: string, source?: 'github' | 'linear' | 'all', enrich?: boolean }
 */
export async function POST(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as {
    project_id?: string
    source?: SyncSource
    enrich?: boolean
  }

  const enrich = body.enrich !== false
  const requested = body.source === 'all' || !body.source ? 'all' : body.source
  const sources: ImplementedConnectorSource[] =
    requested === 'all' ? IMPLEMENTED_CONNECTORS : [requested]

  const githubToken = await resolveGitHubToken(supa, user.id)
  const linearToken = await resolveLinearToken(supa, user.id)
  const synced: any[] = []

  for (const source of sources) {
    const projectIds = await projectIdsForSource(supa, source, body.project_id)
    if (projectIds.length === 0) {
      synced.push({ source, project_id: null, projects: 0, message: 'no_links' })
      continue
    }

    const connector = getConnector(source)
    const token = source === 'github' ? githubToken : linearToken

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
  }

  if (synced.length === 0) {
    return NextResponse.json({ ok: true, synced: [], message: 'no_linked_sources' })
  }

  return NextResponse.json({ ok: true, synced })
}
