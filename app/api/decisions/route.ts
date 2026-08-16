import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendGenericEmail } from '@/lib/email/send'

export const runtime = 'nodejs'

const URGENCY_LABEL: Record<string, string> = {
  low: 'Niedrig', normal: 'Normal', high: 'Hoch', critical: 'Kritisch',
}

/**
 * Sends a calm decision-request email to the requested_for user.
 * Best-effort: silent on failure so the API still returns success.
 * The DB trigger has already inserted an inbox notification — this is
 * the second channel for users who aren't actively in the app.
 */
async function sendDecisionEmail(
  supa: any,
  decisionId: string,
  recipientId: string,
  title: string,
  description: string | null,
  urgency: string,
  projectTitle: string | null,
  options: Array<{ id: string; label: string; hint?: string }>,
  requesterName: string | null,
) {
  try {
    const { data: profile } = await supa
      .from('profiles')
      .select('email,full_name,first_name')
      .eq('id', recipientId)
      .maybeSingle()
    const email = profile?.email
    if (!email) return

    const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://festag.app'
    const url = `${origin}/decisions?open=${decisionId}`
    const greeting = profile?.first_name || profile?.full_name?.split(' ')[0] || 'hallo'
    const optionsBlock = options.length
      ? `<p style="margin:14px 0 6px;font-size:13px;color:#4E5567;letter-spacing:.017em">Optionen</p><ul style="margin:0;padding-left:18px;color:#1A1A1A;font-size:13.5px;line-height:1.6">${options.map(o => `<li>${escapeHtml(o.label)}${o.hint ? ` — <span style="color:#4E5567">${escapeHtml(o.hint)}</span>` : ''}</li>`).join('')}</ul>`
      : ''

    const body = `
      <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#1A1A1A;letter-spacing:.017em">
        Hallo ${escapeHtml(String(greeting))},${requesterName ? `<br>${escapeHtml(requesterName)} hat eine Entscheidung angefordert.` : '<br>eine Entscheidung wartet auf dich.'}
      </p>
      ${description ? `<p style="margin:0 0 12px;font-size:13.5px;line-height:1.6;color:#1A1A1A;letter-spacing:.017em">${escapeHtml(description)}</p>` : ''}
      ${optionsBlock}
      <p style="margin:18px 0 6px;font-size:12.5px;color:#4E5567">
        Dringlichkeit: <strong>${URGENCY_LABEL[urgency] || 'Normal'}</strong>${projectTitle ? ` · Projekt: <strong>${escapeHtml(projectTitle)}</strong>` : ''}
      </p>
      <p style="margin:18px 0 0">
        <a href="${url}" style="display:inline-block;height:36px;padding:0 18px;line-height:36px;background:#F0F2F5;color:#fff;border-radius:8px;text-decoration:none;font-weight:500;letter-spacing:.017em;font-size:13px">Entscheidung öffnen</a>
      </p>
    `

    await sendGenericEmail({
      to: email,
      title: `Entscheidung: ${title}`,
      subtitle: requesterName ? `${requesterName} braucht deine Freigabe` : 'Eine Entscheidung wartet auf dich',
      body,
      preheader: description ? description.slice(0, 120) : `Entscheidung in Festag — ${title}`,
    })

    await supa.from('decisions').update({ notified_at: new Date().toISOString() }).eq('id', decisionId)
  } catch {
    /* best-effort — surfaced to console via lib/email already */
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * GET  /api/decisions
 *   The whole Decision Center in one payload — decisions the current user is
 *   involved in (requested_for == me, or created_by == me), the projects they
 *   belong to, and the work each open decision holds up. Sorted server-side
 *   with the same ranking the page renders with (lib/decisions/center.ts), so
 *   the first paint is already in the right order.
 *
 *   ?open=1  — only decisions still needing attention.
 *
 * POST /api/decisions
 *   Body: { project_id, title, description?, options?[], urgency?,
 *           due_date?, requested_for, source_task_id? }
 *   Creates a decision request. The DB trigger fans out an inbox
 *   notification to requested_for.
 */

import { DECISION_OPEN_STATES } from '@/lib/decisions/types'
import { loadAffectedWork } from '@/lib/decisions/affected'
import { sortByAttention } from '@/lib/decisions/center'
import type { Decision } from '@/components/decisions/decisions-shared'

const URGENCY = new Set(['low', 'normal', 'high', 'critical'])
const OPEN_STATES = DECISION_OPEN_STATES

// Affected work is only resolved for what the user can act on — history rows
// don't need it, and it keeps the extra two queries bounded.
const MAX_AFFECTED_LOOKUPS = 40

export async function GET(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const onlyOpen = new URL(req.url).searchParams.get('open') === '1'

  // Two reads (the OR across RLS scopes can't be expressed in one .or chain
  // cleanly without polluting policy reasoning — easier to fetch both).
  const [{ data: forMe }, { data: byMe }] = await Promise.all([
    (supa as any).from('decisions').select('*').eq('requested_for', user.id).order('created_at', { ascending: false }).limit(200),
    (supa as any).from('decisions').select('*').eq('created_by', user.id).order('created_at', { ascending: false }).limit(200),
  ])

  // De-dupe (a dev could decide their own request in theory).
  const seen = new Set<string>()
  const merged: any[] = []
  for (const row of [...(forMe ?? []), ...(byMe ?? [])]) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    merged.push(row)
  }

  const filtered = onlyOpen ? merged.filter(d => OPEN_STATES.has(d.status)) : merged
  const decisions = sortByAttention(filtered as Decision[]) as any[]

  // Projects + affected work, resolved once here instead of N round trips from
  // the client (the page used to fetch project titles itself after render).
  const projectIds = Array.from(new Set(decisions.map(d => d.project_id).filter(Boolean)))
  const openIds = decisions
    .filter(d => OPEN_STATES.has(d.status))
    .slice(0, MAX_AFFECTED_LOOKUPS)
    .map(d => d.id)

  const [projectRows, affected, optionRows] = await Promise.all([
    projectIds.length
      ? (supa as any).from('projects').select('id,title,color,status,workspace_id').in('id', projectIds)
          .then((r: any) => r.data ?? [])
      : Promise.resolve([]),
    openIds.length ? loadAffectedWork(supa as any, openIds) : Promise.resolve({}),
    // Only the recommended option per decision — the board renders its name
    // ("Stripe", "Google + Apple"); the full option set loads when the user
    // actually opens the alternatives.
    openIds.length
      ? (supa as any).from('decision_options')
          .select('id,decision_id,external_id,label,client_label,description,recommended_by_tagro,ordinal')
          .in('decision_id', openIds)
          .eq('recommended_by_tagro', true)
          .then((r: any) => r.data ?? [])
      : Promise.resolve([]),
  ])

  const projects: Record<string, unknown> = {}
  for (const p of projectRows as any[]) projects[p.id] = p

  const recommendations: Record<string, unknown> = {}
  for (const o of optionRows as any[]) {
    if (!recommendations[o.decision_id]) recommendations[o.decision_id] = o
  }
  // Legacy rows carry the recommendation in decisions.recommended_option +
  // options_json instead of a decision_options row.
  for (const d of decisions) {
    if (recommendations[d.id] || !d.recommended_option || d.recommended_option === 'freeform') continue
    const key = String(d.recommended_option).toLowerCase()
    const legacy = (Array.isArray(d.options_json) ? d.options_json : []).find(
      (o: any) => String(o?.id ?? '').toLowerCase() === key || String(o?.label ?? '').toLowerCase() === key,
    )
    if (legacy) {
      recommendations[d.id] = {
        id: legacy.id,
        decision_id: d.id,
        external_id: legacy.id,
        label: legacy.label,
        client_label: legacy.label,
        description: legacy.hint ?? null,
        recommended_by_tagro: true,
      }
    }
  }

  const openForMe = merged.filter(d => OPEN_STATES.has(d.status) && d.requested_for === user.id)

  return NextResponse.json({
    decisions,
    projects,
    affected,
    recommendations,
    counts: {
      total: merged.length,
      open: merged.filter(d => OPEN_STATES.has(d.status)).length,
      open_for_me: openForMe.length,
      urgent: openForMe.filter(d => d.urgency === 'high' || d.urgency === 'critical').length,
      queued: merged.filter(d => OPEN_STATES.has(d.status) && d.queued).length,
      decided: merged.filter(d => !OPEN_STATES.has(d.status)).length,
    },
    // Kept for older callers that read the flat count.
    open_count: openForMe.length,
  })
}

export async function POST(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const b = (await req.json().catch(() => ({}))) as {
    project_id?: string
    title?: string
    description?: string
    options?: Array<{ id?: string; label?: string; hint?: string }>
    urgency?: string
    due_date?: string | null
    requested_for?: string
    source_task_id?: string
    notification_channels?: string[]
  }

  if (!b.project_id || !b.title?.trim()) {
    return NextResponse.json({ error: 'project_id and title required' }, { status: 400 })
  }

  // Default requested_for: project owner.
  let requestedFor = b.requested_for || null
  if (!requestedFor) {
    const { data: proj } = await (supa as any)
      .from('projects').select('user_id,client_id').eq('id', b.project_id).maybeSingle()
    requestedFor = proj?.client_id || proj?.user_id || null
  }

  const options = Array.isArray(b.options)
    ? b.options.slice(0, 6).map((o, i) => ({
        id: (o.id || `opt-${i + 1}`).slice(0, 32),
        label: String(o.label || `Option ${i + 1}`).slice(0, 200),
        hint: o.hint ? String(o.hint).slice(0, 400) : undefined,
      }))
    : []

  const urgency = URGENCY.has(b.urgency || '') ? b.urgency : 'normal'

  const { data, error } = await (supa as any).from('decisions').insert({
    project_id: b.project_id,
    title: b.title.trim().slice(0, 200),
    description: b.description?.slice(0, 4000) || null,
    options_json: options,
    urgency,
    due_date: b.due_date || null,
    status: 'open',
    visible_to_client: true,
    source: b.source_task_id ? 'task' : 'manual',
    source_task_id: b.source_task_id || null,
    created_by: user.id,
    requested_for: requestedFor,
    notification_channels: Array.isArray(b.notification_channels) && b.notification_channels.length
      ? b.notification_channels.filter(c => ['email','push','whatsapp','sms','phone'].includes(c))
      : ['email'],
  }).select('*').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Email fan-out (best-effort, async). Fires only when the channel
  // list includes 'email' and a recipient is set. WhatsApp / SMS /
  // push hooks plug in here later.
  if (data?.requested_for && (data.notification_channels || []).includes('email')) {
    const [{ data: projectRow }, { data: requesterRow }] = await Promise.all([
      (supa as any).from('projects').select('title').eq('id', data.project_id).maybeSingle(),
      (supa as any).from('profiles').select('full_name,first_name').eq('id', user.id).maybeSingle(),
    ])
    const requesterName = requesterRow?.full_name || requesterRow?.first_name || null
    // Fire-and-forget so the response stays snappy. Errors surface in
    // server logs only — the inbox + sidebar badge are the durable
    // signals; email is the polite ping.
    sendDecisionEmail(
      supa,
      data.id,
      data.requested_for,
      data.title,
      data.description,
      data.urgency,
      projectRow?.title || null,
      Array.isArray(data.options_json) ? data.options_json : [],
      requesterName,
    ).catch(() => {})
  }

  return NextResponse.json({ decision: data })
}
