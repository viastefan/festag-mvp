import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendMail } from '@/lib/email/client'
import { tplGeneric } from '@/lib/email/templates'

export const runtime = 'nodejs'
export const maxDuration = 60

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://xsdkoepwuvpuroijjain.supabase.co'

/**
 * GET /api/cron/briefings
 *
 * Hourly Vercel Cron. Scans briefing_subscriptions for rows whose
 * next_run_at <= now() and is active, generates a briefing email and
 * delivers it to the workspace owner + extra recipients, then advances
 * next_run_at via the SQL helper.
 *
 * Vercel auto-pings this; in production CRON_SECRET is enforced.
 */
export async function GET(req: NextRequest) {
  // Vercel sends an Authorization: Bearer ${CRON_SECRET} header for crons.
  // In dev, allow unauthenticated invocation for testing.
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

  // Pull due subscriptions. Limit to a manageable batch per cron tick.
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
      // Resolve recipients: workspace owner email + extras.
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

      // Project context (when project-scoped)
      let projectTitle = 'Workspace-Briefing'
      let body = ''
      if (sub.project_id) {
        const { data: project } = await sb
          .from('projects').select('id,title,status').eq('id', sub.project_id).maybeSingle()
        if (project) {
          projectTitle = (project as any).title

          // Pull the latest status_report from ai_updates, fall back to a stub.
          const { data: latest } = await sb
            .from('ai_updates')
            .select('content,created_at')
            .eq('project_id', sub.project_id)
            .eq('type', 'status_report')
            .order('created_at', { ascending: false }).limit(1).maybeSingle()
          body = (latest as any)?.content
            || `Für "${projectTitle}" liegt noch kein generierter Statusbericht vor. Sobald Tagro neue Signale aus dem Projekt erkennt, landet hier eine Zusammenfassung.`
        }
      } else {
        // Workspace-level briefing: list all active projects briefly
        const { data: projs } = await sb
          .from('projects').select('id,title,status')
          .eq('user_id', sub.user_id)
        const list = (projs as any[]) ?? []
        if (list.length === 0) {
          body = 'In deinem Workspace ist aktuell kein Projekt aktiv.'
        } else {
          body = `Du hast ${list.length} Projekt${list.length === 1 ? '' : 'e'} im Workspace.\n\n` +
            list.slice(0, 8).map(p => `· ${p.title} — Phase: ${p.status ?? 'unbekannt'}`).join('\n')
        }
      }

      const greeting = ownerName ? `Hallo ${ownerName.split(' ')[0]},` : 'Hallo,'
      const ctaUrl = sub.project_id
        ? `https://festag.app/reports?project=${sub.project_id}`
        : 'https://festag.app/reports'
      const bodyHtml = `
        <p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#1c1914;">${greeting}</p>
        <p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#1c1914;">hier ist dein aktuelles Briefing zu <strong>${projectTitle}</strong>. Tagro hat die letzten Signale verdichtet — ruhig und auf den Punkt.</p>
        <pre style="white-space:pre-wrap;font:inherit;font-size:13.5px;line-height:1.7;color:#1c1914;margin:0 0 18px 0;background:#f7f5ee;border:1px solid #ebe6d5;border-radius:10px;padding:14px 16px;">${body.replace(/</g, '&lt;')}</pre>
        <p style="margin:0;font-size:13px;line-height:1.6;color:#54585A;">
          <a href="${ctaUrl}" style="display:inline-block;padding:10px 16px;background:#1c1914;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Im Festag öffnen</a>
        </p>
      `
      const tpl = tplGeneric({
        title: `Festag Projektbriefing — ${projectTitle}`,
        subtitle: `Dein heutiges Projektbriefing zu ${projectTitle}`,
        preheader: `Heutiges Briefing · ${projectTitle}`,
        body: bodyHtml,
      })

      const result = await sendMail({
        to: recipients,
        subject: tpl.subject,
        html: tpl.html,
        text: `${greeting}\n\n${body}\n\nIm Festag öffnen: ${ctaUrl}`,
      })

      if (!result.ok) {
        skipped.push({ id: sub.id, reason: result.error || 'send_failed' })
        continue
      }

      // Bump next_run_at via SQL helper, mark last_sent_at.
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

  return NextResponse.json({ ok: true, sent: sent.length, skipped: skipped.length, details: { sent, skipped } })
}
