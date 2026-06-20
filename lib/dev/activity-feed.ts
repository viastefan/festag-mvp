import type { SupabaseClient } from '@supabase/supabase-js'

export type DevActivityKind =
  | 'signal'
  | 'commit'
  | 'pull_request'
  | 'proof'
  | 'work_log'
  | 'issue'

export type DevActivityRow = {
  id: string
  kind: DevActivityKind
  project_id: string | null
  project_title: string | null
  title: string
  body: string
  created_at: string
  client_visible: boolean
  href?: string | null
  meta?: Record<string, string | boolean | null>
}

export type DevActivityOverview = {
  rows: DevActivityRow[]
  stats: {
    signals: number
    commits_7d: number
    pulls_open: number
    client_visible: number
  }
}

async function devProjectIds(sb: SupabaseClient<any>, userId: string): Promise<string[]> {
  const { data: assignments } = await sb
    .from('project_assignments')
    .select('project_id')
    .eq('user_id', userId)
    .eq('active', true)

  let ids = ((assignments as any[]) ?? []).map(a => a.project_id).filter(Boolean)

  if (ids.length === 0) {
    const { data: prof } = await sb.from('profiles').select('role').eq('id', userId).maybeSingle()
    if (['admin', 'project_owner', 'dev', 'developer'].includes((prof as any)?.role ?? '')) {
      const { data: all } = await sb.from('projects').select('id').limit(50)
      ids = ((all as any[]) ?? []).map(p => p.id)
    }
  }
  return ids
}

export async function buildDevActivityFeed(
  sb: SupabaseClient<any>,
  userId: string,
  limit = 50,
): Promise<DevActivityOverview> {
  const projectIds = await devProjectIds(sb, userId)
  if (projectIds.length === 0) {
    return { rows: [], stats: { signals: 0, commits_7d: 0, pulls_open: 0, client_visible: 0 } }
  }

  const since7d = new Date(Date.now() - 7 * 86400000).toISOString()

  const { data: projects } = await sb.from('projects').select('id,title').in('id', projectIds)
  const projectMap = Object.fromEntries(((projects as any[]) ?? []).map(p => [p.id, p.title]))

  const [
    { data: signals },
    { data: commits },
    { data: pulls },
    { data: proofs },
    { data: logs },
    { data: issues },
  ] = await Promise.all([
    sb.from('work_signals')
      .select('id,project_id,type,source,content,visibility,tagro_classification_json,created_at')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false })
      .limit(limit),
    sb.from('github_commits')
      .select('id,project_id,commit_sha,message,commit_url,committed_at,branch_name')
      .in('project_id', projectIds)
      .gte('committed_at', since7d)
      .order('committed_at', { ascending: false })
      .limit(20),
    sb.from('github_pull_requests')
      .select('id,project_id,pr_number,title,state,merged,pr_url,updated_at_github,merged_at')
      .in('project_id', projectIds)
      .order('updated_at_github', { ascending: false })
      .limit(20),
    sb.from('task_proofs')
      .select('id,project_id,proof_type,description,url,created_at,task_id')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false })
      .limit(15),
    sb.from('developer_updates')
      .select('id,project_id,update_text,status,created_at,task_id')
      .eq('developer_id', userId)
      .in('project_id', projectIds)
      .order('created_at', { ascending: false })
      .limit(15),
    sb.from('issues')
      .select('id,project_id,title,severity,status,created_at')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false })
      .limit(15),
  ])

  const rows: DevActivityRow[] = []

  for (const s of (signals as any[]) ?? []) {
    const cls = s.tagro_classification_json ?? {}
    const clientVisible = s.visibility === 'client' || cls.client_visible === true
    rows.push({
      id: `signal-${s.id}`,
      kind: 'signal',
      project_id: s.project_id,
      project_title: projectMap[s.project_id] ?? null,
      title: `${s.type} · ${s.source}`,
      body: cls.client_translation || cls.internal_summary || s.content || '',
      created_at: s.created_at,
      client_visible: clientVisible,
      href: clientVisible ? '/dev/visibility' : null,
    })
  }

  for (const c of (commits as any[]) ?? []) {
    const msg = String(c.message || '').split('\n')[0].slice(0, 120)
    rows.push({
      id: `commit-${c.id}`,
      kind: 'commit',
      project_id: c.project_id,
      project_title: projectMap[c.project_id] ?? null,
      title: `Commit ${String(c.commit_sha || '').slice(0, 7)}`,
      body: msg,
      created_at: c.committed_at || new Date().toISOString(),
      client_visible: false,
      href: c.commit_url,
      meta: { branch: c.branch_name },
    })
  }

  for (const p of (pulls as any[]) ?? []) {
    rows.push({
      id: `pr-${p.id}`,
      kind: 'pull_request',
      project_id: p.project_id,
      project_title: projectMap[p.project_id] ?? null,
      title: `PR #${p.pr_number}${p.merged ? ' · merged' : ''}`,
      body: p.title || '',
      created_at: p.merged_at || p.updated_at_github || new Date().toISOString(),
      client_visible: false,
      href: p.pr_url,
      meta: { state: p.state, merged: p.merged },
    })
  }

  for (const p of (proofs as any[]) ?? []) {
    rows.push({
      id: `proof-${p.id}`,
      kind: 'proof',
      project_id: p.project_id,
      project_title: projectMap[p.project_id] ?? null,
      title: `Nachweis · ${p.proof_type}`,
      body: p.description || p.url || 'Nachweis hinzugefügt',
      created_at: p.created_at,
      client_visible: false,
      href: p.task_id ? `/dev/tasks?id=${p.task_id}` : null,
    })
  }

  for (const l of (logs as any[]) ?? []) {
    rows.push({
      id: `log-${l.id}`,
      kind: 'work_log',
      project_id: l.project_id,
      project_title: projectMap[l.project_id] ?? null,
      title: `Work-Log · ${l.status}`,
      body: String(l.update_text || '').slice(0, 280),
      created_at: l.created_at,
      client_visible: false,
      href: l.task_id ? `/dev/tasks?id=${l.task_id}` : null,
    })
  }

  for (const i of (issues as any[]) ?? []) {
    rows.push({
      id: `issue-${i.id}`,
      kind: 'issue',
      project_id: i.project_id,
      project_title: projectMap[i.project_id] ?? null,
      title: i.title,
      body: `${i.severity} · ${i.status}`,
      created_at: i.created_at,
      client_visible: i.severity === 'critical' || i.severity === 'high',
      href: `/dev/issues?open=${i.id}`,
    })
  }

  rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const sliced = rows.slice(0, limit)

  return {
    rows: sliced,
    stats: {
      signals: ((signals as any[]) ?? []).length,
      commits_7d: ((commits as any[]) ?? []).length,
      pulls_open: ((pulls as any[]) ?? []).filter(p => p.state === 'open').length,
      client_visible: sliced.filter(r => r.client_visible).length,
    },
  }
}
