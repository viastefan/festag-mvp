import type { SupabaseClient } from '@supabase/supabase-js'
import { extractTaskHints, getRepo, listCommits, listPullRequests, GitHubError, type GhCommit, type GhPullRequest } from './api'

/**
 * Synchronise one repository row (`github_repositories`) with GitHub.
 *
 * - Pulls commits since `last_synced_at` (or 7d back on first sync).
 * - Pulls PRs updated in the same window.
 * - Upserts both into `github_commits` and `github_pull_requests`.
 * - Auto-links a commit / PR to a task when the message references it
 *   (UUID or branch-name match against `tasks.branch_name`).
 *
 * Returns counters used for the API response.
 */
export type RepoSyncResult = {
  repoId: string
  commits: number
  prs: number
  linked: number
  error?: string
}

type Repo = {
  id: string
  project_id: string | null
  developer_id: string | null
  owner: string
  repo_name: string
  repo_full_name: string
  default_branch: string | null
  last_synced_at: string | null
}

const FIRST_SYNC_LOOKBACK_DAYS = 14

export async function syncRepository(
  sb: SupabaseClient<any>,
  repo: Repo,
  opts: { token?: string } = {},
): Promise<RepoSyncResult> {
  const since = repo.last_synced_at
    ? new Date(repo.last_synced_at).toISOString()
    : new Date(Date.now() - FIRST_SYNC_LOOKBACK_DAYS * 24 * 3600 * 1000).toISOString()

  let commits: GhCommit[] = []
  let prs: GhPullRequest[] = []

  try {
    // If we never knew the default branch, fetch the repo once to learn it.
    if (!repo.default_branch) {
      try {
        const meta = await getRepo(repo.repo_full_name, opts.token)
        if (meta?.default_branch) {
          await sb.from('github_repositories').update({ default_branch: meta.default_branch }).eq('id', repo.id)
          repo.default_branch = meta.default_branch
        }
      } catch { /* tolerate — non-fatal */ }
    }

    commits = await listCommits(repo.repo_full_name, { since, branch: repo.default_branch || undefined, perPage: 100, token: opts.token })
    prs     = await listPullRequests(repo.repo_full_name, { state: 'all', perPage: 50, token: opts.token })
  } catch (e: any) {
    const msg = e instanceof GitHubError ? `${e.message}` : (e?.message || 'sync_failed')
    await sb.from('github_repositories').update({
      last_sync_status: 'error',
      last_sync_error: msg.slice(0, 500),
      last_synced_at: new Date().toISOString(),
    }).eq('id', repo.id)
    return { repoId: repo.id, commits: 0, prs: 0, linked: 0, error: msg }
  }

  // Preload candidate tasks for auto-link (assigned project tasks).
  let candidateTasks: Array<{ id: string; title: string; branch_name: string | null }> = []
  if (repo.project_id) {
    const { data: t } = await sb
      .from('tasks')
      .select('id,title,branch_name')
      .eq('project_id', repo.project_id)
      .neq('status', 'done')
      .limit(200)
    candidateTasks = ((t as any[]) ?? []) as typeof candidateTasks
  }

  function autoLinkTaskId(text: string, branchHint?: string | null): { taskId: string | null; confidence: number } {
    const hints = extractTaskHints(text)
    const lowerText = (text || '').toLowerCase()
    // Strongest signal: explicit UUID in commit message that matches a candidate
    const uuidHit = candidateTasks.find(t => hints.includes(t.id.toLowerCase()))
    if (uuidHit) return { taskId: uuidHit.id, confidence: 0.98 }
    // Branch name (commit pushed on `feature/<branch>` matching a task branch)
    if (branchHint) {
      const byBranch = candidateTasks.find(t => t.branch_name && branchHint.toLowerCase().includes(t.branch_name.toLowerCase()))
      if (byBranch) return { taskId: byBranch.id, confidence: 0.85 }
    }
    // Title fuzzy: at least 4-char overlap of the task title slug in commit text
    for (const t of candidateTasks) {
      const slug = t.title.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(w => w.length >= 4)
      if (slug.length === 0) continue
      const hits = slug.filter(w => lowerText.includes(w)).length
      if (hits >= 2) return { taskId: t.id, confidence: 0.55 }
    }
    return { taskId: null, confidence: 0 }
  }

  let linked = 0

  // Upsert commits
  for (const c of commits) {
    const message = c.commit?.message ?? ''
    const committedAt = c.commit?.committer?.date || c.commit?.author?.date || null
    const branchHint = repo.default_branch || null
    const { taskId, confidence } = autoLinkTaskId(message, branchHint)

    const row = {
      repo_id: repo.id,
      project_id: repo.project_id,
      developer_id: repo.developer_id,
      commit_sha: c.sha,
      message: message.slice(0, 4000),
      author_name: c.commit?.author?.name ?? null,
      author_email: c.commit?.author?.email ?? null,
      commit_url: c.html_url,
      committed_at: committedAt,
      files_changed_count: c.files?.length ?? null,
      raw_payload: c as any,
      task_id: taskId,
      task_match_confidence: confidence || null,
      linked_at: taskId ? new Date().toISOString() : null,
      branch_name: branchHint,
    }
    const { error } = await sb.from('github_commits').upsert(row, { onConflict: 'repo_id,commit_sha' })
    if (!error && taskId) linked++
  }

  // Upsert PRs
  for (const p of prs) {
    const text = `${p.title || ''}\n${p.head?.ref || ''}`
    const { taskId, confidence } = autoLinkTaskId(text, p.head?.ref || null)
    const row = {
      repo_id: repo.id,
      project_id: repo.project_id,
      developer_id: repo.developer_id,
      pr_number: p.number,
      title: (p.title || '').slice(0, 500),
      state: p.state,
      merged: !!p.merged_at,
      pr_url: p.html_url,
      created_at_github: p.created_at,
      updated_at_github: p.updated_at,
      merged_at: p.merged_at,
      raw_payload: p as any,
      task_id: taskId,
      head_branch: p.head?.ref ?? null,
      base_branch: p.base?.ref ?? null,
      linked_at: taskId ? new Date().toISOString() : null,
    }
    const { error } = await sb.from('github_pull_requests').upsert(row, { onConflict: 'repo_id,pr_number' })
    if (!error && taskId) linked++

    // Bonus: when a PR is merged AND it was auto-linked, nudge the task into
    // dev_status=review so the dev sees "ready for review" without needing
    // to update manually. This is conservative: only on merge, never undo.
    if (taskId && p.merged_at) {
      await sb.from('tasks').update({
        dev_status: 'review',
        last_dev_action_at: new Date().toISOString(),
      }).eq('id', taskId).eq('dev_status', 'in_progress').then(() => null, () => null)
    }
  }

  await sb.from('github_repositories').update({
    last_synced_at: new Date().toISOString(),
    last_sync_status: 'ok',
    last_sync_error: null,
  }).eq('id', repo.id)

  return { repoId: repo.id, commits: commits.length, prs: prs.length, linked }
}
