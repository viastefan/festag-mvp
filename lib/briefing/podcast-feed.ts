import { randomBytes, randomUUID } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildBriefingDeliveryContent,
  estimateBriefingDurationSeconds,
} from '@/lib/briefing/build-delivery-content'
import { synthesizeBriefingMp3 } from '@/lib/tts'

const BUCKET = 'briefing-podcasts'
const MAX_EPISODES_IN_FEED = 30

export type BriefingPodcastFeedRow = {
  id: string
  user_id: string
  workspace_id: string | null
  project_id: string | null
  secret_token: string
  title: string
  active: boolean
  cadence: 'daily' | 'weekly' | 'biweekly' | 'off'
  last_episode_at: string | null
  linked_at: string
}

export type BriefingPodcastEpisodeRow = {
  id: string
  feed_id: string
  title: string
  description: string
  audio_path: string
  duration_seconds: number | null
  guid: string
  published_at: string
}

export function festagAppOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://festag.app')
}

export function generatePodcastFeedToken(): string {
  return randomBytes(24).toString('hex')
}

export function podcastFeedUrl(token: string, origin = festagAppOrigin()): string {
  return `${origin}/api/briefings/feed/${token}`
}

export function podcastEpisodeAudioUrl(token: string, episodeId: string, origin = festagAppOrigin()): string {
  return `${origin}/api/briefings/feed/${token}/audio/${episodeId}`
}

export function defaultPodcastFeedTitle(projectTitle?: string | null): string {
  if (projectTitle) return `Festag Briefing — ${projectTitle}`
  return 'Mein Festag Briefing'
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function buildPodcastRssXml(
  feed: Pick<BriefingPodcastFeedRow, 'title' | 'secret_token'>,
  episodes: BriefingPodcastEpisodeRow[],
  origin = festagAppOrigin(),
): string {
  const feedUrl = podcastFeedUrl(feed.secret_token, origin)
  const items = episodes
    .slice(0, MAX_EPISODES_IN_FEED)
    .map((ep) => {
      const audioUrl = podcastEpisodeAudioUrl(feed.secret_token, ep.id, origin)
      const pubDate = new Date(ep.published_at).toUTCString()
      const duration = ep.duration_seconds ?? 120
      return `
    <item>
      <title>${xmlEscape(ep.title)}</title>
      <description>${xmlEscape(ep.description)}</description>
      <guid isPermaLink="false">${xmlEscape(ep.guid)}</guid>
      <pubDate>${pubDate}</pubDate>
      <enclosure url="${xmlEscape(audioUrl)}" length="0" type="audio/mpeg"/>
      <itunes:duration>${duration}</itunes:duration>
    </item>`
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(feed.title)}</title>
    <description>${xmlEscape('Dein privates Tagro-Briefing — nur für dich. Täglich frisch aus Festag.')}</description>
    <language>de-de</language>
    <link>${xmlEscape(origin)}</link>
    <atom:link href="${xmlEscape(feedUrl)}" rel="self" type="application/rss+xml"/>
    <itunes:author>Festag</itunes:author>
    <itunes:explicit>no</itunes:explicit>
    <itunes:category text="Business"/>
    ${items}
  </channel>
</rss>`
}

function berlinDateKey(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

export function shouldPublishPodcastEpisode(
  feed: Pick<BriefingPodcastFeedRow, 'active' | 'cadence' | 'last_episode_at'>,
): boolean {
  if (!feed.active || feed.cadence === 'off') return false
  if (!feed.last_episode_at) return true

  const last = new Date(feed.last_episode_at)
  const todayKey = berlinDateKey(new Date())
  const lastKey = berlinDateKey(last)

  if (feed.cadence === 'daily') return lastKey !== todayKey

  const dayDiff = Math.floor(
    (Date.now() - last.getTime()) / (24 * 60 * 60 * 1000),
  )
  if (feed.cadence === 'weekly') return dayDiff >= 7
  if (feed.cadence === 'biweekly') return dayDiff >= 14
  return false
}

export async function publishPodcastEpisode(
  sb: SupabaseClient,
  feed: BriefingPodcastFeedRow,
  opts?: { force?: boolean; ownerName?: string },
): Promise<{ ok: true; episodeId: string } | { ok: false; reason: string }> {
  if (!opts?.force && !shouldPublishPodcastEpisode(feed)) {
    return { ok: false, reason: 'not_due' }
  }

  const { data: profile } = await sb
    .from('profiles')
    .select('full_name')
    .eq('id', feed.user_id)
    .maybeSingle()

  const ownerName = opts?.ownerName ?? (profile as { full_name?: string } | null)?.full_name ?? ''
  const content = await buildBriefingDeliveryContent(sb, {
    userId: feed.user_id,
    projectId: feed.project_id,
    ownerName,
  })

  const spoken = `${content.spokenIntro} ${content.body}`.trim()
  const mp3 = await synthesizeBriefingMp3(spoken, { voice: 'nova' })
  if (!mp3) {
    return { ok: false, reason: 'tts_unavailable' }
  }

  const stamp = new Date().toISOString().slice(0, 10)
  const episodeId = randomUUID()
  const audioPath = `${feed.id}/${episodeId}.mp3`
  const guid = `${feed.id}-${stamp}-${episodeId}`

  const { error: uploadError } = await sb.storage
    .from(BUCKET)
    .upload(audioPath, mp3, { contentType: 'audio/mpeg', upsert: true })

  if (uploadError) {
    return { ok: false, reason: uploadError.message }
  }

  const episodeTitle = `${content.projectTitle}, ${new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Berlin',
  }).format(new Date())}`

  const description = content.body.length > 600
    ? `${content.body.slice(0, 600)}…`
    : content.body

  const durationSeconds = estimateBriefingDurationSeconds(spoken)
  const publishedAt = new Date().toISOString()

  const { error: insertError } = await sb.from('briefing_podcast_episodes').insert({
    id: episodeId,
    feed_id: feed.id,
    title: episodeTitle,
    description,
    audio_path: audioPath,
    duration_seconds: durationSeconds,
    guid,
    published_at: publishedAt,
  })

  if (insertError) {
    await sb.storage.from(BUCKET).remove([audioPath]).catch(() => {})
    return { ok: false, reason: insertError.message }
  }

  await sb.from('briefing_podcast_feeds').update({
    last_episode_at: publishedAt,
  }).eq('id', feed.id)

  // Trim old episodes beyond feed limit.
  const { data: stale } = await sb
    .from('briefing_podcast_episodes')
    .select('id,audio_path')
    .eq('feed_id', feed.id)
    .order('published_at', { ascending: false })
    .range(MAX_EPISODES_IN_FEED, MAX_EPISODES_IN_FEED + 20)

  if (stale?.length) {
    const paths = stale.map((row) => (row as { audio_path: string }).audio_path)
    await sb.storage.from(BUCKET).remove(paths).catch(() => {})
    await sb.from('briefing_podcast_episodes')
      .delete()
      .in('id', stale.map((row) => (row as { id: string }).id))
  }

  return { ok: true, episodeId }
}
