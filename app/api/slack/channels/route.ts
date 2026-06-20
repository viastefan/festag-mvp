import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listSlackChannelsForAuth } from '@/lib/connectors/slack'
import type { SlackAuth } from '@/lib/slack/api'

export const runtime = 'nodejs'

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

/** GET /api/slack/channels */
export async function GET() {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const auth = await resolveSlackAuth(supa, user.id)
  if (!auth) return NextResponse.json({ error: 'slack_not_connected' }, { status: 400 })

  try {
    const channels = await listSlackChannelsForAuth(auth)
    return NextResponse.json({ channels })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'slack_channels_failed' }, { status: 502 })
  }
}
