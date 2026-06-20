import type { SupabaseClient } from '@supabase/supabase-js'

export type DevVisibilityRow = {
  id: string
  project_id: string
  project_title: string | null
  type: string
  source: string
  content: string
  client_visible: boolean
  client_translation: string | null
  internal_summary: string | null
  created_at: string
  created_by: string | null
}

export type DevVisibilityOverview = {
  rows: DevVisibilityRow[]
  stats: {
    total: number
    client_visible: number
    pending_deliverables: number
    signals_7d: number
  }
}

export async function buildDevVisibilityFeed(
  sb: SupabaseClient<any>,
  userId: string,
  limit = 40,
): Promise<DevVisibilityOverview> {
  const since7d = new Date(Date.now() - 7 * 86400000).toISOString()

  const { data: assignments } = await sb
    .from('project_assignments')
    .select('project_id')
    .eq('user_id', userId)
    .eq('active', true)

  let projectIds = ((assignments as any[]) ?? []).map(a => a.project_id).filter(Boolean)

  if (projectIds.length === 0) {
    const { data: prof } = await sb.from('profiles').select('role').eq('id', userId).maybeSingle()
    if (['admin', 'project_owner', 'dev', 'developer'].includes((prof as any)?.role ?? '')) {
      const { data: all } = await sb.from('projects').select('id').limit(50)
      projectIds = ((all as any[]) ?? []).map(p => p.id)
    }
  }

  if (projectIds.length === 0) {
    return { rows: [], stats: { total: 0, client_visible: 0, pending_deliverables: 0, signals_7d: 0 } }
  }

  const { data: projects } = await sb.from('projects').select('id,title').in('id', projectIds)
  const projectMap = Object.fromEntries(((projects as any[]) ?? []).map(p => [p.id, p.title]))

  const { data: signals } = await sb
    .from('work_signals')
    .select('id,project_id,type,source,content,visibility,tagro_classification_json,created_at,created_by')
    .in('project_id', projectIds)
    .order('created_at', { ascending: false })
    .limit(limit)

  const rows: DevVisibilityRow[] = ((signals as any[]) ?? []).map(s => {
    const cls = s.tagro_classification_json ?? {}
    const clientVisible = s.visibility === 'client' || cls.client_visible === true
    return {
      id: s.id,
      project_id: s.project_id,
      project_title: projectMap[s.project_id] ?? null,
      type: s.type,
      source: s.source,
      content: (s.content || '').slice(0, 400),
      client_visible: clientVisible,
      client_translation: cls.client_translation ?? null,
      internal_summary: cls.internal_summary ?? null,
      created_at: s.created_at,
      created_by: s.created_by ?? null,
    }
  })

  const clientVisible = rows.filter(r => r.client_visible).length
  const signals7d = rows.filter(r => r.created_at >= since7d).length

  const { count: pendingDeliverables } = await sb
    .from('project_assets')
    .select('id', { count: 'exact', head: true })
    .in('project_id', projectIds)
    .eq('status', 'analyzed')
    .in('visibility', ['client_visible', 'white_label_visible'])

  return {
    rows,
    stats: {
      total: rows.length,
      client_visible: clientVisible,
      pending_deliverables: pendingDeliverables ?? 0,
      signals_7d: signals7d,
    },
  }
}
