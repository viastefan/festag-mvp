// ─────────────────────────────────────────────────────────────────────────────
// Dev Console Relay — WP5: dispatch engine
//
// Routes one RelayItem to the right client surface, idempotently, carrying its
// attachments along, then leaves a proof behind:
//   - client artifact  (status_update | decision | client_task | client_message)
//   - client inbox item (→ the badge on the client's sidebar)
//   - attachments made client-visible + linked
//   - a dev "ledger" task, auto-checked (the receipt of what was said)
//   - a dev_relay_dispatches row (the durable ledger record)
//   - an echo back into the dev's tagro chat ("✓ an Kunde gesendet: …")
//
// Idempotency: a (source_item_id, relay_kind, client_text) hash; a second
// dispatch of the same item is a no-op.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import { runDecisionPipeline } from '@/lib/decisions'
import type { RelayItem } from './relay'

export type DispatchResult = {
  relay_kind: RelayItem['relay_kind']
  skipped: boolean
  dispatch_id?: string
  decision_id?: string | null
  task_id?: string | null
  client_inbox_item_id?: string | null
  ledger_task_id?: string | null
  asset_ids: string[]
}

export type DispatchArgs = {
  messageItemId: string
  item: RelayItem
  projectId: string
  developerId: string
}

export async function dispatchRelayItem(
  supa: SupabaseClient<any>,
  { messageItemId, item, projectId, developerId }: DispatchArgs,
): Promise<DispatchResult> {
  const sb = supa as any
  const hash = `${item.relay_kind}:${(item.client_text || item.internal_text || '').slice(0, 200)}`

  // Idempotency guard.
  const { data: existing } = await sb
    .from('dev_relay_dispatches')
    .select('id, decision_id, task_id, client_inbox_item_id, ledger_task_id, asset_ids')
    .eq('source_item_id', messageItemId)
    .eq('dispatch_hash', hash)
    .not('dispatched_at', 'is', null)
    .maybeSingle()
  if (existing) {
    return {
      relay_kind: item.relay_kind, skipped: true, dispatch_id: existing.id,
      decision_id: existing.decision_id, task_id: existing.task_id,
      client_inbox_item_id: existing.client_inbox_item_id, ledger_task_id: existing.ledger_task_id,
      asset_ids: existing.asset_ids ?? [],
    }
  }

  // Project + client recipient.
  const { data: project } = await sb.from('projects').select('id, client_id, title').eq('id', projectId).maybeSingle()
  const clientId: string | null = project?.client_id ?? null

  // Attachments to carry along (intersection of this item's ids and the
  // message_assets the dev marked send_to_client).
  const assetIds = await resolveAttachments(sb, messageItemId, item.attach_asset_ids ?? [])

  let decisionId: string | null = null
  let taskId: string | null = null
  let statusReportId: string | null = null
  let clientInboxItemId: string | null = null

  const meta = assetIds.length > 0 ? { asset_ids: assetIds } : {}
  const shortTitle = (item.client_text || item.internal_text || '').slice(0, 80)

  switch (item.relay_kind) {
    case 'status_update': {
      clientInboxItemId = await postClientInbox(sb, {
        clientId, projectId, category: 'status_update', type: 'status_update',
        title: 'Projekt-Update', body: item.client_text, actorId: developerId, meta,
      })
      break
    }
    case 'decision': {
      const q = item.decision?.question || item.client_text || item.internal_text
      const outcome = await runDecisionPipeline(
        supa,
        {
          kind: 'dev_request', projectId, authorUserId: developerId, question: q,
          suggestedOptions: item.decision?.options,
          suggestedDecisionType: item.decision?.decision_type as any,
          urgency: item.decision?.urgency as any,
        },
        { requestedFor: clientId, createdBy: developerId },
      )
      decisionId =
        outcome.status === 'created' ? outcome.result.decision.id
        : outcome.status === 'refreshed' ? outcome.existing.id
        : null
      // Client badge item for the decision (the pipeline doesn't write inbox_items).
      clientInboxItemId = await postClientInbox(sb, {
        clientId, projectId, category: 'decision', type: 'decision',
        title: 'Entscheidung nötig', body: item.client_text || q, actorId: developerId,
        sourceTable: decisionId ? 'decisions' : null, sourceId: decisionId, meta,
      })
      break
    }
    case 'client_task': {
      const { data: task } = await sb.from('tasks').insert({
        project_id: projectId,
        title: item.task?.title || shortTitle || 'Aufgabe für den Kunden',
        description: item.task?.client_description || item.client_text,
        client_description: item.task?.client_description || item.client_text,
        dev_description: item.internal_text,
        audience: 'client',
        task_type: 'client_action',
        client_visible: true,
        client_status: 'submitted',
        status: 'in_progress',
        source: 'tagro_relay',
        created_by: developerId,
      }).select('id').single()
      taskId = task?.id ?? null
      if (taskId && assetIds.length > 0) {
        await sb.from('task_assets').upsert(
          assetIds.map((a) => ({ task_id: taskId, asset_id: a })),
          { onConflict: 'task_id,asset_id', ignoreDuplicates: true },
        )
      }
      clientInboxItemId = await postClientInbox(sb, {
        clientId, projectId, category: 'task_event', type: 'task_event',
        title: 'Neue Aufgabe', body: item.task?.client_description || item.client_text, actorId: developerId,
        sourceTable: taskId ? 'tasks' : null, sourceId: taskId, meta,
      })
      break
    }
    case 'client_message': {
      clientInboxItemId = await postClientInbox(sb, {
        clientId, projectId, category: 'message', type: 'message',
        title: 'Nachricht', body: item.client_text, actorId: developerId, meta,
      })
      break
    }
    case 'internal_note':
      // No client artifact. Only the ledger/echo below.
      break
  }

  // Make carried assets client-visible.
  if (assetIds.length > 0 && item.relay_kind !== 'internal_note') {
    await sb.from('project_assets').update({ visibility: 'client_visible' }).in('id', assetIds)
  }

  // Ledger task — the auto-checked receipt.
  const sentToClient = item.relay_kind !== 'internal_note'
  const { data: ledger } = await sb.from('tasks').insert({
    project_id: projectId,
    title: (sentToClient ? 'An Kunde gesendet: ' : 'Intern notiert: ') + (shortTitle || '—'),
    dev_description: item.internal_text,
    audience: 'dev',
    task_type: 'tagro_relay',
    client_visible: false,
    status: 'done',
    completed_at: new Date().toISOString(),
    source: 'tagro_relay',
    created_by: developerId,
    tagro_result_json: {
      relay_kind: item.relay_kind, decision_id: decisionId, task_id: taskId,
      client_inbox_item_id: clientInboxItemId, asset_ids: assetIds,
    },
  }).select('id').single()
  const ledgerTaskId = ledger?.id ?? null

  // Durable dispatch record.
  const { data: dispatch } = await sb.from('dev_relay_dispatches').insert({
    project_id: projectId,
    developer_id: developerId,
    source_item_id: messageItemId,
    relay_kind: item.relay_kind,
    client_text: item.client_text,
    internal_text: item.internal_text,
    decision_id: decisionId,
    task_id: taskId,
    status_report_id: statusReportId,
    client_inbox_item_id: clientInboxItemId,
    asset_ids: assetIds,
    ledger_task_id: ledgerTaskId,
    dispatch_hash: hash,
    dispatched_at: new Date().toISOString(),
  }).select('id').single()

  // Echo into the dev's tagro chat so the saved history shows what was sent.
  await echoToDevThread(sb, messageItemId, developerId, projectId, sentToClient, item.client_text || item.internal_text)

  return {
    relay_kind: item.relay_kind, skipped: false, dispatch_id: dispatch?.id,
    decision_id: decisionId, task_id: taskId, client_inbox_item_id: clientInboxItemId,
    ledger_task_id: ledgerTaskId, asset_ids: assetIds,
  }
}

async function resolveAttachments(sb: any, messageItemId: string, itemAssetIds: string[]): Promise<string[]> {
  const { data } = await sb
    .from('message_assets')
    .select('asset_id')
    .eq('inbox_item_id', messageItemId)
    .eq('send_to_client', true)
  const allowed = new Set((data ?? []).map((r: any) => r.asset_id as string))
  // If the item named specific assets, intersect; otherwise carry none for this
  // item (assets are bound per-item by the framer's attach_asset_ids).
  if (itemAssetIds.length === 0) return []
  return itemAssetIds.filter((id) => allowed.has(id))
}

async function postClientInbox(
  sb: any,
  args: {
    clientId: string | null; projectId: string
    category: string; type: string; title: string; body: string | null
    actorId: string | null; sourceTable?: string | null; sourceId?: string | null
    meta?: Record<string, unknown>
  },
): Promise<string | null> {
  if (!args.clientId) return null  // no client on the project yet — artifact still created, just no badge
  const { data, error } = await sb.rpc('create_inbox_item', {
    p_user_id: args.clientId,
    p_project_id: args.projectId,
    p_category: args.category,
    p_type: args.type,
    p_title: args.title,
    p_body: args.body,
    p_actor_id: args.actorId,
    p_source_table: args.sourceTable ?? null,
    p_source_id: args.sourceId ?? null,
    p_metadata: args.meta ?? {},
  })
  if (error) {
    console.error('postClientInbox failed', error.message)
    return null
  }
  return (data as string) ?? null
}

async function echoToDevThread(
  sb: any, messageItemId: string, developerId: string, projectId: string,
  sentToClient: boolean, text: string | null,
): Promise<void> {
  const { data: src } = await sb.from('inbox_items').select('thread_id').eq('id', messageItemId).maybeSingle()
  if (!src?.thread_id) return
  await sb.from('inbox_items').insert({
    thread_id: src.thread_id,
    user_id: developerId,
    project_id: projectId,
    category: 'tagro',
    type: 'chat_message',
    title: sentToClient ? '✓ an Kunde gesendet' : '· intern notiert',
    body: (sentToClient ? '✓ an Kunde gesendet: ' : '· intern notiert: ') + (text || '').slice(0, 280),
    actor_id: null,
    metadata: { tagro_echo: true },
  })
}
