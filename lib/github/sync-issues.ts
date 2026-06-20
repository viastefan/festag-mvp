import type { SupabaseClient } from '@supabase/supabase-js'
import { GitHubError, listIssues } from '@/lib/github/api'
import { ghIssueToConnectorIssue } from '@/lib/issues/github-map'
import { upsertConnectorIssues } from '@/lib/issues/upsert'

export type RepoIssueSyncResult = {
  created: number
  updated: number
  linked: number
  fetched: number
  error?: string
}

type Repo = {
  id: string
  project_id: string | null
  repo_full_name: string
  last_synced_at: string | null
}

const FIRST_SYNC_LOOKBACK_DAYS = 14

/**
 * Import GitHub issues for one linked repository into Festag `issues`.
 */
export async function syncRepositoryIssues(
  sb: SupabaseClient<any>,
  repo: Repo,
  opts: { token?: string; userId?: string | null } = {},
): Promise<RepoIssueSyncResult> {
  if (!repo.project_id) {
    return { created: 0, updated: 0, linked: 0, fetched: 0 }
  }

  const since = repo.last_synced_at
    ? new Date(repo.last_synced_at).toISOString()
    : new Date(Date.now() - FIRST_SYNC_LOOKBACK_DAYS * 24 * 3600 * 1000).toISOString()

  try {
    const ghIssues = await listIssues(repo.repo_full_name, {
      state: 'all',
      since,
      perPage: 100,
      token: opts.token,
    })

    const { data: project } = await sb
      .from('projects')
      .select('workspace_id')
      .eq('id', repo.project_id)
      .maybeSingle()

    const connectorIssues = ghIssues.map(ghIssueToConnectorIssue)
    const result = await upsertConnectorIssues({
      sb,
      projectId: repo.project_id,
      workspaceId: (project as any)?.workspace_id ?? null,
      userId: opts.userId ?? null,
      issues: connectorIssues,
    })

    return {
      created: result.created,
      updated: result.updated,
      linked: result.linked,
      fetched: ghIssues.length,
    }
  } catch (e: any) {
    const msg = e instanceof GitHubError ? e.message : (e?.message || 'issue_sync_failed')
    return { created: 0, updated: 0, linked: 0, fetched: 0, error: msg }
  }
}
