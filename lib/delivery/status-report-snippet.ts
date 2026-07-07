/**
 * Append coordination events to the latest client-visible status report.
 * Keeps the daily Statusbericht in sync with decisions and handoffs.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type SnippetSection =
  | 'client_actions_json'
  | 'dev_followups_json'
  | 'decisions_needed_json'
  | 'current_work_json'
  | 'completed_work_json'
  | 'next_steps_json'

export type AppendSnippetInput = {
  projectId: string
  line: string
  section?: SnippetSection
  taskId?: string | null
  decisionId?: string | null
}

function uniqueAppend(existing: unknown, line: string, max = 8): string[] {
  const arr = Array.isArray(existing)
    ? existing.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    : []
  const trimmed = line.trim().slice(0, 280)
  if (!trimmed) return arr
  if (arr.some((x) => x === trimmed)) return arr
  return [trimmed, ...arr].slice(0, max)
}

/**
 * Merges a coordination line into the newest visible status report for a project.
 * Creates a lightweight report row when none exists yet.
 */
export async function appendCoordinationSnippet(
  sb: SupabaseClient<any>,
  input: AppendSnippetInput,
): Promise<{ reportId: string | null }> {
  const section = input.section ?? 'current_work_json'
  const line = input.line.trim()
  if (!line) return { reportId: null }

  const { data: latest } = await sb
    .from('status_reports')
    .select('id, current_work_json, completed_work_json, next_steps_json, client_actions_json, dev_followups_json, decisions_needed_json')
    .eq('project_id', input.projectId)
    .eq('visible_to_client', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latest?.id) {
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      [section]: uniqueAppend((latest as any)[section], line),
    }
    await sb.from('status_reports').update(patch).eq('id', latest.id)
    return { reportId: latest.id }
  }

  const title = 'Koordination'
  const { data: created } = await sb.from('status_reports').insert({
    project_id: input.projectId,
    title,
    summary: line.slice(0, 400),
    visible_to_client: true,
    generated_on: new Date().toISOString().slice(0, 10),
    current_work_json: section === 'current_work_json' ? [line] : [],
    client_actions_json: section === 'client_actions_json' ? [line] : [],
    dev_followups_json: section === 'dev_followups_json' ? [line] : [],
    decisions_needed_json: section === 'decisions_needed_json' ? [line] : [],
    completed_work_json: section === 'completed_work_json' ? [line] : [],
    next_steps_json: section === 'next_steps_json' ? [line] : [],
    blockers_json: [],
    risks_json: [],
    action_items_json: input.taskId || input.decisionId
      ? [{ kind: 'coordination', task_id: input.taskId, decision_id: input.decisionId, line }]
      : [],
  }).select('id').single()

  return { reportId: (created as any)?.id ?? null }
}
