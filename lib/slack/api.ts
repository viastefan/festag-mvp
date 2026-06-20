/**
 * Slack Web API — server-side only.
 *
 * Token: Bot User OAuth Token (xoxb-...) stored in user_connectors.config.token
 * Scopes: channels:history, channels:read, groups:history, groups:read, chat:write
 */

const SLACK_API = 'https://slack.com/api'

export class SlackError extends Error {
  slackError?: string
  constructor(message: string, slackError?: string) {
    super(message)
    this.slackError = slackError
  }
}

export type SlackAuth = {
  token: string
}

export type SlackTeam = {
  id: string
  name: string
}

export type SlackChannel = {
  id: string
  name: string
  is_private?: boolean
  num_members?: number
}

export type SlackMessage = {
  ts: string
  user?: string
  text?: string
  subtype?: string
  bot_id?: string
}

type SlackResponse<T> = {
  ok: boolean
  error?: string
} & T

async function slackPost<T>(method: string, token: string, body: Record<string, string | number> = {}): Promise<T> {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(body)) params.set(k, String(v))

  const res = await fetch(`${SLACK_API}/${method}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
    cache: 'no-store',
  })

  const data = await res.json().catch(() => null) as SlackResponse<T> | null
  if (!data?.ok) {
    throw new SlackError(data?.error || `slack_${method}_failed`, data?.error)
  }
  return data as T
}

export async function testSlackAuth(auth: SlackAuth): Promise<{ team: SlackTeam; user: string }> {
  const data = await slackPost<{ team: SlackTeam; user: string }>('auth.test', auth.token)
  return { team: data.team, user: data.user }
}

export async function listSlackChannels(auth: SlackAuth): Promise<SlackChannel[]> {
  const channels: SlackChannel[] = []
  let cursor = ''

  for (let page = 0; page < 5; page++) {
    const data = await slackPost<{
      channels: SlackChannel[]
      response_metadata?: { next_cursor?: string }
    }>('conversations.list', auth.token, {
      types: 'public_channel,private_channel',
      exclude_archived: 1,
      limit: 200,
      ...(cursor ? { cursor } : {}),
    })

    channels.push(...(data.channels ?? []).filter(c => c.name && !c.name.startsWith('archived-')))
    cursor = data.response_metadata?.next_cursor ?? ''
    if (!cursor) break
  }

  return channels.sort((a, b) => a.name.localeCompare(b.name))
}

export async function fetchChannelHistory(
  auth: SlackAuth,
  channelId: string,
  opts?: { oldest?: string; limit?: number },
): Promise<SlackMessage[]> {
  const data = await slackPost<{ messages: SlackMessage[] }>('conversations.history', auth.token, {
    channel: channelId,
    limit: Math.min(opts?.limit ?? 50, 100),
    ...(opts?.oldest ? { oldest: opts.oldest } : {}),
  })

  return (data.messages ?? []).filter(m => {
    if (!m.text?.trim()) return false
    if (m.subtype && !['bot_message', 'file_share'].includes(m.subtype)) return false
    return true
  })
}

export async function postSlackMessage(
  auth: SlackAuth,
  channelId: string,
  text: string,
): Promise<void> {
  await slackPost('chat.postMessage', auth.token, {
    channel: channelId,
    text: text.slice(0, 3000),
  })
}

export function slackMessagePermalink(teamDomain: string | null, channelId: string, ts: string): string {
  const slug = teamDomain || 'slack'
  const tsPath = ts.replace('.', '')
  return `https://${slug}.slack.com/archives/${channelId}/p${tsPath}`
}
