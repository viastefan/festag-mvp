import type { SupabaseClient } from '@supabase/supabase-js'

function normalizeTitle(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9äöüß\s-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function similarity(a: string, b: string) {
  const left = new Set(normalizeTitle(a).split(' ').filter((word) => word.length > 2))
  const right = new Set(normalizeTitle(b).split(' ').filter((word) => word.length > 2))
  if (!left.size || !right.size) return 0
  let overlap = 0
  left.forEach((word) => {
    if (right.has(word)) overlap += 1
  })
  return overlap / Math.max(left.size, right.size)
}

export async function findSimilarOpenTasks(
  sb: SupabaseClient<any>,
  projectId: string,
  title: string,
  taskType?: string | null,
) {
  if (!projectId || !title.trim()) return null

  const { data } = await sb
    .from('tasks')
    .select('id,title,description,task_type,client_status,dev_status,status,updated_at')
    .eq('project_id', projectId)
    .order('updated_at', { ascending: false })
    .limit(80)

  const openTasks = ((data as any[]) ?? []).filter((task) => {
    const state = String(task.client_status ?? task.dev_status ?? task.status ?? '').toLowerCase()
    return !['done', 'completed', 'cancelled', 'erledigt'].includes(state)
  })

  return openTasks.find((task) => {
    const sameType = !taskType || !task.task_type || task.task_type === taskType
    return sameType && similarity(task.title || '', title) >= 0.62
  }) ?? null
}

