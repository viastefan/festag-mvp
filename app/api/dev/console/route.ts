import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { decomposeDevMessage, listMessageAssets } from '@/lib/dev-console'

export const runtime = 'nodejs'

/**
 * POST /api/dev/console
 *
 * The composer turn. Resolves (or creates) a tagro chat thread, stores the dev
 * message as an inbox_item, runs Tagro's decomposition, and returns the plan.
 * No auto-dispatch — the dev confirms in the preview (WP5 route).
 *
 * Body: { projectId, text, threadId?, newThread?, attachmentItemId? }
 *   - threadId   : continue an existing chat
 *   - newThread  : force a fresh chat
 */
export async function POST(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const b = (await req.json().catch(() => ({}))) as {
    projectId?: string; text?: string; threadId?: string; newThread?: boolean; assetIds?: string[]
  }
  if (!b.projectId || !b.text?.trim()) {
    return NextResponse.json({ error: 'projectId and text required' }, { status: 400 })
  }

  // Project access (owner / assigned dev / workspace member).
  const { data: project } = await (supa as any)
    .from('projects').select('id, user_id, assigned_dev, workspace_id, client_id, title').eq('id', b.projectId).maybeSingle()
  if (!project) return NextResponse.json({ error: 'project not found' }, { status: 404 })

  const sb = (getServiceClient() ?? supa) as any

  // Resolve the chat thread.
  const { data: threadId, error: threadErr } = await sb.rpc('dev_console_thread', {
    p_developer: user.id, p_project: b.projectId,
    p_thread_id: b.threadId ?? null, p_new: b.newThread ?? false, p_title: null,
  })
  if (threadErr || !threadId) {
    return NextResponse.json({ error: threadErr?.message ?? 'thread_failed' }, { status: 500 })
  }

  // Recent history for context (oldest → newest).
  const { data: hist } = await sb.from('inbox_items')
    .select('actor_id, body, type').eq('thread_id', threadId)
    .order('created_at', { ascending: false }).limit(8)
  const history = (hist ?? []).reverse().map((h: any) => ({
    role: (h.actor_id ? 'dev' : 'tagro') as 'dev' | 'tagro', text: h.body ?? '',
  }))

  // Store the dev message.
  const { data: msg, error: msgErr } = await sb.from('inbox_items').insert({
    thread_id: threadId, user_id: user.id, project_id: b.projectId,
    category: 'tagro', type: 'chat_message', title: 'Dev', body: b.text.trim(),
    actor_id: user.id, metadata: {},
  }).select('id').single()
  if (msgErr || !msg) return NextResponse.json({ error: msgErr?.message ?? 'message_failed' }, { status: 500 })

  // Bind staged assets to this message so the framer sees them and dispatch
  // can carry them. send_to_client defaults true (the tray's "An Kunde").
  const assetIds = Array.isArray(b.assetIds) ? b.assetIds.filter((x) => typeof x === 'string') : []
  if (assetIds.length > 0) {
    await sb.from('message_assets').upsert(
      assetIds.map((asset_id) => ({ inbox_item_id: msg.id, asset_id, send_to_client: true })),
      { onConflict: 'inbox_item_id,asset_id' },
    )
  }

  // Decompose (+ the attachments now bound to this message).
  const attachments = await listMessageAssets(sb, msg.id)
  const plan = await decomposeDevMessage(sb, {
    projectId: b.projectId, developerId: user.id, text: b.text.trim(),
    attachments: attachments.map((a) => ({ id: a.asset_id, title: a.title, kind: a.kind })),
    history,
  })

  // Persist the plan on the message; set the thread title from the first message.
  await sb.from('inbox_items').update({ metadata: { relay_plan: plan } }).eq('id', msg.id)
  await maybeTitleThread(sb, threadId, plan.summary, b.text.trim())

  return NextResponse.json({ threadId, messageItemId: msg.id, plan })
}

async function maybeTitleThread(sb: any, threadId: string, summary: string, text: string) {
  const { data: t } = await sb.from('inbox_threads').select('title').eq('id', threadId).maybeSingle()
  if (t && (!t.title || t.title === 'Neuer Chat' || t.title === 'Tagro Chat')) {
    const title = (summary || text).split(/\s+/).slice(0, 6).join(' ').slice(0, 60)
    await sb.from('inbox_threads').update({ title, last_item_at: new Date().toISOString() }).eq('id', threadId)
  }
}
