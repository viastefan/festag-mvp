import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { slackConnector } from '@/lib/connectors/slack'
import type { SlackAuth } from '@/lib/slack/api'

export const runtime = 'nodejs'
export const maxDuration = 60

async function resolveSlackAuth(supa: any, userId: string): Promise<SlackAuth | null> {
  const { data: conn } = await supa
    .from('user_connectors')
    .select('config,status')
    .eq('user_id', userId)
    .eq('connector_id', 'slack')
    .maybeSingle()

  if ((conn as any)?.status === 'connected') {
    const token = (conn as any)?.config?.token
    if (token) return { token }
  }
  if (process.env.SLACK_BOT_TOKEN) return { token: process.env.SLACK_BOT_TOKEN }
  return null
}

/** POST /api/slack/sync { project_id?: string } */
export async function POST(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const auth = await resolveSlackAuth(supa, user.id)
  if (!auth) return NextResponse.json({ error: 'slack_not_connected' }, { status: 400 })

  const body = (await req.json().catch(() => ({}))) as { project_id?: string }

  let projectIds: string[] = []
  if (body.project_id) {
    projectIds = [body.project_id]
  } else {
    const { data: links } = await (supa as any)
      .from('slack_channel_links')
      .select('project_id')
      .eq('active', true)
    projectIds = Array.from(new Set(((links as any[]) ?? []).map(l => l.project_id).filter(Boolean)))
  }

  if (projectIds.length === 0) {
    return NextResponse.json({ ok: true, synced: [], message: 'no_links' })
  }

  const synced = []
  for (const projectId of projectIds) {
    const result = await slackConnector.sync({
      sb: supa as any,
      projectId,
      userId: user.id,
      token: auth.token,
      config: { token: auth.token },
    })
    synced.push({ project_id: projectId, ...result, signalsImported: result.issuesImported })
  }

  return NextResponse.json({ ok: true, synced })
}
