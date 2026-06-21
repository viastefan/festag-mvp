/**
 * Tagro → Cursor worker: enqueue, dispatch, poll.
 */

import { createCloudAgent, cursorConfigured, getCloudRun } from '@/lib/cursor/cloud-agent-client'
import { buildCursorTaskPrompt } from '@/lib/cursor/task-prompt'

type AnySb = any

export type CursorJobRow = {
  id: string
  task_id: string
  project_id: string
  requested_by?: string | null
  status: string
  prompt_text: string
  repo_url: string | null
  repo_ref: string | null
  auto_create_pr: boolean
  cursor_agent_id: string | null
  cursor_run_id: string | null
  cursor_agent_url: string | null
  pr_url: string | null
  branch_name: string | null
  result_summary: string | null
  error_message: string | null
}

const TERMINAL = new Set(['finished', 'error', 'cancelled'])

export async function resolveRepoForProject(sb: AnySb, projectId: string): Promise<{ url: string; ref: string } | null> {
  const fallback = process.env.FESTAG_CURSOR_DEFAULT_REPO_URL?.trim()
  const { data: repos } = await sb
    .from('github_repositories')
    .select('repo_url,default_branch,active')
    .eq('project_id', projectId)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)

  const row = (repos as any[])?.[0]
  if (row?.repo_url) {
    return { url: String(row.repo_url), ref: String(row.default_branch || 'main') }
  }
  if (fallback) return { url: fallback, ref: process.env.FESTAG_CURSOR_DEFAULT_REPO_REF?.trim() || 'main' }
  return null
}

export async function enqueueCursorJob(sb: AnySb, {
  taskId,
  userId,
  autoCreatePR = true,
}: {
  taskId: string
  userId: string
  autoCreatePR?: boolean
}) {
  const { data: task, error: taskErr } = await sb
    .from('tasks')
    .select('id,title,description,dev_description,expected_outcome,definition_of_done,priority,work_type,branch_name,tagro_internal_notes,tagro_verification_summary,project_id')
    .eq('id', taskId)
    .maybeSingle()
  if (taskErr) throw new Error(taskErr.message)
  if (!task) throw new Error('task_not_found')

  const projectId = (task as any).project_id as string
  const { data: project } = await sb.from('projects').select('title,description,scope_summary').eq('id', projectId).maybeSingle()
  const repo = await resolveRepoForProject(sb, projectId)
  if (!repo) throw new Error('no_repo_linked')

  const promptText = buildCursorTaskPrompt(task as any, project as any)
  const { data: job, error: insErr } = await sb.from('cursor_agent_jobs').insert({
    task_id: taskId,
    project_id: projectId,
    requested_by: userId,
    status: 'queued',
    prompt_text: promptText,
    repo_url: repo.url,
    repo_ref: repo.ref,
    auto_create_pr: autoCreatePR,
  }).select('*').single()

  if (insErr) throw new Error(insErr.message)
  return job as CursorJobRow
}

export async function dispatchCursorJob(sb: AnySb, jobId: string) {
  if (!cursorConfigured()) throw new Error('cursor_not_configured')

  const { data: job, error } = await sb.from('cursor_agent_jobs').select('*').eq('id', jobId).maybeSingle()
  if (error) throw new Error(error.message)
  if (!job) throw new Error('job_not_found')
  if ((job as CursorJobRow).status !== 'queued') return job as CursorJobRow

  const row = job as CursorJobRow
  if (!row.repo_url) throw new Error('repo_url_missing')

  await sb.from('cursor_agent_jobs').update({
    status: 'dispatching',
    updated_at: new Date().toISOString(),
  }).eq('id', jobId)

  const created = await createCloudAgent({
    promptText: row.prompt_text,
    repoUrl: row.repo_url,
    startingRef: row.repo_ref || 'main',
    autoCreatePR: row.auto_create_pr,
    name: `Festag · ${row.task_id.slice(0, 8)}`,
    modelId: process.env.CURSOR_AGENT_MODEL?.trim() || undefined,
  })

  if (!created.ok || !created.data?.agent?.id) {
    const err = created.error || 'cursor_create_failed'
    await sb.from('cursor_agent_jobs').update({
      status: 'error',
      error_message: err,
      updated_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
    }).eq('id', jobId)
    throw new Error(err)
  }

  const agent = created.data.agent
  const run = created.data.run
  const branch = run?.git?.branches?.[0]?.branch ?? null

  const { data: updated } = await sb.from('cursor_agent_jobs').update({
    status: 'running',
    cursor_agent_id: agent.id,
    cursor_run_id: run?.id ?? agent.latestRunId ?? null,
    cursor_agent_url: agent.url ?? null,
    branch_name: branch,
    dispatched_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', jobId).select('*').single()

  await sb.from('task_activity_logs').insert({
    task_id: row.task_id,
    project_id: row.project_id,
    actor_id: row.requested_by,
    actor_kind: 'system',
    event: 'cursor_agent_dispatched',
    metadata: { job_id: jobId, agent_id: agent.id, run_id: run?.id, agent_url: agent.url },
    visible_to_client: false,
  }).then(() => null, () => null)

  return updated as CursorJobRow
}

export async function refreshCursorJob(sb: AnySb, jobId: string) {
  const { data: job, error } = await sb.from('cursor_agent_jobs').select('*').eq('id', jobId).maybeSingle()
  if (error) throw new Error(error.message)
  if (!job) throw new Error('job_not_found')

  const row = job as CursorJobRow
  if (TERMINAL.has(row.status)) return row
  if (!row.cursor_agent_id || !row.cursor_run_id) return row

  const runRes = await getCloudRun(row.cursor_agent_id, row.cursor_run_id)
  if (!runRes.ok || !runRes.data) return row

  const run = runRes.data
  const status = String(run.status || '').toUpperCase()
  const branch = run.git?.branches?.[0]?.branch ?? row.branch_name

  if (status === 'FINISHED') {
    const patch = {
      status: 'finished',
      result_summary: run.result?.slice(0, 4000) ?? null,
      branch_name: branch,
      updated_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
    }
    await sb.from('cursor_agent_jobs').update(patch).eq('id', jobId)
    await sb.from('task_activity_logs').insert({
      task_id: row.task_id,
      project_id: row.project_id,
      actor_kind: 'system',
      event: 'cursor_agent_finished',
      metadata: { job_id: jobId, summary: patch.result_summary, branch },
      visible_to_client: false,
    }).then(() => null, () => null)
    return { ...row, ...patch }
  }

  if (status === 'ERROR' || status === 'CANCELLED' || status === 'EXPIRED') {
    const patch = {
      status: 'error',
      error_message: run.result || status,
      branch_name: branch,
      updated_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
    }
    await sb.from('cursor_agent_jobs').update(patch).eq('id', jobId)
    return { ...row, ...patch }
  }

  if (branch && branch !== row.branch_name) {
    await sb.from('cursor_agent_jobs').update({ branch_name: branch, updated_at: new Date().toISOString() }).eq('id', jobId)
    return { ...row, branch_name: branch }
  }

  return row
}

export async function refreshRunningCursorJobs(sb: AnySb, limit = 20) {
  const { data: jobs } = await sb
    .from('cursor_agent_jobs')
    .select('id')
    .eq('status', 'running')
    .order('updated_at', { ascending: true })
    .limit(limit)

  const out: CursorJobRow[] = []
  for (const j of (jobs as any[]) ?? []) {
    try {
      out.push(await refreshCursorJob(sb, j.id))
    } catch { /* continue */ }
  }
  return out
}
