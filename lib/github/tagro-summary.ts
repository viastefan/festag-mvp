import type { SupabaseClient } from '@supabase/supabase-js'
import { translateDevUpdate } from '@/lib/tagro/translate-update'

export type GithubActivityCommit = {
  message?: string | null
  branch_name?: string | null
  committed_at?: string | null
  task_id?: string | null
  author_name?: string | null
}

export type GithubActivityPr = {
  pr_number?: number | null
  title?: string | null
  state?: string | null
  merged?: boolean | null
  head_branch?: string | null
  task_id?: string | null
}

export function formatGithubDigest(
  commits: GithubActivityCommit[],
  pulls: GithubActivityPr[],
): string {
  const parts: string[] = ['GitHub-Aktivität seit letztem Sync:', '']

  if (commits.length) {
    parts.push('Commits:')
    for (const c of commits.slice(0, 14)) {
      const msg = (c.message || '').split('\n')[0].slice(0, 140)
      const branch = c.branch_name ? ` [${c.branch_name}]` : ''
      const linked = c.task_id ? ' · verknüpft' : ' · offen'
      parts.push(`- ${msg}${branch}${linked}`)
    }
  }

  if (pulls.length) {
    parts.push('', 'Pull Requests:')
    for (const p of pulls.slice(0, 10)) {
      const state = p.merged ? 'merged' : p.state || 'open'
      const linked = p.task_id ? ' · verknüpft' : ' · offen'
      parts.push(`- #${p.pr_number ?? '?'} ${(p.title || '').slice(0, 120)} (${state})${linked}`)
    }
  }

  if (!commits.length && !pulls.length) {
    parts.push('Keine Commits oder PRs im gewählten Zeitraum.')
  }

  const unlinked = commits.filter(c => !c.task_id).length + pulls.filter(p => !p.task_id).length
  if (unlinked > 0) {
    parts.push('', `${unlinked} Einträge ohne Task-Verknüpfung — bitte priorisieren oder verknüpfen.`)
  }

  parts.push('', 'Erstelle ein client-sicheres Status-Update und schlage nächste Schritte vor.')
  return parts.join('\n')
}

export async function buildGithubTagroSummary(
  sb: SupabaseClient<any>,
  opts: {
    repoId?: string | null
    projectId?: string | null
    limit?: number
    includeClientPreview?: boolean
  } = {},
) {
  const limit = Math.min(opts.limit ?? 30, 60)
  let cq = sb
    .from('github_commits')
    .select('message,branch_name,committed_at,task_id,author_name,project_id')
    .order('committed_at', { ascending: false })
    .limit(limit)
  let pq = sb
    .from('github_pull_requests')
    .select('pr_number,title,state,merged,head_branch,task_id,project_id,updated_at_github')
    .order('updated_at_github', { ascending: false })
    .limit(limit)

  if (opts.repoId) {
    cq = cq.eq('repo_id', opts.repoId)
    pq = pq.eq('repo_id', opts.repoId)
  }
  if (opts.projectId) {
    cq = cq.eq('project_id', opts.projectId)
    pq = pq.eq('project_id', opts.projectId)
  }

  const [{ data: commits }, { data: pulls }] = await Promise.all([cq, pq])
  const commitRows = (commits as GithubActivityCommit[]) ?? []
  const pullRows = (pulls as GithubActivityPr[]) ?? []

  const digest = formatGithubDigest(commitRows, pullRows)
  const resolvedProjectId = opts.projectId
    ?? commitRows.find(c => (c as any).project_id)?.project_id
    ?? pullRows.find(p => (p as any).project_id)?.project_id
    ?? null

  let projectTitle: string | null = null
  if (resolvedProjectId) {
    const { data: proj } = await sb.from('projects').select('title').eq('id', resolvedProjectId).maybeSingle()
    projectTitle = (proj as any)?.title ?? null
  }

  let clientPreview: string | null = null
  if (opts.includeClientPreview && digest.trim()) {
    const translated = await translateDevUpdate({
      devText: digest.slice(0, 3000),
      projectTitle,
    })
    clientPreview = translated.clientSummary
  }

  return {
    digest,
    clientPreview,
    projectId: resolvedProjectId,
    projectTitle,
    stats: {
      commits: commitRows.length,
      prs: pullRows.length,
      unlinked: commitRows.filter(c => !c.task_id).length + pullRows.filter(p => !p.task_id).length,
    },
  }
}
