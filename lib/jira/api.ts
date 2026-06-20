/**
 * Jira Cloud REST API v3 — server-side only.
 *
 * Auth: Basic (email + API token). Config stored in user_connectors.config:
 *   { site, email, token }
 */

export class JiraError extends Error {
  status: number
  body: unknown
  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

export type JiraAuth = {
  site: string
  email: string
  token: string
}

export type JiraProject = {
  id: string
  key: string
  name: string
}

export type JiraIssue = {
  id: string
  key: string
  self: string
  fields: {
    summary: string
    description?: string | { type?: string; content?: unknown } | null
    status?: { name?: string; statusCategory?: { key?: string } }
    priority?: { name?: string } | null
    issuetype?: { name?: string } | null
    labels?: string[]
    assignee?: { displayName?: string } | null
    creator?: { displayName?: string } | null
    updated?: string
  }
}

function normalizeSite(site: string): string {
  return site.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '')
}

function authHeader(auth: JiraAuth): string {
  const raw = `${auth.email}:${auth.token}`
  return `Basic ${Buffer.from(raw).toString('base64')}`
}

async function jiraFetch<T>(path: string, auth: JiraAuth): Promise<T> {
  const site = normalizeSite(auth.site)
  if (!site || !auth.email || !auth.token) {
    throw new JiraError('missing_jira_credentials', 401, null)
  }

  const res = await fetch(`https://${site}${path}`, {
    headers: {
      Authorization: authHeader(auth),
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    let body: unknown = null
    try { body = await res.json() } catch { /* noop */ }
    throw new JiraError(`jira_${res.status}`, res.status, body)
  }

  return res.json() as Promise<T>
}

function flattenDescription(desc: JiraIssue['fields']['description']): string | null {
  if (!desc) return null
  if (typeof desc === 'string') return desc
  try {
    return JSON.stringify(desc).slice(0, 8000)
  } catch {
    return null
  }
}

export function jiraIssueUrl(auth: JiraAuth, key: string): string {
  return `https://${normalizeSite(auth.site)}/browse/${key}`
}

export async function listJiraProjects(auth: JiraAuth): Promise<JiraProject[]> {
  const data = await jiraFetch<{ values?: JiraProject[] }>(
    '/rest/api/3/project/search?maxResults=50&orderBy=name',
    auth,
  )
  return data.values ?? []
}

export async function searchJiraProjectIssues(
  auth: JiraAuth,
  projectKey: string,
  opts?: { maxResults?: number },
): Promise<JiraIssue[]> {
  const max = Math.min(opts?.maxResults ?? 100, 100)
  const site = normalizeSite(auth.site)

  const res = await fetch(`https://${site}/rest/api/3/search`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(auth),
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jql: `project = "${projectKey}" ORDER BY updated DESC`,
      maxResults: max,
      fields: ['summary', 'description', 'status', 'priority', 'issuetype', 'labels', 'assignee', 'creator', 'updated'],
    }),
    cache: 'no-store',
  })

  if (!res.ok) {
    let body: unknown = null
    try { body = await res.json() } catch { /* noop */ }
    throw new JiraError(`jira_${res.status}`, res.status, body)
  }

  const data = await res.json() as { issues?: JiraIssue[] }

  return (data.issues ?? []).map(issue => ({
    ...issue,
    fields: {
      ...issue.fields,
      description: flattenDescription(issue.fields.description),
    },
  }))
}
