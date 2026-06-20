import type { SupabaseClient } from '@supabase/supabase-js'
import type { WorkSignalRow } from '@/lib/work-signals'
import { listClientDeliverables, type ClientDeliverable } from '@/lib/client/deliverables'
import { isClientVisibleTask, resolveClientVisibleStatus, clientSummaryText } from '@/lib/tasks/client-view'

export type ClientTimelineKind =
  | 'signal'
  | 'deliverable'
  | 'task'
  | 'meeting'
  | 'approval'

export type ClientTimelineItem = {
  id: string
  kind: ClientTimelineKind
  project_id: string | null
  project_title: string | null
  title: string
  body: string
  created_at: string
  meta?: {
    deliverable_id?: string
    task_id?: string
    approval_status?: string
    status_label?: string
    kind_label?: string
  }
}

async function userProjects(sb: SupabaseClient<any>, userId: string) {
  const { data } = await sb
    .from('projects')
    .select('id,title')
    .or(`user_id.eq.${userId},client_id.eq.${userId}`)
    .limit(100)
  const rows = (data as any[]) ?? []
  return {
    ids: rows.map(p => p.id),
    map: Object.fromEntries(rows.map(p => [p.id, p.title])) as Record<string, string>,
  }
}

function isClientVisibleSignal(row: WorkSignalRow): boolean {
  if (row.visibility === 'client') return row.tagro_classification_json?.client_visible !== false
  return row.tagro_classification_json?.client_visible === true
}

function signalItem(row: WorkSignalRow, projectMap: Record<string, string>): ClientTimelineItem {
  const cls = row.tagro_classification_json ?? {}
  const body = cls.client_translation?.trim()
    || cls.internal_summary?.trim()
    || row.content?.trim()
    || ''
  return {
    id: `signal-${row.id}`,
    kind: 'signal',
    project_id: row.project_id,
    project_title: projectMap[row.project_id] ?? null,
    title: body.slice(0, 100) || 'Projekt-Update',
    body,
    created_at: row.created_at,
    meta: { kind_label: row.type },
  }
}

function deliverableItem(d: ClientDeliverable): ClientTimelineItem {
  const awaiting = d.approval_status === 'awaiting_review'
  return {
    id: `deliverable-${d.id}`,
    kind: awaiting ? 'approval' : 'deliverable',
    project_id: d.project_id,
    project_title: d.project_title,
    title: d.title,
    body: d.summary || d.description || (awaiting ? 'Neues Deliverable wartet auf deine Freigabe.' : 'Neues Deliverable verfügbar.'),
    created_at: d.analyzed_at || d.created_at,
    meta: {
      deliverable_id: d.id,
      approval_status: d.approval_status,
      kind_label: d.kind,
    },
  }
}

const KIND_LABEL: Record<string, string> = {
  file: 'Datei', video: 'Video', image: 'Bild', pdf: 'PDF', document: 'Dokument',
  figma: 'Design', link: 'Link', screenshot: 'Screenshot', code: 'Code',
}

export async function buildClientTimeline(
  sb: SupabaseClient<any>,
  userId: string,
  limit = 30,
): Promise<ClientTimelineItem[]> {
  const { ids: projectIds, map: projectMap } = await userProjects(sb, userId)
  if (projectIds.length === 0) return []

  const items: ClientTimelineItem[] = []

  const { data: signalRows } = await sb
    .from('work_signals')
    .select('*')
    .in('project_id', projectIds)
    .order('created_at', { ascending: false })
    .limit(limit * 3)

  for (const row of ((signalRows as WorkSignalRow[]) ?? []).filter(isClientVisibleSignal)) {
    items.push(signalItem(row, projectMap))
  }

  const deliverables = await listClientDeliverables(sb, userId, limit)
  for (const d of deliverables) {
    items.push({
      ...deliverableItem(d),
      meta: { ...deliverableItem(d).meta, kind_label: KIND_LABEL[d.kind] || d.kind },
    })
  }

  const { data: taskRows } = await sb
    .from('tasks')
    .select('id,title,project_id,client_visible,client_visible_status,dev_status,status,client_status,tagro_client_summary,latest_client_update,customer_update,updated_at,finished_by_dev_at,approved_by_owner_at')
    .in('project_id', projectIds)
    .order('updated_at', { ascending: false })
    .limit(limit * 2)

  for (const t of (taskRows as any[]) ?? []) {
    if (!isClientVisibleTask(t)) continue
    const status = resolveClientVisibleStatus(t)
    const summary = clientSummaryText(t)
    if (!summary && status === 'planned') continue
    const stamp = t.approved_by_owner_at || t.finished_by_dev_at || t.updated_at
    items.push({
      id: `task-${t.id}`,
      kind: 'task',
      project_id: t.project_id,
      project_title: projectMap[t.project_id] ?? null,
      title: t.title || 'Aufgabe',
      body: summary,
      created_at: stamp,
      meta: { task_id: t.id, status_label: status },
    })
  }

  const { data: meetings } = await sb
    .from('notes')
    .select('id,title,project_id,tagro_suggestions,updated_at,created_at')
    .in('project_id', projectIds)
    .eq('note_type', 'meeting')
    .contains('shared_with', [userId])
    .order('updated_at', { ascending: false })
    .limit(10)

  for (const n of (meetings as any[]) ?? []) {
    const summary = (n.tagro_suggestions?.summary as string | undefined)?.trim()
    if (!summary) continue
    items.push({
      id: `meeting-${n.id}`,
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
