import type { SupabaseClient } from '@supabase/supabase-js'
import { actionItemExtractionPrompt } from './task-prompts'
import { buildTagroContext, contextToPromptText } from './task-context-builder'
import { runOpenAIJson } from './openai'
import { normalizeActionItem, taskShapeForActionItem } from './task-classifier'
import { findSimilarOpenTasks } from './deduplication'
import { clampPriority, type TagroActionItem } from './task-rules'

function fallbackActionItems(reportContent: string) {
  const text = reportContent.toLowerCase()
  const actionItems: TagroActionItem[] = []

  if (/\b(entscheidung|freigabe|approved?|wählen|auswählen)\b/.test(text)) {
    actionItems.push({
      type: 'decision',
      title: 'Offene Entscheidung prüfen',
      description: 'Der Statusbericht enthält einen Punkt, der eine bewusste Freigabe oder Auswahl benötigt.',
      priority: 'high',
      owner_type: 'client',
      client_visible: true,
      requires_approval: true,
      related_reason: 'Statusbericht nennt Entscheidungsbedarf.',
      confidence_score: 0.72,
    })
  }

  if (actionItems.length < 2 && /\b(fehl|benötig|brauchen|bereitstellen|upload|datei|text)\b/.test(text)) {
    actionItems.push({
      type: 'client_task',
      title: 'Fehlende Information bereitstellen',
      description: 'Für den nächsten Projektschritt wird noch Material oder Feedback vom Client benötigt.',
      priority: 'medium',
      owner_type: 'client',
      client_visible: true,
      related_reason: 'Statusbericht nennt fehlende Informationen.',
      confidence_score: 0.68,
    })
  }

  if (actionItems.length < 2 && /\b(test|prüf|nächster schritt|weiter)\b/.test(text)) {
    actionItems.push({
      type: 'dev_task',
      title: 'Nächsten Umsetzungsschritt prüfen',
      description: 'Der im Statusbericht genannte nächste Schritt wird als Developer-Follow-up vorbereitet.',
      priority: 'medium',
      owner_type: 'developer',
      client_visible: false,
      related_reason: 'Statusbericht enthält klaren nächsten Umsetzungsschritt.',
      confidence_score: 0.64,
    })
  }

  return { action_items: actionItems.slice(0, 2) }
}

export async function extractActionItemsFromStatusReport({
  sb,
  projectId,
  reportContent,
}: {
  sb: SupabaseClient<any>
  projectId: string
  reportContent: string
}) {
  const context = await buildTagroContext({ sb, projectId, purpose: 'action_items' })
  const prompt = actionItemExtractionPrompt(contextToPromptText(context), reportContent)
  const result = await runOpenAIJson({
    prompt,
    runType: 'action_item_extraction',
    fallback: () => fallbackActionItems(reportContent),
  })

  const items = Array.isArray((result.output as any).action_items)
    ? (result.output as any).action_items.map(normalizeActionItem).filter((item: TagroActionItem) => item.title || item.type === 'no_action').slice(0, 2)
    : []

  return {
    ...result,
    output: { action_items: items },
  }
}

export async function createTasksAndDecisionsFromActionItems({
  sb,
  actorId,
  projectId,
  sourceReportId,
  actionItems,
}: {
  sb: SupabaseClient<any>
  actorId: string | null
  projectId: string
  sourceReportId?: string | null
  actionItems: TagroActionItem[]
}) {
  const created: Array<{ type: string; id: string; title: string }> = []

  for (const rawItem of actionItems.map(normalizeActionItem)) {
    if (rawItem.type === 'no_action' || !rawItem.title) continue

    if (rawItem.type === 'decision') {
      const { data: decision } = await sb.from('decisions').insert({
        project_id: projectId,
        source: 'status_report',
        source_report_id: sourceReportId ?? null,
        title: rawItem.title,
        description: rawItem.description || null,
        impact_summary: rawItem.related_reason || null,
        status: 'waiting_for_client',
        visible_to_client: true,
        created_by: actorId,
        options_json: [],
      }).select('id,title').single()

      if (decision?.id) {
        created.push({ type: 'decision', id: decision.id, title: decision.title })
      }
      continue
    }

    const shape = taskShapeForActionItem(rawItem)
    const duplicate = await findSimilarOpenTasks(sb, projectId, rawItem.title, shape.task_type)
    if (duplicate?.id) {
      await sb.from('tasks').update({
        latest_dev_update: rawItem.related_reason || rawItem.description || null,
        source_status_report_id: sourceReportId ?? null,
      }).eq('id', duplicate.id)
      created.push({ type: 'duplicate_linked', id: duplicate.id, title: duplicate.title })
      continue
    }

    const { data: task } = await sb.from('tasks').insert({
      project_id: projectId,
      title: rawItem.title,
      description: rawItem.description || null,
      client_description: rawItem.client_visible === false ? null : rawItem.description || null,
      dev_description: rawItem.description || null,
      source: 'status_report',
      source_status_report_id: sourceReportId ?? null,
      origin: 'tagro',
      priority: clampPriority(rawItem.priority, 'medium'),
      progress: 0,
      latest_client_update: rawItem.client_visible === false ? null : rawItem.related_reason || rawItem.description || null,
      latest_dev_update: rawItem.related_reason || rawItem.description || null,
      created_by: actorId,
      ...shape,
    }).select('id,title').single()

    if (task?.id) {
      created.push({ type: 'task', id: task.id, title: task.title })
    }
  }

  if (sourceReportId) {
    await sb.from('status_reports').update({
      action_items_json: actionItems,
      action_items_processed: true,
    }).eq('id', sourceReportId)
  }

  return created
}

