import { GitHubError, listIssues, type GhIssue } from '@/lib/github/api'
import { ghIssueToConnectorIssue } from '@/lib/issues/github-map'
import { upsertConnectorIssues } from '@/lib/issues/upsert'
import { enrichProjectIssues } from '@/lib/tagro/issue-intelligence'
import type {
  Connector,
  ConnectorContext,
  ConnectorIssue,
  ConnectorProject,
  ConnectorSyncResult,
} from '@/lib/connectors/types'

type RepoRow = {
  id: string
  repo_full_name: string
  project_id: string | null
  last_synced_at: string | null
}

async function loadProjectRepos(sb: ConnectorContext['sb'], projectId: string): Promise<RepoRow[]> {
  const { data } = await sb
    .from('github_repositories')
    .select('id,repo_full_name,project_id,last_synced_at')
    .eq('project_id', projectId)
    .eq('active', true)
  return ((data as RepoRow[] | null) ?? [])
}

export class GitHubConnector implements Connector {
  readonly source = 'github' as const

  async connect(_ctx: ConnectorContext) {
    return { ok: true }
  }

  async disconnect(_ctx: ConnectorContext) {
    return { ok: true }
  }

  async fetchProjects(ctx: ConnectorContext): Promise<ConnectorProject[]> {
    const repos = await loadProjectRepos(ctx.sb, ctx.projectId)
    return repos.map(r => ({
      externalId: r.id,
      name: r.repo_full_name,
      url: `https://github.com/${r.repo_full_name}`,
      metadata: { repo_id: r.id },
    }))
  }

  async fetchIssues(ctx: ConnectorContext, opts?: { since?: string }): Promise<ConnectorIssue[]> {
    const repos = await loadProjectRepos(ctx.sb, ctx.projectId)
    const all: ConnectorIssue[] = []

    for (const repo of repos) {
      try {
        const since = opts?.since
          || (repo.last_synced_at
            ? new Date(repo.last_synced_at).toISOString()
            : new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString())
        const ghIssues = await listIssues(repo.repo_full_name, {
          state: 'all',
          since,
          perPage: 100,
          token: ctx.token,
        })
        for (const issue of ghIssues) {
          all.push(ghIssueToConnectorIssue(issue))
        }
      } catch (e: any) {
        if (e instanceof GitHubError && e.status === 404) continue
        throw e
      }
    }

    return all
  }

  async fetchTasks(_ctx: ConnectorContext): Promise<ConnectorIssue[]> {
    // GitHub tasks live in Issues for now — same fetch path.
    return []
  }

  async sync(ctx: ConnectorContext, opts?: { since?: string; enrich?: boolean }): Promise<ConnectorSyncResult> {
    const result: ConnectorSyncResult = {
      source: 'github',
      projects: 0,
      issuesImported: 0,
      issuesUpdated: 0,
      tasksImported: 0,
      linked: 0,
      enriched: 0,
      errors: [],
    }

    const repos = await loadProjectRepos(ctx.sb, ctx.projectId)
    result.projects = repos.length
    if (repos.length === 0) return result

    const { data: project } = await ctx.sb
      .from('projects')
      .select('id,workspace_id,title')
      .eq('id', ctx.projectId)
      .maybeSingle()

    for (const repo of repos) {
      try {
        const since = opts?.since
          || (repo.last_synced_at
            ? new Date(repo.last_synced_at).toISOString()
            : new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString())

        const ghIssues = await listIssues(repo.repo_full_name, {
          state: 'all',
          since,
          perPage: 100,
          token: ctx.token,
        })

        const connectorIssues = ghIssues.map((i: GhIssue) => ghIssueToConnectorIssue(i))
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
      } catch (e: any) {
        result.errors.push(e instanceof GitHubError ? e.message : (e?.message || 'github_sync_failed'))
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

export const githubConnector = new GitHubConnector()
