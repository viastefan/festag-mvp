import type { SupabaseClient } from '@supabase/supabase-js'

export type PendingApproval = {
  id: string
  kind: 'capture' | 'decision'
  title: string
  project_id: string | null
  project_title?: string | null
  created_at: string
  href: string
}

export async function listPendingApprovals(
  sb: SupabaseClient<any>,
  userId: string,
): Promise<{ items: PendingApproval[]; count: number }> {
  const { data: projects } = await sb
    .from('projects')
    .select('id,title')
    .or(`user_id.eq.${userId},client_id.eq.${userId}`)
    .limit(100)

  const projectRows = (projects as any[]) ?? []
  const projectIds = projectRows.map(p => p.id)
  const projectMap = Object.fromEntries(projectRows.map(p => [p.id, p.title]))

  const items: PendingApproval[] = []

  if (projectIds.length > 0) {
    const { data: captures } = await sb
      .from('captures')
      .select('id,title,project_id,created_at,status')
      .in('project_id', projectIds)
      .eq('status', 'ready_review')
      .order('created_at', { ascending: false })
      .limit(20)

    for (const c of (captures as any[]) ?? []) {
      items.push({
        id: c.id,
        kind: 'capture',
        title: c.title || 'Capture zur Freigabe',
        project_id: c.project_id,
        project_title: projectMap[c.project_id] ?? null,
        created_at: c.created_at,
        href: '/captures',
      })
    }
  }

  const { data: decisions } = await sb
    .from('decisions')
    .select('id,title,project_id,created_at')
    .eq('requested_for', userId)
    .in('status', ['open', 'waiting_for_client', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(20)

  for (const d of (decisions as any[]) ?? []) {
    items.push({
      id: d.id,
      kind: 'decision',
      title: d.title || 'Entscheidung',
      project_id: d.project_id,
      project_title: projectMap[d.project_id] ?? null,
      created_at: d.created_at,
      href: `/decisions?open=${d.id}`,
    })
  }

  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return { items: items.slice(0, 12), count: items.length }
}
