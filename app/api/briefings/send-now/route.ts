import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { sendMail } from '@/lib/email/client'
import { tplGeneric } from '@/lib/email/templates'
import { synthesizeBriefingMp3 } from '@/lib/tts'

export const runtime = 'nodejs'
export const maxDuration = 60

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://xsdkoepwuvpuroijjain.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

/**
 * POST /api/briefings/send-now
 *
 * Auth via session. Sends the briefing for the user's current
 * subscription (project-scoped or workspace-level) immediately as a
 * test/manual delivery, without touching next_run_at. Used by the
 * "Jetzt senden" button on the Briefing page so the user can verify the
 * pipeline without waiting for the next cron tick.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { projectId?: string | null }

    const cookieStore = cookies()
    const sbCookie = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(_cookies: { name: string; value: string; options: CookieOptions }[]) { /* read-only */ },
      },
    })
    const { data: { user } } = await sbCookie.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'no_session' }, { status: 401 })

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) return NextResponse.json({ ok: false, error: 'service_key_missing' }, { status: 500 })
    const sb = createServiceClient(SUPABASE_URL, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Find this user's subscription for the given project (or workspace-level).
    let q = sb.from('briefing_subscriptions')
      .select('id,user_id,project_id,workspace_id,cadence,format,recipients')
      .eq('user_id', user.id)
    q = body.projectId ? q.eq('project_id', body.projectId) : q.is('project_id', null)
    const { data: sub } = await q.maybeSingle()

    // Recipients: owner + extras (subscription exists) else owner only.
    const { data: profile } = await sb.from('profiles').select('email,full_name').eq('id', user.id).maybeSingle()
    const ownerEmail = (profile as any)?.email
    const ownerName = (profile as any)?.full_name || ''
    const recipients = [ownerEmail, ...((sub as any)?.recipients ?? [])].filter(Boolean) as string[]
    if (recipients.length === 0) {
      return NextResponse.json({ ok: false, error: 'no_recipient' }, { status: 400 })
    }
    const format = (sub as any)?.format ?? 'email'

    // Project context (when provided)
    let projectTitle = 'Workspace-Briefing'
    let bodyText = ''
    if (body.projectId) {
      const { data: project } = await sb
        .from('projects').select('id,title,status').eq('id', body.projectId).maybeSingle()
      if (project) {
        projectTitle = (project as any).title
        const { data: latest } = await sb
          .from('ai_updates')
          .select('content')
          .eq('project_id', body.projectId)
          .in('type', ['status_report', 'daily_summary'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        bodyText = (latest as any)?.content
          || `Für "${projectTitle}" liegt noch kein generierter Statusbericht vor. Sobald Veyra neue Signale erkennt, landet hier eine Zusammenfassung.`
      }
    } else {
      const { data: projs } = await sb.from('projects').select('id,title,status').eq('user_id', user.id)
      const list = (projs as any[]) ?? []
      bodyText = list.length === 0
        ? 'In deinem Workspace ist aktuell kein Projekt aktiv.'
        : `Du hast ${list.length} Projekt${list.length === 1 ? '' : 'e'} im Workspace.\n\n` +
          list.slice(0, 8).map((p: any) => `· ${p.title} — Phase: ${p.status ?? 'unbekannt'}`).join('\n')
    }

    const greeting = ownerName ? `Hallo ${ownerName.split(' ')[0]},` : 'Hallo,'
    const ctaUrl = body.projectId
      ? `https://festag.app/reports?project=${body.projectId}`
      : 'https://festag.app/reports'
    const bodyHtml = `
      <p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#1c1914;">${greeting}</p>
      <p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#1c1914;">hier ist dein Briefing zu <strong>${projectTitle}</strong>. Diese E-Mail wurde manuell ausgelöst — ein Test der automatischen Zustellung.</p>
      <pre style="white-space:pre-wrap;font:inherit;font-size:13.5px;line-height:1.7;color:#1c1914;margin:0 0 18px 0;background:#f7f5ee;border:1px solid #ebe6d5;border-radius:10px;padding:14px 16px;">${bodyText.replace(/</g, '&lt;')}</pre>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#54585A;">
        <a href="${ctaUrl}" style="display:inline-block;padding:10px 16px;background:#1c1914;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Im Festag öffnen</a>
      </p>
    `
    const tpl = tplGeneric({
      title: `Festag Projektbriefing — ${projectTitle} (Test)`,
      subtitle: `Manuell ausgelöstes Briefing zu ${projectTitle}`,
      preheader: `Test-Briefing · ${projectTitle}`,
      body: bodyHtml,
    })

    // Audio attachment when format wants audio and TTS key set.
    let attachments: Array<{ filename: string; content: Buffer; contentType: string }> | undefined
    if (format === 'audio' || format === 'both') {
      const mp3 = await synthesizeBriefingMp3(`${greeting} hier ist dein heutiges Briefing zu ${projectTitle}. ${bodyText}`)
      if (mp3) {
        const stamp = new Date().toISOString().slice(0, 10)
        attachments = [{
          filename: `festag-briefing-${projectTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) || 'projekt'}-${stamp}.mp3`,
          content: mp3,
          contentType: 'audio/mpeg',
        }]
      }
    }

    const result = await sendMail({
      to: recipients,
      subject: tpl.subject,
      html: tpl.html,
      text: `${greeting}\n\n${bodyText}\n\nIm Festag öffnen: ${ctaUrl}`,
      attachments,
    })

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error || 'send_failed' }, { status: 500 })
    }
    return NextResponse.json({
      ok: true,
      sent_to: recipients,
      audio_attached: Boolean(attachments?.length),
      subscription_id: (sub as any)?.id ?? null,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'send_failed' }, { status: 500 })
  }
}
