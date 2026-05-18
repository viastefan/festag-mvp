import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/github/activity?repoId=...&projectId=...&taskId=...&limit=...
 *
 * Reads commits + PRs for the current developer. Filters are optional;
 * if `repoId` is supplied we narrow to that repo, otherwise we return
 * activity across every linked repo the user can see (RLS applies).
 *
 * Response:
 *   { commits: [...], pulls: [...] }
 *
 * The UI uses this to populate the GitHub page and the task drawer.
 */
export async function GET(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const url = new URL(req.url)
    const repoId    = url.searchParams.get('repoId')
    const projectId = url.searchParams.get('projectId')
    const taskId    = url.searchParams.get('taskId')
    const limit     = Math.min(Number(url.searchParams.get('limit') ?? 30), 100)

    let cq = supabase
      .from('github_commits')
      .select('id,repo_id,project_id,commit_sha,message,author_name,commit_url,committed_at,task_id,task_match_confidence,branch_name')
      .order('committed_at', { ascending: false }).limit(limit)
    if (repoId)    cq = cq.eq('repo_id', repoId)
    if (projectId) cq = cq.eq('project_id', projectId)
    if (taskId)    cq = cq.eq('task_id', taskId)

    let pq = supabase
      .from('github_pull_requests')
      .select('id,repo_id,project_id,pr_number,title,state,merged,pr_url,head_branch,base_branch,updated_at_github,merged_at,task_id')
      .order('updated_at_github', { ascending: false }).limit(limit)
    if (repoId)    pq = pq.eq('repo_id', repoId)
    if (projectId) pq = pq.eq('project_id', projectId)
    if (taskId)    pq = pq.eq('task_id', taskId)

    const [{ data: commits }, { data: pulls }] = await Promise.all([cq, pq])

    return NextResponse.json({
      commits: commits ?? [],
      pulls: pulls ?? [],
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 })
  }
}
