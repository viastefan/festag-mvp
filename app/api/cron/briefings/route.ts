import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { buildBriefingDeliveryContent } from '@/lib/briefing/build-delivery-content'
import {
  publishPodcastEpisode,
  shouldPublishPodcastEpisode,
  type BriefingPodcastFeedRow,
} from '@/lib/briefing/podcast-feed'
import { sendMail } from '@/lib/email/client'
import { tplGeneric } from '@/lib/email/templates'
import { synthesizeBriefingMp3 } from '@/lib/tts'

export const runtime = 'nodejs'
export const maxDuration = 60

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://xsdkoepwuvpuroijjain.supabase.co'

/**
 * GET /api/cron/briefings
 *
 * Daily Vercel Cron. Delivers due briefing_subscriptions by email and
 * publishes private podcast episodes for active briefing_podcast_feeds.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization') || ''
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    }
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ ok: false, error: 'service_key_missing' }, { status: 500 })
  }
  const sb = createServiceClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const nowIso = new Date().toISOString()

  const { data: subs, error } = await sb
    .from('briefing_subscriptions')
    .select('id,user_id,project_id,workspace_id,cadence,format,send_hour,timezone,recipients,last_sent_at')
    .eq('active', true)
    .neq('cadence', 'off')
    .lte('next_run_at', nowIso)
    .order('next_run_at', { ascending: true })
    .limit(50)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const sent: string[] = []
  const skipped: { id: string; reason: string }[] = []

  for (const sub of (subs as any[]) ?? []) {
    try {
      const { data: userRow } = await sb
        .from('profiles').select('email,full_name')
        .eq('id', sub.user_id).maybeSingle()
      const ownerEmail = (userRow as any)?.email
      const ownerName = (userRow as any)?.full_name || ''
      const recipients = [ownerEmail, ...(sub.recipients || [])].filter(Boolean) as string[]

      if (recipients.length === 0) {
        skipped.push({ id: sub.id, reason: 'no_recipient' })
        continue
      }

      const content = await buildBriefingDeliveryContent(sb, {
        userId: sub.user_id,
        projectId: sub.project_id,
        ownerName,
      })

      const bodyHtml = `
        <p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#1c1914;">${content.greeting}</p>
        <p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#1c1914;">hier ist dein aktuelles Briefing zu <strong>${content.projectTitle}</strong>. Tagro hat die letzten Signale verdichtet — ruhig und auf den Punkt.</p>
        <pre style="white-space:pre-wrap;font:inherit;font-size:13.5px;line-height:1.7;color:#1c1914;margin:0 0 18px 0;background:#f7f5ee;border:1px solid #ebe6d5;border-radius:10px;padding:14px 16px;">${content.body.replace(/</g, '&lt;')}</pre>
        <p style="margin:0;font-size:13px;line-height:1.6;color:#54585A;">
          <a href="${content.ctaUrl}" style="display:inline-block;padding:10px 16px;background:#1c1914;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Im Festag öffnen</a>
        </p>
      `
      const tpl = tplGeneric({
        title: `Festag Projektbriefing — ${content.projectTitle}`,
        subtitle: `Dein heutiges Projektbriefing zu ${content.projectTitle}`,
        preheader: `Heutiges Briefing, ${content.projectTitle}`,
        body: bodyHtml,
      })

      const wantsAudio = sub.format === 'audio' || sub.format === 'both'
      let attachments: Array<{ filename: string; content: Buffer; contentType: string }> | undefined
      if (wantsAudio) {
        const mp3 = await synthesizeBriefingMp3(`${content.spokenIntro} ${content.body}`, { voice: 'alloy' })
        if (mp3) {
          const stamp = new Date().toISOString().slice(0, 10)
          attachments = [{
            filename: `festag-briefing-${content.projectTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) || 'projekt'}-${stamp}.mp3`,
            content: mp3,
            contentType: 'audio/mpeg',
          }]
        }
      }

      const result = await sendMail({
        to: recipients,
        subject: tpl.subject,
        html: tpl.html,
        text: `${content.greeting}\n\n${content.body}\n\nIm Festag öffnen: ${content.ctaUrl}`,
        attachments,
      })

      if (!result.ok) {
        skipped.push({ id: sub.id, reason: result.error || 'send_failed' })
        continue
      }

      const { data: nextRun } = await sb.rpc('compute_next_briefing_run', {
        p_cadence: sub.cadence,
        p_send_hour: sub.send_hour ?? 8,
        p_timezone: sub.timezone ?? 'Europe/Berlin',
      }) as any

      await sb.from('briefing_subscriptions').update({
        last_sent_at: new Date().toISOString(),
        next_run_at: nextRun,
      }).eq('id', sub.id)

      sent.push(sub.id)
    } catch (e: any) {
      skipped.push({ id: sub.id, reason: e?.message || 'exception' })
    }
  }

  const podcastPublished: string[] = []
  const podcastSkipped: { id: string; reason: string }[] = []

  const { data: feeds } = await sb
    .from('briefing_podcast_feeds')
    .select('*')
    .eq('active', true)
    .neq('cadence', 'off')
    .limit(100)

  for (const feed of (feeds as BriefingPodcastFeedRow[] | null) ?? []) {
    try {
      if (!shouldPublishPodcastEpisode(feed)) {
        podcastSkipped.push({ id: feed.id, reason: 'not_due' })
        continue
      }
      const result = await publishPodcastEpisode(sb, feed)
      if (result.ok) podcastPublished.push(feed.id)
      else podcastSkipped.push({ id: feed.id, reason: result.reason })
    } catch (e: any) {
      podcastSkipped.push({ id: feed.id, reason: e?.message || 'exception' })
    }
  }

  return NextResponse.json({
    ok: true,
    sent: sent.length,
    skipped: skipped.length,
    podcast: { published: podcastPublished.length, skipped: podcastSkipped.length },
    details: { sent, skipped, podcastPublished, podcastSkipped },
  })
}
