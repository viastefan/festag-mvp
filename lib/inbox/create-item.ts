import type { SupabaseClient } from '@supabase/supabase-js'
import { inboxSourceId } from '@/lib/inbox/source-id'

export type InboxCategory = 'tagro' | 'client' | 'team' | 'system' | 'billing' | 'support'
export type InboxItemType =
  | 'chat_message' | 'system_event' | 'project_event'
  | 'invoice_created' | 'payment_event' | 'guarantee_event'
  | 'support_event' | 'task_event' | 'status_update'

export type CreateInboxItemInput = {
  userId: string
  projectId?: string | null
  category: InboxCategory
  type: InboxItemType
  title: string
  body?: string | null
  actorId?: string | null
  sourceTable: string
  /** UUID or composite string — composites are hashed deterministically. */
  sourceId: string
  metadata?: Record<string, unknown>
}

function asUuid(sourceId: string): string {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sourceId)) {
    return sourceId
  }
  return inboxSourceId(sourceId)
}

export async function createInboxItem(
  sb: SupabaseClient<any>,
  input: CreateInboxItemInput,
): Promise<string | null> {
  const { data, error } = await sb.rpc('create_inbox_item', {
    p_user_id: input.userId,
    p_project_id: input.projectId ?? null,
    p_category: input.category,
    p_type: input.type,
    p_title: input.title,
    p_body: input.body ?? null,
    p_actor_id: input.actorId ?? null,
    p_source_table: input.sourceTable,
    p_source_id: asUuid(input.sourceId),
    p_metadata: input.metadata ?? {},
  })
  if (error) {
    console.error('[inbox] createInboxItem failed:', error.message)
    return null
  }
  return (data as string | null) ?? null
}
