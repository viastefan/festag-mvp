import { SlackError, fetchChannelHistory, listSlackChannels, type SlackAuth } from '@/lib/slack/api'
import { formatSlackSignalContent, mapSlackMessageType } from '@/lib/slack/map-message'
import { createWorkSignal } from '@/lib/work-signals'
import type {
  Connector,
  ConnectorContext,
  ConnectorIssue,
  ConnectorProject,
  ConnectorSyncResult,
} from '@/lib/connectors/types'

type LinkRow = {
  id: string
  channel_id: string
  channel_name: string | null
  team_id: string | null
  team_name: string | null
  project_id: string
  last_synced_at: string | null
}

function resolveAuth(ctx: ConnectorContext): SlackAuth {
  const cfg = (ctx.config ?? {}) as Record<string, string>
  return { token: ctx.token || cfg.token || '' }
}

async function loadChannelLinks(sb: ConnectorContext['sb'], projectId: string): Promise<LinkRow[]> {
  const { data } = await sb
    .from('slack_channel_links')
    .select('id,channel_id,channel_name,team_id,team_name,project_id,last_synced_at')
    .eq('project_id', projectId)
    .eq('active', true)
  return ((data as LinkRow[] | null) ?? [])
}

async function isMessageSynced(
  sb: ConnectorContext['sb'],
  projectId: string,
  channelId: string,
  messageTs: string,
): Promise<boolean> {
  const { data } = await sb
    .from('slack_synced_messages')
    .select('id')
    .eq('project_id', projectId)
    .eq('channel_id', channelId)
    .eq('message_ts', messageTs)
    .maybeSingle()
  return !!(data as any)?.id
}

export class SlackConnector implements Connector {
  readonly source = 'slack' as const

  async connect(_ctx: ConnectorContext) {
    return { ok: true }
  }

  async disconnect(_ctx: ConnectorContext) {
    return { ok: true }
  }

  async fetchProjects(ctx: ConnectorContext): Promise<ConnectorProject[]> {
    const links = await loadChannelLinks(ctx.sb, ctx.projectId)
    return links.map(l => ({
      externalId: l.channel_id,
      name: l.channel_name ? `#${l.channel_name}` : l.channel_id,
      metadata: { link_id: l.id, team_id: l.team_id },
    }))
  }

  async fetchIssues(_ctx: ConnectorContext): Promise<ConnectorIssue[]> {
    return []
  }

  async fetchTasks(_ctx: ConnectorContext): Promise<ConnectorIssue[]> {
    return []
  }

  async sync(ctx: ConnectorContext): Promise<ConnectorSyncResult> {
    const result: ConnectorSyncResult = {
      source: 'slack',
      projects: 0,
      issuesImported: 0,
      issuesUpdated: 0,
      tasksImported: 0,
      linked: 0,
      enriched: 0,
      errors: [],
    }

    const auth = resolveAuth(ctx)
    if (!auth.token) {
      result.errors.push('missing_slack_token')
      return result
    }

    const links = await loadChannelLinks(ctx.sb, ctx.projectId)
    result.projects = links.length
    if (links.length === 0) return result

    const { data: project } = await ctx.sb
      .from('projects')
      .select('id,work_type')
      .eq('id', ctx.projectId)
      .maybeSingle()

    for (const link of links) {
      try {
        const oldest = link.last_synced_at
          ? String(new Date(link.last_synced_at).getTime() / 1000)
          : undefined

        const messages = await fetchChannelHistory(auth, link.channel_id, {
          oldest,
          limit: 50,
        })

        let imported = 0
        for (const msg of messages) {
          if (!msg.ts || !msg.text?.trim()) continue
          if (await isMessageSynced(ctx.sb, ctx.projectId, link.channel_id, msg.ts)) continue

          const signalType = mapSlackMessageType(msg.text)
          const content = formatSlackSignalContent(msg.text, msg.user)
          const signal = await createWorkSignal(
            ctx.sb,
            {
              projectId: ctx.projectId,
              type: signalType,
              source: 'slack',
              content,
              visibility: 'team',
              createdBy: ctx.userId ?? null,
            },
            (project as any)?.work_type ?? null,
          )

          if (signal) {
            await ctx.sb.from('slack_synced_messages').insert({
              project_id: ctx.projectId,
              channel_id: link.channel_id,
              message_ts: msg.ts,
              work_signal_id: signal.id,
            }).then(() => null, () => null)
            imported++
          }
        }

        result.issuesImported += imported
        await ctx.sb.from('slack_channel_links').update({
          last_synced_at: new Date().toISOString(),
          last_sync_status: 'ok',
          last_sync_error: null,
          updated_at: new Date().toISOString(),
        }).eq('id', link.id)
      } catch (e: any) {
        const msg = e instanceof SlackError ? e.message : (e?.message || 'slack_sync_failed')
        result.errors.push(msg)
        await ctx.sb.from('slack_channel_links').update({
          last_sync_status: 'error',
          last_sync_error: msg.slice(0, 500),
          updated_at: new Date().toISOString(),
        }).eq('id', link.id)
      }
    }

    return result
  }
}

export const slackConnector = new SlackConnector()

export async function listSlackChannelsForAuth(auth: SlackAuth) {
  return listSlackChannels(auth)
}
