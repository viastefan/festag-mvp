import { JiraError, listJiraProjects, searchJiraProjectIssues, type JiraAuth } from '@/lib/jira/api'
import { jiraIssueToConnectorIssue } from '@/lib/issues/jira-map'
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
  jira_site: string
  jira_project_id: string
  jira_project_key: string | null
  jira_project_name: string | null
  project_id: string
  last_synced_at: string | null
}

function resolveAuth(ctx: ConnectorContext): JiraAuth {
  const cfg = (ctx.config ?? {}) as Record<string, string>
  return {
    site: cfg.site || '',
    email: cfg.email || '',
    token: ctx.token || cfg.token || '',
  }
}

async function loadProjectLinks(sb: ConnectorContext['sb'], projectId: string): Promise<LinkRow[]> {
  const { data } = await sb
    .from('jira_project_links')
    .select('id,jira_site,jira_project_id,jira_project_key,jira_project_name,project_id,last_synced_at')
    .eq('project_id', projectId)
    .eq('active', true)
  return ((data as LinkRow[] | null) ?? [])
}

export class JiraConnector implements Connector {
  readonly source = 'jira' as const

  async connect(_ctx: ConnectorContext) {
    return { ok: true }
  }

  async disconnect(_ctx: ConnectorContext) {
    return { ok: true }
  }

  async fetchProjects(ctx: ConnectorContext): Promise<ConnectorProject[]> {
    const links = await loadProjectLinks(ctx.sb, ctx.projectId)
    return links.map(l => ({
      externalId: l.jira_project_id,
      name: l.jira_project_name || l.jira_project_key || l.jira_project_id,
      url: l.jira_project_key
        ? `https://${l.jira_site.replace(/^https?:\/\//, '')}/browse/${l.jira_project_key}`
        : null,
      metadata: { link_id: l.id, project_key: l.jira_project_key },
    }))
  }

  async fetchIssues(ctx: ConnectorContext): Promise<ConnectorIssue[]> {
    const auth = resolveAuth(ctx)
    const links = await loadProjectLinks(ctx.sb, ctx.projectId)
    const all: ConnectorIssue[] = []

    for (const link of links) {
      if (!link.jira_project_key) continue
      try {
        const issues = await searchJiraProjectIssues(
          { ...auth, site: link.jira_site || auth.site },
          link.jira_project_key,
        )
        for (const issue of issues) {
          all.push(jiraIssueToConnectorIssue(issue, { ...auth, site: link.jira_site || auth.site }))
        }
      } catch (e: any) {
        if (e instanceof JiraError && e.status === 404) continue
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
      source: 'jira',
      projects: 0,
      issuesImported: 0,
      issuesUpdated: 0,
      tasksImported: 0,
      linked: 0,
      enriched: 0,
      errors: [],
    }

    const auth = resolveAuth(ctx)
    const links = await loadProjectLinks(ctx.sb, ctx.projectId)
    result.projects = links.length
    if (links.length === 0) return result

    const { data: project } = await ctx.sb
      .from('projects')
      .select('id,workspace_id,title')
      .eq('id', ctx.projectId)
      .maybeSingle()

    for (const link of links) {
      if (!link.jira_project_key) {
        result.errors.push('missing_jira_project_key')
        continue
      }
      try {
        const linkAuth = { ...auth, site: link.jira_site || auth.site }
        const jiraIssues = await searchJiraProjectIssues(linkAuth, link.jira_project_key)
        const connectorIssues = jiraIssues.map(i => jiraIssueToConnectorIssue(i, linkAuth))
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

        await ctx.sb.from('jira_project_links').update({
          last_synced_at: new Date().toISOString(),
          last_sync_status: 'ok',
          last_sync_error: null,
          updated_at: new Date().toISOString(),
        }).eq('id', link.id)
      } catch (e: any) {
        const msg = e instanceof JiraError ? e.message : (e?.message || 'jira_sync_failed')
        result.errors.push(msg)
        await ctx.sb.from('jira_project_links').update({
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

export const jiraConnector = new JiraConnector()

export async function listJiraProjectsForAuth(auth: JiraAuth) {
  return listJiraProjects(auth)
}
