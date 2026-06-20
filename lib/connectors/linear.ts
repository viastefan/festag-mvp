import { LinearError, listTeamIssues, listTeams } from '@/lib/linear/api'
import { linearIssueToConnectorIssue } from '@/lib/issues/linear-map'
import { upsertConnectorIssues } from '@/lib/issues/upsert'
import { enrichProjectIssues } from '@/lib/tagro/issue-intelligence'
import type {
  Connector,
  ConnectorContext,
  ConnectorIssue,
  ConnectorProject,
  ConnectorSyncResult,
} from '@/lib/connectors/types'

type LinkRow = {
  id: string
  team_id: string
  team_key: string | null
  team_name: string | null
  project_id: string
  last_synced_at: string | null
}

async function loadProjectLinks(sb: ConnectorContext['sb'], projectId: string): Promise<LinkRow[]> {
  const { data } = await sb
    .from('linear_project_links')
    .select('id,team_id,team_key,team_name,project_id,last_synced_at')
    .eq('project_id', projectId)
    .eq('active', true)
  return ((data as LinkRow[] | null) ?? [])
}

export class LinearConnector implements Connector {
  readonly source = 'linear' as const

  async connect(_ctx: ConnectorContext) {
    return { ok: true }
  }

  async disconnect(_ctx: ConnectorContext) {
    return { ok: true }
  }

  async fetchProjects(ctx: ConnectorContext): Promise<ConnectorProject[]> {
    const links = await loadProjectLinks(ctx.sb, ctx.projectId)
    return links.map(l => ({
      externalId: l.team_id,
      name: l.team_name || l.team_key || l.team_id,
      url: l.team_key ? `https://linear.app/team/${l.team_key}` : null,
      metadata: { link_id: l.id, team_key: l.team_key },
    }))
  }

  async fetchIssues(ctx: ConnectorContext): Promise<ConnectorIssue[]> {
    const links = await loadProjectLinks(ctx.sb, ctx.projectId)
    const all: ConnectorIssue[] = []

    for (const link of links) {
      try {
        const issues = await listTeamIssues(link.team_id, { token: ctx.token, maxPages: 3 })
        for (const issue of issues) {
          all.push(linearIssueToConnectorIssue(issue))
        }
      } catch (e: any) {
        if (e instanceof LinearError && e.status === 404) continue
        throw e
      }
    }

    return all
  }

  async fetchTasks(_ctx: ConnectorContext): Promise<ConnectorIssue[]> {
    return []
  }

  async sync(ctx: ConnectorContext, opts?: { since?: string; enrich?: boolean }): Promise<ConnectorSyncResult> {
    const result: ConnectorSyncResult = {
      source: 'linear',
      projects: 0,
      issuesImported: 0,
      issuesUpdated: 0,
      tasksImported: 0,
      linked: 0,
      enriched: 0,
      errors: [],
    }

    const links = await loadProjectLinks(ctx.sb, ctx.projectId)
    result.projects = links.length
    if (links.length === 0) return result

    const { data: project } = await ctx.sb
      .from('projects')
      .select('id,workspace_id,title')
      .eq('id', ctx.projectId)
      .maybeSingle()

    for (const link of links) {
      try {
        const linearIssues = await listTeamIssues(link.team_id, { token: ctx.token, maxPages: 3 })
        const connectorIssues = linearIssues.map(linearIssueToConnectorIssue)
        const upsert = await upsertConnectorIssues({
          sb: ctx.sb,
          projectId: ctx.projectId,
          workspaceId: (project as any)?.workspace_id ?? null,
          userId: ctx.userId ?? null,
          issues: connectorIssues,
        })
        result.issuesImported += upsert.created
        result.issuesUpdated += upsert.updated
        result.linked += upsert.linked

        await ctx.sb.from('linear_project_links').update({
          last_synced_at: new Date().toISOString(),
          last_sync_status: 'ok',
          last_sync_error: null,
          updated_at: new Date().toISOString(),
        }).eq('id', link.id)
      } catch (e: any) {
        const msg = e instanceof LinearError ? e.message : (e?.message || 'linear_sync_failed')
        result.errors.push(msg)
        await ctx.sb.from('linear_project_links').update({
          last_sync_status: 'error',
          last_sync_error: msg.slice(0, 500),
          updated_at: new Date().toISOString(),
        }).eq('id', link.id)
      }
    }

    if (opts?.enrich !== false) {
      try {
        const enriched = await enrichProjectIssues(ctx.sb, ctx.projectId, {
          projectTitle: (project as any)?.title,
        })
        result.enriched = enriched.updated
      } catch (e: any) {
        result.errors.push(e?.message || 'tagro_enrich_failed')
      }
    }

    return result
  }
}

export const linearConnector = new LinearConnector()

/** List Linear teams for the authenticated user's token. */
export async function listLinearTeamsForToken(token?: string) {
  return listTeams(token)
}
