import type { SupabaseClient } from '@supabase/supabase-js'
import type { Objective } from '@/lib/objectives/types'
import { isObjectiveAtRisk } from '@/lib/objectives/types'

function isTaskDone(status: string | null | undefined): boolean {
  return ['done', 'completed'].includes(String(status ?? ''))
}

export async function computeObjectiveProgress(
  sb: SupabaseClient<any>,
  objectiveId: string,
): Promise<{ progress_pct: number; task_count: number; task_done: number }> {
  const { data: links } = await sb
    .from('objective_task_links')
    .select('task_id')
    .eq('objective_id', objectiveId)

  const taskIds = ((links as any[]) ?? []).map(l => l.task_id).filter(Boolean)
  if (taskIds.length === 0) {
    return { progress_pct: 0, task_count: 0, task_done: 0 }
  }

  const { data: tasks } = await sb
    .from('tasks')
    .select('id,status,dev_status,client_status')
    .in('id', taskIds)

  const rows = (tasks as any[]) ?? []
  const task_done = rows.filter(t =>
    isTaskDone(t.status) || isTaskDone(t.dev_status) || isTaskDone(t.client_status),
  ).length
  const task_count = rows.length
  const progress_pct = task_count > 0 ? Math.round((task_done / task_count) * 100) : 0

  return { progress_pct, task_count, task_done }
}

export async function refreshObjectiveProgress(
  sb: SupabaseClient<any>,
  objectiveId: string,
): Promise<Objective | null> {
  const { progress_pct } = await computeObjectiveProgress(sb, objectiveId)
  const { data, error } = await sb
    .from('objectives')
    .update({ progress_pct })
    .eq('id', objectiveId)
    .select('*')
    .single()

  if (error || !data) return null
  return data as Objective
}

export function enrichObjective(
  row: Objective,
  counts?: { task_count: number; task_done: number },
): Objective {
  return {
    ...row,
    task_count: counts?.task_count ?? row.task_count ?? 0,
    task_done: counts?.task_done ?? row.task_done ?? 0,
    at_risk: isObjectiveAtRisk(row),
  }
}
