import type { SupabaseClient } from '@supabase/supabase-js'
import type { WorkSignalRow } from '@/lib/work-signals'

export type ClientActivityItem = {
  id: string
  kind: 'signal' | 'meeting'
  project_id: string | null
  project_title: string | null
  title: string
  body: string
  created_at: string
}

async function userProjectIds(
  sb: SupabaseClient<any>,
  userId: string,
): Promise<Array<{ id: string; title: string }>> {
  const { data } = await sb
    .from('projects')
    .select('id,title')
    .or(`user_id.eq.${userId},client_id.eq.${userId}`)
    .limit(100)
  return ((data as any[]) ?? []).map(p => ({ id: p.id, title: p.title }))
}

function signalToItem(row: WorkSignalRow, projectTitle: string | null): ClientActivityItem {
  const cls = row.tagro_classification_json ?? {}
  const body = cls.client_translation?.trim()
    || cls.internal_summary?.trim()
    || row.content?.trim()
    || ''
  return {
    id: row.id,
    kind: 'signal',
    project_id: row.project_id,
    project_title: projectTitle,
    title: body.slice(0, 80) || 'Projekt-Update',
    body,
    created_at: row.created_at,
  }
}

function isClientVisibleSignal(row: WorkSignalRow): boolean {
  if (row.visibility === 'client') return row.tagro_classification_json?.client_visible !== false
  return row.tagro_classification_json?.client_visible === true
}

export async function listClientActivity(
  sb: SupabaseClient<any>,
  userId: string,
  limit = 10,
): Promise<ClientActivityItem[]> {
  const projects = await userProjectIds(sb, userId)
  if (projects.length === 0) return []

  const projectMap = Object.fromEntries(projects.map(p => [p.id, p.title]))
  const projectIds = projects.map(p => p.id)
  const items: ClientActivityItem[] = []

  const { data: signalRows } = await sb
    .from('work_signals')
    .select('*')
    .in('project_id', projectIds)
    .order('created_at', { ascending: false })
    .limit(limit * 4)

  for (const row of ((signalRows as WorkSignalRow[]) ?? []).filter(isClientVisibleSignal)) {
    items.push(signalToItem(row, projectMap[row.project_id] ?? null))
  }

  const { data: meetings } = await sb
    .from('notes')
    .select('id,title,project_id,tagro_suggestions,updated_at,created_at')
    .in('project_id', projectIds)
    .eq('note_type', 'meeting')
    .contains('shared_with', [userId])
    .order('updated_at', { ascending: false })
    .limit(8)

  for (const n of (meetings as any[]) ?? []) {
    const summary = (n.tagro_suggestions?.summary as string | undefined)?.trim()
    if (!summary) continue
    items.push({
      id: n.id,
      kind: 'meeting',
      project_id: n.project_id,
      project_title: projectMap[n.project_id] ?? null,
      title: n.title?.trim() || 'Meeting-Zusammenfassung',
      body: summary,
      created_at: n.updated_at || n.created_at,
    })
  }

  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return items.slice(0, limit)
}
