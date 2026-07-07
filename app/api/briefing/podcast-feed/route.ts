import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import {
  defaultPodcastFeedTitle,
  festagAppOrigin,
  generatePodcastFeedToken,
  podcastFeedUrl,
  publishPodcastEpisode,
  type BriefingPodcastFeedRow,
} from '@/lib/briefing/podcast-feed'

export const runtime = 'nodejs'
export const maxDuration = 60

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://xsdkoepwuvpuroijjain.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

async function sessionUser() {
  const cookieStore = cookies()
  const sb = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(_cookies: { name: string; value: string; options: CookieOptions }[]) { /* read-only */ },
    },
  })
  const { data: { user } } = await sb.auth.getUser()
  return { sb, user }
}

function serviceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return null
  return createServiceClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function mapDbError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('briefing_podcast') || lower.includes('column') || lower.includes('relation')) {
    return 'schema_missing'
  }
  return message
}

async function resolveWorkspaceId(sb: ReturnType<typeof serviceClient>, userId: string): Promise<string | null> {
  if (!sb) return null
  const { data: ws } = await sb
    .from('workspaces')
    .select('id')
    .eq('primary_owner_id', userId)
    .eq('is_personal', true)
    .maybeSingle()
  return (ws as { id?: string } | null)?.id ?? null
}

async function loadFeed(
  sb: ReturnType<typeof serviceClient>,
  userId: string,
  projectId?: string | null,
) {
  if (!sb) return { data: null, error: { message: 'service_key_missing' } }
  let q = sb
    .from('briefing_podcast_feeds')
    .select('*')
    .eq('user_id', userId)
  q = projectId ? q.eq('project_id', projectId) : q.is('project_id', null)
  return q.maybeSingle()
}

function serializeFeed(row: BriefingPodcastFeedRow, episodeCount: number) {
  const origin = festagAppOrigin()
  return {
    id: row.id,
    active: row.active,
    title: row.title,
    cadence: row.cadence,
    projectId: row.project_id,
    feedUrl: podcastFeedUrl(row.secret_token, origin),
    lastEpisodeAt: row.last_episode_at,
    linkedAt: row.linked_at,
    episodeCount,
  }
}

/**
 * GET /api/briefing/podcast-feed?projectId=
 */
export async function GET(req: NextRequest) {
  const { user } = await sessionUser()
  if (!user) return NextResponse.json({ ok: false, error: 'no_session' }, { status: 401 })

  const projectId = req.nextUrl.searchParams.get('projectId') || null
  const sb = serviceClient()
  if (!sb) return NextResponse.json({ ok: false, error: 'service_key_missing' }, { status: 500 })

  const { data, error } = await loadFeed(sb, user.id, projectId)
  if (error) {
    const mapped = mapDbError(error.message)
    return NextResponse.json({ ok: false, error: mapped }, { status: mapped === 'schema_missing' ? 503 : 500 })
  }

  if (!data) {
    return NextResponse.json({ ok: true, feed: null })
  }

  const { count } = await sb
    .from('briefing_podcast_episodes')
    .select('id', { count: 'exact', head: true })
    .eq('feed_id', (data as BriefingPodcastFeedRow).id)

  return NextResponse.json({
    ok: true,
    feed: serializeFeed(data as BriefingPodcastFeedRow, count ?? 0),
  })
}

type PatchBody = {
  action: 'enable' | 'disable' | 'regenerate_token' | 'publish_now'
  projectId?: string | null
  projectTitle?: string | null
  cadence?: 'daily' | 'weekly' | 'biweekly' | 'off'
}

/**
 * PATCH /api/briefing/podcast-feed
 */
export async function PATCH(req: NextRequest) {
  const { user } = await sessionUser()
  if (!user) return NextResponse.json({ ok: false, error: 'no_session' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as PatchBody
  const { action, projectId = null, projectTitle = null, cadence } = body
  if (!action) {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 })
  }

  const sb = serviceClient()
  if (!sb) return NextResponse.json({ ok: false, error: 'service_key_missing' }, { status: 500 })

  const { data: existing, error: loadError } = await loadFeed(sb, user.id, projectId)
  if (loadError) {
    const mapped = mapDbError(loadError.message)
    return NextResponse.json({ ok: false, error: mapped }, { status: mapped === 'schema_missing' ? 503 : 500 })
  }

  if (action === 'enable') {
    const workspaceId = await resolveWorkspaceId(sb, user.id)
    const token = generatePodcastFeedToken()
    const title = defaultPodcastFeedTitle(projectTitle)
    const row = existing
      ? {
          active: true,
          title,
          ...(cadence ? { cadence } : {}),
          linked_at: new Date().toISOString(),
        }
      : {
          user_id: user.id,
          workspace_id: workspaceId,
          project_id: projectId,
          secret_token: token,
          title,
          active: true,
          cadence: cadence ?? 'daily',
          linked_at: new Date().toISOString(),
        }

    const { data, error } = existing
      ? await sb
        .from('briefing_podcast_feeds')
        .update(row)
        .eq('id', (existing as BriefingPodcastFeedRow).id)
        .select('*')
        .single()
      : await sb
        .from('briefing_podcast_feeds')
        .insert(row)
        .select('*')
        .single()

    if (error) {
      const mapped = mapDbError(error.message)
      return NextResponse.json({ ok: false, error: mapped }, { status: mapped === 'schema_missing' ? 503 : 500 })
    }

    const feed = data as BriefingPodcastFeedRow
    const publish = await publishPodcastEpisode(sb, feed, { force: true })
    const { count } = await sb
      .from('briefing_podcast_episodes')
      .select('id', { count: 'exact', head: true })
      .eq('feed_id', feed.id)

    return NextResponse.json({
      ok: true,
      feed: serializeFeed(feed, count ?? 0),
      firstEpisode: publish.ok ? { id: publish.episodeId } : { error: publish.reason },
    })
  }

  if (!existing) {
    return NextResponse.json({ ok: false, error: 'feed_not_found' }, { status: 404 })
  }

  const feed = existing as BriefingPodcastFeedRow

  if (action === 'disable') {
    const { data, error } = await sb
      .from('briefing_podcast_feeds')
      .update({ active: false })
      .eq('id', feed.id)
      .select('*')
      .single()
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
    const { count } = await sb
      .from('briefing_podcast_episodes')
      .select('id', { count: 'exact', head: true })
      .eq('feed_id', feed.id)
    return NextResponse.json({ ok: true, feed: serializeFeed(data as BriefingPodcastFeedRow, count ?? 0) })
  }

  if (action === 'regenerate_token') {
    const token = generatePodcastFeedToken()
    const { data, error } = await sb
      .from('briefing_podcast_feeds')
      .update({ secret_token: token })
      .eq('id', feed.id)
      .select('*')
      .single()
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
    const { count } = await sb
      .from('briefing_podcast_episodes')
      .select('id', { count: 'exact', head: true })
      .eq('feed_id', feed.id)
    return NextResponse.json({ ok: true, feed: serializeFeed(data as BriefingPodcastFeedRow, count ?? 0) })
  }

  if (action === 'publish_now') {
    const publish = await publishPodcastEpisode(sb, feed, { force: true })
    if (!publish.ok) {
      return NextResponse.json({ ok: false, error: publish.reason }, { status: 500 })
    }
    const { data, error } = await sb
      .from('briefing_podcast_feeds')
      .select('*')
      .eq('id', feed.id)
      .single()
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
    const { count } = await sb
      .from('briefing_podcast_episodes')
      .select('id', { count: 'exact', head: true })
      .eq('feed_id', feed.id)
    return NextResponse.json({
      ok: true,
      feed: serializeFeed(data as BriefingPodcastFeedRow, count ?? 0),
      episodeId: publish.episodeId,
    })
  }

  return NextResponse.json({ ok: false, error: 'invalid_action' }, { status: 400 })
}
