import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { BriefingPodcastEpisodeRow, BriefingPodcastFeedRow } from '@/lib/briefing/podcast-feed'

export const runtime = 'nodejs'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://xsdkoepwuvpuroijjain.supabase.co'
const BUCKET = 'briefing-podcasts'

/**
 * GET /api/briefings/feed/[token]/audio/[episodeId]
 * Streams episode MP3 — token must match the feed that owns the episode.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string; episodeId: string } },
) {
  const token = params.token?.trim()
  const episodeId = params.episodeId?.trim()
  if (!token || !episodeId) {
    return new NextResponse('Not found', { status: 404 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return new NextResponse('Service unavailable', { status: 503 })
  }

  const sb = createServiceClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: feed } = await sb
    .from('briefing_podcast_feeds')
    .select('id,active')
    .eq('secret_token', token)
    .eq('active', true)
    .maybeSingle()

  if (!feed) {
    return new NextResponse('Not found', { status: 404 })
  }

  const { data: episode } = await sb
    .from('briefing_podcast_episodes')
    .select('*')
    .eq('id', episodeId)
    .eq('feed_id', (feed as BriefingPodcastFeedRow).id)
    .maybeSingle()

  if (!episode) {
    return new NextResponse('Not found', { status: 404 })
  }

  const audioPath = (episode as BriefingPodcastEpisodeRow).audio_path
  const { data: blob, error } = await sb.storage.from(BUCKET).download(audioPath)
  if (error || !blob) {
    return new NextResponse('Not found', { status: 404 })
  }

  const buffer = Buffer.from(await blob.arrayBuffer())
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=86400',
      'Content-Length': String(buffer.length),
    },
  })
}
