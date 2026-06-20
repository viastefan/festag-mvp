/**
 * Tiny GitHub REST helper.
 *
 * Lives entirely server-side — never import this from a client component.
 *
 * Token resolution order (server only):
 *   1. token argument (per-call override)
 *   2. github_connections.access_token_encrypted for the developer (plain
 *      until we add Supabase Vault — flagged in TODO)
 *   3. process.env.GITHUB_PAT — fallback PAT used by the sync cron and by
 *      developers who have not yet completed the OAuth handshake
 *
 * All responses are normalized to the shapes consumed by /api/github/*.
 */

const GH = 'https://api.github.com'

export class GitHubError extends Error {
  status: number
  body: unknown
  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

type FetchOpts = { token?: string; etag?: string }

async function ghFetch<T>(path: string, opts: FetchOpts = {}): Promise<{ data: T; etag?: string; status: number }> {
  const token = opts.token || process.env.GITHUB_PAT
  if (!token) throw new GitHubError('missing_github_token', 401, null)
  const res = await fetch(`${GH}${path}`, {
    headers: {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Authorization': `Bearer ${token}`,
      ...(opts.etag ? { 'If-None-Match': opts.etag } : {}),
    },
    cache: 'no-store',
  })
  if (res.status === 304) return { data: [] as unknown as T, status: 304, etag: opts.etag }
  if (!res.ok) {
    let body: unknown = null
    try { body = await res.json() } catch { /* noop */ }
    throw new GitHubError(`github_${res.status}`, res.status, body)
  }
  const etag = res.headers.get('etag') ?? undefined
  const data = await res.json() as T
  return { data, etag, status: res.status }
}

export type GhRepo = {
  id: number
  name: string
  full_name: string
  html_url: string
  default_branch: string
  private: boolean
  description?: string | null
}

export async function getRepo(fullName: string, token?: string): Promise<GhRepo> {
  const { data } = await ghFetch<GhRepo>(`/repos/${fullName}`, { token })
  return data
}

export type GhCommit = {
  sha: string
  html_url: string
  commit: {
    message: string
    author?: { name?: string | null; email?: string | null; date?: string | null } | null
    committer?: { name?: string | null; email?: string | null; date?: string | null } | null
  }
  author?: { login?: string | null; avatar_url?: string | null } | null
  files?: Array<{ filename: string }>
}

export async function listCommits(
  fullName: string,
  opts: { since?: string; branch?: string; perPage?: number; token?: string } = {},
): Promise<GhCommit[]> {
  const params = new URLSearchParams()
  if (opts.since) params.set('since', opts.since)
  if (opts.branch) params.set('sha', opts.branch)
  params.set('per_page', String(Math.min(opts.perPage ?? 50, 100)))
  const { data } = await ghFetch<GhCommit[]>(`/repos/${fullName}/commits?${params}`, { token: opts.token })
  return data
}

export type GhPullRequest = {
  id: number
  number: number
  state: 'open' | 'closed'
  title: string
  html_url: string
  created_at: string
  updated_at: string
  closed_at: string | null
  merged_at: string | null
  merge_commit_sha?: string | null
  head: { ref: string; sha: string }
  base: { ref: string; sha: string }
  user?: { login?: string; avatar_url?: string } | null
  draft?: boolean
}

export async function listPullRequests(
  fullName: string,
  opts: { state?: 'open' | 'closed' | 'all'; perPage?: number; token?: string } = {},
): Promise<GhPullRequest[]> {
  const params = new URLSearchParams()
  params.set('state', opts.state ?? 'all')
  params.set('sort', 'updated')
  params.set('direction', 'desc')
  params.set('per_page', String(Math.min(opts.perPage ?? 30, 100)))
  const { data } = await ghFetch<GhPullRequest[]>(`/repos/${fullName}/pulls?${params}`, { token: opts.token })
  return data
}

export type GhIssue = {
  id: number
  number: number
  title: string
  body?: string | null
  state: 'open' | 'closed'
  html_url: string
  created_at: string
  updated_at: string
  labels?: Array<{ name?: string; color?: string | null }>
  assignee?: { login?: string | null } | null
  user?: { login?: string | null } | null
  pull_request?: { url?: string } | null
}

export async function listIssues(
  fullName: string,
  opts: { state?: 'open' | 'closed' | 'all'; since?: string; perPage?: number; token?: string } = {},
): Promise<GhIssue[]> {
  const params = new URLSearchParams()
  params.set('state', opts.state ?? 'all')
  params.set('sort', 'updated')
  params.set('direction', 'desc')
  params.set('per_page', String(Math.min(opts.perPage ?? 50, 100)))
  if (opts.since) params.set('since', opts.since)
  const { data } = await ghFetch<GhIssue[]>(`/repos/${fullName}/issues?${params}`, { token: opts.token })
  // GitHub returns PRs in the issues endpoint — skip them.
  return (data ?? []).filter(i => !i.pull_request)
}

/**
 * Try to extract task identifiers from a commit / PR title or body.
 * Recognises:
 *   - "FT-1234"     (Festag task short code, if ever introduced)
 *   - "task:<uuid>" (explicit binding)
 *   - "#1234"       (issue / PR number — kept as raw string)
 * The matches are deduped + lower-cased for downstream lookup.
 */
export function extractTaskHints(text: string): string[] {
  if (!text) return []
  const out: string[] = []
  const uuidRe = /task[:#\s]\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi
  const ftRe = /\bFT-\d+\b/gi
  const issueRe = /(?:^|[\s(])#(\d+)\b/g
  let m: RegExpExecArray | null
  while ((m = uuidRe.exec(text)) !== null) {
    const v = m[1].toLowerCase()
    if (!out.includes(v)) out.push(v)
  }
  while ((m = ftRe.exec(text)) !== null) {
    const v = m[0].toUpperCase()
    if (!out.includes(v)) out.push(v)
  }
  while ((m = issueRe.exec(text)) !== null) {
    const v = `#${m[1]}`
    if (!out.includes(v)) out.push(v)
  }
  return out
}
