/**
 * Linear GraphQL helper — server-side only.
 *
 * Token resolution:
 *   1. token argument
 *   2. user_connectors.config.token (passed by caller)
 *   3. process.env.LINEAR_API_KEY
 */

const LINEAR_GQL = 'https://api.linear.app/graphql'

export class LinearError extends Error {
  status: number
  body: unknown
  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

async function linearQuery<T>(
  query: string,
  variables: Record<string, unknown> = {},
  token?: string,
): Promise<T> {
  const apiKey = token || process.env.LINEAR_API_KEY
  if (!apiKey) throw new LinearError('missing_linear_token', 401, null)

  const res = await fetch(LINEAR_GQL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  })

  const payload = await res.json().catch(() => null) as {
    data?: T
    errors?: Array<{ message?: string }>
  } | null

  if (!res.ok) {
    throw new LinearError(`linear_${res.status}`, res.status, payload)
  }
  if (payload?.errors?.length) {
    throw new LinearError(payload.errors[0]?.message || 'linear_graphql_error', 400, payload)
  }
  if (!payload?.data) {
    throw new LinearError('linear_empty_response', 502, payload)
  }
  return payload.data
}

export type LinearTeam = {
  id: string
  key: string
  name: string
}

export type LinearIssueState = {
  name: string
  type: string
}

export type LinearIssue = {
  id: string
  identifier: string
  title: string
  description?: string | null
  url: string
  priority: number
  updatedAt: string
  createdAt: string
  state: LinearIssueState
  labels?: { nodes: Array<{ name: string }> }
  assignee?: { displayName?: string | null } | null
  creator?: { displayName?: string | null } | null
}

const TEAMS_QUERY = `
  query LinearTeams {
    teams {
      nodes { id key name }
    }
  }
`

const TEAM_ISSUES_QUERY = `
  query TeamIssues($teamId: String!, $after: String) {
    team(id: $teamId) {
      issues(first: 50, after: $after, orderBy: updatedAt) {
        nodes {
          id
          identifier
          title
          description
          url
          priority
          updatedAt
          createdAt
          state { name type }
          labels { nodes { name } }
          assignee { displayName }
          creator { displayName }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`

export async function listTeams(token?: string): Promise<LinearTeam[]> {
  const data = await linearQuery<{ teams: { nodes: LinearTeam[] } }>(TEAMS_QUERY, {}, token)
  return data.teams?.nodes ?? []
}

export async function listTeamIssues(
  teamId: string,
  opts: { token?: string; maxPages?: number } = {},
): Promise<LinearIssue[]> {
  const all: LinearIssue[] = []
  let after: string | null = null
  const maxPages = opts.maxPages ?? 3

  for (let page = 0; page < maxPages; page++) {
    const data = await linearQuery<{
      team: {
        issues: {
          nodes: LinearIssue[]
          pageInfo: { hasNextPage: boolean; endCursor: string | null }
        }
      } | null
    }>(TEAM_ISSUES_QUERY, { teamId, after }, opts.token)

    const batch = data.team?.issues?.nodes ?? []
    all.push(...batch)

    const pageInfo = data.team?.issues?.pageInfo
    if (!pageInfo?.hasNextPage || !pageInfo.endCursor) break
    after = pageInfo.endCursor
  }

  return all
}
