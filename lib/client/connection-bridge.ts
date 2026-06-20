import type { SupabaseClient } from '@supabase/supabase-js'
import { createWorkSignal, type WorkSignalAttachment } from '@/lib/work-signals'
import { classifyAndPersistWorkSignal } from '@/lib/tagro/classify-signal'
import { publishTagroClientUpdate } from '@/lib/sync/client-bridge'
import type { WorkSignalType } from '@/lib/work-types'

export type EmitClientVisibilityInput = {
  projectId: string
  type: WorkSignalType
  content: string
  source?: string
  visibility?: 'internal' | 'team' | 'client'
  createdBy?: string | null
  relatedTaskId?: string | null
  relatedDecisionId?: string | null
  attachments?: WorkSignalAttachment[]
  /** Push inbox + messages to project client when classified as client-visible. */
  notifyClient?: boolean
  clientTranslation?: string | null
  inboxTitle?: string
  workType?: string | null
}

/**
 * Developer Activity → Tagro Analysis → work_signals → Client Visibility
 *
 * Central bridge for the Festag Client↔Developer connection system.
 * Every meaningful dev action should funnel through here.
 */
export async function emitDevActionToClient(
  sb: SupabaseClient<any>,
  input: EmitClientVisibilityInput,
): Promise<{ signalId: string | null; clientNotified: boolean }> {
  const visibility = input.visibility ?? 'team'

  const signal = await createWorkSignal(sb, {
    projectId: input.projectId,
    type: input.type,
    source: input.source || 'festag',
    content: input.content,
    attachments: input.attachments,
    relatedTaskId: input.relatedTaskId ?? null,
    relatedDecisionId: input.relatedDecisionId ?? null,
    visibility,
    createdBy: input.createdBy ?? null,
  }, input.workType ?? null)

  if (!signal) return { signalId: null, clientNotified: false }

  const classified = await classifyAndPersistWorkSignal(sb, signal.id)
  const cls = classified?.tagro_classification_json ?? {}
  const shouldNotify = input.notifyClient !== false
    && (visibility === 'client' || cls.client_visible === true)

  if (!shouldNotify) return { signalId: signal.id, clientNotified: false }

  const { data: project } = await sb
    .from('projects')
    .select('client_id, title, work_type')
    .eq('id', input.projectId)
    .maybeSingle()

  const clientId = (project as any)?.client_id
  if (!clientId) return { signalId: signal.id, clientNotified: false }

  const translation = input.clientTranslation?.trim()
    || cls.client_translation?.trim()
    || input.content

  try {
    await publishTagroClientUpdate({
      writer: sb,
      clientId,
      projectId: input.projectId,
      projectTitle: (project as any)?.title ?? null,
      devText: input.content,
      preTranslated: translation,
      actorId: input.createdBy ?? null,
      taskId: input.relatedTaskId ?? null,
      sourceTable: 'work_signals',
      sourceId: signal.id,
      inboxTitle: input.inboxTitle ?? undefined,
    })
    return { signalId: signal.id, clientNotified: true }
  } catch {
    return { signalId: signal.id, clientNotified: false }
  }
}
