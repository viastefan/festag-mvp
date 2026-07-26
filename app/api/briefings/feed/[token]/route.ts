import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import {
  buildPodcastRssXml,
  type BriefingPodcastEpisodeRow,
  type BriefingPodcastFeedRow,
} from '@/lib/briefing/podcast-feed'

export const runtime = 'nodejs'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://xsdkoepwuvpuroijjain.supabase.co'

/**
 * GET /api/briefings/feed/[token]
 * Public RSS feed — token is the only auth gate.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } },
) {
  const token = params.token?.trim()
  if (!token || token.length < 16) {
    return new NextResponse('Not found', { status: 404 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return new NextResponse('Service unavailable', { status: 503 })
  }

  const sb = createServiceClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: feed, error } = await sb
    .from('briefing_podcast_feeds')
    .select('*')
    .eq('secret_token', token)
    .eq('active', true)
    .maybeSingle()

  if (error || !feed) {
    return new NextResponse('Not found', { status: 404 })
  }

  const { data: episodes } = await sb
    .from('briefing_podcast_episodes')
    .select('*')
    .eq('feed_id', (feed as BriefingPodcastFeedRow).id)
    .order('published_at', { ascending: false })
    .limit(30)

  const xml = buildPodcastRssXml(
    feed as BriefingPodcastFeedRow,
    (episodes as BriefingPodcastEpisodeRow[] | null) ?? [],
  )

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
