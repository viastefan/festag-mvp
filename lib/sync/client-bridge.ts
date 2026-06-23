import type { SupabaseClient } from '@supabase/supabase-js'
import { createInboxItem } from '@/lib/inbox/create-item'
import { translateDevUpdate } from '@/lib/tagro/translate-update'

export type PublishClientUpdateInput = {
  writer: SupabaseClient<any>
  clientId: string
  projectId: string
  projectTitle?: string | null
  devText: string
  actorId?: string | null
  taskId?: string | null
  sourceTable: string
  sourceId: string
  inboxTitle?: string
  link?: string
  preTranslated?: string | null
}

/**
 * Tagro Client Bridge — dev execution → client visibility layer.
 */
export async function publishTagroClientUpdate(input: PublishClientUpdateInput): Promise<{
  clientSummary: string
  inboxItemId: string | null
}> {
  const {
    writer, clientId, projectId, projectTitle, devText, actorId,
    taskId, sourceTable, sourceId, inboxTitle, link, preTranslated,
  } = input

  let clientSummary = preTranslated?.trim() || ''
  if (!clientSummary) {
    const translated = await translateDevUpdate({
      devText,
      projectTitle: projectTitle ?? null,
    })
    clientSummary = translated.clientSummary
  }

  const title = inboxTitle ?? (projectTitle ? `${projectTitle}, Update` : 'Projekt-Update')

  const inboxItemId = await createInboxItem(writer, {
    userId: clientId,
    projectId,
    category: 'client',
    type: 'status_update',
    title,
    body: clientSummary,
    actorId: actorId ?? null,
    sourceTable,
    sourceId,
    metadata: {
      source_label: 'Tagro',
      thread_title: projectTitle ?? 'Projekt',
      task_id: taskId ?? null,
      via: 'tagro_bridge',
    },
  })

  const clientLink = link ?? (inboxItemId
    ? `/benachrichtigungen?thread=${inboxItemId}`
    : `/project/${projectId}`)

  await writer.from('notifications').insert({
    user_id: clientId,
    project_id: projectId,
    task_id: taskId ?? null,
    audience: 'client',
    kind: 'tagro_client_update',
    type: 'tagro_client_update',
    title,
    body: clientSummary,
    message: clientSummary,
    link: clientLink,
    payload: {
      source: sourceTable,
      source_id: sourceId,
      via: 'tagro_bridge',
      inbox_item_id: inboxItemId,
    },
    read: false,
  }).then(() => null, () => null)

  await writer.from('messages').insert({
    project_id: projectId,
    sender_id: actorId ?? null,
    message: clientSummary,
    is_ai: true,
  }).then(() => null, () => null)

  return { clientSummary, inboxItemId }
}
