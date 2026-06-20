import type { SupabaseClient } from '@supabase/supabase-js'

export type ClientDeliverable = {
  id: string
  title: string
  description: string | null
  kind: string
  status: string
  approval_status: 'awaiting_review' | 'approved' | 'none'
  project_id: string
  project_title: string | null
  uploaded_by: string | null
  created_at: string
  analyzed_at: string | null
  summary: string | null
  requires_client_approval: boolean
  preview_url: string | null
  external_url: string | null
  storage_path: string | null
}

export async function listClientDeliverables(
  sb: SupabaseClient<any>,
  userId: string,
  limit = 20,
): Promise<ClientDeliverable[]> {
  const { data: projects } = await sb
    .from('projects')
    .select('id,title')
    .or(`user_id.eq.${userId},client_id.eq.${userId}`)
    .limit(100)

  const projectRows = (projects as any[]) ?? []
  const projectIds = projectRows.map(p => p.id)
  if (projectIds.length === 0) return []

  const projectMap = Object.fromEntries(projectRows.map(p => [p.id, p.title]))

  const { data: assets } = await sb
    .from('project_assets')
    .select('id,title,description,kind,status,visibility,project_id,uploaded_by,created_at,analyzed_at,analysis_result,preview_url,external_url,storage_path')
    .in('project_id', projectIds)
    .in('visibility', ['client_visible', 'white_label_visible'])
    .neq('status', 'archived')
    .order('created_at', { ascending: false })
    .limit(limit * 2)

  const items: ClientDeliverable[] = []

  for (const a of (assets as any[]) ?? []) {
    const analysis = (a.analysis_result || {}) as { summary?: string; requires_client_approval?: boolean }
    const requiresApproval = Boolean(analysis.requires_client_approval)
    const isApproved = a.status === 'approved'

    items.push({
      id: a.id,
      title: a.title || 'Deliverable',
      description: a.description ?? null,
      kind: a.kind || 'file',
      status: a.status,
      approval_status: requiresApproval
        ? (isApproved ? 'approved' : 'awaiting_review')
        : 'none',
      project_id: a.project_id,
      project_title: projectMap[a.project_id] ?? null,
      uploaded_by: a.uploaded_by ?? null,
      created_at: a.created_at,
      analyzed_at: a.analyzed_at ?? null,
      summary: analysis.summary?.trim() || null,
      requires_client_approval: requiresApproval,
      preview_url: a.preview_url ?? null,
      external_url: a.external_url ?? null,
      storage_path: a.storage_path ?? null,
    })
  }

  return items.slice(0, limit)
}
