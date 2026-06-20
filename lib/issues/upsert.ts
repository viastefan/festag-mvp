import type { SupabaseClient } from '@supabase/supabase-js'
import { extractTaskHints } from '@/lib/github/api'
import type { ConnectorIssue } from '@/lib/connectors/types'

export type UpsertIssuesResult = {
  created: number
  updated: number
  linked: number
  issueIds: string[]
}

export async function upsertConnectorIssues({
  sb,
  projectId,
  workspaceId,
  userId,
  issues,
}: {
  sb: SupabaseClient<any>
  projectId: string
  workspaceId?: string | null
  userId?: string | null
  issues: ConnectorIssue[]
}): Promise<UpsertIssuesResult> {
  let created = 0
  let updated = 0
  let linked = 0
  const issueIds: string[] = []

  const { data: candidateTasks } = await sb
    .from('tasks')
    .select('id,title,branch_name')
    .eq('project_id', projectId)
    .limit(200)

  const tasks = ((candidateTasks as any[]) ?? []) as Array<{ id: string; title: string; branch_name: string | null }>

  for (const ext of issues) {
    if (!ext.source_id) continue

    const { data: existing } = await sb
      .from('issues')
      .select('id,updated_at')
      .eq('project_id', projectId)
      .eq('source', ext.source || 'manual')
      .eq('source_id', ext.source_id)
      .maybeSingle()

    const row = {
      project_id: projectId,
      workspace_id: workspaceId ?? null,
      title: ext.title.slice(0, 240),
      description: ext.description?.slice(0, 8000) || null,
      issue_type: ext.issue_type || 'bug',
      severity: ext.severity || 'medium',
      status: ext.status || 'open',
      impact: ext.impact?.slice(0, 2000) || null,
      source: ext.source || 'manual',
      source_id: ext.source_id,
      source_url: ext.source_url || ext.externalUrl || null,
      labels: ext.labels ?? [],
      created_by: userId ?? null,
      reporter: userId ?? null,
    }

    let issueId: string | null = (existing as any)?.id ?? null

    if (existing) {
      const { data, error } = await sb
        .from('issues')
        .update(row)
        .eq('id', (existing as any).id)
        .select('id')
        .single()
      if (!error && data) {
        updated++
        issueId = data.id
      }
    } else {
      const { data, error } = await sb
        .from('issues')
        .insert(row)
        .select('id')
        .single()
      if (!error && data) {
        created++
        issueId = data.id
      }
    }

    if (!issueId) continue
    issueIds.push(issueId)

    const text = `${ext.title}\n${ext.description || ''}`
    const hints = extractTaskHints(text)
    for (const task of tasks) {
      const match =
        hints.includes(task.id.toLowerCase()) ||
        hints.some(h => h.startsWith('#') && text.includes(h))
      if (!match) continue
      const { error } = await sb.from('issue_task_links').upsert({
        issue_id: issueId,
        task_id: task.id,
        link_kind: ext.issue_type === 'blocker' ? 'blocks' : 'related',
      }, { onConflict: 'issue_id,task_id' })
      if (!error) linked++
    }
  }

  return { created, updated, linked, issueIds }
}
